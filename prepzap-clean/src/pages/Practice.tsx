import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
import { QuestionSkeleton } from "@/components/SkeletonLoader";
import { loadLibrary } from "@/lib/sourceContext";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  BookOpen, CheckCircle2, XCircle, ChevronRight, RotateCcw,
  Brain, Timer, Target, Trophy, ChevronDown, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { callGroq } from "@/lib/groq";
import { type HistoryEntry } from "@/components/ToolShell";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── KaTeX renderer ───────────────────────────────────────────────────────────
// Splits content on $...$ / $$...$$ delimiters AND bare \frac{}{} commands.
// Each math segment is rendered by KaTeX; plain text segments render as-is.
// This ensures fractions like \frac{1}{5} always display as proper fractions.
function MathText({ content, className }: { content: string; className?: string }) {
  // Split on:  $$...$$  |  $...$  |  any \cmd{...}{...} LaTeX expression
  // The LaTeX arm captures a backslash-command followed by any brace groups.
  const SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\[a-zA-Z]+(?:\{(?:[^{}]|\{[^{}]*\})*\})*)/g;

  const segments: { text: string; math: boolean; display: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = SPLIT.exec(content)) !== null) {
    if (m.index > last) segments.push({ text: content.slice(last, m.index), math: false, display: false });
    const raw = m[0];
    const display = raw.startsWith("$$");
    const latex = display ? raw.slice(2, -2) : raw.startsWith("$") ? raw.slice(1, -1) : raw;
    segments.push({ text: latex, math: true, display });
    last = m.index + raw.length;
  }
  if (last < content.length) segments.push({ text: content.slice(last), math: false, display: false });

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (!seg.math) return <span key={i}>{seg.text}</span>;
        try {
          const html = katex.renderToString(seg.text, {
            throwOnError: false,
            displayMode: seg.display,
            output: "html",
            strict: false,
          });
          return (
            <span
              key={i}
              className={seg.display ? "block my-2 text-center" : "inline"}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={i}>{seg.text}</span>;
        }
      })}
    </span>
  );
}

// Alias used throughout the quiz UI
const MathRenderer = MathText;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
}

interface SourceItem {
  id: string;
  name: string;
  content?: string;
}

