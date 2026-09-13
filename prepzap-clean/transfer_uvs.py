import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

fbx_path = r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

fbx_armature = None
fbx_mesh = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        fbx_armature = obj
    elif obj.type == 'MESH':
        fbx_mesh = obj
fbx_mesh.name = "TargetMesh"

glb_path = r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

glb_mesh = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.name != "TargetMesh":
        glb_mesh = obj

# Scale FBX up by 100 to perfectly match GLB world space
fbx_armature.scale = (100, 100, 100)
bpy.context.view_layer.objects.active = fbx_armature
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# Create a UV map on the FBX mesh
bpy.context.view_layer.objects.active = fbx_mesh
fbx_mesh.select_set(True)
if not fbx_mesh.data.uv_layers:
    fbx_mesh.data.uv_layers.new(name="UVMap")

# Data Transfer Modifier for UVs
mod = fbx_mesh.modifiers.new(name="DataTransfer", type='DATA_TRANSFER')
mod.object = glb_mesh
mod.use_loop_data = True
mod.data_types_loops = {'UV'}
mod.loop_mapping = 'POLYINTERP_NEAREST'

bpy.ops.object.datalayout_transfer(modifier=mod.name)
bpy.ops.object.modifier_apply(modifier=mod.name)

# Copy the material from GLB to FBX so it has the texture!
if glb_mesh.data.materials:
    if not fbx_mesh.data.materials:
        fbx_mesh.data.materials.append(glb_mesh.data.materials[0])
    else:
        fbx_mesh.data.materials[0] = glb_mesh.data.materials[0]

# Cleanup GLB
bpy.ops.object.select_all(action='DESELECT')
glb_mesh.select_set(True)
bpy.ops.object.delete()

for obj in bpy.context.scene.objects:
    if obj.type == 'EMPTY' and obj.parent is None:
        obj.select_set(True)
        bpy.ops.object.delete()

# Scale FBX back down to 0.01 for R3F
bpy.ops.object.select_all(action='DESELECT')
fbx_armature.select_set(True)
fbx_armature.scale = (0.01, 0.01, 0.01)
bpy.context.view_layer.objects.active = fbx_armature
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

out_path = r"C:\Users\Migs\Desktop\prepzap\prepzap-clean\public\models\fox.glb"
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_skins=True
)

print("SUCCESS_UV_TRANSFER")
