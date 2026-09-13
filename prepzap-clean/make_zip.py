import bpy
import os
import zipfile

def process_glb(name, glb_path):
    base_dir = r"C:\Users\Migs\Desktop\Mixamo_Uploads"
    work_dir = os.path.join(base_dir, name)
    os.makedirs(work_dir, exist_ok=True)
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # Save a temporary blend file so unpack_all creates textures in this folder
    blend_path = os.path.join(work_dir, "temp.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    
    bpy.ops.import_scene.gltf(filepath=glb_path)
    
    # Unpack textures
    bpy.ops.file.unpack_all(method='USE_LOCAL')
    
    # Export OBJ
    obj_path = os.path.join(work_dir, f"{name}.obj")
    
    # Check blender version for correct OBJ export operator
    if hasattr(bpy.ops.wm, 'obj_export'):
        bpy.ops.wm.obj_export(filepath=obj_path, export_materials=True)
    else:
        bpy.ops.export_scene.obj(filepath=obj_path, use_materials=True)
        
    # Zip everything
    zip_path = os.path.join(base_dir, f"{name}_Mixamo.zip")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(work_dir):
            for file in files:
                if file.endswith('.blend'): continue # Skip the temp blend file
                file_path = os.path.join(root, file)
                # Keep the 'textures' subfolder structure intact
                arcname = os.path.relpath(file_path, work_dir)
                zipf.write(file_path, arcname)
                
    print(f"Created ZIP for {name}")

process_glb("Fox", r"C:\Users\Migs\Desktop\FINISHED 3D\fox.glb")
