const fs = require('fs');
let content = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

const importLines = `import { loadContext } from "@/lib/sourceContext";\n`;
if (!content.includes('loadContext')) {
    content = content.replace(`import TiptapEditor from "@/components/TiptapEditor";`, `import TiptapEditor from "@/components/TiptapEditor";\n${importLines}`);
}

const effectSearch = `setNotes(data || []);
        if (data && data.length > 0) setActiveNote(data[0]);`;
        
const effectReplace = `setNotes(data || []);
        if (data && data.length > 0) setActiveNote(data[0]);
        
        // Populate global links for Tiptap Mention (Note Linking)
        const sources = loadContext();
        const availableLinks = [
          ...(data || []).map(n => ({ id: n.id, label: n.title || "Untitled", type: "note" })),
          ...sources.map((s: any) => ({ id: s.id, label: s.name, type: "source" }))
        ];
        (window as any)._availableLinks = availableLinks;`;
        
content = content.replace(effectSearch, effectReplace);

fs.writeFileSync('src/pages/NotesWorkspace.tsx', content, 'utf8');
