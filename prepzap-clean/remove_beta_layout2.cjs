const fs = require('fs');
let content = fs.readFileSync('src/pages/StudeniusLayout.tsx', 'utf8');

const regex = /<span\s*className="text-\[10px\] font-black px-1\.5 py-0\.5 rounded bg-\[\#ae2925\] text-white tracking-wider"\s*>\s*BETA\s*<\/span>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/pages/StudeniusLayout.tsx', content, 'utf8');
