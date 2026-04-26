import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronLeft, Zap, FileText, AlertCircle, Loader2, RotateCcw, TrendingUp, BookOpen } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { callGroq } from "@/lib/groq"
import { loadLibrary, loadContext } from "@/lib/sourceContext"

interface HighYieldConcept {
  concept: string
  likelihood: number
  reason: string
  keyFacts: string[]
  examTip: string
}

export default function HighYieldDetector() {
  const [loading, setLoading] = useState(false)
  const [concepts, setConcepts] = useState<HighYieldConcept[]>([])
  const [error, setError] = useState<string | null>(null)
  const [examType, setExamType] = useState("")
  const [analyzed, setAnalyzed] = useState(false)

  const sources = loadLibrary()
  const ctx = loadContext()

  const activeSources = ctx.mode === "all"
    ? sources
    : ctx.mode === "selected"
    ? sources.filter(s => ctx.selectedIds.includes(s.id))
    : sources

  const sourceText = activeSources
    .filter(s => s.fullText || s.preview)
    .map(s => s.fullText || s.preview || "")
    .join("\n\n")
    .slice(0, 10000)

  const analyze = async () => {
    if (!sourceText) { setError("No source text found. Upload PDFs or notes to Source Library first."); return }
    setLoading(true)
    setError(null)

    const prompt = `You are an expert exam strategist. Analyze the following study material and identify the TOP 8 highest-yield concepts most likely to appear on ${examType || "an exam"}.

Study Material:
${sourceText}

Return ONLY valid JSON, no markdown:
{
  "concepts": [
    {
      "concept": "concept name",
      "likelihood": 95,
      "reason": "why this is high yield (1-2 sentences)",
      "keyFacts": ["fact 1", "fact 2", "fact 3"],
      "examTip": "specific tip for answering exam questions about this"
    }
  ]
}

Order by likelihood descending. Likelihood is a percentage 0-100.`

    try {
      const response = await callGroq(
        [{ role: "user", content: prompt }],
        "You are an exam strategist. Return only valid JSON.",
        "llama-3.3-70b-versatile",
        2000
      )
      const clean = response.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)
      setConcepts(parsed.concepts)
      setAnalyzed(true)
    } catch {
      setError("Failed to analyze. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const getLikelihoodColor = (l: number) => {
    if (l >= 85) return "#ef4444"
    if (l >= 70) return "#f59e0b"
    return "#10b981"
  }

  const getLikelihoodLabel = (l: number) => {
    if (l >= 85) return "Very High"
    if (l >= 70) return "High"
    return "Moderate"
  }

  const card: React.CSSProperties = { background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <div className="md:hidden flex items-center justify-between px-4 h-12 sticky top-0 z-40"
        style={{ background: "rgba(0,0,0,0.95)", borderBottom: "0.5px solid var(--pz-border)", backdropFilter: "blur(12px)" }}>
        <Link to="/dashboard" style={{ color: "var(--pz-text-muted)", display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <ChevronLeft size={14} /> Back
        </Link>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 16 }}>High Yield</span>
        <div style={{ width: 48 }} />
      </div>

      <div className="hidden md:flex items-center gap-3 px-8 py-4" style={{ borderBottom: "0.5px solid var(--pz-border)" }}>
        <Link to="/dashboard">
          <button className="flex items-center gap-1 text-xs" style={{ color: "var(--pz-text-muted)", background: "transparent", border: "none", cursor: "pointer" }}>
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
        </Link>
        <span style={{ color: "var(--pz-border)" }}>|</span>
        <TrendingUp className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>High Yield Detector</h1>
      </div>

      <BottomNav />

      <main className="flex-1 py-6 pb-24 md:pb-6">
        <div className="container mx-auto px-4 max-w-2xl">

          {!analyzed ? (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-none flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <TrendingUp className="h-8 w-8" style={{ color: "#f59e0b" }} />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'DM Serif Display',serif" }}>High Yield Detector</h2>
                <p className="text-sm" style={{ color: "var(--pz-text-muted)" }}>
                  AI scans your uploaded materials and flags the concepts most likely to appear on your exam.
                </p>
              </div>

              {/* Source status */}
              <div className="p-4 rounded-none" style={card}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>Source Materials</p>
                </div>
                {activeSources.length === 0 ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" style={{ color: "var(--pz-text-muted)" }} />
                    <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>No sources loaded.</p>
                    <Link to="/sources">
                      <button className="mt-2 text-xs px-3 py-1.5 rounded-none" style={{ background: "var(--pz-gold)", color: "#0A0A0C", border: "none", cursor: "pointer" }}>
                        Upload Materials →
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeSources.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-xs" style={{ color: "var(--pz-text-2)" }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.fullText ? "#10b981" : "#f59e0b" }} />
                        <span className="truncate">{s.name}</span>
                        <span style={{ color: "var(--pz-text-muted)", flexShrink: 0 }}>{s.fullText ? "✓ text" : "no text"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exam type */}
              <div className="p-4 rounded-none" style={card}>
                <label className="text-xs font-semibold uppercase tracking-wider mb-3 block" style={{ color: "var(--pz-text-muted)" }}>
                  Exam type (optional)
                </label>
                <input
                  type="text"
                  value={examType}
                  onChange={e => setExamType(e.target.value)}
                  placeholder="e.g. USMLE Step 1, Midterm, Finals, Board Exam..."
                  className="w-full px-3 py-2 text-sm rounded-none focus:outline-none"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                  onFocus={e => (e.target.style.borderColor = "var(--pz-gold)")}
                  onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
                />
              </div>

              {error && <p className="text-xs px-3 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>{error}</p>}

              <button
                onClick={analyze}
                disabled={loading || activeSources.length === 0}
                className="w-full py-4 text-sm font-bold rounded-none transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0A0A0C", opacity: loading || activeSources.length === 0 ? 0.5 : 1 }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing materials...</> : <><TrendingUp className="h-4 w-4" /> Detect High Yield Concepts</>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: "'DM Serif Display',serif" }}>High Yield Concepts</h2>
                  <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Ranked by exam likelihood</p>
                </div>
                <button onClick={() => { setAnalyzed(false); setConcepts([]) }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-none transition-all hover:opacity-70"
                  style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)", background: "transparent", cursor: "pointer" }}>
                  <RotateCcw className="h-3 w-3" /> Re-analyze
                </button>
              </div>

              {concepts.map((concept, i) => (
                <div key={i} className="p-5 rounded-none space-y-3" style={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-none flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: getLikelihoodColor(concept.likelihood), color: "#fff" }}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--pz-text)" }}>{concept.concept}</p>
                        <p className="text-xs" style={{ color: getLikelihoodColor(concept.likelihood) }}>
                          {getLikelihoodLabel(concept.likelihood)} likelihood
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold" style={{ color: getLikelihoodColor(concept.likelihood), fontFamily: "'DM Mono',monospace" }}>
                        {concept.likelihood}%
                      </p>
                    </div>
                  </div>

                  {/* Likelihood bar */}
                  <div className="h-1.5 rounded-none" style={{ background: "var(--pz-surface3)" }}>
                    <div className="h-full rounded-none transition-all" style={{ width: `${concept.likelihood}%`, background: getLikelihoodColor(concept.likelihood) }} />
                  </div>

                  <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{concept.reason}</p>

                  {/* Key facts */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--pz-text-2)" }}>Key facts to know:</p>
                    <div className="space-y-1">
                      {concept.keyFacts.map((fact, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs" style={{ color: "var(--pz-text-2)" }}>
                          <span style={{ color: "var(--pz-gold)", flexShrink: 0 }}>›</span>
                          <span>{fact}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exam tip */}
                  <div className="p-3 rounded-none" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "#f59e0b" }}>💡 Exam Tip</p>
                    <p className="text-xs" style={{ color: "var(--pz-text-2)" }}>{concept.examTip}</p>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link to="/ai-tutor">
                  <button className="w-full py-3 text-xs font-semibold rounded-none flex items-center justify-center gap-2"
                    style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-2)", cursor: "pointer" }}>
                    <BookOpen className="h-3.5 w-3.5" /> Study with AI
                  </button>
                </Link>
                <Link to="/practice">
                  <button className="w-full py-3 text-xs font-semibold rounded-none flex items-center justify-center gap-2"
                    style={{ background: "var(--pz-gold)", color: "#0A0A0C", border: "none", cursor: "pointer" }}>
                    <Zap className="h-3.5 w-3.5" /> Practice These
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
