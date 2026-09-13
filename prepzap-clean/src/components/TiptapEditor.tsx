import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { callGroq } from "@/lib/groq";

interface TiptapEditorProps {
  initialContent: string;
  onUpdate: (html: string) => void;
}

export default function TiptapEditor({ initialContent, onUpdate }: TiptapEditorProps) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Type '/' for commands, '[[' to link notes...",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base focus:outline-none min-h-[400px] max-w-full px-4 py-2",
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor]);

  const handleAI = async (action: 'summarize' | 'explain') => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    setAiLoading(action);
    try {
      const prompt = action === 'summarize' 
        ? `Summarize this text in 1-2 short bullet points:\n\n${selectedText}`
        : `Explain this text simply as if to a beginner:\n\n${selectedText}`;
        
      const response = await callGroq([{ role: "user", content: prompt }], "You are a helpful study assistant. Output ONLY the requested explanation/summary using clean markdown. Keep it very concise.", "openai/gpt-oss-20b", 500, "notes_ai");
      
      editor.chain().focus().insertContentAt(to, `<blockquote><strong>🤖 AI ${action === 'summarize' ? 'Summary' : 'Explanation'}:</strong><br/>${response.replace(/\n/g, '<br/>')}</blockquote><p></p>`).run();
    } catch (err) {
      alert("AI failed to respond.");
    } finally {
      setAiLoading(null);
    }
  };

  const handleFlashcards = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    localStorage.setItem("qs_practice_export", JSON.stringify(selectedText));
    window.location.href = "/quick-study";
  };

  if (!editor) return null;

  return (
    <div className="w-full relative bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_#000]">
      <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-lg overflow-hidden">
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="px-3 py-1.5 font-black hover:bg-black hover:text-white transition-colors text-[13px]">H1</button>
        <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="px-3 py-1.5 font-black hover:bg-black hover:text-white transition-colors text-[13px] border-l-2 border-black">H2</button>
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className="px-3 py-1.5 font-black hover:bg-black hover:text-white transition-colors text-[13px] border-l-2 border-black">• List</button>
      </FloatingMenu>

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

      <EditorContent editor={editor} className="w-full p-4" />
    </div>
  );
}
