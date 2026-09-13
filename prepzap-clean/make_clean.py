import bpy
import os
import zipfile

def decimate_and_zip(name, glb_path, base_dir):
    work_dir = os.path.join(base_dir, f"{name}_Clean")
    os.makedirs(work_dir, exist_ok=True)
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    blend_path = os.path.join(work_dir, "temp.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    
    bpy.ops.import_scene.gltf(filepath=glb_path)
    
    # Delete EVERYTHING except the main mesh to prevent Mixamo from finding hidden skeletons
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
        else:
            mesh_obj = obj
            
    bpy.context.view_layer.objects.active = mesh_obj
    mesh_obj.select_set(True)
    
    # Decimate
    mod = mesh_obj.modifiers.new(name='Decimate', type='DECIMATE')
    mod.ratio = 0.1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    
    # FIX SHATTERED NORMALS:
    # 1. Switch to edit mode, merge by distance to fix broken vertices
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles()
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # 2. Clear custom split normals that cause the black cracked shading
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
    
    # 3. Shade smooth
    bpy.ops.object.shade_smooth()
    
    # Unpack and convert textures
    bpy.ops.file.unpack_all(method='USE_LOCAL')
    for img in bpy.data.images:
        if img.has_data:
            img.file_format = 'PNG'
            old_path = img.filepath
            new_path = old_path.rsplit('.', 1)[0] + '.png'
            img.filepath = new_path
            img.save()
            if old_path.endswith('.webp') and os.path.exists(bpy.path.abspath(old_path)):
                os.remove(bpy.path.abspath(old_path))
                
    obj_path = os.path.join(work_dir, f"{name}.obj")
    if hasattr(bpy.ops.wm, 'obj_export'):
        bpy.ops.wm.obj_export(filepath=obj_path, export_materials=True, export_normals=True)
    else:
        bpy.ops.export_scene.obj(filepath=obj_path, use_materials=True, use_normals=True)
        
    zip_path = os.path.join(base_dir, f"{name}_Mixamo_Clean.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(work_dir):
            for file in files:
                if file.endswith('.blend') or file.endswith('.webp'): continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, work_dir)
                zipf.write(file_path, arcname)
                
    print(f"Created Clean ZIP for {name}")

decimate_and_zip("Fox", r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb", r"C:\Users\Migs\Desktop\Mixamo_Uploads")
