import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, Brain, CheckCircle2, XCircle, RotateCcw, Loader2, ChevronRight, Eye } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { callGroq } from "@/lib/groq"
import { buildAIContext } from "@/lib/sourceContext"
import { MathRenderer } from "@/components/MathRenderer"

interface RecallQuestion {
  question: string
  answer: string
  hint: string
}

interface RecallResult {
  question: string
  answer: string
  userAnswer: string
  selfRated: "correct" | "partial" | "wrong" | null
}

export default function RecallMode() {
  const [step, setStep] = useState<"setup" | "generating" | "recall" | "reveal" | "results">("setup")
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [questions, setQuestions] = useState<RecallQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showHint, setShowHint] = useState(false)
  const [results, setResults] = useState<RecallResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const card: React.CSSProperties = { background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }
  const currentQ = questions[currentIdx]

  const generate = async () => {
    if (!topic.trim()) { setError("Enter a topic first."); return }
    setError(null)
    setStep("generating")
    const sourceCtx = buildAIContext()

    const prompt = `Generate 5 ${difficulty} recall questions about "${topic}".
${sourceCtx ? `Base on this material:\n${sourceCtx}\n` : ""}
These are OPEN-ENDED questions requiring free recall — not multiple choice.
Return ONLY valid JSON:
{
  "questions": [
    {
      "question": "question text",
      "answer": "complete correct answer",
      "hint": "a subtle hint without giving away the answer"
    }
  ]
}`

    try {
      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are a recall quiz generator. Return only valid JSON.",
        "llama-3.3-70b-versatile",
        1500
      )
      const clean = response.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)
      setQuestions(parsed.questions)
      setCurrentIdx(0)
      setResults([])
      setUserAnswer("")
      setShowHint(false)
      setStep("recall")
    } catch {
      setError("Failed to generate. Try again.")
      setStep("setup")
    }
  }

  const handleReveal = () => {
    setStep("reveal")
  }

  const handleRate = (rating: "correct" | "partial" | "wrong") => {
    const result: RecallResult = {
      question: currentQ.question,
      answer: currentQ.answer,
      userAnswer,
      selfRated: rating,
    }
    const newResults = [...results, result]
    setResults(newResults)

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1)
      setUserAnswer("")
      setShowHint(false)
      setStep("recall")
    } else {
      setStep("results")
    }
  }

  const reset = () => {
    setStep("setup")
    setTopic("")
    setQuestions([])
    setCurrentIdx(0)
    setUserAnswer("")
    setResults([])
    setShowHint(false)
    setError(null)
  }

  const score = {
    correct: results.filter(r => r.selfRated === "correct").length,
    partial: results.filter(r => r.selfRated === "partial").length,
    wrong: results.filter(r => r.selfRated === "wrong").length,
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.95)", borderBottom: "0.5px solid var(--pz-border)", backdropFilter: "blur(12px)" }}>
        <Link to="/dashboard" style={{ color: "var(--pz-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16 }}>Recall Mode</span>
        <div style={{ width: 48 }} />
      </div>

      <div className="hidden md:flex items-center gap-3 px-8 py-4" style={{ borderBottom: "0.5px solid var(--pz-border)" }}>
        <Link to="/dashboard">
          <button className="flex items-center gap-1 text-xs" style={{ color: "var(--pz-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <span style={{ color: "var(--pz-border)" }}>|</span>
        <Brain className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Recall Mode</h1>
      </div>

      <BottomNav />

      <main className="flex-1 py-6 pb-24 md:pb-6">
        <div className="container mx-auto px-4 max-w-xl">

          {/* SETUP */}
          {step === "setup" && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                  <Brain className="h-8 w-8" style={{ color: "#a855f7" }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display',serif" }}>Recall Mode</h2>
                <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>
                  Type your answer from memory first — then see the correct answer. Stronger than multiple choice.
                </p>
              </div>

              <div className="p-5 rounded-none space-y-4" style={card}>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--pz-text-muted)" }}>Topic</label>
                  <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder="e.g. Mitosis, French Revolution, Calculus..."
                    className="w-full px-3 py-2 text-sm rounded-none focus:outline-none"
                    style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                    onFocus={e => (e.target.style.borderColor = "var(--pz-gold)")}
                    onBlur={e => (e.target.style.borderColor = "var(--pz-border)")} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--pz-text-muted)" }}>Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as const).map(d => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className="py-2 text-xs font-semibold rounded-none capitalize transition-all"
                        style={{
                          background: difficulty === d ? "var(--pz-gold)" : "var(--pz-surface3)",
                          color: difficulty === d ? "#0A0A0C" : "var(--pz-text-2)",
                          border: `1px solid ${difficulty === d ? "var(--pz-gold)" : "var(--pz-border)"}`,
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && <p className="text-xs px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>{error}</p>}

              <button onClick={generate} className="w-full py-4 text-sm font-bold rounded-none transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }}>
                <Brain className="h-4 w-4" /> Start Recall Session
              </button>
            </div>
          )}

          {/* GENERATING */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#a855f7" }} />
              <p className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>Generating recall questions...</p>
            </div>
          )}

          {/* RECALL - user types answer */}
          {step === "recall" && currentQ && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Question {currentIdx + 1} of {questions.length}</p>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className="w-6 h-1.5 rounded-none" style={{ background: i < currentIdx ? "#a855f7" : i === currentIdx ? "#a855f7" : "var(--pz-surface3)" }} />
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-none" style={card}>
                <p className="text-sm font-medium leading-relaxed mb-5" style={{ color: "var(--pz-text)" }}>{currentQ.question}</p>
                <textarea
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  placeholder="Type your answer from memory..."
                  rows={4}
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-none focus:outline-none resize-none"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                  onFocus={e => (e.target.style.borderColor = "#a855f7")}
                  onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
                />
              </div>

              {showHint && (
                <div className="p-3 rounded-none text-xs" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", color: "var(--pz-text-2)" }}>
                  💡 Hint: {currentQ.hint}
                </div>
              )}

              <div className="flex gap-2">
                {!showHint && (
                  <button onClick={() => setShowHint(true)} className="flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-none transition-all hover:opacity-70"
                    style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
                    <Eye className="h-3.5 w-3.5" /> Hint
                  </button>
                )}
                <button onClick={handleReveal} className="flex-1 py-2.5 text-sm font-bold rounded-none transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", cursor: "pointer" }}>
                  Reveal Answer <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* REVEAL - show answer, user rates themselves */}
          {step === "reveal" && currentQ && (
            <div className="space-y-4">
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Question {currentIdx + 1} of {questions.length}</p>

              {/* User's answer */}
              <div className="p-4 rounded-none" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--pz-text-muted)" }}>Your Answer</p>
                <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>{userAnswer || <em style={{ color: "var(--pz-text-muted)" }}>Left blank</em>}</p>
              </div>

              {/* Correct answer */}
              <div className="p-4 rounded-none" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#10b981" }}>Correct Answer</p>
                <MathRenderer content={currentQ.answer} className="text-sm" />
              </div>

              {/* Self rating */}
              <div className="p-4 rounded-none" style={card}>
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--pz-text)" }}>How did you do?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleRate("correct")} className="py-3 rounded-none text-xs font-semibold flex flex-col items-center gap-1 transition-all hover:opacity-80"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", cursor: "pointer" }}>
                    <CheckCircle2 className="h-5 w-5" /> Got it!
                  </button>
                  <button onClick={() => handleRate("partial")} className="py-3 rounded-none text-xs font-semibold flex flex-col items-center gap-1 transition-all hover:opacity-80"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", cursor: "pointer" }}>
                    <Eye className="h-5 w-5" /> Partial
                  </button>
                  <button onClick={() => handleRate("wrong")} className="py-3 rounded-none text-xs font-semibold flex flex-col items-center gap-1 transition-all hover:opacity-80"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", cursor: "pointer" }}>
                    <XCircle className="h-5 w-5" /> Missed
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RESULTS */}
          {step === "results" && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <Brain className="h-10 w-10 mx-auto mb-3" style={{ color: "#a855f7" }} />
                <h2 className="text-xl font-bold" style={{ fontFamily: "'DM Serif Display',serif" }}>Session Complete</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Got It", value: score.correct, color: "#10b981" },
                  { label: "Partial", value: score.partial, color: "#f59e0b" },
                  { label: "Missed", value: score.wrong, color: "#ef4444" },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-none text-center" style={card}>
                    <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--pz-text-muted)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={i} className="p-4 rounded-none" style={card}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {r.selfRated === "correct" && <CheckCircle2 className="h-4 w-4" style={{ color: "#10b981" }} />}
                        {r.selfRated === "partial" && <Eye className="h-4 w-4" style={{ color: "#f59e0b" }} />}
                        {r.selfRated === "wrong" && <XCircle className="h-4 w-4" style={{ color: "#ef4444" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--pz-text)" }}>{r.question}</p>
                        <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{r.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={reset} className="w-full py-3 text-sm font-semibold rounded-none flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
                <RotateCcw className="h-4 w-4" /> New Session
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
