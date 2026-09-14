const fs = require('fs');
let content = fs.readFileSync('src/pages/TeachIt.tsx', 'utf8');
content = content.replace(/AI Tutor: Active/ig, 'Rex: Active');
fs.writeFileSync('src/pages/TeachIt.tsx', content, 'utf8');
console.log("Fixed TeachIt casing");
