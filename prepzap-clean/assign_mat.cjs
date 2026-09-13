const { Document, NodeIO } = require('@gltf-transform/core');
const { prune } = require('@gltf-transform/functions');
const { EXTTextureWebP } = require('@gltf-transform/extensions');
const fs = require('fs');

async function fix() {
    const io = new NodeIO().registerExtensions([EXTTextureWebP]);
    const doc = await io.read('public/models/fox.glb');
    
    const root = doc.getRoot();
    
    // Assign the material to unamedmesh BEFORE disposing the heavy mesh!
    const unamedMesh = root.listMeshes().find(m => m.getName() === 'unamedmesh');
    const heavyMesh = root.listMeshes().find(m => m.getName() === 'geometry_0.007');
    
    if (unamedMesh && heavyMesh) {
        const mat = heavyMesh.listPrimitives()[0].getMaterial();
        if (mat) {
             unamedMesh.listPrimitives()[0].setMaterial(mat);
             console.log("Assigned material to unamedmesh!");
        }
    }
    
    root.listMeshes().forEach(m => {
        if (m !== unamedMesh) {
             console.log("Disposing heavy mesh:", m.getName());
             root.listNodes().forEach(n => { if(n.getMesh() === m) n.dispose(); });
             m.dispose();
        }
    });

    await doc.transform(prune());
    await io.write('public/models/fox.glb', doc);
    
    const buffer = fs.readFileSync('public/models/fox.glb');
    console.log("New size MB:", buffer.length / 1024 / 1024);
}
fix().catch(console.error);
