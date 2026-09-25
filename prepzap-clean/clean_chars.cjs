const fs = require('fs');

function cleanBadChars(file) {
  let content = fs.readFileSync(file, 'utf8');
  // Replace the PRO bad string
  content = content.replace(/PRO [^<]+/g, 'PRO ✨');
  
  // Replace the mobile calendar checkmark bad string
  content = content.replace(/\{studied \? "[^"]+" : idx \+ 1\}/g, '{studied ? "✓" : idx + 1}');
  
  // Replace the flashcards "All caught up" bad string
  content = content.replace(/"All caught up! [^"]+"/g, '"All caught up! 🏆"');
  
  fs.writeFileSync(file, content, 'utf8');
}

cleanBadChars('src/pages/Dashboard.tsx');
try { cleanBadChars('src/pages/Flashcards.tsx'); } catch(e) {}
