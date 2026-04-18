import { useState, useEffect } from "react"
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ChevronLeft, ChevronDown, ChevronRight, Check,
  RotateCcw, Sparkles, BookOpen
} from "lucide-react"
import { callGroq } from "@/lib/groq"
import { RoadmapSkeleton } from "@/components/SkeletonLoader"
import { ActiveSourcePill } from "@/components/ActiveSourcePill"
import { buildAIContext, getActiveSource, onSourceChange } from "@/lib/sourceContext"


// ─── JSON Repair Utility ──────────────────────────────────────────────────────
function repairJSON(raw: string): string {
  // Strip markdown fences
  let s = raw.replace(/```json|```/g, "").trim()
  // Extract first JSON object
  const match = s.match(/\{[\s\S]*/)
  if (!match) return s
  s = match[0]
  // Balance braces/brackets
  let depth = 0, inStr = false, escape = false
  let last = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escape) { escape = false; continue }
    if (c === "\\" && inStr) { escape = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === "{" || c === "[") depth++
    else if (c === "}" || c === "]") { depth--; last = i }
    if (depth === 0) { s = s.slice(0, i + 1); break }
  }
  // If still unbalanced, close open structures
  if (depth > 0) {
    // Remove trailing comma if present before we close
    s = s.replace(/,\s*$/, "")
    for (let i = 0; i < depth; i++) s += "}"
  }
  return s
}

interface RoadmapNode {
  id: string
  title: string
  description: string
  resourceTip: string
}

interface RoadmapStage {
  id: string
  label: string
  color: string
  nodes: RoadmapNode[]
}

interface Roadmap {
  title: string
  description: string
  stages: RoadmapStage[]
}

const TOPIC_CATEGORIES = [
  { emoji: "🖥️", label: "Programming", topics: ["Python", "JavaScript", "Data Structures", "SQL"] },
  { emoji: "🎨", label: "Creative",    topics: ["UI/UX Design", "Video Editing", "Music Theory", "Drawing"] },
  { emoji: "📊", label: "Business",    topics: ["Digital Marketing", "Excel", "Finance Basics", "Public Speaking"] },
  { emoji: "🔬", label: "Science",     topics: ["Physics", "Biology", "Chemistry", "Statistics"] },
  { emoji: "🌍", label: "Language",    topics: ["English Grammar", "Spanish", "Japanese", "Filipino"] },
  { emoji: "🧠", label: "Skills",      topics: ["Critical Thinking", "Speed Reading", "Note Taking", "Time Management"] },
]

function lsKey(topic: string) {
  return `pz_roadmap_${topic.toLowerCase().replace(/\s+/g, "-")}`
}

function loadLearned(topic: string): Set<string> {
  try { const raw = localStorage.getItem(lsKey(topic)); return raw ? new Set(JSON.parse(raw)) : new Set() }
  catch { return new Set() }
}

function saveLearned(topic: string, ids: Set<string>) {
  localStorage.setItem(lsKey(topic), JSON.stringify([...ids]))
}

