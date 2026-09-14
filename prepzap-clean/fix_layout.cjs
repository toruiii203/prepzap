const fs = require('fs');
let ws = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

ws = ws.replace(
  '<div className="flex-1 flex overflow-hidden">',
  '<div className="flex-1 flex overflow-hidden md:ml-64 pb-16 md:pb-0">'
);
fs.writeFileSync('src/pages/NotesWorkspace.tsx', ws);
