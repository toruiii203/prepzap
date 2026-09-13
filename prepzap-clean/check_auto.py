import bpy
import sys

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.fbx(filepath=r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx")

fbx_armature = None
fbx_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        fbx_armature = obj
    elif obj.type == 'MESH':
        fbx_mesh_obj = obj

bpy.ops.import_scene.gltf(filepath=r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb")

glb_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and obj != fbx_mesh_obj:
        glb_mesh_obj = obj

scale_factor = fbx_mesh_obj.dimensions.y / glb_mesh_obj.dimensions.y
glb_mesh_obj.scale = (scale_factor, scale_factor, scale_factor)

bpy.ops.object.select_all(action='DESELECT')
glb_mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = glb_mesh_obj
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bpy.ops.object.select_all(action='DESELECT')
glb_mesh_obj.select_set(True)
fbx_armature.select_set(True)
bpy.context.view_layer.objects.active = fbx_armature

bpy.ops.object.parent_set(type='ARMATURE_AUTO')

print("VERTEX GROUPS COUNT:", len(glb_mesh_obj.vertex_groups))