export default function ToolArchitect() {
  const toolKey = "toolarchitect"
  const lsKey = `pz_hist_${toolKey}`
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"select" | "loading" | "roadmap">("select")
  const [topic, setTopic] = useState("")
  const [input, setInput] = useState("")
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [learned, setLearned] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [activeSourceName, setActiveSourceName] = useState<string | null>(() => getActiveSource()?.name ?? null)

  // Keep source pill in sync
  useEffect(() => {
    return onSourceChange(() => setActiveSourceName(getActiveSource()?.name ?? null))
  }, [])

  const generate = async (t: string, attempt = 1) => {
    if (!t.trim()) return
    setTopic(t); setPhase("loading"); setError(null)
    if (attempt > 1) setRetrying(true)
    try {
      const raw = await callGroq(
        [{ role: "user", content: `Generate a concise learning roadmap for "${t}". Return ONLY valid JSON with exactly 5-7 stages, 3 sub-tasks each. Schema: {"title":"...","description":"1 sentence","stages":[{"id":"s1","label":"Stage Name","color":"#hex","nodes":[{"id":"s1n1","title":"Task","description":"2 sentences","resourceTip":"How to learn"}]}]}. Keep descriptions short to ensure valid JSON completion.` }],
        "You are a learning path expert. Return ONLY valid JSON. No markdown, no fences, no extra text. Limit output to 5-7 stages with 3 nodes each to ensure the response completes successfully." + buildAIContext(3000, 1),
        "llama-3.3-70b-versatile", 2500
      )
      let repaired = repairJSON(raw)
      const parsed = JSON.parse(repaired)
      setRoadmap(parsed); setLearned(loadLearned(t)); setPhase("roadmap")
    } catch (e) {
      if (attempt < 2) {
        // Auto-retry once on JSON parse failure
        setRetrying(true)
        setTimeout(() => generate(t, 2), 800)
        return
      }
      setRetrying(false)
      setError(e instanceof Error ? e.message : "Failed to generate roadmap. Please try again."); setPhase("select")
    }
  }

  const toggleLearned = (nodeId: string) => {
    const updated = new Set(learned)
    if (updated.has(nodeId)) updated.delete(nodeId); else updated.add(nodeId)
    setLearned(updated); saveLearned(topic, updated)
  }

  const toggleExpanded = (nodeId: string) => {
    const updated = new Set(expanded)
    if (updated.has(nodeId)) updated.delete(nodeId); else updated.add(nodeId)
    setExpanded(updated)
  }

  const newTopic = () => { setPhase("select"); setInput(""); setRoadmap(null); setError(null) }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="toolarchitect"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-none bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg"><BookOpen className="h-4 w-4 text-white"/></div>
                Roadmap Generator
              </h1>
              <p className="text-xs text-muted-foreground">Learn anything — from zero to mastery.</p>
            </div>
            {phase === "roadmap" && <Button variant="outline" size="sm" onClick={newTopic} className="gap-1"><RotateCcw className="h-3.5 w-3.5"/>New Topic</Button>}
          </div>

          {/* Active source indicator */}
          <ActiveSourcePill className="mb-4" />

          {phase === "select" && (
            <div className="space-y-6">
              {/* Active source pill */}
              {activeSourceName && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-none text-xs" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                  <span style={{ color: "var(--pz-text-muted)" }}>Context:</span>
                  <span className="font-medium truncate max-w-xs" style={{ color: "var(--pz-teal)" }}>{activeSourceName}</span>
                  <Button
                    size="sm"
                    onClick={() => generate(activeSourceName.replace(/\.\w+$/, ""))}
                    className="ml-auto h-6 text-xs px-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:opacity-90"
                  >
                    ⚡ Generate Roadmap
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="What do you want to learn? (e.g. Machine Learning, Guitar, Spanish)"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && input.trim() && generate(input.trim())}
                />
                <Button onClick={() => input.trim() && generate(input.trim())} disabled={!input.trim()} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:opacity-90 px-5 gap-2">
                  <Sparkles className="h-4 w-4"/>Generate
                </Button>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
              {TOPIC_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{cat.emoji}</span>
                    <h2 className="font-semibold text-sm text-muted-foreground">{cat.label}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cat.topics.map(t => (
                      <button key={t} onClick={() => generate(t)} className="px-3 py-1.5 rounded-none border border-border text-sm hover:border-amber-500 hover:text-amber-500 transition-colors">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {phase === "loading" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-12 h-12 rounded-none bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center animate-pulse">
                  <BookOpen className="h-6 w-6 text-white"/>
                </div>
                <p className="font-bold">{retrying ? "Retrying with repaired JSON…" : `Generating your ${topic} roadmap…`}</p>
                <p className="text-sm text-muted-foreground">{retrying ? "Almost there — fixing the response…" : "Mapping the journey from zero to mastery"}</p>
                <div className="flex gap-1">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-none bg-amber-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
              </div>
              <RoadmapSkeleton />
            </div>
          )}

          {phase === "roadmap" && roadmap && (
            <div className="space-y-6">
              <div className="p-5 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'DM Serif Display', serif" }}>{roadmap.title}</h2>
                <p className="text-sm text-muted-foreground">{roadmap.description}</p>
                <div className="flex flex-wrap gap-4 mt-3">
                  {roadmap.stages.map(s => {
                    const done = s.nodes.filter(n => learned.has(n.id)).length
                    return (
                      <div key={s.id} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-none" style={{ background: s.color }}/>
                        <span className="text-xs text-muted-foreground">{s.label}: {done}/{s.nodes.length}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {roadmap.stages.map((stage, si) => {
                const stageLearnedCount = stage.nodes.filter(n => learned.has(n.id)).length
                const stageProgress = stage.nodes.length > 0 ? Math.round((stageLearnedCount / stage.nodes.length) * 100) : 0
                return (
                  <div key={stage.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-6 h-6 rounded-none flex items-center justify-center text-xs font-bold text-white" style={{ background: stage.color }}>{si+1}</div>
                      <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: stage.color }}>Stage {si+1}: {stage.label}</h3>
                      <div className="flex-1 mx-2"><Progress value={stageProgress} className="h-1"/></div>
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{stageLearnedCount}/{stage.nodes.length}</span>
                    </div>
                    <div className="pl-3 border-l-2 space-y-2" style={{ borderColor: `${stage.color}30` }}>
                      {stage.nodes.map(node => {
                        const isLearned = learned.has(node.id)
                        const isExpanded = expanded.has(node.id)
                        return (
                          <div key={node.id} className="relative">
                            <div className="absolute -left-[17px] top-3 w-3 h-3 rounded-none flex items-center justify-center"
                              style={{ background: isLearned ? stage.color : "var(--pz-surface3)", border: `1px solid ${stage.color}` }}>
                              {isLearned && <Check className="h-2 w-2 text-white"/>}
                            </div>
                            <div className="ml-2 p-3 rounded-none" style={{ background: isLearned ? `${stage.color}10` : "var(--pz-surface2)", border: `1px solid ${isLearned ? `${stage.color}40` : "var(--pz-border)"}` }}>
                              <div className="flex items-center gap-2">
                                <button onClick={() => toggleLearned(node.id)}
                                  className="w-4 h-4 rounded-none flex items-center justify-center flex-shrink-0 transition-all"
                                  style={{ background: isLearned ? stage.color : "transparent", border: `1px solid ${isLearned ? stage.color : "var(--pz-border)"}` }}>
                                  {isLearned && <Check className="h-2.5 w-2.5 text-white"/>}
                                </button>
                                <span className="flex-1 text-sm font-medium" style={{ color: isLearned ? "var(--pz-text-muted)" : "var(--pz-text)", textDecoration: isLearned ? "line-through" : "none" }}>
                                  {node.title}
                                </span>
                                <button onClick={() => toggleExpanded(node.id)} className="flex-shrink-0 transition-opacity hover:opacity-70" style={{ color: "var(--pz-text-muted)" }}>
                                  {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--pz-border)" }}>
                                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{node.description}</p>
                                  <div className="flex items-start gap-1.5 mt-2">
                                    <BookOpen className="h-3 w-3 flex-shrink-0 mt-0.5" style={{ color: stage.color }}/>
                                    <p className="text-xs" style={{ color: stage.color }}>{node.resourceTip}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {(() => {
                const allNodes = roadmap.stages.flatMap(s => s.nodes)
                const total = allNodes.length
                const done = allNodes.filter(n => learned.has(n.id)).length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div className="p-4 rounded-none text-center" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                    <p className="text-sm font-medium mb-2" style={{ color: "var(--pz-text)" }}>Overall Progress: {done} / {total} topics learned ({pct}%)</p>
                    <Progress value={pct} className="h-2"/>
                    {pct === 100 && <p className="text-xs mt-2" style={{ color: "var(--pz-gold)" }}>🏆 Mastery achieved! You've completed the entire roadmap.</p>}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
        </div>
      </div>
  )
}
