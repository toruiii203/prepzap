import { TextSkeleton } from "@/components/SkeletonLoader";
import { buildAIContext } from "@/lib/sourceContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ToolPageShell } from "@/pages/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, XCircle, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { MathRenderer } from "@/components/MathRenderer";

const TEAL = "#00C4B4";
const GOLD = "#E8B923";
const ROSE = "#ef4444";

export default function SpotError() {
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
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setInterval>|null>(null);
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
      setTimerRef(t);
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
      if (newFound.length >= errors.length) { if(timerRef)clearInterval(timerRef); setPhase("revealed"); }
    }
  };

  const reveal = () => { if(timerRef)clearInterval(timerRef); saveScore(found.length); setPhase("revealed"); };

  const mm = String(Math.floor(timeLeft/60)).padStart(2,"0");
  const ss = String(timeLeft%60).padStart(2,"0");

  return (
    <ToolPageShell>
      <main style={{ flex: 1, padding: "24px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#ef4444,#f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Spot the Error</h1>
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
                <h2 style={{ fontSize: 18, fontWeight: 900, color: "#F0F0F0", margin: "0 0 6px" }}>Spot the Error</h2>
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
    </ToolPageShell>
  );
}
