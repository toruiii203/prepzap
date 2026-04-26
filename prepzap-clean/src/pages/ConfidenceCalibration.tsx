import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ToolHeader } from "@/components/ToolShell";
import { Star, RefreshCw, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

type Confidence = "know" | "unsure" | "dont-know";

interface Question {
  id: string;
  text: string;
  answer: string;
  topic: string;
}

interface Response {
  questionId: string;
  confidence: Confidence;
  wasCorrect?: boolean;
}

export default function ConfidenceCalibration() {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [phase, setPhase] = useState<"setup" | "quiz" | "results">("setup");

  const handleGenerate = async () => {
    if (!subject.trim()) { toast.error("Enter a subject first"); return; }
    setLoading(true);
    try {
      const ctx = await buildAIContext();
      const prompt = `Generate 8 short-answer questions for confidence calibration on: "${subject}".
${ctx ? `Study context:\n${ctx}\n` : ""}
Return ONLY valid JSON array:
[{"id":"q1","text":"question","answer":"concise answer (1-2 sentences)","topic":"subtopic"}]`;
      const raw = await callGroq(prompt, "llama3-8b-8192");
      const parsed: Question[] = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setQuestions(parsed);
      setResponses([]);
      setRevealed([]);
      setPhase("quiz");
    } catch {
      toast.error("Failed to generate questions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const setConfidence = (qId: string, confidence: Confidence) => {
    setResponses(prev => {
      const existing = prev.find(r => r.questionId === qId);
      if (existing) return prev.map(r => r.questionId === qId ? { ...r, confidence } : r);
      return [...prev, { questionId: qId, confidence }];
    });
  };

  const revealAnswer = (qId: string) => setRevealed(prev => [...prev, qId]);

  const markCorrect = (qId: string, correct: boolean) => {
    setResponses(prev => prev.map(r => r.questionId === qId ? { ...r, wasCorrect: correct } : r));
  };

  const allAnswered = questions.length > 0 && questions.every(q => responses.find(r => r.questionId === q.id)?.wasCorrect !== undefined);

  const getResults = () => {
    const knew = responses.filter(r => r.confidence === "know" && r.wasCorrect).length;
    const overconfident = responses.filter(r => r.confidence === "know" && !r.wasCorrect).length;
    const underconfident = responses.filter(r => r.confidence === "dont-know" && r.wasCorrect).length;
    return { knew, overconfident, underconfident, total: questions.length };
  };

  const confBtnStyle = (q: Question, c: Confidence) => {
    const r = responses.find(r => r.questionId === q.id);
    const active = r?.confidence === c;
    const colors: Record<Confidence, string> = { "know": "var(--pz-teal)", "unsure": "var(--pz-gold)", "dont-know": "var(--pz-rose, #E84040)" };
    return {
      border: `1px solid ${active ? colors[c] : "var(--pz-border)"}`,
      background: active ? `${colors[c]}15` : "var(--pz-surface3)",
      color: active ? colors[c] : "var(--pz-text-muted)",
      padding: "6px 12px", fontSize: 11, cursor: "pointer", fontWeight: active ? 700 : 400,
    } as React.CSSProperties;
  };

  const results = phase === "results" ? getResults() : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg, #000)", color: "var(--pz-text, #F0E8D4)" }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <ToolHeader
          icon={<Star className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />}
          title="Confidence Calibration"
          subtitle="Find out what you actually know vs. what you think you know"
        />

        {phase === "setup" && (
          <div className="space-y-4 mt-6">
            <p className="text-sm" style={{ color: "var(--pz-text-2)" }}>
              Rate your confidence on each question <em>before</em> seeing the answer. Discover your blind spots and overconfident areas.
            </p>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Human Anatomy, JavaScript, French Revolution..."
                className="w-full px-3 py-2.5 rounded-none text-sm outline-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading || !subject.trim()} className="w-full py-3 rounded-none font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
              {loading ? "Generating questions..." : "Start Calibration →"}
            </Button>
          </div>
        )}

        {phase === "quiz" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>Rate confidence → Reveal → Mark correct/wrong</p>
              <span className="text-xs" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono',monospace" }}>{responses.filter(r => r.wasCorrect !== undefined).length}/{questions.length}</span>
            </div>

            {questions.map((q, i) => {
              const resp = responses.find(r => r.questionId === q.id);
              const isRevealed = revealed.includes(q.id);
              return (
                <div key={q.id} className="p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xs font-mono mt-0.5" style={{ color: "var(--pz-text-muted)" }}>Q{i + 1}</span>
                    <p className="text-sm" style={{ color: "var(--pz-text)" }}>{q.text}</p>
                  </div>

                  {!resp?.confidence && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {(["know", "unsure", "dont-know"] as Confidence[]).map(c => (
                        <button key={c} style={confBtnStyle(q, c)} onClick={() => setConfidence(q.id, c)}>
                          {c === "know" ? "✓ I know this" : c === "unsure" ? "~ Unsure" : "✗ Don't know"}
                        </button>
                      ))}
                    </div>
                  )}

                  {resp?.confidence && !isRevealed && (
                    <button onClick={() => revealAnswer(q.id)} className="text-xs px-3 py-1.5 rounded-none" style={{ border: "1px solid var(--pz-gold)", color: "var(--pz-gold)", background: "var(--pz-gold-dim)" }}>
                      Reveal Answer
                    </button>
                  )}

                  {isRevealed && (
                    <div className="mt-2 p-3 rounded-none" style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)" }}>
                      <p className="text-xs mb-3" style={{ color: "var(--pz-text-2)" }}>{q.answer}</p>
                      {resp?.wasCorrect === undefined && (
                        <div className="flex gap-2">
                          <button onClick={() => markCorrect(q.id, true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-none" style={{ border: "1px solid var(--pz-teal)", color: "var(--pz-teal)", background: "var(--pz-teal-dim)" }}>
                            <CheckCircle className="h-3 w-3" /> Got it
                          </button>
                          <button onClick={() => markCorrect(q.id, false)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-none" style={{ border: "1px solid var(--pz-rose, #E84040)", color: "var(--pz-rose, #E84040)", background: "rgba(232,64,64,0.06)" }}>
                            <XCircle className="h-3 w-3" /> Missed it
                          </button>
                        </div>
                      )}
                      {resp?.wasCorrect !== undefined && (
                        <span className="text-xs font-medium" style={{ color: resp.wasCorrect ? "var(--pz-teal)" : "var(--pz-rose, #E84040)" }}>
                          {resp.wasCorrect ? "✓ Correct" : "✗ Incorrect"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {allAnswered && (
              <Button onClick={() => setPhase("results")} className="w-full py-3 rounded-none font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
                See Results →
              </Button>
            )}
          </div>
        )}

        {phase === "results" && results && (
          <div className="mt-6 space-y-4">
            <h2 className="font-semibold text-lg" style={{ color: "var(--pz-text)" }}>Calibration Results</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Knew It", value: results.knew, color: "var(--pz-teal)", emoji: "✓" },
                { label: "Overconfident", value: results.overconfident, color: "var(--pz-rose, #E84040)", emoji: "⚠" },
                { label: "Underconfident", value: results.underconfident, color: "var(--pz-gold)", emoji: "↑" },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: `1px solid var(--pz-border)`, borderTop: `2px solid ${s.color}` }}>
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm p-3 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-2)" }}>
              {results.overconfident > 2 ? "Focus on reviewing topics you felt confident about — you have more blind spots than expected." :
               results.knew > 5 ? "Strong performance! Shore up your weak areas and you're ready." :
               "Good calibration. Keep practising the concepts you're unsure about."}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => { setPhase("setup"); setQuestions([]); }} className="flex-1 py-2.5 rounded-none text-sm" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                New Subject
              </Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 py-2.5 rounded-none text-sm" style={{ background: "var(--pz-gold)", color: "#000" }}>
                {loading ? "Loading..." : "Try Again"}
              </Button>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
