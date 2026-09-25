const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace ANY character inside `{studied ? "..." : idx + 1}`
content = content.replace(/\{studied \? "[^"]*" : idx \+ 1\}/g, '{studied ? "✓" : idx + 1}');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
