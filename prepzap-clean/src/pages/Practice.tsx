import { useState, useRef, useCallback, useEffect } from "react";
import { ToolPageShell } from "@/components/ToolPageShell";
import { BottomNav } from "@/components/BottomNav";
import { useToolHistory, ToolHistorySidebar, type ToolSession } from "@/components/ToolHistorySidebar";
import {
  loadLibrary,
  loadContext,
  onSourceChange,
  type SourceFile,
  type SourceContextState,
} from "@/lib/sourceContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MCQOption { label: string; text: string }
interface MCQ {
  id: string;
  question: string;
  options: MCQOption[];
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

interface PracticeSession {
  topic: string;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  count: number;
  questions: MCQ[];
  answers: Record<string, string>;
  submitted: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD = "#f0a040";
const BG = "#160810";
const SURF = "#1f0b13";
const SURF2 = "#2a0e18";
const BORDER = "rgba(139,26,42,0.35)";
const TEXT = "#f5ede8";
const TEXT2 = "rgba(245,237,232,0.55)";
const TEXT3 = "rgba(245,237,232,0.28)";

const DIFF_COLORS = {
  easy: "#10b981",
  medium: "#f59e0b",
  hard: "#ef4444",
  mixed: "#8b5cf6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getActiveSourceFiles(
  files: SourceFile[],
  ctx: SourceContextState
): SourceFile[] {
  if (ctx.mode === "all") return files;
  if (ctx.mode === "selected") {
    const ids = ctx.selectedIds ?? [];
    return files.filter((f) => ids.includes(f.id));
  }
  return [];
}

function buildSourceSnippet(files: SourceFile[]): string {
  if (!files.length) return "";
  const combined = files
    .map((f) => `[Source: ${f.name}]\n${f.content ?? ""}`)
    .join("\n\n")
    .slice(0, 8000);
  return `\n\nUse the following source material to generate relevant questions:\n${combined}`;
}

// ─── AI Generation ────────────────────────────────────────────────────────────
async function generateMCQs(
  topic: string,
  difficulty: string,
  count: number,
  sourceSnippet: string
): Promise<MCQ[]> {
  const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  const systemPrompt = `You are a rigorous academic quiz generator. Generate exactly ${count} multiple-choice questions about: "${topic}".
Difficulty: ${difficulty}.${sourceSnippet}

RESPOND ONLY with a valid JSON array. No preamble, no markdown fences.
Format:
[
  {
    "id": "q1",
    "question": "...",
    "options": [
      {"label": "A", "text": "..."},
      {"label": "B", "text": "..."},
      {"label": "C", "text": "..."},
      {"label": "D", "text": "..."}
    ],
    "answer": "A",
    "explanation": "...",
    "difficulty": "${difficulty === "mixed" ? "medium" : difficulty}"
  }
]`;

  // Try Groq first
  if (GROQ_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content ?? "";
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* fall through to Gemini */ }
  }

  // Fallback: Gemini
  if (GEMINI_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* fall through */ }
  }

