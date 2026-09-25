const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');

content = content.replace(/aut✓>/g, 'auto">');

fs.writeFileSync('src/pages/Flashcards.tsx', content, 'utf8');
