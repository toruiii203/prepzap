import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.fbx(filepath=r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx")
fbx_mesh_obj = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH')

bpy.ops.import_scene.gltf(filepath=r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb")
glb_mesh_obj = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj != fbx_mesh_obj)

def get_bbox(obj):
    return [obj.matrix_world @ v.co for v in obj.data.vertices]

fbx_verts = get_bbox(fbx_mesh_obj)
glb_verts = get_bbox(glb_mesh_obj)

print("FBX World Vert 0:", fbx_verts[0])
print("GLB World Vert 0:", glb_verts[0])
