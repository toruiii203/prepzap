const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<div style=\{\{\s*position:\s*"fixed",\s*inset:\s*0,\s*background:\s*"var\(--pz-bg,\s*#160810\)",\s*display:\s*"flex",\s*alignItems:\s*"center",\s*justifyContent:\s*"center",\s*zIndex:\s*9999\s*\}\}>\s*<img src="\/icon-512\.png"[^>]+>\s*<\/div>/;

content = content.replace(regex, '<div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#FAF7F2" }}><AppSkeleton /></div>');

fs.writeFileSync('src/App.tsx', content, 'utf8');
