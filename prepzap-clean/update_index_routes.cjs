const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

content = content.replace(
  "var a = ['/dashboard', '/notes', '/ai-tutor', '/flashcards', '/practice', '/timer', '/planner', '/math', '/teach-it', '/quick-study', '/sources', '/mistakes', '/analytics', '/challenges'];",
  "var a = ['/dashboard', '/notes', '/ai-tutor', '/flashcards', '/practice', '/timer', '/planner', '/math', '/teach-it', '/quick-study', '/sources', '/mistakes', '/analytics', '/challenges', '/arena'];"
);

fs.writeFileSync('index.html', content, 'utf8');
