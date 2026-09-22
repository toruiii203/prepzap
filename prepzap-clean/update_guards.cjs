const fs = require('fs');

['src/pages/arcade/MemoryMatch.tsx', 'src/pages/arcade/TrueFalseBlitz.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    'async function loadGame() {',
    'async function loadGame() {\n      if (!user) return;'
  );
  fs.writeFileSync(file, content, 'utf8');
});
