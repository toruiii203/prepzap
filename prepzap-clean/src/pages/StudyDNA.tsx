import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, Dna, Brain, Clock, TrendingUp, Zap, RotateCcw, Loader2 } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { callGroq } from "@/lib/groq"

interface StudyDNAProfile {
  learningStyle: string
  peakHours: string
  strengths: string[]
  weaknesses: string[]
  studyPatterns: string[]
  recommendations: string[]
  personalityType: string
  personalityDesc: string
}

const DNA_QUESTIONS = [
  { id: "style", question: "When learning something new, you prefer to:", options: ["Read detailed explanations", "See diagrams and visuals", "Try it hands-on first", "Discuss it with someone"] },
  { id: "time", question: "When do you feel most focused?", options: ["Early morning (6AM-10AM)", "Late morning (10AM-12PM)", "Afternoon (12PM-5PM)", "Evening/Night (5PM+)"] },
  { id: "struggle", question: "You struggle most with:", options: ["Abstract concepts", "Memorizing facts", "Applying theory to problems", "Staying motivated"] },
  { id: "session", question: "Your typical study session is:", options: ["Short bursts (15-20 min)", "Medium sessions (30-45 min)", "Long focused blocks (1hr+)", "Variable — depends on mood"] },
  { id: "mistake", question: "When you get something wrong, you:", options: ["Review it immediately", "Move on and come back later", "Ask for an explanation", "Try a different approach"] },
  { id: "goal", question: "Your main study goal is:", options: ["Pass exams with high grades", "Actually understand the subject", "Build practical skills", "Complete the course quickly"] },
  { id: "distraction", question: "Your biggest distraction while studying is:", options: ["Phone/social media", "Background noise", "Other thoughts/anxiety", "Boredom with the material"] },
  { id: "retention", question: "You retain information best when you:", options: ["Write it down in notes", "Create summaries/mind maps", "Teach it to someone else", "Do practice questions"] },
]

