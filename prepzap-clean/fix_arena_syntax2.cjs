const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

content = content.replace(/<\/div>\s*\);\s*}\s*<\/div>\s*$/, '    </div>\n    </div>\n  );\n}\n');

fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
