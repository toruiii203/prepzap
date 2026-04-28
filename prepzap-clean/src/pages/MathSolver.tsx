import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Calculator, Sparkles, RotateCcw, BookOpen, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { callGroq } from "@/lib/groq"
import { HistorySidebar, ModelSelector, type HistoryEntry } from "@/components/ToolShell"
import { MathRenderer } from "@/components/MathRenderer"

const MATH_MODES = [
  { id: "solve",    label: "Solve Step-by-Step", emoji: "🔢", desc: "Full working shown"        },
  { id: "explain",  label: "Explain Concept",    emoji: "💡", desc: "Understand the why"        },
  { id: "practice", label: "Generate Problems",  emoji: "📝", desc: "Practice with similar Qs"  },
  { id: "check",    label: "Check My Work",      emoji: "✅", desc: "Verify your solution"      },
]

const TOPICS = [
  "Algebra", "Calculus", "Trigonometry", "Statistics", "Geometry",
  "Linear Algebra", "Differential Equations", "Number Theory", "Probability", "Discrete Math"
]

// (renderMath removed — using KaTeX-based MathRenderer component instead)

export default function MathSolver() {

  const [mode, setMode]       = useState("solve")
  const [input, setInput]     = useState("")
  const [result, setResult]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [copied, setCopied]   = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory("mathsolver"))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeSource, setActiveSource] = useState(() => getActiveSource())

  useEffect(() => {
    const sync = () => setActiveSource(getActiveSource())
    window.addEventListener("storage", sync)
    sync()
    return () => window.removeEventListener("storage", sync)
  }, [])


  const systemPrompt = `You are an expert mathematics tutor. Format your response using LaTeX and rich text formatting:

1. Use **bold** for all problem/section titles (e.g., **Problem 1: Linear Equations**)
2. Use \\[ ... \\] for display math (centered equations on their own line)
3. Use \\( ... \\) or $ ... $ for inline math variables like $x$, $y$, $n$
4. Use proper LaTeX for: fractions \\frac{a}{b}, exponents x^{2}, roots \\sqrt{x}, multiplication \\cdot
5. Show numbered steps with clear explanations in plain English between steps
6. End each problem with → The solution is [answer] on its own line
7. NEVER use code blocks or monospace font
8. Use \\div for division symbol when appropriate`

  const handleSubmit = async () => {
    if (!input.trim() && buildAIContext().length === 0 && !activeSource) return
    setLoading(true)
    setError(null)
    setResult("")
    const fileContext = buildAIContext()
    const userInput = input.trim()
    try {
      const modeInstructions: Record<string, string> = {
        solve:    `Solve this math problem step-by-step using LaTeX formatting, showing all working: ${userInput}${fileContext}`,
        explain:  `Explain this math concept clearly using LaTeX for all equations and formulas, with examples and visual descriptions: ${userInput}${fileContext}`,
        practice: `Generate 5 similar practice problems to: "${userInput}"${fileContext}. For each: show the question, a hint, then the full LaTeX-formatted solution.`,
        check:    `Check this math work using LaTeX formatting. Tell me if it's correct, identify any errors, and show the right solution if needed: ${userInput}${fileContext}`,
      }
      const res = await callGroq(
        [{ role: "user", content: modeInstructions[mode] }],
        systemPrompt, "llama-3.3-70b-versatile", 3000
      )
      setResult(res)
      // Save to history
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        title: input.slice(0, 50) || "Math",
        subtitle: mode,
        timestamp: new Date(),
        data: { input: input.slice(0, 80), result: res, mode },
      }
      setHistory(prev => addHistoryEntry("mathsolver", entry, prev))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg.includes("VITE_GROQ_API_KEY") ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file." : `Error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const copyResult = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // loadFromHistory removed — using HistorySidebar from ToolShell

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />

      <div className="container mx-auto px-4 pt-4 max-w-4xl"><GlobalContextBar compact /></div>
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">

          <HistorySidebar
            entries={history}
            activeId={null}
            onSelect={(e) => { const d = e.data as {input:string;result:string;mode:string}; setInput(d.input); setResult(d.result); setMode(d.mode); setSidebarOpen(false); }}
            onNew={() => { setInput(""); setResult(""); setError(null); setSidebarOpen(false); }}
            onDelete={(id) => setHistory(prev => deleteHistoryEntry("mathsolver", id, prev))}
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(v => !v)}
            newLabel="Clear"
          />

          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4" /> Dashboard</Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-none bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <Calculator className="h-4 w-4 text-white" />
                </div>
                Math Solver
              </h1>
              <p className="text-xs text-muted-foreground">AI-powered math help with LaTeX rendering</p>
            </div>
            <button onClick={() => setSidebarOpen(v => !v)}
              className="relative flex items-center justify-center w-8 h-8 rounded-none border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              {history.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-none bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">{history.length > 9 ? "9+" : history.length}</span>}
            </button>
            <ModelSelector />
          </div>
          {/* Mode selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {MATH_MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={cn("p-3 rounded-none border text-left transition-all",
                  mode === m.id ? "border-pink-500 bg-pink-500/10" : "border-border hover:border-pink-300")}>
                <div className="text-2xl mb-1">{m.emoji}</div>
                <p className="text-xs font-bold">{m.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                {mode === m.id && <div className="w-full h-0.5 bg-pink-500 rounded-none mt-2" />}
              </button>
            ))}
          </div>

          {/* Quick topics */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TOPICS.map(t => (
              <button key={t} onClick={() => setInput(prev => prev ? prev : t)}
                className="px-3 py-1 rounded-none border text-xs hover:border-pink-400 hover:text-pink-500 transition-colors">
                {t}
              </button>
            ))}
          </div>

          {/* Active Source Bar */}
          {activeSource && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 mb-3 rounded-none"
              style={{ background: "rgba(212,175,90,0.06)", border: "1px solid rgba(212,175,90,0.3)" }}>
              <span className="text-xs font-medium truncate" style={{ color: "var(--pz-gold, #E8B923)" }}>
                📄 Active: <strong>{activeSource.name}</strong>
              </span>
              <button
                onClick={() => setInput(`Explain the key math concepts from ${activeSource.name?.replace(/\.[^.]+$/, "") || "the source"}`)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(212,175,90,0.15)", border: "1px solid rgba(212,175,90,0.4)", color: "var(--pz-gold, #E8B923)" }}>
                ⚡ Use Source
              </button>
            </div>
          )}
          {/* Input */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <textarea
                className="w-full min-h-28 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                placeholder={
                  mode === "solve"    ? "e.g. Solve: 2x² + 5x - 3 = 0\ne.g. Find the integral of sin(x)cos(x)dx\ne.g. A train travels 60mph for 2.5 hours. How far?" :
                  mode === "explain"  ? "e.g. What is the chain rule?\ne.g. Explain eigenvalues and eigenvectors\ne.g. How does integration by parts work?" :
                  mode === "practice" ? "e.g. Quadratic equations\ne.g. Finding derivatives using product rule\ne.g. Probability with permutations" :
                  "Paste your work here:\ne.g. Problem: 2x + 3 = 7\nMy solution: x = 2"
                }
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit(); }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{input.length} chars</span>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSubmit} disabled={loading || (!input.trim() && buildAIContext().length === 0 && !activeSource)}
                    className="bg-pink-500 hover:bg-pink-600 text-white gap-2">
                    {loading ? <><span className="animate-spin">⚙️</span> Solving...</> : <><Sparkles className="h-4 w-4" /> {MATH_MODES.find(m=>m.id===mode)?.label}</>}
                  </Button>
                  {input && <Button variant="ghost" size="sm" onClick={() => { setInput(""); setResult(""); setError(null) }}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>}
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 mb-4">
              <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-pink-500" /> Solution
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={copyResult} className="gap-1 text-xs">
                    {copied ? <><Check className="h-3.5 w-3.5 text-white/60" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <MathRenderer content={result} className="text-sm px-2" />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
