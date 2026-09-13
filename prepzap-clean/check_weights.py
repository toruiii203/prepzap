import bpy
import sys

bpy.ops.wm.read_factory_settings(use_empty=True)

fbx_path = r"C:\Users\Migs\Desktop\Mixamo FBX!\foxtpose.fbx"
bpy.ops.import_scene.fbx(filepath=fbx_path)

fbx_mesh_obj = None
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
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

has_weight = False
for v in glb_mesh_obj.data.vertices:
    if len(v.groups) > 0:
        has_weight = True
        break

print("WEIGHTS TRANSFERRED: " + str(has_weight))
