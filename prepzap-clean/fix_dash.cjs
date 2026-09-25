const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace('export default \nconst formatDuration', 'const formatDuration');
fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
