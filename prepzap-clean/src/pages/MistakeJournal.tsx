import { useState, useEffect } from "react";
import { ToolPageShell } from "@/pages/ToolPageShell";
import { AlertCircle, Plus, Trash2, RefreshCw, Flame, Play } from "lucide-react";
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
const TEAL = "#00C4B4";
const GOLD = "#E8B923";
const ROSE = "#ef4444";

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
      const prompt = `Based on these mistakes a student made, create a focused review quiz:\n${mistakeList}\n${ctx ? `\nAdditional context:\n${ctx}\n` : ""}\nReturn ONLY valid JSON array, no markdown:\n[{"question":"rephrased or related question","answer":"correct answer"}]\nCreate ${Math.min(toReview.length * 2, 8)} questions. Rephrase the originals to test understanding, not just memory.`;
      const raw = await callGroq(prompt, "meta-llama/llama-3.3-70b-instruct:free");
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
      <ToolPageShell>
        <main style={{ flex: 1, padding: "24px 16px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Review Session</h2>
              <button onClick={() => setReviewMode(false)}
                style={{ fontSize: 11, padding: "4px 10px", border: "0.5px solid #252525", color: "#555", background: "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                Exit
              </button>
            </div>
            <div style={{ height: 3, background: "#1A1A1A", marginBottom: 24 }}>
              <div style={{ height: "100%", width: `${(reviewIdx / reviewQuestions.length) * 100}%`, background: GOLD, transition: "width .3s" }} />
            </div>
            {!allDone && q ? (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", borderTop: `2px solid ${GOLD}`, padding: 20 }}>
                <p style={{ fontSize: 10, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{reviewIdx + 1} / {reviewQuestions.length}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#F0F0F0", marginBottom: 16 }}>{q.question}</p>
                <textarea value={reviewAnswers[reviewIdx]}
                  onChange={e => { const a = [...reviewAnswers]; a[reviewIdx] = e.target.value; setReviewAnswers(a); }}
                  disabled={reviewRevealed[reviewIdx]}
                  placeholder="Your answer..." rows={3}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid #252525", color: "#F0F0F0", outline: "none", resize: "none", marginBottom: 12, fontFamily: "inherit", boxSizing: "border-box" }} />
                {!reviewRevealed[reviewIdx] ? (
                  <button onClick={() => { const r = [...reviewRevealed]; r[reviewIdx] = true; setReviewRevealed(r); if (reviewIdx + 1 < reviewQuestions.length) setTimeout(() => setReviewIdx(i => i + 1), 1200); }}
                    style={{ width: "100%", padding: 10, background: GOLD, color: "#000", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Reveal Answer
                  </button>
                ) : (
                  <div style={{ padding: 12, background: "rgba(232,185,35,0.06)", borderLeft: `2px solid ${GOLD}` }}>
                    <p style={{ fontSize: 12, color: "#C0C0C0", margin: 0 }}>{q.answer}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 32, background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: GOLD, margin: "0 0 8px" }}>Review Complete! 🎉</p>
                <p style={{ fontSize: 12, color: "#555", margin: "0 0 16px" }}>Streak: {streak} day{streak !== 1 ? "s" : ""} 🔥</p>
                <button onClick={() => setReviewMode(false)}
                  style={{ width: "100%", padding: 10, background: GOLD, color: "#000", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Back to Journal
                </button>
              </div>
            )}
          </div>
        </main>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell>
      <main style={{ flex: 1, padding: "24px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg,${ROSE},#f97316)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Mistake Journal</h1>
              <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em" }}>LOG ERRORS — AUTO-SORTED BY OVERDUE</p>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "0.5px solid #1E1E1E" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#F0F0F0", margin: "0 0 4px", fontFamily: "monospace" }}>{mistakes.length}</p>
              <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>Total</p>
            </div>
            <div style={{ padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: `0.5px solid ${overdue.length > 0 ? "rgba(239,68,68,0.4)" : "#1E1E1E"}` }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: overdue.length > 0 ? ROSE : "#F0F0F0", margin: "0 0 4px", fontFamily: "monospace" }}>{overdue.length}</p>
              <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>Overdue</p>
            </div>
            <div style={{ padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "0.5px solid #1E1E1E" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: ROSE, margin: "0 0 4px", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                {streak > 0 && <Flame style={{ width: 14, height: 14 }} />}{streak}
              </p>
              <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>Streak</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={startReviewSession} disabled={reviewLoading || mistakes.length === 0}
              style={{ flex: 1, padding: "10px", background: overdue.length > 0 ? ROSE : GOLD, color: overdue.length > 0 ? "#fff" : "#000", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: (reviewLoading || mistakes.length === 0) ? 0.5 : 1 }}>
              <Play style={{ width: 12, height: 12 }} />
              {reviewLoading ? "Loading..." : overdue.length > 0 ? `Review ${overdue.length} overdue` : "Start Review Session"}
            </button>
            <button onClick={() => setAdding(a => !a)}
              style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", color: "#555", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus style={{ width: 12, height: 12 }} /> Log
            </button>
          </div>

          {/* Add form */}
          {adding && (
            <div style={{ padding: 16, marginBottom: 16, background: "rgba(255,255,255,0.02)", border: `0.5px solid ${GOLD}`, borderTop: `2px solid ${GOLD}` }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: "#F0F0F0", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>New Mistake</h3>
              {[
                { key: "subject", label: "Subject (optional)", placeholder: "e.g. Biology" },
                { key: "question", label: "Question / Concept *", placeholder: "What were you asked?" },
                { key: "correctAnswer", label: "Correct Answer *", placeholder: "What's the right answer?" },
                { key: "tags", label: "Tags (comma separated)", placeholder: "e.g. mitosis, cell division" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#555", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{f.label}</label>
                  <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "8px 10px", fontSize: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid #252525", color: "#F0F0F0", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={handleAdd}
                  style={{ flex: 1, padding: "8px", background: GOLD, color: "#000", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Save
                </button>
                <button onClick={() => setAdding(false)}
                  style={{ padding: "8px 14px", background: "transparent", border: "0.5px solid #252525", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              <button onClick={() => setFilterTag(null)}
                style={{ fontSize: 10, padding: "3px 8px", border: `0.5px solid ${!filterTag ? GOLD : "#252525"}`, color: !filterTag ? GOLD : "#555", background: !filterTag ? "rgba(232,185,35,0.06)" : "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                All
              </button>
              {allTags.map(tag => (
                <button key={tag} onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                  style={{ fontSize: 10, padding: "3px 8px", border: `0.5px solid ${filterTag === tag ? GOLD : "#252525"}`, color: filterTag === tag ? GOLD : "#555", background: filterTag === tag ? "rgba(232,185,35,0.06)" : "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Mistakes list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "#333" }}>
              <AlertCircle style={{ width: 36, height: 36, margin: "0 auto 12px", opacity: 0.2 }} />
              <p style={{ fontSize: 13, margin: "0 0 6px" }}>No mistakes logged yet</p>
              <p style={{ fontSize: 11, opacity: 0.6, margin: 0 }}>Every mistake is a lesson — start logging</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(m => {
                const overdueDays = daysSinceReview(m);
                const due = isOverdue(m);
                return (
                  <div key={m.id} style={{ padding: 16, background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", borderLeft: `3px solid ${due ? ROSE : "#252525"}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.subject}</span>
                        {due && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(239,68,68,0.1)", color: ROSE, border: "0.5px solid rgba(239,68,68,0.2)" }}>Overdue {overdueDays}d</span>}
                        {m.reviewCount > 0 && <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(0,196,180,0.06)", color: TEAL, border: "0.5px solid rgba(0,196,180,0.2)" }}>×{m.reviewCount}</span>}
                      </div>
                      <button onClick={() => deleteMistake(m.id)} style={{ color: "#444", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F0", margin: "0 0 6px" }}>{m.question}</p>
                    <p style={{ fontSize: 11, color: "#999", margin: "0 0 12px" }}>{m.correctAnswer}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {m.tags.map(tag => (
                          <span key={tag} style={{ fontSize: 9, padding: "2px 6px", background: "rgba(232,185,35,0.06)", color: GOLD, border: "0.5px solid rgba(232,185,35,0.15)" }}>{tag}</span>
                        ))}
                      </div>
                      <button onClick={() => markReviewed(m.id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "4px 8px", border: "0.5px solid #252525", color: "#555", background: "transparent", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                        <RefreshCw style={{ width: 10, height: 10 }} /> Mark reviewed
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </ToolPageShell>
  );
}
