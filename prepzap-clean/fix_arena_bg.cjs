const fs = require('fs');
const files = [
  'src/pages/Arena.tsx',
  'src/pages/ArenaQuiz.tsx',
  'src/pages/ArenaResults.tsx',
  'src/pages/ArenaRoom.tsx',
  'src/pages/ArenaInvite.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/bg-\[#f5f0e8\]/g, 'bg-[#FAF7F2]');
    fs.writeFileSync(file, content, 'utf8');
  }
});
