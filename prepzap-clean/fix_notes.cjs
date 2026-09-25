const fs = require('fs');
let content = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

content = content.replace(/loadContext/g, 'loadLibrary');

fs.writeFileSync('src/pages/NotesWorkspace.tsx', content, 'utf8');
