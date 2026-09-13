import bpy
import sys

# Clear existing objects
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1. Import the FBX (Rigged but no UVs)
fbx_path = r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

# Find FBX Armature and Mesh
fbx_armature = None
fbx_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        fbx_armature = obj
    elif obj.type == 'MESH':
        fbx_mesh_obj = obj

if not fbx_armature or not fbx_mesh_obj:
    print("Error: Could not find Armature or Mesh in FBX")
    sys.exit(1)

fbx_mesh_obj.name = "SourceMesh"

# 2. Import the GLB (Textured but frozen)
glb_path = r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

glb_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.name != "SourceMesh":
        glb_mesh_obj = obj

if not glb_mesh_obj:
    print("Error: Could not find Mesh in GLB")
    sys.exit(1)

# Ensure glb mesh is active and selected
bpy.ops.object.select_all(action='DESELECT')
glb_mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = glb_mesh_obj

# 3. Transfer Weights
# Add data transfer modifier
mod = glb_mesh_obj.modifiers.new(name="DataTransfer", type='DATA_TRANSFER')
mod.object = fbx_mesh_obj
mod.use_vert_data = True
mod.data_types_verts = {'VGROUP_WEIGHTS'}
mod.vert_mapping = 'POLYINTERP_NEAREST'

# Generate data layers so the vertex groups are actually created
bpy.ops.object.datalayout_transfer(modifier=mod.name)
bpy.ops.object.modifier_apply(modifier=mod.name)

# 4. Parent GLB Mesh to Armature
glb_mesh_obj.parent = fbx_armature
arm_mod = glb_mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
arm_mod.object = fbx_armature

# 5. Cleanup: Delete the old FBX mesh and any other garbage
bpy.ops.object.select_all(action='DESELECT')
fbx_mesh_obj.select_set(True)
bpy.ops.object.delete()

# Delete the empty node that came from the GLB if any
for obj in bpy.context.scene.objects:
    if obj.type == 'EMPTY' and obj.parent is None:
        obj.select_set(True)
        bpy.ops.object.delete()

# 6. Export the combined result
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

print("SUCCESS")