  throw new Error("Could not generate questions. Check your API keys in .env.");
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function ScoreBadge({ score, total }: { score: number; total: number }) {
  const pct = Math.round((score / total) * 100);
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: `${color}18`,
        border: `2px solid ${color}`,
        borderRadius: 12,
        padding: "10px 20px",
        color,
        fontFamily: "'Fredoka One', cursive",
        fontSize: 20,
      }}
    >
      {score}/{total} · {pct}%
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Practice() {
  // Source context — safe initialization (fixes "confirmedSources is not defined")
  const [sourceFiles, setSourceFiles] = useState<SourceFile[]>(() => {
    try { return loadLibrary(); } catch { return []; }
  });
  const [sourceCtx, setSourceCtx] = useState<SourceContextState>(() => {
    try { return loadContext(); } catch { return { mode: "none", selectedIds: [] }; }
  });

  useEffect(() => {
    try {
      return onSourceChange(() => {
        setSourceFiles(loadLibrary());
        setSourceCtx(loadContext());
      });
    } catch { return undefined; }
  }, []);

  // Derive active sources safely
  const activeSources = getActiveSourceFiles(sourceFiles, sourceCtx);

  // Session state
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("medium");
  const [count, setCount] = useState(5);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History sidebar
  const { sessions, addSession, deleteSession } = useToolHistory("practice");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Quick-launch prefill
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem("quicklaunch_prompt");
      const tool = sessionStorage.getItem("quicklaunch_tool");
      if (prefill && tool === "/practice") {
        setTopic(prefill);
        sessionStorage.removeItem("quicklaunch_prompt");
        sessionStorage.removeItem("quicklaunch_tool");
      }
    } catch { /* ignore */ }
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const snippet = buildSourceSnippet(activeSources);
      const questions = await generateMCQs(topic.trim(), difficulty, count, snippet);
      const newSession: PracticeSession = {
        topic: topic.trim(),
        difficulty,
        count: questions.length,
        questions,
        answers: {},
        submitted: false,
      };
      setSession(newSession);
      const hist = addSession(topic.trim(), `${questions.length} ${difficulty} questions`);
      setActiveSessionId(hist.id);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, label: string) => {
    if (!session || session.submitted) return;
    setSession((prev) =>
      prev ? { ...prev, answers: { ...prev.answers, [questionId]: label } } : prev
    );
  };

  const handleSubmit = () => {
    if (!session) return;
    setSession((prev) => prev ? { ...prev, submitted: true } : prev);
  };

  const handleReset = () => {
    setSession(null);
    setActiveSessionId(null);
    setTopic("");
  };

  const score = session
    ? session.questions.filter((q) => session.answers[q.id] === q.answer).length
    : 0;

  return (
    <ToolPageShell>
      {/* History sidebar */}
      <ToolHistorySidebar
        toolKey="practice"
        onNew={handleReset}
        onSelect={(s: ToolSession) => {
          setTopic(s.title);
          setActiveSessionId(s.id);
        }}
        activeId={activeSessionId}
      />

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "20px 16px 100px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: GOLD, fontFamily: "'Fredoka One', cursive", margin: 0 }}>
              📝 Practice
            </h1>
            <p style={{ fontSize: 12, color: TEXT2, margin: 0 }}>
              AI-generated multiple choice questions on any topic
            </p>
          </div>
        </div>

        {/* Source context indicator */}
        {activeSources.length > 0 && (
          <div
            style={{
              background: `${GOLD}11`,
              border: `1px solid ${GOLD}44`,
              borderRadius: 10,
              padding: "8px 12px",
              marginBottom: 16,
              fontSize: 11,
              color: GOLD,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📚 Using {activeSources.length} source{activeSources.length !== 1 ? "s" : ""} from your library
          </div>
        )}

        {/* Session setup form */}
        {!session && (
          <div
            style={{
              background: SURF,
              border: `2px solid ${BORDER}`,
              borderRadius: 18,
              padding: "20px",
              marginBottom: 20,
            }}
          >
            {/* Topic input */}
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Topic or Subject
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Mitosis, Newton's Laws, French Revolution..."
              style={{
                width: "100%",
                background: SURF2,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: "12px 14px",
                color: TEXT,
                fontSize: 14,
                fontFamily: "'Nunito', sans-serif",
                outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            {/* Difficulty + Count row */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              {/* Difficulty */}
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Difficulty
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["easy", "medium", "hard", "mixed"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: 10,
                        border: `1.5px solid ${difficulty === d ? DIFF_COLORS[d] : BORDER}`,
                        background: difficulty === d ? `${DIFF_COLORS[d]}22` : SURF2,
                        color: difficulty === d ? DIFF_COLORS[d] : TEXT2,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'Nunito', sans-serif",
                        textTransform: "capitalize",
                        transition: "all 0.15s",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div style={{ minWidth: 120 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  # Questions
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[3, 5, 10, 15].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      style={{
                        flex: 1,
                        padding: "8px 4px",
                        borderRadius: 10,
                        border: `1.5px solid ${count === n ? GOLD : BORDER}`,
                        background: count === n ? `${GOLD}22` : SURF2,
                        color: count === n ? GOLD : TEXT2,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "'Nunito', sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: topic.trim() && !loading ? GOLD : SURF2,
                border: `2px solid ${topic.trim() && !loading ? GOLD : BORDER}`,
                color: topic.trim() && !loading ? BG : TEXT3,
                fontSize: 14,
                fontWeight: 800,
                cursor: topic.trim() && !loading ? "pointer" : "not-allowed",
                fontFamily: "'Fredoka One', cursive",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 16 }}>⟳</span>
                  Generating {count} questions...
                </>
              ) : (
                <>📝 Generate {count} Questions</>
              )}
            </button>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  background: "#ef444418",
                  border: "1px solid #ef444444",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#ef4444",
                  fontSize: 12,
                }}
              >
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* Questions */}
        {session && (
          <>
            {/* Session header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: 0, fontFamily: "'Fredoka One', cursive" }}>
                  {session.topic}
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: DIFF_COLORS[session.difficulty],
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {session.difficulty} · {session.questions.length} questions
                </span>
              </div>
              {session.submitted ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <ScoreBadge score={score} total={session.questions.length} />
                  <button
                    onClick={handleReset}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: `1.5px solid ${BORDER}`,
                      background: SURF2,
                      color: TEXT2,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Nunito', sans-serif",
                    }}
                  >
                    ↩ New Practice
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: TEXT3 }}>
                  {Object.keys(session.answers).length}/{session.questions.length} answered
                </span>
              )}
            </div>

            {/* Questions list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {session.questions.map((q, qi) => {
                const userAnswer = session.answers[q.id];
                const isCorrect = userAnswer === q.answer;
                return (
                  <div
                    key={q.id}
                    style={{
                      background: SURF,
                      border: `2px solid ${
                        !session.submitted || !userAnswer
                          ? BORDER
                          : isCorrect
                          ? "#10b98144"
                          : "#ef444444"
                      }`,
                      borderRadius: 16,
                      padding: "16px",
                      transition: "border-color 0.2s",
                    }}
                  >
                    {/* Question */}
                    <p
                      style={{
                        fontSize: 14,
                        color: TEXT,
                        fontWeight: 600,
                        marginBottom: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: GOLD, fontWeight: 800, marginRight: 6 }}>
                        Q{qi + 1}.
                      </span>
                      {q.question}
                    </p>

                    {/* Options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {q.options.map((opt) => {
                        const isSelected = userAnswer === opt.label;
                        const isRight = opt.label === q.answer;
                        let borderColor = BORDER;
                        let bgColor = SURF2;
                        let textColor = TEXT2;

                        if (session.submitted) {
                          if (isRight) { borderColor = "#10b981"; bgColor = "#10b98118"; textColor = "#10b981"; }
                          else if (isSelected && !isRight) { borderColor = "#ef4444"; bgColor = "#ef444418"; textColor = "#ef4444"; }
                        } else if (isSelected) {
                          borderColor = GOLD; bgColor = `${GOLD}18`; textColor = TEXT;
                        }

                        return (
                          <button
                            key={opt.label}
                            onClick={() => handleAnswer(q.id, opt.label)}
                            disabled={session.submitted}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "10px 12px",
                              borderRadius: 10,
                              border: `1.5px solid ${borderColor}`,
                              background: bgColor,
                              color: textColor,
                              fontSize: 13,
                              fontFamily: "'Nunito', sans-serif",
                              cursor: session.submitted ? "default" : "pointer",
                              textAlign: "left",
                              transition: "all 0.15s",
                              width: "100%",
                            }}
                          >
                            <span
                              style={{
                                flexShrink: 0,
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: isSelected || (session.submitted && isRight) ? borderColor : "transparent",
                                border: `1.5px solid ${borderColor}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 800,
                                color: isSelected || (session.submitted && isRight) ? BG : borderColor,
                              }}
                            >
                              {opt.label}
                            </span>
                            <span style={{ lineHeight: 1.5, paddingTop: 2 }}>{opt.text}</span>
                            {session.submitted && isRight && (
                              <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {session.submitted && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 12px",
                          background: "#ffffff08",
                          borderRadius: 10,
                          border: `1px solid ${BORDER}`,
                          fontSize: 12,
                          color: TEXT2,
                          lineHeight: 1.6,
                        }}
                      >
                        <span style={{ color: GOLD, fontWeight: 700 }}>💡 Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit button */}
            {!session.submitted && (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(session.answers).length === 0}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "14px",
                  borderRadius: 14,
                  background:
                    Object.keys(session.answers).length > 0 ? GOLD : SURF2,
                  border: `2px solid ${
                    Object.keys(session.answers).length > 0 ? GOLD : BORDER
                  }`,
                  color:
                    Object.keys(session.answers).length > 0 ? BG : TEXT3,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor:
                    Object.keys(session.answers).length > 0
                      ? "pointer"
                      : "not-allowed",
                  fontFamily: "'Fredoka One', cursive",
                  transition: "all 0.2s",
                }}
              >
                Submit & See Results
              </button>
            )}
          </>
        )}
      </div>

      <BottomNav />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </ToolPageShell>
  );
}
