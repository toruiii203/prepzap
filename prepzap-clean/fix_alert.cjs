const fs = require('fs');
let c = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');
c = c.replace('alert("Failed to generate flashcards from your material. The AI returned an invalid format or timed out. Falling back to example deck.");', 'alert("Failed to generate flashcards. Error: " + String((err && err.message) ? err.message : err));');
fs.writeFileSync('src/pages/Flashcards.tsx', c);
