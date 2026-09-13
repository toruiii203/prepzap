import bpy
import sys

bpy.ops.wm.read_factory_settings(use_empty=True)

fbx_path = r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

fbx_armature = None
fbx_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        fbx_armature = obj
    elif obj.type == 'MESH':
        fbx_mesh_obj = obj

fbx_mesh_obj.name = "SourceMesh"

glb_path = r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

glb_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.name != "SourceMesh":
        glb_mesh_obj = obj

bpy.ops.object.select_all(action='DESELECT')
glb_mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = glb_mesh_obj

# Create ALL vertex groups on the target mesh before transferring
for vg in fbx_mesh_obj.vertex_groups:
    glb_mesh_obj.vertex_groups.new(name=vg.name)

fbx_mesh_obj.select_set(True)

bpy.ops.object.data_transfer(
    use_reverse_transfer=False, 
    data_type='VGROUP_WEIGHTS', 
    vert_mapping='POLYINTERP_NEAREST', 
    layers_select_src='ALL', 
    layers_select_dst='NAME'
)

glb_mesh_obj.parent = fbx_armature
arm_mod = glb_mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
arm_mod.object = fbx_armature

bpy.ops.object.select_all(action='DESELECT')
fbx_mesh_obj.select_set(True)
bpy.ops.object.delete()

for obj in bpy.context.scene.objects:
    if obj.type == 'EMPTY' and obj.parent is None:
        obj.select_set(True)
        bpy.ops.object.delete()

bpy.ops.object.select_all(action='SELECT')
out_path = r"C:\Users\Migs\Desktop\prepzap\prepzap-clean\public\models\fox_fixed.glb"
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_skins=True
)
print("SUCCESS_3")
