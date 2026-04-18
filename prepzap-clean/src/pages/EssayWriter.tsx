import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, PenLine, Sparkles, RotateCcw, Copy, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { callGroq } from "@/lib/groq"
import { HistorySidebar, ModelSelector, useFileAttach, FileBadge, type HistoryEntry } from "@/components/ToolShell"

const ESSAY_TYPES = [
  { id: "argumentative", label: "Argumentative",  emoji: "⚔️",  desc: "Take a stance & defend it"        },
  { id: "expository",    label: "Expository",     emoji: "📖",  desc: "Explain a topic clearly"           },
  { id: "analytical",   label: "Analytical",     emoji: "🔍",  desc: "Break down & examine deeply"       },
  { id: "narrative",    label: "Narrative",      emoji: "📖",  desc: "Tell a compelling story"           },
  { id: "compare",      label: "Compare & Contrast", emoji: "⚖️", desc: "Examine two sides"             },
  { id: "outline",      label: "Outline Only",   emoji: "📋",  desc: "Get a structured plan first"       },
]

const TONES = ["Academic", "Conversational", "Formal", "Persuasive", "Creative"]
const LENGTHS = [
  { id: "short",  label: "Short",   desc: "~300 words", words: 300   },
  { id: "medium", label: "Medium",  desc: "~600 words", words: 600   },
  { id: "long",   label: "Long",    desc: "~1000 words", words: 1000 },
]

// History uses HistoryEntry from ToolShell

export default function EssayWriter() {

  const [showHistory, setShowHistory] = useState(false)
  const [topic, setTopic]         = useState("")
  const [essayType, setEssayType] = useState("argumentative")
  const [tone, setTone]           = useState("Academic")
  const [length, setLength]       = useState("medium")
  const [extraInstructions, setExtraInstructions] = useState("")
  const [result, setResult]       = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [history, setHistory]     = useState<HistoryEntry[]>(() => loadHistory("essaywriter"))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pendingFile, setPendingFile, FileAttachButton } = useFileAttach()

  const selectedLength = LENGTHS.find(l => l.id === length)!

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setResult("")
    try {
      const typeLabels: Record<string, string> = {
        argumentative: "an argumentative essay that takes a clear stance and defends it with evidence",
        expository:    "an expository essay that clearly explains the topic with examples and evidence",
        analytical:    "an analytical essay that breaks the topic into components and examines each deeply",
        narrative:     "a narrative essay that tells a compelling story related to the topic",
        compare:       "a compare and contrast essay examining two sides or perspectives",
        outline:       "a detailed essay outline with thesis, main points, sub-points, and conclusion notes",
      }

      const systemPrompt = `You are an expert academic writing tutor. Write clearly structured essays with:
- A compelling introduction with a strong thesis statement
- Well-developed body paragraphs with topic sentences, evidence, and analysis
- Smooth transitions between paragraphs
- A strong conclusion that reinforces the thesis
- ${tone} tone throughout
- Approximately ${selectedLength.words} words
Use clear paragraph breaks. For outlines, use numbered sections and bullet points.`

      const userPrompt = `Write ${typeLabels[essayType]} on the topic: "${topic}".
${extraInstructions ? `Additional instructions: ${extraInstructions}` : ""}`

      const res = await callGroq(
        [{ role: "user", content: userPrompt }],
        systemPrompt, "llama-3.3-70b-versatile", 3000
      )
      setResult(res)
      setHistory(prev => addHistoryEntry("essaywriter", {
        id: `${Date.now()}`,
        title: topic.slice(0, 60),
        subtitle: essayType,
        timestamp: new Date(),
        data: { topic: topic.slice(0, 60), type: essayType, result: res },
      }, prev))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const copyResult = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = result ? result.split(/\s+/).filter(Boolean).length : 0

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">

          <div className="flex items-center gap-3 mb-6">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4" /> Dashboard</Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-none bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20"><PenLine className="h-4 w-4 text-white" /></div> Essay Writer
              </h1>
              <p className="text-sm text-muted-foreground">AI-powered essays — any topic, any style</p>
            </div>
            {history.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowHistory(s => !s)} className="gap-1 shrink-0">
                History
                <ChevronDown className={cn("h-3 w-3 transition-transform", showHistory && "rotate-180")} />
              </Button>
            )}
          </div>

          {/* History */}
          {showHistory && history.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Essays</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                {history.map(h => {
                  const d = h.data as { topic: string; type: string; result: string };
                  return (
                    <button key={h.id} onClick={() => { setResult(d.result); setShowHistory(false) }}
                      className="w-full text-left p-3 rounded-none bg-muted/40 hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {h.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs truncate font-medium">{d.topic}</p>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">

              {/* Essay type */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Essay Type</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {ESSAY_TYPES.map(t => (
                    <button key={t.id} onClick={() => setEssayType(t.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-none text-left transition-all border",
                        essayType === t.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-transparent hover:border-border hover:bg-muted/40"
                      )}>
                      <span className="text-lg">{t.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                      {essayType === t.id && <div className="ml-auto w-2 h-2 rounded-none bg-blue-500 shrink-0" />}
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Tone */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tone</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map(t => (
                      <button key={t} onClick={() => setTone(t)}
                        className={cn(
                          "px-3 py-1 rounded-none text-xs font-medium border transition-all",
                          tone === t
                            ? "bg-blue-500 text-white border-blue-500"
                            : "border-border hover:border-blue-400 hover:text-blue-500"
                        )}>
                        {t}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Length */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Length</CardTitle></CardHeader>
                <CardContent className="flex gap-2">
                  {LENGTHS.map(l => (
                    <button key={l.id} onClick={() => setLength(l.id)}
                      className={cn(
                        "flex-1 p-2 rounded-none text-center border transition-all",
                        length === l.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-border hover:border-blue-300"
                      )}>
                      <p className="text-xs font-bold">{l.label}</p>
                      <p className="text-[10px] text-muted-foreground">{l.desc}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* Topic input */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Essay Topic or Prompt</label>
                    <textarea
                      className="w-full min-h-24 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="e.g. Should social media be regulated by governments?&#10;e.g. The causes and effects of climate change&#10;e.g. Compare capitalism and socialism"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5">Additional instructions (optional)</label>
                    <input
                      className="w-full px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Include references to specific historical events, focus on economic impacts..."
                      value={extraInstructions}
                      onChange={e => setExtraInstructions(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleGenerate}
                      disabled={loading || !topic.trim()}
                      className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
                    >
                      {loading
                        ? <><span className="animate-spin">⚙️</span> Writing...</>
                        : <><Sparkles className="h-4 w-4" /> Generate Essay</>}
                    </Button>
                    {(topic || result) && (
                      <Button variant="ghost" size="sm" onClick={() => { setTopic(""); setResult(""); setError(null); setExtraInstructions("") }}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    {result && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        ~{wordCount} words
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
                </Card>
              )}

              {result && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <PenLine className="h-4 w-4 text-blue-500" />
                        {ESSAY_TYPES.find(t => t.id === essayType)?.label} Essay
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{tone}</Badge>
                        <Button variant="ghost" size="sm" onClick={copyResult} className="gap-1 text-xs">
                          {copied
                            ? <><Check className="h-3.5 w-3.5 text-white/60" /> Copied</>
                            : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-none p-5 max-h-[600px] overflow-y-auto">
                      {result}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
