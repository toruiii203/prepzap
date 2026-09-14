const fs = require('fs');
let file = fs.readFileSync('src/components/TiptapEditor.tsx', 'utf8');

file = `import { callGroq } from "@/lib/groq";\n` + file;

file = file.replace('export default function TiptapEditor({ initialContent, onUpdate }: TiptapEditorProps) {', 'export default function TiptapEditor({ initialContent, onUpdate }: TiptapEditorProps) {\n  const [aiLoading, setAiLoading] = useState<string | null>(null);');

const oldBubble = `<BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex flex-col bg-white border-2 border-black shadow-[4px_4px_0px_#000] rounded-lg overflow-hidden min-w-[150px]">
        <div className="bg-[#f0a040] text-black text-[10px] font-black uppercase px-2 py-1 border-b-2 border-black">AI Commands</div>
        <button className="px-3 py-2 text-left font-bold text-[13px] hover:bg-black hover:text-white transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">short_text</span> /ai summarize
        </button>
        <button className="px-3 py-2 text-left font-bold text-[13px] hover:bg-black hover:text-white transition-colors flex items-center gap-2 border-t-2 border-black">
          <span className="material-symbols-outlined text-[16px]">psychology</span> /ai explain
        </button>
        <button className="px-3 py-2 text-left font-bold text-[13px] hover:bg-black hover:text-white transition-colors flex items-center gap-2 border-t-2 border-black">
          <span className="material-symbols-outlined text-[16px]">style</span> /ai flashcards
        </button>
      </BubbleMenu>`;

const newBubble = `
  const handleAI = async (action: 'summarize' | 'explain') => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    setAiLoading(action);
    try {
      const prompt = action === 'summarize' 
        ? \`Summarize this text in 1-2 short bullet points:\\n\\n\${selectedText}\`
        : \`Explain this text simply as if to a beginner:\\n\\n\${selectedText}\`;
        
      const response = await callGroq([{ role: "user", content: prompt }], "You are a helpful study assistant. Output ONLY the requested explanation/summary using clean markdown. Keep it very concise.", "openai/gpt-oss-20b", 500, "notes_ai");
      
      editor.chain().focus().insertContentAt(to, \`<blockquote><strong>🤖 AI \${action === 'summarize' ? 'Summary' : 'Explanation'}:</strong><br/>\${response.replace(/\\n/g, '<br/>')}</blockquote><p></p>\`).run();
    } catch (err) {
      alert("AI failed to respond.");
    } finally {
      setAiLoading(null);
    }
  };

  const handleFlashcards = () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    localStorage.setItem("qs_practice_export", JSON.stringify(selectedText));
    window.location.href = "/quick-study";
  };

<BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex flex-col bg-white border-2 border-black shadow-[4px_4px_0px_#000] rounded-lg overflow-hidden min-w-[150px]">
        <div className="bg-[#f0a040] text-black text-[10px] font-black uppercase px-2 py-1 border-b-2 border-black">AI Commands</div>
        <button disabled={aiLoading !== null} onClick={() => handleAI('summarize')} className="px-3 py-2 text-left font-bold text-[13px] hover:bg-black hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">short_text</span> {aiLoading === 'summarize' ? 'Thinking...' : '/ai summarize'}
        </button>
        <button disabled={aiLoading !== null} onClick={() => handleAI('explain')} className="px-3 py-2 text-left font-bold text-[13px] hover:bg-black hover:text-white transition-colors flex items-center gap-2 border-t-2 border-black disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">psychology</span> {aiLoading === 'explain' ? 'Thinking...' : '/ai explain'}
        </button>
        <button disabled={aiLoading !== null} onClick={handleFlashcards} className="px-3 py-2 text-left font-bold text-[13px] hover:bg-black hover:text-white transition-colors flex items-center gap-2 border-t-2 border-black disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">style</span> /ai flashcards
        </button>
      </BubbleMenu>
`;

file = file.replace(oldBubble, newBubble);
fs.writeFileSync('src/components/TiptapEditor.tsx', file);
