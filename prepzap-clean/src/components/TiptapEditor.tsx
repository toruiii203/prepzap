import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import suggestion from "./suggestion";

import { callGroq } from "@/lib/groq";

interface TiptapEditorProps {
  initialContent: string;
  onUpdate: (html: string) => void;
}

export default function TiptapEditor({ initialContent, onUpdate }: TiptapEditorProps) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showVisualMenu, setShowVisualMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TableKit.configure({
        resizable: true,
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "mention inline-block px-1.5 py-0.5 rounded-md bg-[#e3e8f8] border-2 border-[#1c1c19] text-[#1e3a8a] font-bold shadow-[2px_2px_0px_#1c1c19] mx-1 cursor-pointer hover:bg-[#dbeafe] transition-colors",
        },
        suggestion: {
          ...suggestion,
          char: "[[",
        },
      }),
      Placeholder.configure({
        placeholder: "Type your notes, insert tables, diagrams, or type '[[' to link concepts...",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base focus:outline-none min-h-[460px] max-w-full px-6 py-4 select-text",
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent, false);
    }
  }, [initialContent, editor]);

  const handleAI = async (action: "summarize" | "explain") => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    setAiLoading(action);
    try {
      const prompt =
        action === "summarize"
          ? `Summarize this text in 2-3 high-yield bullet points:\n\n${selectedText}`
          : `Explain this text simply as if teaching a beginner, using a concrete analogy:\n\n${selectedText}`;

      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are an encouraging, precise study mentor. Output ONLY clean, concise notes.",
        "openai/gpt-oss-20b",
        500,
        "notes_ai"
      );

      const calloutHtml = `
        <div style="margin: 16px 0; padding: 14px 16px; background: #FAF7F2; border: 2.5px solid #111; border-radius: 12px; box-shadow: 3px 3px 0 #111;">
          <div style="font-weight: 900; font-size: 13px; color: #111; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>${action === "summarize" ? "📋" : "💡"}</span>
            <span>${action === "summarize" ? "Key Summary" : "Concept Breakdown"}</span>
          </div>
          <div style="font-size: 13px; color: #333; line-height: 1.5;">${response.replace(/\n/g, "<br/>")}</div>
        </div>
        <p></p>
      `;

      editor.chain().focus().insertContentAt(to, calloutHtml).run();
    } catch (err) {
      alert("AI assistant could not respond.");
    } finally {
      setAiLoading(null);
    }
  };

  const handleFlashcards = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    localStorage.setItem("qs_practice_export", JSON.stringify(selectedText));
    window.location.href = "/flashcards";
  };

  // Visual Blocks & Shape Inserters
  const insertProcessFlow = () => {
    if (!editor) return;
    const html = `
      <div class="diagram-flow" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:22px 0;padding:16px;background:#FAF7F2;border:2.5px solid #111;border-radius:16px;box-shadow:3px 3px 0 #111;flex-wrap:wrap;">
        <div style="flex:1 1 120px;background:#fff;border:2px solid #111;border-radius:12px;padding:12px;text-align:center;box-shadow:2px 2px 0 #111;">
          <span style="display:inline-block;font-size:10px;font-weight:900;text-transform:uppercase;color:#10B981;letter-spacing:1px;margin-bottom:2px;">Step 1</span>
          <div style="font-weight:800;font-size:14px;color:#111;">Input / Stimulus</div>
          <p style="margin:4px 0 0;font-size:12px;color:#666;">Initial trigger or condition</p>
        </div>
        <div style="font-size:22px;font-weight:900;color:#111;display:flex;align-items:center;">➔</div>
        <div style="flex:1 1 120px;background:#fff;border:2px solid #111;border-radius:12px;padding:12px;text-align:center;box-shadow:2px 2px 0 #111;">
          <span style="display:inline-block;font-size:10px;font-weight:900;text-transform:uppercase;color:#3B82F6;letter-spacing:1px;margin-bottom:2px;">Step 2</span>
          <div style="font-weight:800;font-size:14px;color:#111;">Core Mechanism</div>
          <p style="margin:4px 0 0;font-size:12px;color:#666;">Processing or reaction</p>
        </div>
        <div style="font-size:22px;font-weight:900;color:#111;display:flex;align-items:center;">➔</div>
        <div style="flex:1 1 120px;background:#fff;border:2px solid #111;border-radius:12px;padding:12px;text-align:center;box-shadow:2px 2px 0 #111;">
          <span style="display:inline-block;font-size:10px;font-weight:900;text-transform:uppercase;color:#EC4899;letter-spacing:1px;margin-bottom:2px;">Step 3</span>
          <div style="font-weight:800;font-size:14px;color:#111;">Final Outcome</div>
          <p style="margin:4px 0 0;font-size:12px;color:#666;">Resulting state</p>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertCycleLoop = () => {
    if (!editor) return;
    const html = `
      <div class="diagram-cycle" style="margin:22px 0;padding:18px;background:#F0FDF4;border:2.5px solid #111;border-radius:16px;box-shadow:3px 3px 0 #111;">
        <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#10B981;margin-bottom:12px;text-align:center;">Cyclic Feedback Diagram</div>
        <div style="display:flex;justify-content:space-around;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="background:#fff;border:2px solid #111;border-radius:10px;padding:8px 14px;text-align:center;box-shadow:2px 2px 0 #111;font-weight:800;font-size:13px;">1. Trigger</div>
          <span style="font-weight:900;font-size:18px;">➔</span>
          <div style="background:#fff;border:2px solid #111;border-radius:10px;padding:8px 14px;text-align:center;box-shadow:2px 2px 0 #111;font-weight:800;font-size:13px;">2. Synthesis</div>
          <span style="font-weight:900;font-size:18px;">➔</span>
          <div style="background:#fff;border:2px solid #111;border-radius:10px;padding:8px 14px;text-align:center;box-shadow:2px 2px 0 #111;font-weight:800;font-size:13px;">3. Response</div>
          <span style="font-weight:900;font-size:18px;">➔</span>
          <div style="background:#fff;border:2px solid #111;border-radius:10px;padding:8px 14px;text-align:center;box-shadow:2px 2px 0 #111;font-weight:800;font-size:13px;">4. Reset</div>
          <span style="font-weight:900;font-size:18px;">↺</span>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertComparisonShapes = () => {
    if (!editor) return;
    const html = `
      <div class="diagram-comparison" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin:22px 0;">
        <div style="background:#F0FDF4;border:2.5px solid #111;border-radius:14px;padding:16px;box-shadow:3px 3px 0 #111;">
          <div style="font-size:15px;font-weight:900;margin-bottom:8px;color:#15803D;display:flex;align-items:center;gap:6px;">
            <span>🟢</span> Concept A: [e.g. Mitosis]
          </div>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#111;">
            <li>Occurs in somatic cells</li>
            <li>Produces 2 identical daughter cells</li>
            <li>Diploid output (2n)</li>
          </ul>
        </div>
        <div style="background:#FAF5FF;border:2.5px solid #111;border-radius:14px;padding:16px;box-shadow:3px 3px 0 #111;">
          <div style="font-size:15px;font-weight:900;margin-bottom:8px;color:#7E22CE;display:flex;align-items:center;gap:6px;">
            <span>🟣</span> Concept B: [e.g. Meiosis]
          </div>
          <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#111;">
            <li>Occurs in germ cells (gametes)</li>
            <li>Produces 4 genetically varied cells</li>
            <li>Haploid output (1n)</li>
          </ul>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertDecisionTree = () => {
    if (!editor) return;
    const html = `
      <div class="diagram-decision" style="margin:22px 0;padding:18px;background:#FFFBEB;border:2.5px solid #111;border-radius:16px;box-shadow:3px 3px 0 #111;">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="display:inline-block;background:#FFE566;border:2px solid #111;border-radius:10px;padding:8px 18px;font-weight:900;font-size:14px;box-shadow:2px 2px 0 #111;">
            ❓ Condition / Test: [Is condition met?]
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          <div style="background:#fff;border:2px solid #111;border-radius:10px;padding:12px;box-shadow:2px 2px 0 #111;">
            <span style="font-weight:900;font-size:12px;color:#15803D;text-transform:uppercase;">✓ IF YES:</span>
            <div style="font-weight:800;font-size:13px;margin-top:2px;">Execute Procedure A</div>
            <p style="margin:2px 0 0;font-size:11px;color:#666;">Direct consequence or branch</p>
          </div>
          <div style="background:#fff;border:2px solid #111;border-radius:10px;padding:12px;box-shadow:2px 2px 0 #111;">
            <span style="font-weight:900;font-size:12px;color:#B91C1C;text-transform:uppercase;">✗ IF NO:</span>
            <div style="font-weight:800;font-size:13px;margin-top:2px;">Execute Procedure B</div>
            <p style="margin:2px 0 0;font-size:11px;color:#666;">Fallback or alternative loop</p>
          </div>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertKeyCallout = () => {
    if (!editor) return;
    const html = `
      <div class="callout-key" style="display:flex;gap:12px;align-items:flex-start;margin:18px 0;padding:14px 16px;background:#ECFDF5;border:2.5px solid #111;border-radius:12px;box-shadow:3px 3px 0 #111;">
        <span style="font-size:22px;line-height:1;">📌</span>
        <div style="flex:1;">
          <strong style="font-size:14px;display:block;margin-bottom:2px;color:#065F46;">Core Principle & Definition</strong>
          <span style="font-size:13px;color:#111;line-height:1.5;">Define the primary law, rule, or high-yield concept here...</span>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertExamAlert = () => {
    if (!editor) return;
    const html = `
      <div class="callout-alert" style="display:flex;gap:12px;align-items:flex-start;margin:18px 0;padding:14px 16px;background:#FEF2F2;border:2.5px solid #111;border-radius:12px;box-shadow:3px 3px 0 #111;">
        <span style="font-size:22px;line-height:1;">⚠️</span>
        <div style="flex:1;">
          <strong style="font-size:14px;display:block;margin-bottom:2px;color:#991B1B;">Exam Trap / Common Pitfall</strong>
          <span style="font-size:13px;color:#111;line-height:1.5;">Explain the deceptive trick or misconception frequently tested on exams...</span>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertFormulaBox = () => {
    if (!editor) return;
    const html = `
      <div class="callout-formula" style="margin:18px 0;padding:14px 18px;background:#EFF6FF;border:2.5px solid #111;border-radius:12px;box-shadow:3px 3px 0 #111;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#1D4ED8;">Formula / Equation</span>
          <span style="font-size:14px;">📐</span>
        </div>
        <div style="font-family:monospace;font-size:16px;font-weight:800;color:#1E3A8A;background:#fff;border:2px solid #111;border-radius:8px;padding:8px 12px;box-shadow:2px 2px 0 #111;margin-bottom:6px;">
          E = mc² &nbsp;|&nbsp; F = ma &nbsp;|&nbsp; a² + b² = c²
        </div>
        <p style="margin:0;font-size:12px;color:#555;">Where: [Define each variable and standard SI units]</p>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  const insertMetricChart = () => {
    if (!editor) return;
    const html = `
      <div class="callout-chart" style="margin:20px 0;padding:16px;background:#fff;border:2.5px solid #111;border-radius:14px;box-shadow:3px 3px 0 #111;">
        <div style="font-size:13px;font-weight:900;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
          <span>📊</span> Visual Metric & Ratio Breakdown
        </div>
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:4px;">
            <span>Primary Factor A</span>
            <span>70%</span>
          </div>
          <div style="width:100%;height:14px;background:#F3F4F6;border:2px solid #111;border-radius:9999px;overflow:hidden;">
            <div style="width:70%;height:100%;background:#10B981;"></div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:4px;">
            <span>Secondary Factor B</span>
            <span>30%</span>
          </div>
          <div style="width:100%;height:14px;background:#F3F4F6;border:2px solid #111;border-radius:9999px;overflow:hidden;">
            <div style="width:30%;height:100%;background:#3B82F6;"></div>
          </div>
        </div>
      </div>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowVisualMenu(false);
  };

  // Table Helpers
  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const insertComparisonTable = () => {
    if (!editor) return;
    const html = `
      <table>
        <thead>
          <tr>
            <th>Feature / Metric</th>
            <th>Concept A</th>
            <th>Concept B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Definition</strong></td>
            <td>Main principle A</td>
            <td>Main principle B</td>
          </tr>
          <tr>
            <td><strong>Key Advantage</strong></td>
            <td>High speed, low complexity</td>
            <td>High accuracy, resilience</td>
          </tr>
          <tr>
            <td><strong>Best Used For</strong></td>
            <td>Rapid prototyping</td>
            <td>Production reliability</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowTableMenu(false);
  };

  const insertVocabTable = () => {
    if (!editor) return;
    const html = `
      <table>
        <thead>
          <tr>
            <th>Term / Concept</th>
            <th>Core Definition</th>
            <th>Example / Memory Hook</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>[Enter Term 1]</strong></td>
            <td>Plain language explanation</td>
            <td>Analogy or mnemonic</td>
          </tr>
          <tr>
            <td><strong>[Enter Term 2]</strong></td>
            <td>Plain language explanation</td>
            <td>Analogy or mnemonic</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    editor.chain().focus().insertContent(html).run();
    setShowTableMenu(false);
  };

  if (!editor) return null;

  const isTableActive = editor.can().deleteTable();

  return (
    <div className="w-full relative bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_#000]">
      <style>{`
        .tiptap table {
          border-collapse: collapse;
          margin: 1.5rem 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
          border: 2.5px solid #111111;
          border-radius: 12px;
          box-shadow: 3px 3px 0px #111111;
          background: #ffffff;
        }
        .tiptap table td,
        .tiptap table th {
          border: 1.5px solid #111111;
          box-sizing: border-box;
          min-width: 1em;
          padding: 10px 14px;
          position: relative;
          vertical-align: top;
        }
        .tiptap table th {
          background-color: #FFE566;
          font-weight: 900;
          text-align: left;
          color: #111111;
        }
        .tiptap table .selectedCell:after {
          background: rgba(16, 185, 129, 0.15);
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
      `}</style>

      {/* ── Studio Top Toolbar ── */}
      <div className="bg-[#FAF7F2] border-b-2 border-black px-3 py-2 flex flex-wrap items-center gap-1.5 select-none">
        {/* Headings */}
        <div className="flex items-center bg-white border border-black rounded-lg overflow-hidden shadow-[1px_1px_0px_#000]">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-2.5 py-1 text-[12px] font-black transition-colors ${
              editor.isActive("heading", { level: 1 }) ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-2.5 py-1 text-[12px] font-black border-l border-black transition-colors ${
              editor.isActive("heading", { level: 2 }) ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-2.5 py-1 text-[12px] font-black border-l border-black transition-colors ${
              editor.isActive("heading", { level: 3 }) ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Heading 3"
          >
            H3
          </button>
        </div>

        <div className="w-[1px] h-5 bg-black/20 mx-0.5" />

        {/* Inline Formatting */}
        <div className="flex items-center bg-white border border-black rounded-lg overflow-hidden shadow-[1px_1px_0px_#000]">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2.5 py-1 text-[12px] font-black transition-colors ${
              editor.isActive("bold") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2.5 py-1 text-[12px] font-serif italic border-l border-black transition-colors ${
              editor.isActive("italic") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`px-2.5 py-1 text-[12px] line-through border-l border-black transition-colors ${
              editor.isActive("strike") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Strikethrough"
          >
            S
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`px-2.5 py-1 text-[11px] font-mono border-l border-black transition-colors ${
              editor.isActive("code") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Inline Code"
          >
            {"<>"}
          </button>
        </div>

        <div className="w-[1px] h-5 bg-black/20 mx-0.5" />

        {/* Lists & Quote */}
        <div className="flex items-center bg-white border border-black rounded-lg overflow-hidden shadow-[1px_1px_0px_#000]">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 text-[12px] font-black transition-colors ${
              editor.isActive("bulletList") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-2 py-1 text-[12px] font-black border-l border-black transition-colors ${
              editor.isActive("orderedList") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Numbered List"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-2 py-1 text-[12px] font-black border-l border-black transition-colors ${
              editor.isActive("blockquote") ? "bg-black text-white" : "hover:bg-black/10"
            }`}
            title="Quote"
          >
            “ ”
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="px-2 py-1 text-[12px] font-black border-l border-black hover:bg-black/10 transition-colors"
            title="Divider"
          >
            ―
          </button>
        </div>

        <div className="w-[1px] h-5 bg-black/20 mx-0.5" />

        {/* ── Visual Shapes & Diagrams Dropdown ── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowVisualMenu(!showVisualMenu);
              setShowTableMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFE566] hover:bg-[#FFD13B] text-black border-2 border-black rounded-lg font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">shapes</span>
            <span>Shapes & Diagrams</span>
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>

          {showVisualMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] z-50 p-2 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-black/50 px-2 py-1">
                Process & Flow Shapes
              </div>

              <button
                type="button"
                onClick={insertProcessFlow}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">➔</span>
                <div>
                  <div className="font-black text-[12px]">Process Flow (3 Stages)</div>
                  <div className="text-[10px] text-black/50">Linked horizontal shape steps</div>
                </div>
              </button>

              <button
                type="button"
                onClick={insertCycleLoop}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">🔄</span>
                <div>
                  <div className="font-black text-[12px]">Continuous Cycle Loop</div>
                  <div className="text-[10px] text-black/50">Feedback loop with repeating stages</div>
                </div>
              </button>

              <button
                type="button"
                onClick={insertComparisonShapes}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">⚖️</span>
                <div>
                  <div className="font-black text-[12px]">Side-by-Side Comparison</div>
                  <div className="text-[10px] text-black/50">Dual colored cards for contrasting ideas</div>
                </div>
              </button>

              <button
                type="button"
                onClick={insertDecisionTree}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">🔲</span>
                <div>
                  <div className="font-black text-[12px]">Decision Logic Branch</div>
                  <div className="text-[10px] text-black/50">Condition with Yes/No outcome paths</div>
                </div>
              </button>

              <div className="border-t border-black/10 my-1 pt-1 text-[10px] font-black uppercase tracking-wider text-black/50 px-2 py-1">
                Study Callouts & Charts
              </div>

              <button
                type="button"
                onClick={insertKeyCallout}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">📌</span>
                <div>
                  <div className="font-black text-[12px]">Key Definition Box</div>
                  <div className="text-[10px] text-black/50">Emerald highlight for laws & definitions</div>
                </div>
              </button>

              <button
                type="button"
                onClick={insertExamAlert}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">⚠️</span>
                <div>
                  <div className="font-black text-[12px]">Exam Trap Alert Box</div>
                  <div className="text-[10px] text-black/50">Red warning for frequent test traps</div>
                </div>
              </button>

              <button
                type="button"
                onClick={insertFormulaBox}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">📐</span>
                <div>
                  <div className="font-black text-[12px]">Formula & Equation Box</div>
                  <div className="text-[10px] text-black/50">Monospace math formula container</div>
                </div>
              </button>

              <button
                type="button"
                onClick={insertMetricChart}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="text-[16px]">📊</span>
                <div>
                  <div className="font-black text-[12px]">Visual Ratio Bar Chart</div>
                  <div className="text-[10px] text-black/50">Proportional comparison bars</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* ── Tables Dropdown ── */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTableMenu(!showTableMenu);
              setShowVisualMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-lg font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">table</span>
            <span>Table</span>
            <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
          </button>

          {showTableMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] z-50 p-2 space-y-1">
              <button
                type="button"
                onClick={insertTable}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">grid_on</span>
                <span>Standard 3×3 Table</span>
              </button>

              <button
                type="button"
                onClick={insertComparisonTable}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
                <span>Comparison Matrix Table</span>
              </button>

              <button
                type="button"
                onClick={insertVocabTable}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-lg hover:bg-[#FAF7F2] font-bold text-[12px] text-black transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">dictionary</span>
                <span>Vocabulary / Glossary Table</span>
              </button>

              {isTableActive && (
                <>
                  <div className="border-t border-black/10 my-1 pt-1 text-[10px] font-black uppercase text-black/50 px-2 py-0.5">
                    Table Controls
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addRowAfter().run()}
                      className="px-2 py-1 bg-[#FAF7F2] hover:bg-black hover:text-white rounded font-bold text-[11px] border border-black/30"
                    >
                      + Row
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().deleteRow().run()}
                      className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#AE2925] hover:text-white rounded font-bold text-[11px] border border-black/30"
                    >
                      - Row
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addColumnAfter().run()}
                      className="px-2 py-1 bg-[#FAF7F2] hover:bg-black hover:text-white rounded font-bold text-[11px] border border-black/30"
                    >
                      + Column
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().deleteColumn().run()}
                      className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#AE2925] hover:text-white rounded font-bold text-[11px] border border-black/30"
                    >
                      - Column
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="w-full text-center py-1 mt-1 text-[#AE2925] hover:bg-[#FEE2E2] rounded font-black text-[11px]"
                  >
                    Delete Table
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Table Quick Controls when inside table */}
        {isTableActive && (
          <div className="flex items-center gap-1 bg-[#FFF9C4] border border-black px-2 py-0.5 rounded-lg text-[11px] font-bold">
            <span className="material-symbols-outlined text-[14px]">table_rows</span>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-1.5 py-0.5 hover:bg-black hover:text-white rounded transition-colors"
              title="Add row"
            >
              + Row
            </button>
            <span className="text-black/30">|</span>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-1.5 py-0.5 hover:bg-black hover:text-white rounded transition-colors"
              title="Add column"
            >
              + Col
            </button>
            <span className="text-black/30">|</span>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-1.5 py-0.5 text-[#AE2925] hover:bg-[#AE2925] hover:text-white rounded transition-colors font-black"
              title="Delete table"
            >
              Delete
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Undo / Redo */}
        <div className="flex items-center bg-white border border-black rounded-lg overflow-hidden shadow-[1px_1px_0px_#000]">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-2 py-1 text-[12px] font-black hover:bg-black hover:text-white disabled:opacity-30 transition-colors"
            title="Undo"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-2 py-1 text-[12px] font-black border-l border-black hover:bg-black hover:text-white disabled:opacity-30 transition-colors"
            title="Redo"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Selection Context Menu ── */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="flex items-center bg-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-lg overflow-hidden"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2.5 py-1 text-[12px] font-black hover:bg-black hover:text-white transition-colors ${
            editor.isActive("bold") ? "bg-black text-white" : ""
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2.5 py-1 text-[12px] font-serif italic border-l border-black hover:bg-black hover:text-white transition-colors ${
            editor.isActive("italic") ? "bg-black text-white" : ""
          }`}
        >
          I
        </button>
        <button
          type="button"
          disabled={aiLoading !== null}
          onClick={() => handleAI("summarize")}
          className="px-2.5 py-1 text-[11px] font-black border-l border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1"
          title="Summarize selected text"
        >
          <span className="material-symbols-outlined text-[13px]">summarize</span>
          {aiLoading === "summarize" ? "Summarizing..." : "Summarize"}
        </button>
        <button
          type="button"
          disabled={aiLoading !== null}
          onClick={() => handleAI("explain")}
          className="px-2.5 py-1 text-[11px] font-black border-l border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1"
          title="Explain selected concept"
        >
          <span className="material-symbols-outlined text-[13px]">lightbulb</span>
          {aiLoading === "explain" ? "Explaining..." : "Explain"}
        </button>
        <button
          type="button"
          disabled={aiLoading !== null}
          onClick={handleFlashcards}
          className="px-2.5 py-1 text-[11px] font-black border-l border-black hover:bg-black hover:text-white transition-colors flex items-center gap-1"
          title="Turn selection into flashcards"
        >
          <span className="material-symbols-outlined text-[13px]">style</span>
          Flashcard
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} className="w-full" />
    </div>
  );
}
