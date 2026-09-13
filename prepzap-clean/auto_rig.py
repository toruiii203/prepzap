import bpy
import sys

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import FBX (contains Armature)
bpy.ops.import_scene.fbx(filepath=r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx")

fbx_armature = None
fbx_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        fbx_armature = obj
    elif obj.type == 'MESH':
        fbx_mesh_obj = obj

# Import GLB (contains textured mesh)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb")

glb_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj != fbx_mesh_obj:
        glb_mesh_obj = obj

if not glb_mesh_obj or not fbx_armature:
    print("Could not find required objects!")
    sys.exit(1)

# Scale GLB down to match FBX
scale_factor = fbx_mesh_obj.dimensions.y / glb_mesh_obj.dimensions.y
glb_mesh_obj.scale = (scale_factor, scale_factor, scale_factor)

bpy.ops.object.select_all(action='DESELECT')
glb_mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = glb_mesh_obj
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# Delete FBX Mesh
bpy.ops.object.select_all(action='DESELECT')
fbx_mesh_obj.select_set(True)
bpy.ops.object.delete()

# Clean up Empties from GLTF import
for obj in bpy.context.scene.objects:
    if obj.type == 'EMPTY' and obj.parent is None:
        obj.select_set(True)
        bpy.ops.object.delete()

# Bind with Automatic Weights
bpy.ops.object.select_all(action='DESELECT')
glb_mesh_obj.select_set(True)
fbx_armature.select_set(True)
bpy.context.view_layer.objects.active = fbx_armature

print("Starting Automatic Weights binding...")
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
print("Binding complete!")

# Export
bpy.ops.object.select_all(action='SELECT')
out_path = r"C:\Users\Migs\Desktop\prepzap\prepzap-clean\public\models\fox.glb"
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_skins=True
)
print("SUCCESS_EXPORT")
