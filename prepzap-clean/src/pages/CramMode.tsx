import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronLeft, Zap, Clock, BookOpen, Brain, Target, ArrowRight, Loader2 } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { callGroq } from "@/lib/groq"
import { buildAIContext } from "@/lib/sourceContext"
import { MathRenderer } from "@/components/MathRenderer"

interface CramPlan {
  timeAvailable: number
  examCount: number
  topics: string[]
  plan: string
}

const TIME_OPTIONS = [1, 2, 3, 6, 12, 24]
const EXAM_OPTIONS = [1, 2, 3, 4, 5]

export default function CramMode() {
  const navigate = useNavigate()
  const [step, setStep] = useState<"setup" | "generating" | "plan">("setup")
  const [hours, setHours] = useState(3)
  const [examCount, setExamCount] = useState(1)
  const [topics, setTopics] = useState("")
  const [cramPlan, setCramPlan] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const generatePlan = async () => {
    if (!topics.trim()) { setError("Please enter your exam topics."); return }
    setError(null)
    setStep("generating")

    const sourceCtx = buildAIContext()
    const topicList = topics.split(",").map(t => t.trim()).filter(Boolean)

    const prompt = `You are an expert study strategist. A student has ${hours} hour${hours !== 1 ? "s" : ""} to prepare for ${examCount} exam${examCount !== 1 ? "s" : ""}.

Topics/Exams: ${topicList.join(", ")}
${sourceCtx ? `\nStudy materials available:\n${sourceCtx}` : ""}

Create an EMERGENCY CRAM PLAN with:
1. **Time Breakdown** — Exact minutes per topic (must add up to ${hours * 60} minutes total, leave 10% buffer)
2. **Priority Order** — Which topics to study first and why (highest yield first)
3. **For each topic, provide:**
   - Key concepts to focus on (max 5 bullet points)
   - What to SKIP (low yield content)
   - Quick memory tricks or mnemonics
4. **Last 30 minutes** — What to do in the final stretch before the exam
5. **Emergency tips** — 3 things to do RIGHT NOW to maximize retention

Format with clear headers, be brutally practical, no fluff. Every minute counts.`

    try {
      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are an emergency study strategist. Be direct, practical, and time-focused.",
        "llama-3.3-70b-versatile",
        3000
      )
      setCramPlan(response)
      setStep("plan")
    } catch (err) {
      setError("Failed to generate plan. Check your API key.")
      setStep("setup")
    }
  }

  const card: React.CSSProperties = {
    background: "var(--pz-surface2)",
    border: "1px solid var(--pz-border)",
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.95)", borderBottom: "0.5px solid var(--pz-border)", backdropFilter: "blur(12px)" }}>
        <Link to="/dashboard" style={{ color: "var(--pz-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16, color: "var(--pz-text)" }}>Cram Mode</span>
        <div style={{ width: 48 }} />
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex items-center gap-3 px-8 py-4" style={{ borderBottom: "0.5px solid var(--pz-border)" }}>
        <Link to="/dashboard">
          <button className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{ color: "var(--pz-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <span style={{ color: "var(--pz-border)" }}>|</span>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>Emergency Cram Mode</h1>
        </div>
      </div>

      <BottomNav />

      <main className="flex-1 py-6 pb-24 md:pb-6">
        <div className="container mx-auto px-4 max-w-2xl">

          {step === "setup" && (
            <div className="space-y-6">
              {/* Hero */}
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(232,64,64,0.1)", border: "1px solid rgba(232,64,64,0.2)" }}>
                  <Zap className="h-8 w-8" style={{ color: "#E84040" }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display',serif" }}>
                  Emergency Cram Mode
                </h2>
                <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>
                  Tell us your situation — we'll build the most efficient study plan possible.
                </p>
              </div>

              {/* Time available */}
              <div className="p-5 rounded-none" style={card}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>How much time do you have?</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_OPTIONS.map(h => (
                    <button key={h} onClick={() => setHours(h)}
                      className="py-3 text-sm font-semibold rounded-none transition-all"
                      style={{
                        background: hours === h ? "var(--pz-gold)" : "var(--pz-surface3)",
                        color: hours === h ? "#0A0A0C" : "var(--pz-text-2)",
                        border: `1px solid ${hours === h ? "var(--pz-gold)" : "var(--pz-border)"}`,
                      }}>
                      {h}h
                    </button>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: "var(--pz-text-muted)" }}>
                  Selected: <span style={{ color: "var(--pz-gold)", fontFamily: "'DM Mono',monospace" }}>{hours} hour{hours !== 1 ? "s" : ""} = {hours * 60} minutes</span>
                </p>
              </div>

              {/* Number of exams */}
              <div className="p-5 rounded-none" style={card}>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>How many exams?</h3>
                </div>
                <div className="flex gap-2">
                  {EXAM_OPTIONS.map(n => (
                    <button key={n} onClick={() => setExamCount(n)}
                      className="flex-1 py-3 text-sm font-semibold rounded-none transition-all"
                      style={{
                        background: examCount === n ? "var(--pz-gold)" : "var(--pz-surface3)",
                        color: examCount === n ? "#0A0A0C" : "var(--pz-text-2)",
                        border: `1px solid ${examCount === n ? "var(--pz-gold)" : "var(--pz-border)"}`,
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div className="p-5 rounded-none" style={card}>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>What are your exam topics?</h3>
                </div>
                <textarea
                  value={topics}
                  onChange={e => setTopics(e.target.value)}
                  placeholder="e.g. Cell Biology, Organic Chemistry, Calculus derivatives..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-none focus:outline-none resize-none"
                  style={{
                    background: "var(--pz-surface3)",
                    border: "1px solid var(--pz-border)",
                    color: "var(--pz-text)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--pz-gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
                />
                <p className="text-xs mt-2" style={{ color: "var(--pz-text-muted)" }}>
                  Separate multiple topics with commas. The more specific, the better.
                </p>
              </div>

              {error && (
                <p className="text-xs px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  {error}
                </p>
              )}

              {/* Generate button */}
              <button
                onClick={generatePlan}
                className="w-full py-4 text-sm font-bold rounded-none transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #E84040, #C02020)", color: "#fff" }}>
                <Zap className="h-4 w-4" />
                Generate Emergency Plan
              </button>

              <p className="text-center text-xs" style={{ color: "var(--pz-text-muted)" }}>
                Upload study materials to <Link to="/sources" style={{ color: "var(--pz-gold)" }}>Source Library</Link> for a more personalized plan
              </p>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--pz-gold)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>Building your emergency plan...</p>
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Analyzing {hours}h available for {examCount} exam{examCount !== 1 ? "s" : ""}</p>
            </div>
          )}

          {step === "plan" && (
            <div className="space-y-4">
              {/* Plan header */}
              <div className="p-4 rounded-none flex items-center justify-between"
                style={{ background: "rgba(232,64,64,0.08)", border: "1px solid rgba(232,64,64,0.2)" }}>
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5" style={{ color: "#E84040" }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--pz-text)" }}>Your Emergency Plan</p>
                    <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>
                      {hours}h · {examCount} exam{examCount !== 1 ? "s" : ""} · {topics.split(",").length} topic{topics.split(",").length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <button onClick={() => setStep("setup")}
                  className="text-xs px-3 py-1.5 rounded-none transition-all hover:opacity-80"
                  style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
                  Regenerate
                </button>
              </div>

              {/* Plan content */}
              <div className="p-5 rounded-none" style={card}>
                <MathRenderer content={cramPlan} className="text-sm leading-relaxed" />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link to="/ai-tutor">
                  <button className="w-full py-3 text-xs font-semibold rounded-none flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-2)", cursor: "pointer" }}>
                    <Brain className="h-3.5 w-3.5" /> Ask AI Tutor
                  </button>
                </Link>
                <Link to="/practice">
                  <button className="w-full py-3 text-xs font-semibold rounded-none flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ background: "var(--pz-gold)", color: "#0A0A0C", border: "none", cursor: "pointer" }}>
                    <ArrowRight className="h-3.5 w-3.5" /> Start Practicing
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
