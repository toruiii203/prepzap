import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, Target, Brain, TrendingUp, AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { callGroq } from "@/lib/groq"
import { buildAIContext } from "@/lib/sourceContext"
import { MathRenderer } from "@/components/MathRenderer"

interface TopicResult {
  topic: string
  confidence: number
  score: number
  questions: { q: string; correct: string; userAnswer: string; isCorrect: boolean }[]
}

const CONFIDENCE_LABELS = ["", "Very Unsure", "Unsure", "Neutral", "Confident", "Very Confident"]
const CONFIDENCE_COLORS = ["", "#ef4444", "#f59e0b", "#6366f1", "#10b981", "#059669"]

export default function ConfidenceCalibration() {
  const [step, setStep] = useState<"setup" | "confidence" | "quiz" | "results">("setup")
  const [topics, setTopics] = useState("")
  const [topicList, setTopicList] = useState<string[]>([])
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0)
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, number>>({})
  const [questions, setQuestions] = useState<{ q: string; options: string[]; correct: string }[]>([])
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [results, setResults] = useState<TopicResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const card: React.CSSProperties = { background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }

  const handleSetup = () => {
    if (!topics.trim()) { setError("Please enter at least one topic."); return }
    const list = topics.split(",").map(t => t.trim()).filter(Boolean)
    setTopicList(list)
    setError(null)
    setStep("confidence")
  }

  const handleConfidenceDone = async () => {
    setLoading(true)
    setError(null)
    const topic = topicList[currentTopicIdx]
    const sourceCtx = buildAIContext()

    try {
      const prompt = `Generate exactly 5 multiple choice questions about "${topic}".
${sourceCtx ? `Base questions on this material:\n${sourceCtx}\n` : ""}
Return ONLY valid JSON, no markdown, no explanation:
{
  "questions": [
    {
      "q": "question text",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correct": "A) option1"
    }
  ]
}`
      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are a quiz generator. Return only valid JSON.",
        "llama-3.3-70b-versatile",
        1500
      )
      const clean = response.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)
      setQuestions(parsed.questions)
      setUserAnswers([])
      setCurrentQ(0)
      setStep("quiz")
    } catch {
      setError("Failed to generate questions. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (answer: string) => {
    const newAnswers = [...userAnswers, answer]
    setUserAnswers(newAnswers)

    if (currentQ + 1 < questions.length) {
      setCurrentQ(q => q + 1)
    } else {
      // Calculate score for this topic
      const topic = topicList[currentTopicIdx]
      const correct = newAnswers.filter((a, i) => a === questions[i].correct).length
      const score = Math.round((correct / questions.length) * 100)

      const result: TopicResult = {
        topic,
        confidence: confidenceRatings[topic],
        score,
        questions: questions.map((q, i) => ({
          q: q.q,
          correct: q.correct,
          userAnswer: newAnswers[i],
          isCorrect: newAnswers[i] === q.correct,
        }))
      }

      const newResults = [...results, result]
      setResults(newResults)

      if (currentTopicIdx + 1 < topicList.length) {
        setCurrentTopicIdx(i => i + 1)
        setStep("confidence")
        setQuestions([])
        setUserAnswers([])
        setCurrentQ(0)
      } else {
        setStep("results")
      }
    }
  }

  const reset = () => {
    setStep("setup")
    setTopics("")
    setTopicList([])
    setCurrentTopicIdx(0)
    setConfidenceRatings({})
    setQuestions([])
    setUserAnswers([])
    setCurrentQ(0)
    setResults([])
    setError(null)
  }

  const getCalibrationLabel = (confidence: number, score: number) => {
    const diff = score - confidence * 20
    if (diff > 20) return { label: "Underestimating yourself!", color: "#10b981", icon: "🚀" }
    if (diff < -20) return { label: "Overconfident!", color: "#ef4444", icon: "⚠️" }
    return { label: "Well calibrated", color: "#6366f1", icon: "✅" }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.95)", borderBottom: "0.5px solid var(--pz-border)", backdropFilter: "blur(12px)" }}>
        <Link to="/dashboard" style={{ color: "var(--pz-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16 }}>Confidence Check</span>
        <div style={{ width: 48 }} />
      </div>

      <div className="hidden md:flex items-center gap-3 px-8 py-4" style={{ borderBottom: "0.5px solid var(--pz-border)" }}>
        <Link to="/dashboard">
          <button className="flex items-center gap-1 text-xs" style={{ color: "var(--pz-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <span style={{ color: "var(--pz-border)" }}>|</span>
        <Target className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Confidence Calibration</h1>
      </div>

      <BottomNav />

      <main className="flex-1 py-6 pb-24 md:pb-6">
        <div className="container mx-auto px-4 max-w-xl">

          {/* SETUP */}
          {step === "setup" && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <Target className="h-8 w-8" style={{ color: "#6366f1" }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display',serif" }}>Confidence Calibration</h2>
                <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>
                  Rate your confidence before being tested. Discover where you're overconfident or underestimating yourself.
                </p>
              </div>

              <div className="p-5 rounded-none" style={card}>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: "var(--pz-text-muted)" }}>
                  Topics to test
                </label>
                <textarea
                  value={topics}
                  onChange={e => setTopics(e.target.value)}
                  placeholder="e.g. Photosynthesis, Cell Division, DNA Replication..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-none focus:outline-none resize-none"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                  onFocus={e => (e.target.style.borderColor = "var(--pz-gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
                />
                <p className="text-xs mt-2" style={{ color: "var(--pz-text-muted)" }}>Separate topics with commas. Each topic gets 5 questions.</p>
              </div>

              {error && <p className="text-xs px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>{error}</p>}

              <button onClick={handleSetup} className="w-full py-4 text-sm font-bold rounded-none transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff" }}>
                Start Calibration Test
              </button>
            </div>
          )}

          {/* CONFIDENCE RATING */}
          {step === "confidence" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <p className="text-xs mb-1" style={{ color: "var(--pz-text-muted)" }}>
                  Topic {currentTopicIdx + 1} of {topicList.length}
                </p>
                <h2 className="text-xl font-bold" style={{ fontFamily: "'DM Serif Display',serif" }}>
                  {topicList[currentTopicIdx]}
                </h2>
                <p className="text-sm mt-2" style={{ color: "var(--pz-text-muted)" }}>
                  Before we test you — how confident are you in this topic?
                </p>
              </div>

              <div className="p-5 rounded-none space-y-3" style={card}>
                {[1, 2, 3, 4, 5].map(level => (
                  <button key={level} onClick={() => setConfidenceRatings(r => ({ ...r, [topicList[currentTopicIdx]]: level }))}
                    className="w-full flex items-center gap-4 p-4 rounded-none transition-all text-left"
                    style={{
                      background: confidenceRatings[topicList[currentTopicIdx]] === level ? `${CONFIDENCE_COLORS[level]}15` : "var(--pz-surface3)",
                      border: `1px solid ${confidenceRatings[topicList[currentTopicIdx]] === level ? CONFIDENCE_COLORS[level] : "var(--pz-border)"}`,
                    }}>
                    <div className="w-8 h-8 rounded-none flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: CONFIDENCE_COLORS[level], color: "#fff" }}>
                      {level}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>{CONFIDENCE_LABELS[level]}</p>
                      <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>
                        {level === 1 && "I barely know this topic"}
                        {level === 2 && "I know some basics"}
                        {level === 3 && "I know it moderately well"}
                        {level === 4 && "I know this topic well"}
                        {level === 5 && "I could teach this topic"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {error && <p className="text-xs px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>{error}</p>}

              <button
                onClick={handleConfidenceDone}
                disabled={!confidenceRatings[topicList[currentTopicIdx]] || loading}
                className="w-full py-4 text-sm font-bold rounded-none transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", opacity: !confidenceRatings[topicList[currentTopicIdx]] || loading ? 0.5 : 1 }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating questions...</> : "Start Quiz →"}
              </button>
            </div>
          )}

          {/* QUIZ */}
          {step === "quiz" && questions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>
                  {topicList[currentTopicIdx]} · Question {currentQ + 1} of {questions.length}
                </p>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className="w-6 h-1.5 rounded-none" style={{ background: i < currentQ ? "#6366f1" : i === currentQ ? "#6366f1" : "var(--pz-surface3)" }} />
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-none" style={card}>
                <p className="text-sm font-medium leading-relaxed mb-5" style={{ color: "var(--pz-text)" }}>
                  {questions[currentQ].q}
                </p>
                <div className="space-y-2">
                  {questions[currentQ].options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)}
                      className="w-full text-left px-4 py-3 text-sm rounded-none transition-all hover:opacity-80"
                      style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--pz-border)"}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESULTS */}
          {step === "results" && (
            <div className="space-y-5">
              <div className="text-center py-4">
                <Brain className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--pz-gold)" }} />
                <h2 className="text-xl font-bold" style={{ fontFamily: "'DM Serif Display',serif" }}>Your Calibration Report</h2>
                <p className="text-sm mt-1" style={{ color: "var(--pz-text-muted)" }}>How well does your confidence match your actual knowledge?</p>
              </div>

              {results.map((result, i) => {
                const cal = getCalibrationLabel(result.confidence, result.score)
                return (
                  <div key={i} className="p-5 rounded-none space-y-4" style={card}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--pz-text)" }}>{result.topic}</p>
                        <p className="text-xs mt-0.5" style={{ color: cal.color }}>{cal.icon} {cal.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: "var(--pz-text)", fontFamily: "'DM Mono',monospace" }}>{result.score}%</p>
                        <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>actual score</p>
                      </div>
                    </div>

                    {/* Confidence vs Score bar */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--pz-text-muted)" }}>
                          <span>Confidence ({CONFIDENCE_LABELS[result.confidence]})</span>
                          <span>{result.confidence * 20}%</span>
                        </div>
                        <div className="h-2 rounded-none" style={{ background: "var(--pz-surface3)" }}>
                          <div className="h-full rounded-none transition-all" style={{ width: `${result.confidence * 20}%`, background: CONFIDENCE_COLORS[result.confidence] }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--pz-text-muted)" }}>
                          <span>Actual Score</span>
                          <span>{result.score}%</span>
                        </div>
                        <div className="h-2 rounded-none" style={{ background: "var(--pz-surface3)" }}>
                          <div className="h-full rounded-none transition-all" style={{ width: `${result.score}%`, background: "#6366f1" }} />
                        </div>
                      </div>
                    </div>

                    {/* Wrong answers */}
                    {result.questions.filter(q => !q.isCorrect).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "var(--pz-text-muted)" }}>Missed questions:</p>
                        <div className="space-y-2">
                          {result.questions.filter(q => !q.isCorrect).map((q, j) => (
                            <div key={j} className="p-3 rounded-none text-xs space-y-1" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                              <p style={{ color: "var(--pz-text-2)" }}>{q.q}</p>
                              <p style={{ color: "#ef4444" }}>Your answer: {q.userAnswer}</p>
                              <p style={{ color: "#10b981" }}>Correct: {q.correct}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <button onClick={reset} className="w-full py-3 text-sm font-semibold rounded-none flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
                <RotateCcw className="h-4 w-4" /> Test Another Topic
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