export default function StudyDNA() {
  const [step, setStep] = useState<"intro" | "quiz" | "generating" | "results">("intro")
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [profile, setProfile] = useState<StudyDNAProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedProfile, setSavedProfile] = useState<StudyDNAProfile | null>(() => {
    try { return JSON.parse(localStorage.getItem("pz_study_dna") || "null") } catch { return null }
  })

  const handleAnswer = async (answer: string) => {
    const q = DNA_QUESTIONS[currentQ]
    const newAnswers = { ...answers, [q.id]: answer }
    setAnswers(newAnswers)

    if (currentQ + 1 < DNA_QUESTIONS.length) {
      setCurrentQ(i => i + 1)
    } else {
      setStep("generating")
      await generateProfile(newAnswers)
    }
  }

  const generateProfile = async (ans: Record<string, string>) => {
    const prompt = `Based on these study habit answers, create a personalized Study DNA profile:

${DNA_QUESTIONS.map(q => `${q.question}\nAnswer: ${ans[q.id]}`).join("\n\n")}

Return ONLY valid JSON:
{
  "learningStyle": "Visual/Auditory/Reading-Writing/Kinesthetic learner",
  "peakHours": "their optimal study time",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "studyPatterns": ["pattern observation 1", "pattern observation 2", "pattern observation 3"],
  "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3", "specific recommendation 4"],
  "personalityType": "The [Name] Learner (e.g. The Strategic Learner)",
  "personalityDesc": "2-3 sentence description of their learning personality"
}`

    try {
      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are a learning psychologist. Return only valid JSON.",
        "llama-3.3-70b-versatile",
        1500
      )
      const clean = response.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)
      setProfile(parsed)
      setSavedProfile(parsed)
      localStorage.setItem("pz_study_dna", JSON.stringify(parsed))
      setStep("results")
    } catch {
      setError("Failed to generate profile. Try again.")
      setStep("quiz")
      setCurrentQ(DNA_QUESTIONS.length - 1)
    }
  }

  const reset = () => {
    setStep("intro")
    setCurrentQ(0)
    setAnswers({})
    setProfile(null)
    setError(null)
  }

  const displayProfile = profile || savedProfile
  const card: React.CSSProperties = { background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.95)", borderBottom: "0.5px solid var(--pz-border)", backdropFilter: "blur(12px)" }}>
        <Link to="/dashboard" style={{ color: "var(--pz-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16 }}>Study DNA</span>
        {displayProfile && <button onClick={reset} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--pz-text-muted)", fontSize: 11 }}>Retake</button>}
      </div>

      <div className="hidden md:flex items-center gap-3 px-8 py-4" style={{ borderBottom: "0.5px solid var(--pz-border)" }}>
        <Link to="/dashboard">
          <button className="flex items-center gap-1 text-xs" style={{ color: "var(--pz-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <span style={{ color: "var(--pz-border)" }}>|</span>
        <Dna className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Study DNA</h1>
        {displayProfile && (
          <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none"
            style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
            <RotateCcw className="h-3 w-3" /> Retake
          </button>
        )}
      </div>

      <BottomNav />

      <main className="flex-1 py-6 pb-24 md:pb-6">
        <div className="container mx-auto px-4 max-w-xl">

          {/* INTRO */}
          {step === "intro" && !savedProfile && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(192,160,96,0.1)", border: "1px solid rgba(192,160,96,0.2)" }}>
                  <Dna className="h-8 w-8" style={{ color: "var(--pz-gold)" }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display',serif" }}>Study DNA</h2>
                <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>
                  Answer 8 questions to discover your unique learning profile — how you learn best, your peak hours, and personalized recommendations.
                </p>
              </div>

              <div className="p-5 rounded-none space-y-3" style={card}>
                {[
                  { icon: Brain, text: "Discover your learning style" },
                  { icon: Clock, text: "Find your peak study hours" },
                  { icon: TrendingUp, text: "Identify your strengths & weaknesses" },
                  { icon: Zap, text: "Get personalized study recommendations" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm" style={{ color: "var(--pz-text-2)" }}>
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: "var(--pz-gold)" }} />
                    {text}
                  </div>
                ))}
              </div>

              <button onClick={() => setStep("quiz")} className="w-full py-4 text-sm font-bold rounded-none transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, var(--pz-gold), var(--pz-amber))", color: "#0A0A0C" }}>
                Discover My Study DNA
              </button>
            </div>
          )}

          {/* Show saved profile on intro if exists */}
          {step === "intro" && savedProfile && (() => {
            setStep("results")
            setProfile(savedProfile)
            return null
          })()}

          {/* QUIZ */}
          {step === "quiz" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Question {currentQ + 1} of {DNA_QUESTIONS.length}</p>
                <div className="flex gap-1">
                  {DNA_QUESTIONS.map((_, i) => (
                    <div key={i} className="w-5 h-1.5 rounded-none" style={{ background: i < currentQ ? "var(--pz-gold)" : i === currentQ ? "var(--pz-gold)" : "var(--pz-surface3)" }} />
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-none" style={card}>
                <p className="text-sm font-medium leading-relaxed mb-5" style={{ color: "var(--pz-text)" }}>
                  {DNA_QUESTIONS[currentQ].question}
                </p>
                <div className="space-y-2">
                  {DNA_QUESTIONS[currentQ].options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)}
                      className="w-full text-left px-4 py-3 text-sm rounded-none transition-all hover:opacity-80"
                      style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--pz-gold)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--pz-border)"}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>{error}</p>}
            </div>
          )}

          {/* GENERATING */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Dna className="h-10 w-10 animate-spin" style={{ color: "var(--pz-gold)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>Analyzing your Study DNA...</p>
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Building your personalized learner profile</p>
            </div>
          )}

          {/* RESULTS */}
          {step === "results" && displayProfile && (
            <div className="space-y-5">
              {/* Personality type */}
              <div className="p-5 rounded-none text-center" style={{ ...card, borderTop: "2px solid var(--pz-gold)" }}>
                <div className="w-14 h-14 rounded-none flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(192,160,96,0.1)", border: "1px solid rgba(192,160,96,0.2)" }}>
                  <Dna className="h-7 w-7" style={{ color: "var(--pz-gold)" }} />
                </div>
                <p className="text-xs mb-1" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Your Study DNA</p>
                <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display',serif", color: "var(--pz-gold)" }}>
                  {displayProfile.personalityType}
                </h2>
                <p className="text-sm" style={{ color: "var(--pz-text-2)", lineHeight: 1.7 }}>{displayProfile.personalityDesc}</p>
              </div>

              {/* Learning style & peak hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-none" style={card}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--pz-text-muted)" }}>Learning Style</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>{displayProfile.learningStyle}</p>
                </div>
                <div className="p-4 rounded-none" style={card}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--pz-text-muted)" }}>Peak Hours</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>{displayProfile.peakHours}</p>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-none" style={card}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#10b981" }}>Strengths</p>
                  <div className="space-y-1.5">
                    {displayProfile.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--pz-text-2)" }}>
                        <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>{s}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-none" style={card}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#ef4444" }}>Watch Out</p>
                  <div className="space-y-1.5">
                    {displayProfile.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--pz-text-2)" }}>
                        <span style={{ color: "#ef4444", flexShrink: 0 }}>!</span>{w}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Study patterns */}
              <div className="p-5 rounded-none" style={card}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--pz-text-muted)" }}>Your Study Patterns</p>
                <div className="space-y-2">
                  {displayProfile.studyPatterns.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--pz-text-2)" }}>
                      <span style={{ color: "var(--pz-gold)", flexShrink: 0 }}>›</span>{p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-5 rounded-none" style={{ ...card, borderTop: "2px solid var(--pz-gold)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--pz-gold)" }}>Personalized Recommendations</p>
                <div className="space-y-2">
                  {displayProfile.recommendations.map((r, i) => (
                    <div key={i} className="p-3 rounded-none text-xs" style={{ background: "rgba(192,160,96,0.05)", border: "1px solid rgba(192,160,96,0.1)", color: "var(--pz-text-2)" }}>
                      <span style={{ color: "var(--pz-gold)", marginRight: 6 }}>{i + 1}.</span>{r}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={reset} className="w-full py-3 text-sm font-semibold rounded-none flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
                <RotateCcw className="h-4 w-4" /> Retake Assessment
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
