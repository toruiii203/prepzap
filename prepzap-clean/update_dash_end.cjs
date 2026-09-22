const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace('    </div>\n  );\n}', '    </div>\n    </>\n  );\n}');
fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
