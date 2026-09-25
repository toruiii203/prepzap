const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/aut✓>/g, 'auto">');
  fs.writeFileSync(file, content, 'utf8');
}

fix('src/pages/Dashboard.tsx');
fix('src/pages/Flashcards.tsx');
