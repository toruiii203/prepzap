import { useState, useRef, useCallback } from "react";
import { ToolHistorySidebar, useToolHistory, type ToolSession } from "@/components/ToolHistorySidebar"
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Map, Plus, Trash2, ArrowRight, Sparkles, RotateCcw } from "lucide-react";
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
  const { sessions: toolSessions, addSession, deleteSession } = useToolHistory(toolKey)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewSession = () => { setActiveSessionId(null) }
  const handleSelectSession = (s: ToolSession) => { setActiveSessionId(s.id) }


  const [phase, setPhase] = useState<"setup"|"mapping"|"scored">("setup");
  const [topic, setTopic] = useState("");
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{name:"Learner",xp:2450,streak:12,plan:"free"}}/>
      {/* History Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <ToolHistorySidebar
          toolKey="blankmap"
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          activeId={activeSessionId}
        />
        <div className="flex-1 overflow-auto">
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
            <div className="bg-card border border-border rounded-none p-5 space-y-4">
              <label className="font-semibold text-sm">Topic to map</label>
              {buildAIContext().length > 0 && !topicInput.trim() && (
                <button onClick={() => start()} className="w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ background: "rgba(212,175,90,0.1)", border: "1px solid rgba(212,175,90,0.35)", color: "var(--pz-gold, #d4af5a)" }}>
                  ⚡ Map "{getActiveSource()?.name?.replace(/\.\w+$/, "") ?? "Active Source"}"
                </button>
              )}
              <div className="flex gap-2">
                <input className="flex-1 px-4 py-3 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="e.g. Photosynthesis, Newton's Laws..."
                  value={topicInput} onChange={e=>setTopicInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&start()}/>
                <Button onClick={()=>start()} disabled={!topicInput.trim() && buildAIContext().length === 0} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:opacity-90">Start</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t=><button key={t} onClick={()=>start(t)} className="text-xs px-3 py-1.5 rounded-none border border-border hover:border-teal-400 hover:text-teal-500 transition-all">{t}</button>)}
              </div>
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
              <svg ref={svgRef} className="w-full h-full" onMouseMove={onMouseMove} onMouseUp={()=>setDragging(null)} onMouseLeave={()=>setDragging(null)}>
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
                  <g key={n.id} onMouseDown={()=>onMouseDown(n.id)} style={{cursor:"grab"}}>
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
        </div>
      </div>
    </div>
  );
}