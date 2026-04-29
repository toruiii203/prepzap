import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { AlertCircle, Plus, Trash2, RefreshCw, Flame, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface Mistake {
  id: string;
  subject: string;
  question: string;
  correctAnswer: string;
  tags: string[];
  createdAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
}

interface ReviewQuestion { question: string; answer: string; }

const STORAGE_KEY = "pz_mistake_journal";
const STREAK_KEY  = "pz_mistake_streak";

function loadMistakes(): Mistake[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function saveMistakes(m: Mistake[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); }

function daysSinceReview(m: Mistake): number {
  if (!m.lastReviewedAt) return Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 86400000);
  return Math.floor((Date.now() - new Date(m.lastReviewedAt).getTime()) / 86400000);
}

function isOverdue(m: Mistake) { return daysSinceReview(m) >= 3; }

export default function MistakeJournal() {
  const [mistakes, setMistakes] = useState<Mistake[]>(loadMistakes);
  const [adding, setAdding] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", question: "", correctAnswer: "", tags: "" });
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewAnswers, setReviewAnswers] = useState<string[]>([]);
  const [reviewRevealed, setReviewRevealed] = useState<boolean[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [streak, setStreak] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY) || "0"); } catch { return 0; }
  });

  useEffect(() => { saveMistakes(mistakes); }, [mistakes]);

  const allTags = Array.from(new Set(mistakes.flatMap(m => m.tags)));
  const overdue = mistakes.filter(isOverdue);
  const sorted = [...mistakes].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    return daysSinceReview(b) - daysSinceReview(a);
  });
  const filtered = filterTag ? sorted.filter(m => m.tags.includes(filterTag)) : sorted;

  const handleAdd = () => {
    if (!form.question.trim() || !form.correctAnswer.trim()) { toast.error("Question and correct answer are required"); return; }
    const tags = form.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const newMistake: Mistake = {
      id: Date.now().toString(),
      subject: form.subject || "General",
      question: form.question,
      correctAnswer: form.correctAnswer,
      tags: tags.length > 0 ? tags : [form.subject.toLowerCase() || "general"],
      createdAt: new Date().toISOString(),
      lastReviewedAt: null,
      reviewCount: 0,
    };
    setMistakes(prev => [newMistake, ...prev]);
    setForm({ subject: "", question: "", correctAnswer: "", tags: "" });
    setAdding(false);
    toast.success("Mistake logged!");
  };

  const deleteMistake = (id: string) => { setMistakes(prev => prev.filter(m => m.id !== id)); };

  const markReviewed = (id: string) => {
    setMistakes(prev => prev.map(m => m.id === id ? { ...m, lastReviewedAt: new Date().toISOString(), reviewCount: m.reviewCount + 1 } : m));
  };

  const startReviewSession = async () => {
    const toReview = overdue.length > 0 ? overdue : mistakes.slice(0, 5);
    if (toReview.length === 0) { toast.error("No mistakes to review yet"); return; }
    setReviewLoading(true);
    try {
      const ctx = buildAIContext();
      const mistakeList = toReview.map(m => `Q: ${m.question}\nA: ${m.correctAnswer}`).join("\n\n");
      const prompt = `Based on these mistakes a student made, create a focused review quiz:
${mistakeList}
${ctx ? `\nAdditional context:\n${ctx}\n` : ""}
Return ONLY valid JSON array, no markdown:
[{"question":"rephrased or related question","answer":"correct answer"}]
Create ${Math.min(toReview.length * 2, 8)} questions. Rephrase the originals to test understanding, not just memory.`;
      const raw = await callGroq(prompt, "llama-3.3-70b-versatile");
      const parsed: ReviewQuestion[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setReviewQuestions(parsed);
      setReviewIdx(0);
      setReviewAnswers(parsed.map(() => ""));
      setReviewRevealed(parsed.map(() => false));
      setReviewMode(true);
      toReview.forEach(m => markReviewed(m.id));
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
    } catch { toast.error("Failed to generate review session."); }
    finally { setReviewLoading(false); }
  };

  const relTime = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
  };

  // REVIEW MODE
  if (reviewMode) {
    const q = reviewQuestions[reviewIdx];
    const allDone = reviewRevealed.every(Boolean);
    return (
      <div style={{ minHeight: "100vh", background: "var(--pz-bg)", color: "var(--pz-text)" }}>
        <Navbar />
        <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
          <GlobalContextBar compact />
          <div className="flex items-center justify-between mb-6 mt-4">
            <h2 className="font-semibold" style={{ color: "var(--pz-text)" }}>Review Session</h2>
            <button onClick={() => setReviewMode(false)} className="text-xs px-3 py-1.5" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent" }}>Exit</button>
          </div>

          <div className="h-1.5 mb-6" style={{ background: "var(--pz-surface3)" }}>
            <div className="h-full transition-all" style={{ width: `${(reviewIdx / reviewQuestions.length) * 100}%`, background: "var(--pz-gold)" }} />
          </div>

          {!allDone && q ? (
            <div className="space-y-4">
              <div className="p-5" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderTop: "2px solid var(--pz-gold)" }}>
                <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>{reviewIdx + 1} / {reviewQuestions.length}</p>
                <p className="text-base font-medium mb-4" style={{ color: "var(--pz-text)" }}>{q.question}</p>
                <textarea value={reviewAnswers[reviewIdx]}
                  onChange={e => { const a = [...reviewAnswers]; a[reviewIdx] = e.target.value; setReviewAnswers(a); }}
                  disabled={reviewRevealed[reviewIdx]}
                  placeholder="Your answer..." rows={3}
                  className="w-full px-3 py-2.5 text-sm outline-none resize-none mb-3"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
                {!reviewRevealed[reviewIdx] ? (
                  <button onClick={() => { const r = [...reviewRevealed]; r[reviewIdx] = true; setReviewRevealed(r); if (reviewIdx + 1 < reviewQuestions.length) setTimeout(() => setReviewIdx(i => i + 1), 1200); }}
                    className="w-full py-2.5 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000", border: "none" }}>
                    Reveal Answer
                  </button>
                ) : (
                  <div className="p-3" style={{ background: "var(--pz-surface3)", borderLeft: "2px solid var(--pz-gold)" }}>
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{q.answer}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
              <p className="text-xl font-bold" style={{ color: "var(--pz-gold)" }}>Review Complete! 🎉</p>
              <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>Streak: {streak} day{streak !== 1 ? "s" : ""} 🔥</p>
              <Button onClick={() => setReviewMode(false)} className="w-full py-2.5 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>Back to Journal</Button>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 pt-6 pb-24">
        <GlobalContextBar compact />
        <ToolHeader icon={<AlertCircle className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />} title="Mistake Journal" subtitle="Log errors — auto-sorted by overdue for review" />

        {/* Stats bar */}
        <div className="flex gap-3 mt-6 mb-4">
          <div className="flex-1 p-3 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--pz-text)", fontFamily: "monospace" }}>{mistakes.length}</p>
            <p className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Total</p>
          </div>
          <div className="flex-1 p-3 text-center" style={{ background: "var(--pz-surface2)", border: `1px solid ${overdue.length > 0 ? "var(--pz-rose)" : "var(--pz-border)"}` }}>
            <p className="text-xl font-bold" style={{ color: overdue.length > 0 ? "var(--pz-rose)" : "var(--pz-text)", fontFamily: "monospace" }}>{overdue.length}</p>
            <p className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Overdue</p>
          </div>
          <div className="flex-1 p-3 text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
            <p className="text-xl font-bold flex items-center justify-center gap-1" style={{ color: "var(--pz-rose)", fontFamily: "monospace" }}>
              {streak > 0 && <Flame className="h-4 w-4" />}{streak}
            </p>
            <p className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Streak</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Button onClick={startReviewSession} disabled={reviewLoading || mistakes.length === 0}
            className="flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: overdue.length > 0 ? "var(--pz-rose)" : "var(--pz-gold)", color: overdue.length > 0 ? "#fff" : "#000" }}>
            <Play className="h-3.5 w-3.5" />
            {reviewLoading ? "Loading..." : overdue.length > 0 ? `Review ${overdue.length} overdue` : "Start Review Session"}
          </Button>
          <button onClick={() => setAdding(a => !a)} className="px-3 py-2.5 flex items-center gap-1.5 text-xs font-semibold"
            style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
            <Plus className="h-3.5 w-3.5" /> Log
          </button>
        </div>

        {adding && (
          <div className="p-4 mb-4 space-y-3" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-gold)", borderTop: "2px solid var(--pz-gold)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>New Mistake</h3>
            {[
              { key: "subject", label: "Subject (optional)", placeholder: "e.g. Biology" },
              { key: "question", label: "Question / Concept *", placeholder: "What were you asked?" },
              { key: "correctAnswer", label: "Correct Answer *", placeholder: "What's the right answer?" },
              { key: "tags", label: "Tags (comma separated)", placeholder: "e.g. mitosis, cell division" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>{f.label}</label>
                <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="w-full px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }} />
              </div>
            ))}
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1 py-2 text-sm font-semibold" style={{ background: "var(--pz-gold)", color: "#000" }}>Save</Button>
              <Button onClick={() => setAdding(false)} className="px-4 py-2 text-sm" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            <button onClick={() => setFilterTag(null)} className="text-xs px-2.5 py-1"
              style={{ border: `1px solid ${!filterTag ? "var(--pz-gold)" : "var(--pz-border)"}`, color: !filterTag ? "var(--pz-gold)" : "var(--pz-text-muted)", background: !filterTag ? "var(--pz-gold-dim)" : "transparent" }}>
              All
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setFilterTag(tag === filterTag ? null : tag)} className="text-xs px-2.5 py-1"
                style={{ border: `1px solid ${filterTag === tag ? "var(--pz-gold)" : "var(--pz-border)"}`, color: filterTag === tag ? "var(--pz-gold)" : "var(--pz-text-muted)", background: filterTag === tag ? "var(--pz-gold-dim)" : "transparent" }}>
                {tag}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--pz-text-muted)" }}>
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No mistakes logged yet</p>
            <p className="text-xs mt-1 opacity-60">Every mistake is a lesson — start logging</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
              const overdueDays = daysSinceReview(m);
              const due = isOverdue(m);
              return (
                <div key={m.id} className="p-4" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", borderLeft: `3px solid ${due ? "var(--pz-rose)" : "var(--pz-border)"}` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>{m.subject}</span>
                      {due && <span className="text-[10px] px-1.5 py-0.5" style={{ background: "rgba(232,64,64,0.1)", color: "var(--pz-rose)", border: "1px solid rgba(232,64,64,0.2)" }}>Overdue {overdueDays}d</span>}
                      {m.reviewCount > 0 && <span className="text-[10px] px-1.5 py-0.5" style={{ background: "var(--pz-teal-dim)", color: "var(--pz-teal)", border: "1px solid var(--pz-teal)30" }}>×{m.reviewCount}</span>}
                    </div>
                    <button onClick={() => deleteMistake(m.id)} style={{ color: "var(--pz-text-muted)", background: "none", border: "none", cursor: "pointer", shrink: 0 }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-medium mb-1.5" style={{ color: "var(--pz-text)" }}>{m.question}</p>
                  <p className="text-xs mb-3" style={{ color: "var(--pz-text-2)" }}>{m.correctAnswer}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 flex-wrap">
                      {m.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5" style={{ background: "var(--pz-gold-dim)", color: "var(--pz-gold)", border: "1px solid var(--pz-gold)20" }}>{tag}</span>
                      ))}
                    </div>
                    <button onClick={() => markReviewed(m.id)} className="flex items-center gap-1 text-[10px] px-2.5 py-1" style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent" }}>
                      <RefreshCw className="h-2.5 w-2.5" /> Mark reviewed
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
