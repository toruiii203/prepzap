const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');
content = content.replace(/withTimeout\(query, 8000/g, 'withTimeout(query, 4000');
fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