// ─── Stars Background (same as Dashboard) ─────────────────────────────────────
function useStarfield(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = 0, H = 0, raf = 0;

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    setSize();
    window.addEventListener("resize", setSize);

    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.009,
      teal: Math.random() > 0.8,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00008,
    }));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      // deep space gradient
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, Math.max(W, H) * 0.85);
      bg.addColorStop(0, "#0a0f1a");
      bg.addColorStop(1, "#000308");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const ts = t / 1000;
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0;
        if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0;
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(ts * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.teal
          ? `rgba(0,196,180,${alpha * 0.7})`
          : `rgba(200,220,255,${alpha * 0.85})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", setSize); };
  }, []);
}

// ─── Source Picker Modal ───────────────────────────────────────────────────────
function SourcePickerModal({
  open,
  onClose,
  selectedIds,
  onToggle,
  onConfirm,
  sources,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onConfirm: () => void;
  sources: SourceItem[];
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 400, background: "#0E0E0E", border: "0.5px solid #252525", padding: 20, zIndex: 10, fontFamily: "'Inter', system-ui" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#777", marginBottom: 4 }}>Source Library</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F0", marginBottom: 14 }}>Pick sources to quiz from</div>
        {sources.length === 0 ? (
          <div style={{ color: "#555", fontSize: 12, padding: "12px 0" }}>No sources in your library yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {sources.map((s) => {
              const checked = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => onToggle(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", background: checked ? "rgba(0,196,180,0.06)" : "rgba(255,255,255,0.02)",
                    border: `0.5px solid ${checked ? "#00C4B4" : "#252525"}`,
                    color: checked ? "#00C4B4" : "#C0C0C0",
                    fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s",
                  }}
                >
                  <div style={{
                    width: 16, height: 16, border: `1.5px solid ${checked ? "#00C4B4" : "#444"}`,
                    background: checked ? "#00C4B4" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s",
                  }}>
                    {checked && <Check size={10} color="#000" strokeWidth={3} />}
                  </div>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "8px 0", background: "transparent", border: "0.5px solid #252525", color: "#555", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={selectedIds.length === 0}
            style={{
              flex: 2, padding: "8px 0", background: selectedIds.length > 0 ? "#00C4B4" : "#1A1A1A",
              border: "none", color: selectedIds.length > 0 ? "#000" : "#333",
              fontSize: 11, fontWeight: 700, cursor: selectedIds.length > 0 ? "pointer" : "default", fontFamily: "inherit",
            }}>
            Quiz from {selectedIds.length > 0 ? `${selectedIds.length} source${selectedIds.length > 1 ? "s" : ""}` : "selected"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Concept Chips from Source ─────────────────────────────────────────────────
function SourceConceptRow({
  source,
  concepts,
  onPick,
  onCoverAll,
}: {
  source: SourceItem;
  concepts: string[];
  onPick: (concept: string) => void;
  onCoverAll: () => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#555", marginBottom: 6 }}>
        FROM "{source.name.replace(/\.\w+$/, "").toUpperCase()}" — PICK A CONCEPT:
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <button
          onClick={onCoverAll}
          style={{
            padding: "5px 12px", background: "rgba(0,196,180,0.08)", border: "0.5px solid #00C4B4",
            color: "#00C4B4", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,196,180,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,196,180,0.08)"; }}
        >
          Cover All
        </button>
        {concepts.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            style={{
              padding: "5px 12px", background: "rgba(0,196,180,0.04)", border: "0.5px solid #1E4040",
              color: "#00C4B4", fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.background = "rgba(0,196,180,0.10)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E4040"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Practice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useStarfield(canvasRef);

  const [phase, setPhase] = useState<"setup" | "quiz" | "results">("setup");

  const { entries: historyEntries, save: saveHistory, remove: removeHistory, clear: clearHistory } =("practice");
  const [difficulty, setDifficulty] = useState<"easy" | "mixed" | "hard">("mixed");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<HistoryEntry[]>(() => loadHistory("practice"));

  // Source library state
  const [conceptMap, setConceptMap] = useState<Record<string, string[]>>({});
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [activeTopic, setActiveTopic] = useState(""); // the topic used for quiz

  const allSources: SourceItem[] = useMemo(() => loadLibrary(), []);

  // After sources are confirmed, generate concept chips for each source
  const fetchConceptsForSources = async (sources: SourceItem[]) => {
    setLoadingConcepts(true);
    const newMap: Record<string, string[]> = {};
    await Promise.all(sources.map(async (src) => {
      try {
        const context = src.content ? `\n\nSource content:\n${src.content.slice(0, 3000)}` : "";
        const raw = await callGroq(
          [{ role: "user", content: `List 5-7 key concepts or subtopics from "${src.name.replace(/\.\w+$/, "")}" as a JSON array of short strings (3-5 words each). Only return the JSON array, nothing else.${context}` }],
          "You extract key concepts from study sources. Return only a JSON array of short concept names.",
          "llama-3.3-70b-versatile", 400
        );
        const clean = raw.replace(/```json|```/g, "").trim();
        const arr = JSON.parse(clean.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
        newMap[src.id] = Array.isArray(arr) ? arr.slice(0, 7) : [];
      } catch {
        newMap[src.id] = [];
      }
    }));
    setConceptMap(newMap);
    setLoadingConcepts(false);
  };

  const handleConfirmSources = () => {
    const picked = allSources.filter(s => selectedSourceIds.includes(s.id));
    setConfirmedSources(picked);
    setShowSourcePicker(false);
    fetchConceptsForSources(picked);
  };

  const handleToggleSource = (id: string) => {
    setSelectedSourceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const startQuiz = async (overrideTopic?: string, sourceOverride?: SourceItem[]) => {
    const sources = sourceOverride ?? confirmedSources;
    const effectiveTopic = overrideTopic ?? activeTopic;
    if (!effectiveTopic && sources.length === 0) return;

    setIsLoading(true);
    setError(null);
    const quizTopic = effectiveTopic || sources.map(s => s.name.replace(/\.\w+$/, "")).join(", ");
    const sourceContext = sources.length > 0
      ? `\n\nStudy sources:\n${sources.map(s => `- ${s.name}${s.content ? ": " + s.content.slice(0, 1500) : ""}`).join("\n")}`
      : "";

    try {
      const raw = await callGroq(
        [{
          role: "user",
          content: `Generate 5 multiple choice questions about "${quizTopic}" at ${difficulty} difficulty.${sourceContext}

IMPORTANT: If a question involves a fraction or division, write it using LaTeX fraction notation like \\frac{a}{b} — never use the slash character / for math.
Return ONLY valid JSON:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"why correct","topic":"subtopic"}]}`
        }],
        `You are an expert exam question writer. Write clear, unambiguous multiple choice questions. Each question must have exactly 4 options and one clearly correct answer. The explanation must be 1-2 sentences ONLY explaining why the correct answer is right — do NOT add extra information or hallucinate facts not in the source. Use LaTeX \\frac{}{} for all fractions.`,
        "llama-3.3-70b-versatile", 1800
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch?.[0] ?? clean;
      // Fix unescaped LaTeX backslashes (\frac, \mu etc.) that break JSON.parse
      const fixedJson = jsonStr.replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (_m: string, inner: string) => `"${inner.replace(/\\(?!["\\\\/bfnrtu])/g, "\\\\")}"`,
      );
      const parsed = JSON.parse(fixedJson);
      setQuestions(parsed.questions);
      setCurrentQ(0);
      setSelected(null);
      setAnswered(false);
      setScore(0);
      setWrongAnswers([]);
      setActiveTopic(quizTopic);
      setQuizHistory(prev => addHistoryEntry("practice", {
        id: Date.now().toString(),
        title: quizTopic.slice(0, 40),
        subtitle: `${difficulty} · 5 questions`,
        timestamp: new Date(),
        data: { topic: quizTopic, difficulty }
      }, prev));
      setPhase("quiz");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg.includes("VITE_GROQ_API_KEY")
        ? "⚠️ No API key found. Add VITE_GROQ_API_KEY to your .env file."
        : `Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[currentQ].correct) setScore(s => s + 1);
    else setWrongAnswers(prev => [...prev, currentQ]);
  };

  const next = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase("results");
    }
  };

  // Keyboard shortcuts: 1-4 pick answer, Enter/Space advance
  useEffect(() => {
    if (phase !== "quiz") return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 4 && !answered) {
        handleSelect(num - 1);
      } else if ((e.key === "Enter" || e.key === " ") && answered) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, answered, currentQ, questions]);

  const q = questions[currentQ];
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // ── Shared star background wrapper ──────────────────────────────────────────
  // Canvas is rendered once at the top-level return, NOT inside StarBg,
  // so phase transitions never unmount it and kill the animation.
  const StarBg = ({ children }: { children: React.ReactNode }) => (
    <div style={{ position: "relative", minHeight: "100vh", background: "#000308", overflow: "hidden" }}>
      <style>{`
        /* ── KaTeX fraction display — match the reference image ── */
        .katex { font-size: 1.15em !important; }
        .katex-display { font-size: 1.35em !important; margin: 0.3em 0 !important; }
        .katex .frac-line { border-bottom-width: 1.5px !important; }
        /* Numerator / denominator spacing */
        .katex .mfrac .mfrac-numer { padding-bottom: 0.12em; }
        .katex .mfrac .mfrac-denom { padding-top: 0.12em; }
      `}</style>
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );

  // ── UNIFIED RETURN — canvas always mounted so stars never disappear on phase change ──
  return (
    <>
      {/* Persistent star canvas — lives outside phase-conditional UI */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* ── HISTORY SIDE PANEL ── */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
        />
      )}
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 100,
        width: 300,
        background: "#0A0D12",
        borderLeft: "0.5px solid #1E2A2A",
        display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: sidebarOpen ? "-8px 0 32px rgba(0,0,0,0.6)" : "none",
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid #1A2626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00C4B4", marginBottom: 2 }}>Quiz History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{quizHistory.length} session{quizHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {quizHistory.length > 0 && (
              <button
                onClick={() => { setQuizHistory([]); clearHistory?.(); }}
                style={{ fontSize: 10, color: "#444", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: "2px 6px", transition: "color .15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}
              >
                Clear all
              </button>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ width: 26, height: 26, border: "0.5px solid #1E2A2A", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E2A2A"; e.currentTarget.style.color = "#555"; }}
            >
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
          {quizHistory.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, border: "0.5px solid #1E2A2A", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} style={{ color: "#333" }} />
              </div>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No quizzes yet</div>
              <div style={{ fontSize: 11, color: "#333" }}>Completed quizzes will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...quizHistory].reverse().map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid #1A2626",
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all .15s",
                    position: "relative",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1A2626"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onClick={() => {
                    const data = entry.data as { topic?: string; difficulty?: string };
                    if (data?.topic) {
                      setActiveTopic(data.topic);
                      setDifficulty((data.difficulty as "easy" | "mixed" | "hard") ?? "mixed");
                      setSidebarOpen(false);
                      setPhase("setup");
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#D0D0D0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</div>
                      <div style={{ fontSize: 10, color: "#444", marginTop: 3, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ color: "#2A6A64" }}>{entry.subtitle}</span>
                        <span>·</span>
                        <span>{new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const updated = quizHistory.filter(h => h.id !== entry.id);
                        setQuizHistory(updated);
                        removeHistory?.(entry.id);
                      }}
                      style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#333", padding: "2px", marginTop: 1, transition: "color .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#333"; }}
                    >
                      <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  {/* Replay hint */}
                  <div style={{ fontSize: 9, color: "#2A5050", marginTop: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>Click to replay →</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div style={{ padding: "10px 16px", borderTop: "0.5px solid #1A2626" }}>
          <div style={{ fontSize: 10, color: "#333" }}>Click any entry to reload that quiz topic</div>
        </div>
      </div>

    {/* ── SETUP PHASE ── */}
    {phase === "setup" && <StarBg>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">

          {/* Back to Dashboard */}
          <div className="flex items-center gap-2 mb-1">
            <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#555", textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#00C4B4"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}>
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Dashboard
            </a>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="w-9 h-9 rounded-none flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,196,180,0.12)", border: "0.5px solid #00C4B4" }}>
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#00C4B4" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="1"/>
                <path d="M9 9h6M9 12h6M9 15h4"/>
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Practice</h1>
              <p className="text-xs" style={{ color: "#555" }}>AI-generated quiz questions on any topic</p>
            </div>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title="Quiz History"
              style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}>
              <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              {quizHistory.length > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#00C4B4" }} />
              )}
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-card/70 backdrop-blur-sm border border-border rounded-none p-6 space-y-5">

            {/* Source Library Button */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Source Library</label>
              <button
                onClick={() => setShowSourcePicker(true)}
                style={{
                  width: "100%", padding: "11px 14px",
                  background: confirmedSources.length > 0 ? "rgba(0,196,180,0.06)" : "rgba(255,255,255,0.03)",
                  border: `0.5px solid ${confirmedSources.length > 0 ? "#00C4B4" : "#303030"}`,
                  color: confirmedSources.length > 0 ? "#00C4B4" : "#888",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = confirmedSources.length > 0 ? "#00C4B4" : "#303030"; }}
              >
                <BookOpen size={14} style={{ flexShrink: 0 }} />
                {confirmedSources.length > 0
                  ? `${confirmedSources.length} source${confirmedSources.length > 1 ? "s" : ""} selected — ${confirmedSources.map(s => s.name.replace(/\.\w+$/, "")).join(", ")}`
                  : "Select from your Source Library…"}
                <ChevronDown size={13} style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.5 }} />
              </button>
            </div>

            {/* Concept Chips per confirmed source */}
            {confirmedSources.length > 0 && (
              <div>
                {loadingConcepts ? (
                  <div style={{ color: "#555", fontSize: 11, padding: "8px 0" }}>Extracting concepts…</div>
                ) : (
                  confirmedSources.map(src => (
                    <SourceConceptRow
                      key={src.id}
                      source={src}
                      concepts={conceptMap[src.id] ?? []}
                      onPick={(concept) => startQuiz(concept, [src])}
                      onCoverAll={() => startQuiz(src.name.replace(/\.\w+$/, ""), [src])}
                    />
                  ))
                )}
                {confirmedSources.length > 1 && (
                  <button
                    onClick={() => startQuiz(confirmedSources.map(s => s.name.replace(/\.\w+$/, "")).join(" & "), confirmedSources)}
                    style={{
                      marginTop: 8, padding: "7px 16px",
                      background: "rgba(232,185,35,0.08)", border: "0.5px solid #E8B923",
                      color: "#E8B923", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                    }}
                  >
                    Quiz All {confirmedSources.length} Sources Together
                  </button>
                )}
              </div>
            )}

            {/* Difficulty */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Difficulty</label>
              <div className="flex gap-2">
                {(["easy", "mixed", "hard"] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={cn("flex-1 py-2.5 rounded-none border text-sm font-medium capitalize transition-all",
                      difficulty === d
                        ? d === "easy" ? "bg-emerald-500 text-white border-emerald-500"
                          : d === "hard" ? "bg-red-500 text-white border-red-500"
                            : "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary bg-transparent")}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Start button (only when sources are selected) */}
            {confirmedSources.length > 0 && !loadingConcepts && (
              <button
                onClick={() => startQuiz()}
                disabled={isLoading}
                style={{
                  width: "100%", padding: "11px 0",
                  background: isLoading ? "#1A1A1A" : "linear-gradient(90deg,#00C4B4,#0097A7)",
                  border: "none", color: isLoading ? "#444" : "#000",
                  fontSize: 12, fontWeight: 700, cursor: isLoading ? "default" : "pointer", fontFamily: "inherit",
                  letterSpacing: "0.05em", transition: "all .2s",
                }}
              >
                {isLoading ? "Generating…" : "Start Quiz →"}
              </button>
            )}

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-none p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}
            {isLoading && <div className="pt-2"><QuestionSkeleton /></div>}

            {/* Empty state */}
            {confirmedSources.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#444", fontSize: 12 }}>
                <BookOpen size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                <div>Select sources from your library to get started.</div>
                <div style={{ marginTop: 4, fontSize: 11 }}>Concepts will be extracted automatically.</div>
              </div>
            )}
          </div>
        </main>

        {/* Source Picker Modal */}
      </div>
    </StarBg>}

  {/* ── QUIZ PHASE ── */}
    {phase === "quiz" && q && <StarBg>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-6 pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{q.topic}</span>
              <div className="flex items-center gap-2">
                <span>Question {currentQ + 1} / {questions.length}</span>
                <button onClick={() => setSidebarOpen(v => !v)}
                  style={{ width: 28, height: 28, border: "0.5px solid #252525", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; }}>
                  <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
              </div>
            </div>
            <Progress value={((currentQ) / questions.length) * 100} className="h-2" />
          </div>

          <div className="bg-card/70 backdrop-blur-sm border border-border rounded-none p-6">
            <MathRenderer content={q.question} className="text-lg font-semibold leading-relaxed" />
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correct;
              const isSelected = i === selected;
              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={answered}
                  className={cn("w-full text-left px-5 py-4 rounded-none border-2 text-sm font-medium transition-all",
                    !answered ? "border-border hover:border-primary hover:bg-primary/5 bg-card/50" :
                      isCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" :
                        isSelected ? "border-red-500 bg-red-500/10 text-red-400" : "border-border opacity-40 bg-transparent")}>
                  <span className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-none border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 relative">
                      {String.fromCharCode(65 + i)}
                      {!answered && <span style={{ position: "absolute", top: -8, right: -8, fontSize: 8, color: "#333", fontFamily: "monospace" }}>{i+1}</span>}
                    </span>
                    <MathRenderer content={opt} className="flex-1" />
                    {answered && isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto flex-shrink-0" />}
                    {answered && isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-500 ml-auto flex-shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="bg-card/70 backdrop-blur-sm border border-border rounded-none p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold">Explanation</span>
              </div>
              {/* KaTeX-aware explanation — MathRenderer handles \frac and LaTeX */}
              <MathRenderer content={q.explanation} className="text-sm text-muted-foreground" />
              <Button onClick={next} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:opacity-90">
                {currentQ < questions.length - 1 ? <>Next Question <ChevronRight className="h-4 w-4 ml-1" /></> : <>See Results <Trophy className="h-4 w-4 ml-1" /></>}
              </Button>
            </div>
          )}
        </main>
      </div>
    </StarBg>}

  {/* ── RESULTS PHASE ── */}
    {phase === "results" && <StarBg>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <main className="flex-1 max-w-lg mx-auto w-full p-6 space-y-6 flex flex-col justify-center">
          <div style={{ marginBottom: 4 }}>
            <a href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#555", textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#00C4B4"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}>
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Dashboard
            </a>
          </div>
          <div className="text-center">
            <Trophy className={cn("h-16 w-16 mx-auto mb-4",
              pct >= 80 ? "text-amber-500" : pct >= 60 ? "text-slate-400" : "text-muted-foreground")} />
            <h2 className="text-3xl font-bold">{score} / {questions.length} Correct</h2>
            <p className="text-muted-foreground mt-1">{activeTopic} · {difficulty}</p>
            <div className={cn("text-5xl font-bold mt-4",
              pct >= 80 ? "text-emerald-400" : pct >= 60 ? "text-amber-500" : "text-red-500")}>
              {pct}%
            </div>
          </div>

          {wrongAnswers.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-none p-4 space-y-2">
              <p className="text-sm font-semibold text-red-500">Review These Topics:</p>
              {wrongAnswers.map(i => <p key={i} className="text-sm text-muted-foreground">• {questions[i].topic}</p>)}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-card/50" onClick={() => {
              setPhase("quiz"); setCurrentQ(0); setSelected(null); setAnswered(false); setScore(0); setWrongAnswers([]);
            }}>
              <RotateCcw className="h-4 w-4 mr-2" />Retry
            </Button>
            <Button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white" onClick={() => {
              setPhase("setup"); setActiveTopic("");
            }}>
              <Timer className="h-4 w-4 mr-2" />New Quiz
            </Button>
          </div>
        </main>
      </div>
    </StarBg>}

    </>
  );
}
