import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { AlertCircle, Plus, Trash2, RefreshCw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";

interface Mistake {
  id: string;
  subject: string;
  question: string;
  myAnswer: string;
  correctAnswer: string;
  lesson: string;
  tags: string[];
  createdAt: string;
  reviewCount: number;
}

const STORAGE_KEY = "pz_mistake_journal";

function loadMistakes(): Mistake[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveMistakes(mistakes: Mistake[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
}

export default function MistakeJournal() {
  const [mistakes, setMistakes] = useState<Mistake[]>(loadMistakes);
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", question: "", myAnswer: "", correctAnswer: "" });

  useEffect(() => { saveMistakes(mistakes); }, [mistakes]);

  const allTags = Array.from(new Set(mistakes.flatMap(m => m.tags)));
  const filtered = filterTag ? mistakes.filter(m => m.tags.includes(filterTag)) : mistakes;

  const handleAdd = async () => {
    if (!form.question.trim() || !form.correctAnswer.trim()) {
      toast.error("Question and correct answer are required");
      return;
    }
    setGenerating(true);
    try {
      const prompt = `A student got this wrong:
Question: "${form.question}"
Their answer: "${form.myAnswer || "left blank"}"
Correct answer: "${form.correctAnswer}"

Return ONLY valid JSON (no markdown):
{"lesson":"1 sentence explaining why the correct answer is right and the common misconception","tags":["tag1","tag2"]}
Tags should be 1-2 word topic labels. Max 3 tags.`;
      const raw = await callGroq(prompt, "llama3-8b-8192");
      const { lesson, tags } = JSON.parse(raw.replace(/```json|```/g, "").trim());

      const newMistake: Mistake = {
        id: Date.now().toString(),
        subject: form.subject || "General",
        question: form.question,
        myAnswer: form.myAnswer,
        correctAnswer: form.correctAnswer,
        lesson,
        tags,
        createdAt: new Date().toISOString(),
        reviewCount: 0,
      };
      setMistakes(prev => [newMistake, ...prev]);
      setForm({ subject: "", question: "", myAnswer: "", correctAnswer: "" });
      setAdding(false);
      toast.success("Mistake logged!");
    } catch {
      toast.error("Failed to generate lesson. Saving without AI analysis.");
      const newMistake: Mistake = {
        id: Date.now().toString(),
        subject: form.subject || "General",
        question: form.question,
        myAnswer: form.myAnswer,
        correctAnswer: form.correctAnswer,
        lesson: "Review this concept carefully.",
        tags: [form.subject || "general"],
        createdAt: new Date().toISOString(),
        reviewCount: 0,
      };
      setMistakes(prev => [newMistake, ...prev]);
      setAdding(false);
    } finally {
      setGenerating(false);
    }
  };

  const deleteMistake = (id: string) => {
    setMistakes(prev => prev.filter(m => m.id !== id));
    toast.success("Removed");
  };

  const markReviewed = (id: string) => {
    setMistakes(prev => prev.map(m => m.id === id ? { ...m, reviewCount: m.reviewCount + 1 } : m));
  };

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg, #000)", color: "var(--pz-text, #F0E8D4)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <ToolHeader
          icon={<AlertCircle className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="Mistake Journal"
          subtitle="Track errors, learn the lesson, never repeat them"
        />

        <div className="flex items-center justify-between mt-6 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterTag(null)} className="text-xs px-2.5 py-1 rounded-none" style={{ border: `1px solid ${!filterTag ? "var(--pz-gold)" : "var(--pz-border)"}`, color: !filterTag ? "var(--pz-gold)" : "var(--pz-text-muted)", background: !filterTag ? "var(--pz-gold-dim)" : "transparent" }}>
              All ({mistakes.length})
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setFilterTag(tag === filterTag ? null : tag)} className="text-xs px-2.5 py-1 rounded-none" style={{ border: `1px solid ${filterTag === tag ? "var(--pz-gold)" : "var(--pz-border)"}`, color: filterTag === tag ? "var(--pz-gold)" : "var(--pz-text-muted)", background: filterTag === tag ? "var(--pz-gold-dim)" : "transparent" }}>
                {tag}
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>
            <Plus className="h-3 w-3" /> Log Mistake
          </button>
        </div>

        {adding && (
          <div className="p-4 rounded-none mb-4 space-y-3" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-gold)", borderTop: "2px solid var(--pz-gold)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>New Mistake Entry</h3>
            {[
              { key: "subject", label: "Subject (optional)", placeholder: "e.g. Biology, Math..." },
              { key: "question", label: "Question / Concept *", placeholder: "What was asked?" },
              { key: "myAnswer", label: "Your Answer", placeholder: "What did you answer?" },
              { key: "correctAnswer", label: "Correct Answer *", placeholder: "What's the right answer?" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</label>
                <input
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-none text-sm outline-none"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={generating} className="flex-1 py-2 rounded-none text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>
                {generating ? "Analysing..." : "Save & Analyse"}
              </Button>
              <Button onClick={() => setAdding(false)} className="px-4 py-2 rounded-none text-sm" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--pz-text-muted)" }}>
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{filterTag ? `No mistakes tagged "${filterTag}"` : "No mistakes logged yet"}</p>
            <p className="text-xs mt-1 opacity-60">Every mistake is a lesson — start logging</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => (
              <div key={m.id} className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: "3px solid var(--pz-rose, #E84040)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-medium mr-2" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase" }}>{m.subject}</span>
                    <span className="text-[10px]" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono',monospace" }}>{relTime(m.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.reviewCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-none" style={{ background: "var(--pz-teal-dim)", color: "var(--pz-teal)", border: "1px solid var(--pz-teal)30" }}>reviewed ×{m.reviewCount}</span>}
                    <button onClick={() => deleteMistake(m.id)} style={{ color: "var(--pz-text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--pz-text)" }}>{m.question}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded-none" style={{ background: "rgba(232,64,64,0.06)", border: "1px solid rgba(232,64,64,0.15)" }}>
                    <p className="text-[10px] mb-1" style={{ color: "var(--pz-rose, #E84040)", textTransform: "uppercase" }}>Your answer</p>
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{m.myAnswer || "—"}</p>
                  </div>
                  <div className="p-2 rounded-none" style={{ background: "var(--pz-teal-dim)", border: "1px solid var(--pz-teal)30" }}>
                    <p className="text-[10px] mb-1" style={{ color: "var(--pz-teal)", textTransform: "uppercase" }}>Correct</p>
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{m.correctAnswer}</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-none mb-3" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)" }}>
                  <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>💡 {m.lesson}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {m.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-none" style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)20" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => markReviewed(m.id)} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-none" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                    <RefreshCw className="h-2.5 w-2.5" /> Reviewed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
