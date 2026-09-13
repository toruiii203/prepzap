const fs = require('fs');
let ws = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

if (!ws.includes('import KnowledgeGraph')) {
  ws = ws.replace(
    'import TiptapEditor from "@/components/TiptapEditor";',
    'import TiptapEditor from "@/components/TiptapEditor";\nimport KnowledgeGraph from "@/components/KnowledgeGraph";'
  );
}

if (!ws.includes('showGraph')) {
  ws = ws.replace(
    'const [loading, setLoading] = useState(true);',
    'const [loading, setLoading] = useState(true);\n  const [showGraph, setShowGraph] = useState(false);'
  );
}

ws = ws.replace(
  '<h2 className="font-black text-[16px]">My Notes</h2>',
  '<h2 className="font-black text-[16px]">My Notes</h2>\n            <button onClick={() => setShowGraph(!showGraph)} className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg hover:bg-[#FF4D2E] hover:text-white transition-colors ml-auto mr-2" title="Toggle Knowledge Graph">\n              <span className="material-symbols-outlined text-[18px]">hub</span>\n            </button>'
);

const oldEditorArea = `        {/* Right Area - Editor */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAF7F2]">
          {activeNote ? (`;

const newEditorArea = `        {/* Right Area - Editor */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#FAF7F2]">
          {showGraph ? (
            <div className="flex-1 p-8">
              <KnowledgeGraph onNodeClick={(id) => {
                const note = notes.find(n => n.id === id);
                if (note) {
                  setActiveNote(note);
                  setShowGraph(false);
                }
              }} />
            </div>
          ) : activeNote ? (`;

ws = ws.replace(oldEditorArea, newEditorArea);
fs.writeFileSync('src/pages/NotesWorkspace.tsx', ws);
