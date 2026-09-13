const { Document, NodeIO } = require('@gltf-transform/core');
const { prune } = require('@gltf-transform/functions');
const { EXTTextureWebP } = require('@gltf-transform/extensions');
const fs = require('fs');

async function fix() {
    const io = new NodeIO().registerExtensions([EXTTextureWebP]);
    const doc = await io.read('public/models/fox.glb');
    
    const root = doc.getRoot();
    
    root.listMeshes().forEach(m => {
        if (!m.getName().includes('unamed') && !m.getName().includes('TargetMesh')) {
             console.log("Disposing heavy mesh:", m.getName());
             root.listNodes().forEach(n => { if(n.getMesh() === m) n.dispose(); });
             m.dispose();
        } else {
             console.log("Keeping mesh:", m.getName());
        }
    });

    await doc.transform(prune());
    await io.write('public/models/fox.glb', doc);
    
    const buffer = fs.readFileSync('public/models/fox.glb');
    console.log("New size MB:", buffer.length / 1024 / 1024);
}
fix().catch(console.error);
