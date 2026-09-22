const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

const regex1 = /\{\/\*.*?Mobile header.*?\*\/\}\s*<header className="md:hidden[\s\S]*?<\/header>/;
const regex2 = /\{\/\*.*?Desktop header.*?\*\/\}\s*<header className="hidden md:flex[\s\S]*?<\/header>/;

content = content.replace(regex1, '');
content = content.replace(regex2, '');

fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
