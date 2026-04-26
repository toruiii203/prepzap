import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, BookOpen, Trash2, TrendingDown, Brain, Loader2, RotateCcw, Plus, X } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { callGroq } from "@/lib/groq"

interface MistakeEntry {
  id: string
  topic: string
  question: string
  yourAnswer: string
  correctAnswer: string
  addedAt: string
}

interface PatternAnalysis {
  patterns: { pattern: string; frequency: string; advice: string }[]
  weakestTopics: string[]
  recommendation: string
}

const LS_KEY = "pz_mistake_journal"

function loadMistakes(): MistakeEntry[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]") } catch { return [] }
}

function saveMistakes(m: MistakeEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(m))
}

export default function MistakeJournal() {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(loadMistakes)
  const [showAdd, setShowAdd] = useState(false)
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ topic: "", question: "", yourAnswer: "", correctAnswer: "" })

  useEffect(() => { saveMistakes(mistakes) }, [mistakes])

  const addMistake = () => {
    if (!form.topic || !form.question || !form.correctAnswer) { setError("Fill in topic, question, and correct answer."); return }
    const entry: MistakeEntry = {
      id: Date.now().toString(),
      topic: form.topic,
      question: form.question,
      yourAnswer: form.yourAnswer,
      correctAnswer: form.correctAnswer,
      addedAt: new Date().toISOString(),
    }
    setMistakes(p => [entry, ...p])
    setForm({ topic: "", question: "", yourAnswer: "", correctAnswer: "" })
    setShowAdd(false)
    setError(null)
  }

  const removeMistake = (id: string) => setMistakes(p => p.filter(m => m.id !== id))

  const analyzePatterns = async () => {
    if (mistakes.length < 3) { setError("Add at least 3 mistakes for pattern analysis."); return }
    setAnalyzing(true)
    setError(null)

    const prompt = `Analyze these student mistakes and identify patterns:

${mistakes.map((m, i) => `${i + 1}. Topic: ${m.topic}
Question: ${m.question}
Student answered: ${m.yourAnswer || "left blank"}
Correct answer: ${m.correctAnswer}`).join("\n\n")}

Return ONLY valid JSON:
{
  "patterns": [
    {
      "pattern": "pattern name",
      "frequency": "how often this appears",
      "advice": "specific actionable advice to fix this"
    }
  ],
  "weakestTopics": ["topic1", "topic2", "topic3"],
  "recommendation": "one key recommendation for this student"
}`

    try {
      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are a learning analyst. Return only valid JSON.",
        "llama-3.3-70b-versatile",
        1500
      )
      const clean = response.replace(/```json|```/g, "").trim()
      setAnalysis(JSON.parse(clean))
    } catch {
      setError("Failed to analyze. Try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  const topicCounts = mistakes.reduce((acc, m) => {
    acc[m.topic] = (acc[m.topic] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])

  const card: React.CSSProperties = { background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.95)", borderBottom: "0.5px solid var(--pz-border)", backdropFilter: "blur(12px)" }}>
        <Link to="/dashboard" style={{ color: "var(--pz-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16 }}>Mistake Journal</span>
        <button onClick={() => setShowAdd(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pz-gold)" }}>
          <Plus size={18} />
        </button>
      </div>

      <div className="hidden md:flex items-center gap-3 px-8 py-4" style={{ borderBottom: "0.5px solid var(--pz-border)" }}>
        <Link to="/dashboard">
          <button className="flex items-center gap-1 text-xs" style={{ color: "var(--pz-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <span style={{ color: "var(--pz-border)" }}>|</span>
        <BookOpen className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Mistake Journal</h1>
        <button onClick={() => setShowAdd(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-none transition-all hover:opacity-80"
          style={{ background: "var(--pz-gold)", color: "#0A0A0C", border: "none", cursor: "pointer" }}>
          <Plus className="h-3.5 w-3.5" /> Add Mistake
        </button>
      </div>

      <BottomNav />

      <main className="flex-1 py-6 pb-24 md:pb-6">
        <div className="container mx-auto px-4 max-w-2xl space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Mistakes", value: mistakes.length },
              { label: "Topics", value: Object.keys(topicCounts).length },
              { label: "Most Missed", value: sortedTopics[0]?.[0]?.split(" ")[0] || "—" },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-none text-center" style={card}>
                <p className="text-xl font-bold" style={{ color: "var(--pz-text)", fontFamily: "'DM Mono',monospace" }}>{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--pz-text-muted)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Add mistake form */}
          {showAdd && (
            <div className="p-5 rounded-none space-y-3" style={{ ...card, border: "1px solid var(--pz-gold)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>Log a Mistake</p>
                <button onClick={() => { setShowAdd(false); setError(null) }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pz-text-muted)" }}>
                  <X size={16} />
                </button>
              </div>
              {[
                { key: "topic", label: "Topic", placeholder: "e.g. Cell Biology" },
                { key: "question", label: "Question", placeholder: "What was the question?" },
                { key: "yourAnswer", label: "Your Answer (optional)", placeholder: "What did you answer?" },
                { key: "correctAnswer", label: "Correct Answer", placeholder: "What was the correct answer?" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: "var(--pz-text-muted)" }}>{f.label}</label>
                  <input
                    type="text"
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 text-sm rounded-none focus:outline-none"
                    style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                    onFocus={e => (e.target.style.borderColor = "var(--pz-gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
                  />
                </div>
              ))}
              {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
              <button onClick={addMistake} className="w-full py-2.5 text-sm font-semibold rounded-none"
                style={{ background: "var(--pz-gold)", color: "#0A0A0C", border: "none", cursor: "pointer" }}>
                Save Mistake
              </button>
            </div>
          )}

          {/* Pattern Analysis */}
          {mistakes.length >= 3 && (
            <div className="p-4 rounded-none" style={card}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>AI Pattern Analysis</p>
                </div>
                <button onClick={analyzePatterns} disabled={analyzing}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none transition-all hover:opacity-80"
                  style={{ background: analyzing ? "var(--pz-surface3)" : "var(--pz-gold)", color: analyzing ? "var(--pz-text-muted)" : "#0A0A0C", border: "none", cursor: "pointer" }}>
                  {analyzing ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing...</> : <><Brain className="h-3 w-3" /> Analyze</>}
                </button>
              </div>

              {analysis && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--pz-text-muted)" }}>Weakest Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.weakestTopics.map((t, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-none" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {analysis.patterns.map((p, i) => (
                      <div key={i} className="p-3 rounded-none" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold" style={{ color: "var(--pz-text)" }}>{p.pattern}</p>
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>{p.frequency}</span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{p.advice}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-none" style={{ background: "rgba(192,160,96,0.06)", border: "1px solid rgba(192,160,96,0.2)" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--pz-gold)" }}>💡 Key Recommendation</p>
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{analysis.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mistake list */}
          {mistakes.length === 0 ? (
            <div className="text-center py-16" style={{ border: "1px solid var(--pz-border)", background: "var(--pz-surface2)" }}>
              <TrendingDown className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--pz-text-muted)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--pz-text-2)" }}>No mistakes logged yet</p>
              <p className="text-xs mb-4" style={{ color: "var(--pz-text-muted)" }}>Log wrong answers to track patterns and improve</p>
              <button onClick={() => setShowAdd(true)} className="text-xs px-4 py-2 rounded-none"
                style={{ background: "var(--pz-gold)", color: "#0A0A0C", border: "none", cursor: "pointer" }}>
                Log First Mistake
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--pz-text-muted)" }}>
                All Mistakes ({mistakes.length})
              </p>
              {mistakes.map(m => (
                <div key={m.id} className="p-4 rounded-none group" style={card}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-none" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{m.topic}</span>
                        <span className="text-[10px]" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono',monospace" }}>
                          {new Date(m.addedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--pz-text)" }}>{m.question}</p>
                      {m.yourAnswer && <p className="text-xs" style={{ color: "#ef4444" }}>✗ {m.yourAnswer}</p>}
                      <p className="text-xs" style={{ color: "#10b981" }}>✓ {m.correctAnswer}</p>
                    </div>
                    <button onClick={() => removeMistake(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pz-text-muted)" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
