import bpy
import os
import zipfile

def decimate_and_zip(name, glb_path, base_dir):
    work_dir = os.path.join(base_dir, f"{name}_LowPoly")
    os.makedirs(work_dir, exist_ok=True)
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    blend_path = os.path.join(work_dir, "temp.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    
    bpy.ops.import_scene.gltf(filepath=glb_path)
    
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
                
    # Decimate the mesh
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            mod = obj.modifiers.new(name='Decimate', type='DECIMATE')
            # Reduce to 10% of original (623k -> 62k)
            mod.ratio = 0.05
            bpy.ops.object.modifier_apply(modifier=mod.name)
            
    obj_path = os.path.join(work_dir, f"{name}.obj")
    if hasattr(bpy.ops.wm, 'obj_export'):
        bpy.ops.wm.obj_export(filepath=obj_path, export_materials=True)
    else:
        bpy.ops.export_scene.obj(filepath=obj_path, use_materials=True)
        
    zip_path = os.path.join(base_dir, f"{name}_Mixamo_LowPoly.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(work_dir):
            for file in files:
                if file.endswith('.blend') or file.endswith('.webp'): continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, work_dir)
                zipf.write(file_path, arcname)
                
    print(f"Created LowPoly ZIP for {name}")

decimate_and_zip("Fox", r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb", r"C:\Users\Migs\Desktop\Mixamo_Uploads")
