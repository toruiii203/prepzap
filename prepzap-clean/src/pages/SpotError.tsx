import { BuddyCompanion } from "@/components/BuddyCompanion";
import { TextSkeleton } from "@/components/SkeletonLoader";
import { buildAIContext } from "@/lib/sourceContext";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { ToolPageShell } from "@/components/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, XCircle, RotateCcw, Timer , BrainCircuit} from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";
import { BottomNav } from "@/components/BottomNav";

const TEAL = "#8b1a2a";
const GOLD = "#f0a040";
const ROSE = "#ef4444";

export default function SpotError() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("spot-error"));
  const [phase, setPhase] = useState<"setup"|"hunt"|"revealed">("setup");
  const [topicInput, setTopicInput] = useState("");
  const [difficulty, setDifficulty] = useState<"easy"|"medium"|"hard">("medium");
  const [passage, setPassage] = useState("");
  const [errors, setErrors] = useState<{text:string;correction:string;explanation:string}[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [scores, setScores] = useState<{correct:number;total:number;played:number}>(() => {
    try { return JSON.parse(localStorage.getItem("pz_spoterror_scores") || '{"correct":0,"total":0,"played":0}'); } catch { return {correct:0,total:0,played:0}; }
  });
  const [timeLeft, setTimeLeft] = useState(90);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  const [selectedText, setSelectedText] = useState("");

  const start = async () => {
    if (!topicInput.trim() && buildAIContext().length === 0) return;
    setIsLoading(true); setError(null);
    const difficultyNote = difficulty === "easy" ? "Make errors obvious — wrong numbers or clearly swapped terms." : difficulty === "hard" ? "Make errors extremely subtle — plausible-sounding but factually wrong details that require deep knowledge to catch." : "Make errors moderately subtle — not obvious but detectable with good knowledge.";
    const timeLimit = difficulty === "easy" ? 120 : difficulty === "hard" ? 60 : 90;
    try {
      const topic = topicInput.trim() || "the source material";
      const sourceCtx = buildAIContext();
      let prompt: string;
      if (sourceCtx) {
        prompt = `${sourceCtx}\n\nUsing the source material above, write a short passage (4-6 sentences) about "${topic}" but introduce exactly 3 deliberate factual or logical errors. Difficulty: ${difficulty}. ${difficultyNote} Return ONLY valid JSON:\n{"passage":"...","errors":[{"text":"the exact wrong phrase","correction":"what it should be","explanation":"why it's wrong"}]}`;
      } else {
        prompt = `Create a short ${topic} passage (4-6 sentences) with exactly 3 deliberate factual or logical errors. Difficulty: ${difficulty}. ${difficultyNote} Return ONLY valid JSON:\n{"passage":"...","errors":[{"text":"the exact wrong phrase","correction":"what it should be","explanation":"why it's wrong"}]}`;
      }
      const raw = await callGroq(
        [{role:"user",content:prompt}],
        "You are a tricky educator. Write a convincing passage that sounds authoritative but has subtle errors.",
        "llama-3.3-70b-versatile", 800
      );
      const clean = raw.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean.match(/\{[\s\S]*\}/)?.[0]??clean);
      setPassage(parsed.passage); setErrors(parsed.errors); setFound([]);
      setTimeLeft(timeLimit); setPhase("hunt");
      const t = setInterval(()=>setTimeLeft(prev=>{if(prev<=1){clearInterval(t);saveScore(found.length);setPhase("revealed");return 0;}return prev-1;}),1000);
      timerRef.current = t;
    } catch(e) { setError(e instanceof Error?e.message:"Failed to generate passage"); }
    finally { setIsLoading(false); }
  };

  const saveScore = (foundCount: number) => {
    const newScores = { correct: scores.correct + foundCount, total: scores.total + errors.length, played: scores.played + 1 };
    setScores(newScores);
    try { localStorage.setItem("pz_spoterror_scores", JSON.stringify(newScores)); } catch {}
  };

  const markFound = () => {
    const sel = window.getSelection()?.toString().trim();
    if (!sel || found.includes(sel)) return;
    const isReal = errors.some(e=>passage.includes(e.text)&&sel.includes(e.text.split(" ")[0]));
    if (isReal) {
      const newFound = [...found, sel];
      setFound(newFound);
      if (newFound.length >= errors.length) { if(timerRef.current)clearInterval(timerRef.current); setPhase("revealed"); }
    }
  };

  const reveal = () => { if(timerRef.current)clearInterval(timerRef.current); saveScore(found.length); setPhase("revealed"); };

  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");


  // ── QuickLaunch prefill ────────────────────────────────────────────────────
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    const targetTool = sessionStorage.getItem("quicklaunch_tool");
    if (prefill && prefill.trim()) {
      setTopicInput(prefill);
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b1a2a", marginBottom: 2 }}>Error Hunt History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("spot-error", "all"); setToolHistory([]); }}
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
                <BrainCircuit size={16} style={{ color: "#333" }} />
              </div>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No error hunt history yet</div>
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
      <main style={{ flex: 1, padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#ef4444,#f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Error Hunt</h1>
              <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em" }}>FIND ALL 3 DELIBERATE MISTAKES BEFORE TIME RUNS OUT</p>
            </div>
          </div>

          {/* SETUP */}
          {phase === "setup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#ef4444,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Target style={{ width: 28, height: 28, color: "#fff" }} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#F0F0F0", margin: "0 0 6px" }}>Error Hunt</h2>
                <p style={{ fontSize: 12, color: "#555", margin: 0 }}>AI writes a passage with 3 hidden mistakes. Find them before the timer runs out.</p>
              </div>

              {/* Score tracker */}
              {scores.played > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Played", val: scores.played, color: GOLD },
                    { label: "Found", val: `${scores.correct}/${scores.total}`, color: TEAL },
                    { label: "Rate", val: `${Math.round((scores.correct/scores.total)*100)||0}%`, color: "#F0F0F0" },
                  ].map(s => (
                    <div key={s.label} style={{ padding: "10px 8px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "0.5px solid #1E1E1E" }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: s.color, margin: "0 0 4px", fontFamily: "monospace" }}>{s.val}</p>
                      <p style={{ fontSize: 10, color: "#555", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Difficulty */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#999", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Difficulty</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["easy","medium","hard"] as const).map(d => {
                      const col = d === "easy" ? TEAL : d === "hard" ? ROSE : GOLD;
                      return (
                        <button key={d} onClick={() => setDifficulty(d)}
                          style={{ flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", border: `0.5px solid ${difficulty === d ? col : "#252525"}`, background: difficulty === d ? `${col}12` : "transparent", color: difficulty === d ? col : "#555", fontFamily: "inherit", transition: "all .15s" }}>
                          {d === "easy" ? "Easy 2min" : d === "hard" ? "Hard 1min" : "Medium 90s"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#999", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Topic or paste your own text</label>
                  <textarea value={topicInput} onChange={e => setTopicInput(e.target.value)}
                    placeholder="e.g. 'Cell Biology', 'World War 2', or paste a paragraph..."
                    rows={3}
                    style={{ width: "100%", padding: "10px 12px", fontSize: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid #252525", color: "#F0F0F0", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>

                {buildAIContext().length > 0 && !topicInput.trim() && (
                  <button onClick={start} disabled={isLoading}
                    style={{ width: "100%", padding: "10px", background: "rgba(232,185,35,0.08)", border: `0.5px solid rgba(232,185,35,0.3)`, color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    ⚡ Generate from Active Source
                  </button>
                )}
                {error && <p style={{ fontSize: 12, color: ROSE, background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)", padding: "10px 12px" }}>{error}</p>}
                {isLoading && <TextSkeleton />}
                <button onClick={start} disabled={isLoading || (!topicInput.trim() && buildAIContext().length === 0)}
                  style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#ef4444,#f97316)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (isLoading || (!topicInput.trim() && buildAIContext().length === 0)) ? 0.5 : 1 }}>
                  {isLoading ? <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : <><Target style={{ width: 16, height: 16 }} />Generate Passage</>}
                </button>
              </div>
            </div>
          )}

          {/* HUNT */}
          {phase === "hunt" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Badge variant="secondary">{found.length} / {errors.length} found</Badge>
                <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: timeLeft <= 20 ? ROSE : "#555", display: "flex", alignItems: "center", gap: 4 }}>
                  <Timer style={{ width: 14, height: 14 }} />{mm}:{ss}
                </div>
                <button onClick={reveal}
                  style={{ padding: "4px 10px", border: "0.5px solid #252525", background: "transparent", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  Reveal All
                </button>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", padding: 20 }}>
                <p style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>Select the error text with your cursor, then click "Mark as Error"</p>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: "#C0C0C0", cursor: "text", userSelect: "text" as const }}
                  onMouseUp={() => setSelectedText(window.getSelection()?.toString() || "")}>
                  <MathRenderer content={passage} />
                </div>
              </div>

              {selectedText && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(232,185,35,0.06)", border: "0.5px solid rgba(232,185,35,0.3)" }}>
                  <span style={{ flex: 1, fontSize: 12, color: GOLD, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{selectedText}"</span>
                  <button onClick={markFound}
                    style={{ padding: "5px 12px", background: GOLD, color: "#000", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    Mark as Error
                  </button>
                  <button onClick={() => setSelectedText("")}
                    style={{ padding: "5px 8px", background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
                    ✕
                  </button>
                </div>
              )}

              {found.length > 0 && (
                <p style={{ fontSize: 12, color: TEAL }}>✅ Found {found.length} error{found.length > 1 ? "s" : ""}. Keep looking!</p>
              )}
            </div>
          )}

          {/* REVEALED */}
          {phase === "revealed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: found.length === errors.length ? TEAL : found.length >= 2 ? GOLD : ROSE, marginBottom: 4 }}>
                  {found.length}/{errors.length} Found
                </div>
                <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                  {found.length === errors.length ? "Perfect! You caught every error 🎉" : "Here's what you missed:"}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {errors.map((e, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525", padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <XCircle style={{ width: 16, height: 16, color: ROSE, marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, color: ROSE, textDecoration: "line-through", margin: "0 0 4px" }}>{e.text}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <CheckCircle2 style={{ width: 13, height: 13, color: TEAL }} />
                          <p style={{ fontSize: 13, color: TEAL, fontWeight: 600, margin: 0 }}>{e.correction}</p>
                        </div>
                        <p style={{ fontSize: 11, color: "#555", margin: 0 }}>{e.explanation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPhase("setup")}
                  style={{ flex: 1, padding: "10px", border: "0.5px solid #252525", background: "transparent", color: "#C0C0C0", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <RotateCcw style={{ width: 14, height: 14 }} /> New Passage
                </button>
                <Link to="/dashboard" style={{ flex: 1 }}>
                  <button style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg,#ef4444,#f97316)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Dashboard
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
          <BottomNav />
    </ToolPageShell>
  );
}
