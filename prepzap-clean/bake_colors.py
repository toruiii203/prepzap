import bpy
import os

bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import Mixamo FBX (Perfect Skeleton, No Colors)
fbx_path = r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

fbx_armature = None
fbx_mesh = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        fbx_armature = obj
    elif obj.type == 'MESH':
        fbx_mesh = obj

# 2. Import FINISHED 3D GLB (Perfect Colors, No Skeleton)
glb_path = r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

glb_mesh = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj != fbx_mesh:
        glb_mesh = obj

# 3. Align the GLB to the FBX precisely
# We found earlier that FBX is exactly 0.01 scale compared to GLB
# Instead of scaling the GLB down (which causes precision issues), let's scale the FBX up, bake, then scale back down
fbx_armature.scale = (100, 100, 100)
bpy.context.view_layer.objects.active = fbx_armature
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# 4. Bake Texture to Vertex Colors on the GLB mesh first
# Wait, GLB mesh already has materials. We need to transfer its color to the FBX mesh.
# Since the FBX mesh has no UVs, we can transfer the surface color from GLB to FBX Vertex Colors!
bpy.context.view_layer.objects.active = fbx_mesh
fbx_mesh.select_set(True)

# Create a vertex color layer on the FBX mesh
if not fbx_mesh.data.vertex_colors:
    fbx_mesh.data.vertex_colors.new(name="Col")

# Add Data Transfer Modifier
mod = fbx_mesh.modifiers.new(name="DataTransfer", type='DATA_TRANSFER')
mod.object = glb_mesh
mod.use_loop_data = True
mod.data_types_loops = {'VCOL'}
mod.loop_mapping = 'POLYINTERP_NEAREST'

# Generate Data Layers
bpy.ops.object.datalayout_transfer(modifier=mod.name)
bpy.ops.object.modifier_apply(modifier=mod.name)

# 5. Cleanup GLB
bpy.ops.object.select_all(action='DESELECT')
glb_mesh.select_set(True)
bpy.ops.object.delete()

for obj in bpy.context.scene.objects:
    if obj.type == 'EMPTY' and obj.parent is None:
        obj.select_set(True)
        bpy.ops.object.delete()

# 6. Scale FBX back down so R3F doesn't break
bpy.ops.object.select_all(action='DESELECT')
fbx_armature.select_set(True)
fbx_armature.scale = (0.01, 0.01, 0.01)
bpy.context.view_layer.objects.active = fbx_armature
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# 7. Export the newly colored FBX as a GLB!
bpy.ops.object.select_all(action='SELECT')
out_path = r"C:\Users\Migs\Desktop\prepzap\prepzap-clean\public\models\fox.glb"
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_skins=True,
    export_colors=True
)

print("SUCCESS_BAKE")
