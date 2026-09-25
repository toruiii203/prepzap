const fs = require('fs');
let content = fs.readFileSync('src/pages/Challenges.tsx', 'utf8');
content = content.replace(/"arcade-play"/g, '"arcade_game"');
fs.writeFileSync('src/pages/Challenges.tsx', content, 'utf8');
