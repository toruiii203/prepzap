import { BuddyCompanion } from "@/components/BuddyCompanion";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { ToolPageShell } from "@/components/ToolPageShell";
import { useState, useRef, useCallback, useEffect } from "react";
import { ConceptChipSelector } from "@/components/ConceptChipSelector";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Map, Plus, Trash2, ArrowRight, Sparkles, RotateCcw , Brain} from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface Node { id: string; label: string; x: number; y: number; }
interface Edge { from: string; to: string; label: string; }
interface IdealMap { nodes: {label:string}[]; edges: {from:string;to:string;label:string}[]; score:number; feedback:string; missing:string[]; }

const TOPICS = ["Photosynthesis","The Water Cycle","Newton's Laws","Supply and Demand","DNA Replication","The French Revolution"];

export default function BlankMap() {
  const toolKey = "blankmap"
  const lsKey = `pz_hist_${toolKey}`
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("blankmap"));



  const [phase, setPhase] = useState<"setup"|"mapping"|"scored">("setup");
  const [topic, setTopic] = useState("")
  const [branches, setBranches] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [newNode, setNewNode] = useState("");
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ideal, setIdeal] = useState<IdealMap|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [dragging, setDragging] = useState<string|null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const start = (t?: string) => {
    const top = (t ?? topicInput.trim()) || getActiveSource()?.name?.replace(/\.\w+$/, "");
    if (!top) return;
    setTopic(top); setNodes([]); setEdges([]); setPhase("mapping"); setIdeal(null);
  };

  // Auto-start from active source on mount
  useEffect(() => {
    const src = getActiveSource();
    if (src) {
      const name = src.name.replace(/\.\w+$/, "");
      setTopic(name);
      setNodes([]);
      setEdges([]);
      setPhase("mapping");
    }
  }, []);

  const addNode = () => {
    if (!newNode.trim()) return;
    const id = `n${Date.now()}`;
    const x = 80 + Math.random() * 340;
    const y = 60 + Math.random() * 200;
    setNodes(prev=>[...prev,{id,label:newNode.trim(),x,y}]);
    setNewNode("");
  };

  const addEdge = () => {
    if (!edgeFrom||!edgeTo||edgeFrom===edgeTo) return;
    setEdges(prev=>[...prev,{from:edgeFrom,to:edgeTo,label:edgeLabel||"→"}]);
    setEdgeFrom(""); setEdgeTo(""); setEdgeLabel("");
  };

  const submit = async () => {
    if (nodes.length < 2 || isLoading) return;
    setIsLoading(true); setError(null);
    const studentMap = `Nodes: ${nodes.map(n=>n.label).join(", ")}\nConnections: ${edges.map(e=>`${e.from}→${e.to} (${e.label})`).join(", ")}`;
    try {
      const sourceCtx = buildAIContext(2000, 1);
      const raw = await callGroq(
        [{role:"user",content:`Topic: "${topic}"\nStudent's concept map:\n${studentMap}${sourceCtx}\n\nScore their map and show the ideal. Return ONLY valid JSON:\n{"nodes":[{"label":"..."}],"edges":[{"from":"node label","to":"node label","label":"relationship"}],"score":0-100,"feedback":"2-sentence honest assessment","missing":["concept or connection they missed"]}`}],
        `You are an expert educator evaluating concept maps for "${topic}". Score on: completeness of key concepts (40pts), accuracy of connections (40pts), depth of relationships (20pts). Be honest. Most student maps miss important things.`,
        "llama-3.3-70b-versatile", 800
      );
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0]??clean);
      setIdeal(parsed); setPhase("scored");
    } catch(e) { setError(e instanceof Error?e.message:"Error"); }
    finally { setIsLoading(false); }
  };

  const onMouseDown = (id: string) => setDragging(id);
  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging||!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setNodes(prev=>prev.map(n=>n.id===dragging?{...n,x:e.clientX-rect.left,y:e.clientY-rect.top}:n));
  },[dragging]);

  // Touch support for mobile drag
  const onTouchStart = useCallback((id: string, e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(id);
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    setNodes(prev => prev.map(n => n.id === dragging ? { ...n, x: touch.clientX - rect.left, y: touch.clientY - rect.top } : n));
  }, [dragging]);

  return (
    <ToolPageShell>
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00C4B4", marginBottom: 2 }}>Mind Map History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("blankmap", "all"); setToolHistory([]); }}
                style={{ fontSize: 10, color: "#444", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: "2px 6px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}>Clear all</button>
            )}
            <button onClick={() => setSidebarOpen(false)}
              style={{ width: 26, height: 26, border: "0.5px solid #1E2A2A", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
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
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No mind map history yet</div>
              <div style={{ fontSize: 11, color: "#333" }}>Sessions will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...toolHistory].reverse().map((entry) => (
                <div key={entry.id}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A2626", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
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
      <main className="flex-1 w-full p-4 py-6 md:max-w-3xl md:mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4"/>Dashboard</Button></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-none bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center"><Map className="h-4 w-4 text-white"/></div>
              Blank Map
            </h1>
            <p className="text-xs text-muted-foreground">Draw concept connections yourself — AI reveals the ideal map and scores yours</p>
          </div>
        </div>

        {phase==="setup" && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto shadow-lg"><Map className="h-8 w-8 text-white"/></div>
              <h2 className="text-xl font-bold">Blank Map</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">Pick a topic, add concepts as nodes, draw the connections between them. Then submit — AI reveals the ideal map and scores your understanding.</p>
            </div>
            <div className="bg-card border border-border rounded-none p-5">
              <ConceptChipSelector
                onSelect={(t) => start(t)}
                placeholder="e.g. Photosynthesis, Newton's Laws…"
                label="Topic to map"
                staticChips={TOPICS}
              />
            </div>
          </div>
        )}

        {phase==="mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Topic: {topic}</Badge>
              <span className="text-xs text-muted-foreground">{nodes.length} nodes · {edges.length} connections</span>
            </div>
            {/* Canvas */}
            <div className="bg-card border border-border rounded-none overflow-hidden" style={{height:"280px"}}>
              <svg ref={svgRef} className="w-full h-full" style={{ touchAction: "none" }}
                onMouseMove={onMouseMove} onMouseUp={()=>setDragging(null)} onMouseLeave={()=>setDragging(null)}
                onTouchMove={onTouchMove} onTouchEnd={()=>setDragging(null)}>
                {edges.map((edge,i)=>{
                  const from=nodes.find(n=>n.label===edge.from||n.id===edge.from);
                  const to=nodes.find(n=>n.label===edge.to||n.id===edge.to);
                  if(!from||!to) return null;
                  const mx=(from.x+to.x)/2, my=(from.y+to.y)/2;
                  return <g key={i}>
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="hsl(var(--border))" strokeWidth="2" markerEnd="url(#arr)"/>
                    <text x={mx} y={my-6} textAnchor="middle" className="fill-muted-foreground" fontSize="10">{edge.label}</text>
                  </g>;
                })}
                <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="hsl(var(--muted-foreground))"/></marker></defs>
                {nodes.map(n=>(
                  <g key={n.id} onMouseDown={()=>onMouseDown(n.id)} onTouchStart={(e)=>onTouchStart(n.id,e)} style={{cursor:"grab"}}>
                    <circle cx={n.x} cy={n.y} r="28" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2"/>
                    <text x={n.x} y={n.y+4} textAnchor="middle" fontSize="11" className="fill-foreground font-medium select-none" style={{pointerEvents:"none"}}>{n.label.slice(0,12)}</text>
                  </g>
                ))}
              </svg>
              {nodes.length===0&&<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">Add nodes below, then drag them to arrange</div>}
            </div>
            {/* Add node */}
            <div className="flex gap-2">
              <input className="flex-1 px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Add concept node..." value={newNode} onChange={e=>setNewNode(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addNode()}/>
              <Button onClick={addNode} disabled={!newNode.trim()} size="sm" className="bg-teal-500 text-white hover:bg-teal-600"><Plus className="h-4 w-4"/></Button>
              {nodes.length > 0 && (
                <button title="Export as PNG"
                  onClick={() => {
                    if (!svgRef.current) return;
                    const svg = svgRef.current;
                    const bbox = svg.getBoundingClientRect();
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement("canvas");
                    canvas.width = bbox.width * 2; canvas.height = bbox.height * 2;
                    const ctx = canvas.getContext("2d")!;
                    ctx.fillStyle = "#03050F"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    const img = new Image();
                    img.onload = () => {
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      const a = document.createElement("a");
                      a.download = "mind-map.png";
                      a.href = canvas.toDataURL("image/png");
                      a.click();
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                  }}
                  style={{ padding: "6px 10px", background: "rgba(0,196,180,0.08)", border: "0.5px solid rgba(0,196,180,0.3)", color: "#00C4B4", cursor: "pointer", fontSize: 11, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  ↓ PNG
                </button>
              )}
            </div>
            {/* Add edge */}
            {nodes.length>=2&&(
              <div className="flex gap-2 items-center">
                <select className="flex-1 px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none" value={edgeFrom} onChange={e=>setEdgeFrom(e.target.value)}>
                  <option value="">From...</option>
                  {nodes.map(n=><option key={n.id} value={n.label}>{n.label}</option>)}
                </select>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0"/>
                <select className="flex-1 px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none" value={edgeTo} onChange={e=>setEdgeTo(e.target.value)}>
                  <option value="">To...</option>
                  {nodes.map(n=><option key={n.id} value={n.label}>{n.label}</option>)}
                </select>
                <input className="w-24 px-2 py-2 rounded-none border border-input bg-background text-xs focus:outline-none" placeholder="label" value={edgeLabel} onChange={e=>setEdgeLabel(e.target.value)}/>
                <Button onClick={addEdge} disabled={!edgeFrom||!edgeTo} size="sm" variant="outline">Add</Button>
              </div>
            )}
            {error&&<p className="text-sm text-red-500 bg-red-500/10 rounded-none p-3">{error}</p>}
            <Button onClick={submit} disabled={nodes.length<2||isLoading} className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90">
              {isLoading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-none animate-spin"/>:<><Sparkles className="h-4 w-4 mr-2"/>Submit & Score My Map</>}
            </Button>
          </div>
        )}

        {phase==="scored" && ideal && (
          <div className="space-y-4">
            <div className="text-center">
              <div className={cn("text-4xl font-bold",ideal.score>=80?"text-white/60":ideal.score>=60?"text-amber-500":"text-red-500")}>{ideal.score}<span className="text-xl">%</span></div>
              <p className="text-sm text-muted-foreground mt-1">{ideal.feedback}</p>
            </div>
            <div className="bg-card border border-border rounded-none p-4">
              <p className="text-xs font-bold text-teal-500 mb-3 uppercase tracking-wider">Ideal Concept Map</p>
              <div className="flex flex-wrap gap-2 mb-3">{ideal.nodes.map((n,i)=><span key={i} className="px-3 py-1.5 rounded-none bg-teal-500/10 border border-teal-500/20 text-xs text-teal-600 dark:text-teal-400">{n.label}</span>)}</div>
              <div className="space-y-1">{ideal.edges.map((e,i)=><div key={i} className="text-xs text-muted-foreground flex items-center gap-1"><span className="font-medium">{e.from}</span><ArrowRight className="h-3 w-3"/><span className="text-[10px] italic">{e.label}</span><ArrowRight className="h-3 w-3"/><span className="font-medium">{e.to}</span></div>)}</div>
            </div>
            {ideal.missing.length>0&&<div className="bg-amber-500/5 border border-amber-500/20 rounded-none p-4"><p className="text-xs font-bold text-amber-500 mb-2">You Missed</p>{ideal.missing.map((m,i)=><p key={i} className="text-xs text-muted-foreground mb-1">• {m}</p>)}</div>}
            <div className="flex gap-3">
              <Button onClick={()=>{setPhase("mapping");setNodes([]);setEdges([]);setIdeal(null);}} variant="outline" className="flex-1 gap-2"><RotateCcw className="h-4 w-4"/>Redo Map</Button>
              <Link to="/dashboard" className="flex-1"><Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90">Dashboard</Button></Link>
            </div>
          </div>
        )}
      </main>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
      </div>
      <BuddyCompanion />
    </ToolPageShell>
  );
}