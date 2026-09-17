const fs = require('fs');
let content = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

const targetEffect = /    \/\/ Count-up stats\s*useEffect\(\(\) => \{[\s\S]*?\}\, \[\]\);/g;
content = content.replace(targetEffect, '');

fs.writeFileSync('src/pages/Landing.tsx', content, 'utf8');
