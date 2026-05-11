import { BuddyCompanion } from "@/components/BuddyCompanion";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useEffect } from "react"
import { ConceptChipSelector } from "@/components/ConceptChipSelector";
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ChevronLeft, ChevronDown, ChevronRight, Check,
  RotateCcw, Sparkles, BookOpen
, Brain} from "lucide-react"
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
  return `pz_roadmap_${topic.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("toolarchitect"));



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
    <ToolPageShell>
      <BuddyCompanion />
      {/* ── HISTORY SIDEBAR ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }} />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 100,
        width: 300, background: "#0A0D12", borderLeft: "0.5px solid #1E2A2A",
        display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: sidebarOpen ? "-8px 0 32px rgba(0,0,0,0.6)" : "none",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid #1A2626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b1a2a", marginBottom: 2 }}>Roadmap History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("toolarchitect", "all"); setToolHistory([]); }}
                style={{ fontSize: 10, color: "#444", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: "2px 6px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}>Clear all</button>
            )}
            <button onClick={() => setSidebarOpen(false)}
              style={{ width: 26, height: 26, border: "0.5px solid #1E2A2A", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E2A2A"; e.currentTarget.style.color = "#555"; }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {toolHistory.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, border: "0.5px solid #1E2A2A", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} style={{ color: "#333" }} />
              </div>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No roadmap history yet</div>
              <div style={{ fontSize: 11, color: "#333" }}>Sessions will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...toolHistory].reverse().map((entry) => (
                <div key={entry.id}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A2626", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1A2626"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#D0D0D0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 3, display: "flex", gap: 6 }}>
                    <span style={{ color: "#2A6A64" }}>{entry.subtitle}</span><span>·</span>
                    <span>{new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "0.5px solid #1A2626" }}>
          <div style={{ fontSize: 10, color: "#333", textAlign: "center" }}>Click any session to replay →</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
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
                </div>
              )}
              <ConceptChipSelector
                onSelect={(topic) => generate(topic)}
                placeholder="e.g. Machine Learning, Guitar, Spanish…"
                label="What do you want to learn?"
                staticChips={TOPIC_CATEGORIES.flatMap(c => c.topics).slice(0, 8)}
              />
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>
      </div>
    </ToolPageShell>
  );
}