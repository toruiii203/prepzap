import bpy
import sys

bpy.ops.wm.read_factory_settings(use_empty=True)

fbx_path = r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

fbx_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        fbx_mesh_obj = obj

glb_path = r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb"
bpy.ops.import_scene.gltf(filepath=glb_path)

glb_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj.name != fbx_mesh_obj.name:
        glb_mesh_obj = obj

print("FBX Dimensions:", fbx_mesh_obj.dimensions)
print("GLB Dimensions:", glb_mesh_obj.dimensions)
print("FBX Location:", fbx_mesh_obj.location)
print("GLB Location:", glb_mesh_obj.location)
