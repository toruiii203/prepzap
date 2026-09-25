const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace(/\/pr✓\)/g, '/pro")');
fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
