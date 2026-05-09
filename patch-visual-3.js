const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/VisualLearner.tsx', 'utf8');

// Fix syntax error in SceneCard conditionally rendering img vs svg
code = code.replace(
  '        ) : scene.photoUrl ? (\n          {scene.svgContent ? <div dangerouslySetInnerHTML={{ __html: scene.svgContent }} style={{ width: "100%", height: "100%", display: "block", background: "#160810" }} /> : scene.photoUrl ? <img src={scene.photoUrl} alt={scene.photoAlt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : null}\n        ) : (',
  '        ) : scene.svgContent ? (\n          <div dangerouslySetInnerHTML={{ __html: scene.svgContent }} style={{ width: "100%", height: "100%", display: "block", background: "#160810" }} />\n        ) : scene.photoUrl ? (\n          <img src={scene.photoUrl} alt={scene.photoAlt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />\n        ) : ('
);

fs.writeFileSync('prepzap-clean/src/pages/VisualLearner.tsx', code);
