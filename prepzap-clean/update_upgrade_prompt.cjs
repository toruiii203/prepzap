const fs = require('fs');
let content = fs.readFileSync('src/components/UpgradePrompt.tsx', 'utf8');
content = content.replace('"AI Tutor message"', '"Rex Tutor message"');
fs.writeFileSync('src/components/UpgradePrompt.tsx', content, 'utf8');
