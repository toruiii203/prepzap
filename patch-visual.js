const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/VisualLearner.tsx', 'utf8');

// 1. Remove DOMPurify import
code = code.replace("import DOMPurify from 'dompurify';\n", "");

// 2. Add function to generate SVG illustrations using Groq
const svgGeneratorFunc = `
async function fetchSceneSVG(concept: string, scene: Scene, model: string): Promise<string> {
  const prompt = \`Generate a self-contained inline SVG illustration for a scene about "\${concept}".
Scene title: \${scene.title}
Visual style: Flat vector illustration, simple shapes, clear and educational.
Colors: Use a palette based on maroon (#8b1a2a), gold (#f0a040), off-white (#f5ede8), and very dark backgrounds (#160810, #1f0b13).
IMPORTANT: Return ONLY the raw <svg>...</svg> tag as a string. No markdown formatting, no code blocks, no explanations.
The SVG must have viewBox="0 0 400 300" and width="100%" height="100%".\`;

  try {
    const res = await callGroq(prompt, {
      model,
      systemPrompt: "You are an expert technical illustrator capable of writing clean, semantic, scalable inline SVG code directly."
    });
    const content = res.choices[0]?.message?.content || "";
    const svgMatch = content.match(/<svg[\\s\\S]*?<\\/svg>/i);
    if (svgMatch) return svgMatch[0];
    return \`<svg width="100%" height="100%" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="#1f0b13"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#555">SVG Generation Failed</text></svg>\`;
  } catch (err) {
    return \`<svg width="100%" height="100%" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="#1f0b13"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ef4444">Error loading SVG</text></svg>\`;
  }
}
`;

// Replace fetchScenePhoto and wikimedia logic with fetchSceneSVG
code = code.replace(/async function fetchScenePhoto[\s\S]*?(?=\/\/ ── State)/, svgGeneratorFunc + '\n');

// Update usage in handleGenerate
code = code.replace(
  'const photo = await fetchScenePhoto(parsed.concept, scene)',
  'const svgData = await fetchSceneSVG(parsed.concept, scene, model)'
);
code = code.replace(
  'photoUrl: photo.url, photoAlt: photo.alt, photoLoading: false',
  'svgContent: svgData, photoLoading: false'
);

// Update SceneWithPhoto interface
code = code.replace(
  /export interface SceneWithPhoto extends Scene \{[\s\S]*?\}/,
  `export interface SceneWithPhoto extends Scene {\n  svgContent?: string\n  photoUrl?: string\n  photoAlt?: string\n  photoLoading: boolean\n}`
);

// Remove handleImgError entirely
code = code.replace(/const handleImgError \= [\s\S]*?(?=\n\n  return \()/, '');

// Replace img tag with SVG content in SceneCard
code = code.replace(
  /<img[\s\S]*?onError=\{handleImgError\}[\s\S]*?\/\>/,
  `{scene.svgContent ? <div dangerouslySetInnerHTML={{ __html: scene.svgContent }} style={{ width: "100%", height: "100%", display: "block" }} /> : <img src={scene.photoUrl} alt={scene.photoAlt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}`
);

// Update history saving state
code = code.replace(
  'const entry = { url: scene.photoUrl!, concept, anchor: scene.anchorPhrase, savedAt: new Date().toISOString() };',
  'const entry = { url: scene.svgContent ? "data:image/svg+xml;utf8," + encodeURIComponent(scene.svgContent) : scene.photoUrl!, concept, anchor: scene.anchorPhrase, savedAt: new Date().toISOString() };'
);
code = code.replace(
  'const updated = [entry, ...prev.filter(s => s.url !== scene.photoUrl)];',
  'const updated = [entry, ...prev.filter(s => s.url !== (scene.svgContent ? "data:image/svg+xml;utf8," + encodeURIComponent(scene.svgContent) : scene.photoUrl))];'
);


fs.writeFileSync('prepzap-clean/src/pages/VisualLearner.tsx', code);
