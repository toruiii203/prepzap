const fs = require('fs');
let content = fs.readFileSync('src/lib/tutorialContent.ts', 'utf8');

content = content.replace('"/arcade": [', ',\n  "/arcade": [');

fs.writeFileSync('src/lib/tutorialContent.ts', content, 'utf8');
