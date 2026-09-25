const fs = require('fs');
let content = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

const additionalEffect = `  useEffect(() => {
    const sources = loadContext();
    (window as any)._availableLinks = [
      ...notes.map(n => ({ id: n.id, label: n.title || "Untitled", type: "note" })),
      ...sources.map((s: any) => ({ id: s.id, label: s.name, type: "source" }))
    ];
  }, [notes]);

  const handleCreateNote = async () => {`;
  
content = content.replace(`  const handleCreateNote = async () => {`, additionalEffect);
fs.writeFileSync('src/pages/NotesWorkspace.tsx', content, 'utf8');
