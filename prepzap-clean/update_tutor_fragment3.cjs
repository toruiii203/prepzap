const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

content = content.replace(/<div ref=\{messagesEndRef\} \/>\s*<\/div>\s*<\/>\s*\);\s*\}/, '<div ref={messagesEndRef} />\n      </div>\n    );\n  }');

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
