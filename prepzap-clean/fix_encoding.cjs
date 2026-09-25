const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/âœ“/g, '✓');
  content = content.replace(/ÂŒ¦/g, '✨'); // Maybe?
  content = content.replace(/PRO o/g, 'PRO ✨');
  content = content.replace(/o"/g, '✓');
  content = content.replace(/dYZ%/g, '🏆');
  fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/pages/Dashboard.tsx');
try { fixFile('src/pages/Flashcards.tsx'); } catch(e) {}
try { fixFile('src/components/Header.tsx'); } catch(e) {}
