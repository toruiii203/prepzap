import bpy
import sys

def transfer_weights(fbx_path, glb_path, out_path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # Import FBX
    bpy.ops.import_scene.fbx(filepath=fbx_path)
    fbx_armature = None
    fbx_mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            fbx_armature = obj
        elif obj.type == 'MESH':
            fbx_mesh_obj = obj
            
    fbx_mesh_obj.name = "SourceMesh"
    
    # Import GLB
    bpy.ops.import_scene.gltf(filepath=glb_path)
    glb_mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj.name != "SourceMesh":
            glb_mesh_obj = obj
            
    bpy.ops.object.select_all(action='DESELECT')
    glb_mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = glb_mesh_obj
    
    # Create empty vertex groups on GLB mesh matching FBX mesh
    for vg in fbx_mesh_obj.vertex_groups:
        glb_mesh_obj.vertex_groups.new(name=vg.name)
        
    # Transfer Weights
    mod = glb_mesh_obj.modifiers.new(name="DataTransfer", type='DATA_TRANSFER')
    mod.object = fbx_mesh_obj
    mod.use_vert_data = True
    mod.data_types_verts = {'VGROUP_WEIGHTS'}
    mod.vert_mapping = 'POLYINTERP_NEAREST'
    bpy.ops.object.datalayout_transfer(modifier=mod.name)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    
    # Parent and Armature Modifier
    glb_mesh_obj.parent = fbx_armature
    arm_mod = glb_mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = fbx_armature
    
    # Cleanup Source Mesh
    bpy.ops.object.select_all(action='DESELECT')
    fbx_mesh_obj.select_set(True)
    bpy.ops.object.delete()
    
    # Cleanup Empties
    for obj in bpy.context.scene.objects:
        if obj.type == 'EMPTY' and obj.parent is None:
            obj.select_set(True)
            bpy.ops.object.delete()
            
    # Export
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_skins=True
    )
    print("Exported", out_path)

transfer_weights(
    r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx",
    r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb",
    r"C:\Users\Migs\Desktop\prepzap\prepzap-clean\public\models\fox_fixed.glb"
)
print("SUCCESS")
