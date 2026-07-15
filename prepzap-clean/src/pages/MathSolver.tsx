import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { callGroq } from "@/lib/groq";
import { getActiveSource, buildAIContext, loadContext, loadContext as loadCtx, loadLibrary } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface SolutionStep {
  stepNumber: number;
  description: string;
  mathBlock?: string;
}

// ─── Simple SVG Function Visualizer ──────────────────────────────────────────
function FunctionVisualizer({ expression }: { expression: string }) {
  const width = 400;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2;
  const scale = 30;

  // Try to build a path from the expression. We look for simple patterns.
  const buildPath = useCallback(() => {
    if (!expression) return "";
    const expr = expression.toLowerCase().replace(/\s/g, "");

    const evalY = (x: number): number | null => {
      try {
        // Replace common math patterns
        let e = expr
          .replace(/\^/g, "**")
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/log\(/g, "Math.log10(")
          .replace(/ln\(/g, "Math.log(")
          .replace(/sqrt\(/g, "Math.sqrt(")
          .replace(/π/g, "Math.PI")
          .replace(/pi/g, "Math.PI")
          .replace(/e(?![a-z])/g, "Math.E")
          .replace(/abs\(/g, "Math.abs(");
        // Extract y = ... or f(x) = ...
        const rhs = e.includes("=") ? e.split("=").pop()! : e;
        // Replace bare x references (not inside function names)
        const withX = rhs.replace(/(?<![a-z])x(?![a-z])/g, `(${x})`);
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${withX}`)();
        return isFinite(result) ? result : null;
      } catch {
        return null;
      }
    };

    const steps = 160;
    const xMin = -cx / scale;
    const xMax = (width - cx) / scale;
    const dx = (xMax - xMin) / steps;
    let d = "";
    let penDown = false;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      const y = evalY(x);
      if (y === null || Math.abs(y) > cy / scale + 2) {
        penDown = false;
        continue;
      }
      const px = cx + x * scale;
      const py = cy - y * scale;
      if (!penDown) {
        d += `M ${px.toFixed(1)},${py.toFixed(1)} `;
        penDown = true;
      } else {
        d += `L ${px.toFixed(1)},${py.toFixed(1)} `;
      }
    }
    return d;
  }, [expression, cx, cy, scale, width]);

  const path = buildPath();

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      className="bg-[#FAF7F2]"
      style={{ fontFamily: "monospace" }}
    >
      {/* Grid */}
      {Array.from({ length: Math.ceil(width / scale) + 1 }, (_, i) => {
        const x = (i * scale) % width;
        return <line key={`vg${i}`} x1={x} y1={0} x2={x} y2={height} stroke="#E2E2E2" strokeWidth="1" />;
      })}
      {Array.from({ length: Math.ceil(height / scale) + 1 }, (_, i) => {
        const y = (i * scale) % height;
        return <line key={`hg${i}`} x1={0} y1={y} x2={width} y2={y} stroke="#E2E2E2" strokeWidth="1" />;
      })}
      {/* Axes */}
      <line x1={cx} y1={0} x2={cx} y2={height} stroke="#000" strokeWidth="1.5" />
      <line x1={0} y1={cy} x2={width} y2={cy} stroke="#000" strokeWidth="1.5" />
      {/* Axis labels */}
      {[-4, -3, -2, -1, 1, 2, 3, 4].map((n) => (
        <g key={`xl${n}`}>
          <text x={cx + n * scale} y={cy + 14} textAnchor="middle" fontSize="9" fill="#888">{n}</text>
          <text x={cx - 14} y={cy - n * scale + 3} textAnchor="end" fontSize="9" fill="#888">{n}</text>
        </g>
      ))}
      {/* Curve */}
      {path ? (
        <path d={path} fill="none" stroke="#E8534A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <text x={cx} y={cy} textAnchor="middle" fontSize="12" fill="#aaa">No plottable function detected</text>
      )}
    </svg>
  );
}

// ─── Scientific Calculator ────────────────────────────────────────────────────
function ScientificCalculator({
  onInsert,
  onClose,
}: {
  onInsert: (val: string) => void;
  onClose: () => void;
}) {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState<string>("");

  const append = (val: string) => {
    setDisplay((prev) => (prev === "0" && ![".", "(", ")"].includes(val) ? val : prev + val));
  };
  const clear = () => setDisplay("0");
  const backspace = () => setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));

  const evaluate = () => {
    try {
      const expr = display
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/π/g, String(Math.PI))
        .replace(/e(?![a-z])/g, String(Math.E))
        .replace(/sin\(/g, "Math.sin(")
        .replace(/cos\(/g, "Math.cos(")
        .replace(/tan\(/g, "Math.tan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(")
        .replace(/√\(/g, "Math.sqrt(")
        .replace(/\^/g, "**");
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${expr}`)();
      setDisplay(String(isFinite(result) ? +result.toFixed(10) : "Error"));
    } catch {
      setDisplay("Error");
    }
  };

  const btn = (label: string, action: () => void, className = "") => (
    <button
      key={label}
      onClick={action}
      className={`h-10 border-2 border-black text-[12px] font-extrabold flex items-center justify-center transition-all hover:bg-[#E2E2E2] active:scale-95 ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-[#FAF7F2] border-2 border-black shadow-[4px_4px_0px_#000] w-[300px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-black">
        <span className="text-[11px] font-black uppercase tracking-widest text-white">Calculator</span>
        <button onClick={onClose} className="text-white hover:text-[#E8534A] transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {/* Display */}
      <div className="px-3 py-3 border-b-2 border-black bg-white">
        <div className="text-[10px] font-bold text-black/30 uppercase tracking-wider mb-1 h-4 truncate">{memory}</div>
        <div className="text-right text-[22px] font-black truncate leading-tight">{display}</div>
      </div>
      {/* Insert to problem */}
      <button
        onClick={() => onInsert(display === "Error" ? "" : display)}
        className="mx-3 mt-2 mb-1 py-1.5 border-2 border-black bg-[#E8534A] text-white text-[11px] font-extrabold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[2px_2px_0px_#000]"
      >
        Insert into Problem ↑
      </button>
      {/* Keys */}
      <div className="p-2 grid grid-cols-5 gap-1">
        {/* Row 1: functions */}
        {btn("sin(", () => append("sin("), "bg-[#F0EDE0]")}
        {btn("cos(", () => append("cos("), "bg-[#F0EDE0]")}
        {btn("tan(", () => append("tan("), "bg-[#F0EDE0]")}
        {btn("log(", () => append("log("), "bg-[#F0EDE0]")}
        {btn("ln(", () => append("ln("), "bg-[#F0EDE0]")}
        {/* Row 2 */}
        {btn("√(", () => append("√("), "bg-[#F0EDE0]")}
        {btn("x²", () => append("^2"), "bg-[#F0EDE0]")}
        {btn("^", () => append("^"), "bg-[#F0EDE0]")}
        {btn("π", () => append("π"), "bg-[#F0EDE0]")}
        {btn("e", () => append("e"), "bg-[#F0EDE0]")}
        {/* Row 3 */}
        {btn("(", () => append("("), "bg-white")}
        {btn(")", () => append(")"), "bg-white")}
        {btn("%", () => append("%"), "bg-white")}
        {btn("C", clear, "bg-[#ae2925] text-white col-span-1")}
        {btn("⌫", backspace, "bg-[#333] text-white")}
        {/* Row 4 */}
        {btn("7", () => append("7"), "bg-white")}
        {btn("8", () => append("8"), "bg-white")}
        {btn("9", () => append("9"), "bg-white")}
        {btn("÷", () => append("÷"), "bg-[#1a1a1a] text-white")}
        {btn("x", () => append("x"), "bg-[#E8534A] text-white")}
        {/* Row 5 */}
        {btn("4", () => append("4"), "bg-white")}
        {btn("5", () => append("5"), "bg-white")}
        {btn("6", () => append("6"), "bg-white")}
        {btn("×", () => append("×"), "bg-[#1a1a1a] text-white")}
        {btn("y", () => append("y"), "bg-[#E8534A] text-white")}
        {/* Row 6 */}
        {btn("1", () => append("1"), "bg-white")}
        {btn("2", () => append("2"), "bg-white")}
        {btn("3", () => append("3"), "bg-white")}
        {btn("−", () => append("-"), "bg-[#1a1a1a] text-white")}
        {btn("1/x", () => setDisplay(`1/(${display})`), "bg-[#F0EDE0]")}
        {/* Row 7 */}
        <button
          onClick={() => append("0")}
          className="h-10 col-span-2 border-2 border-black bg-white text-[12px] font-extrabold hover:bg-[#E2E2E2] active:scale-95 transition-all"
        >
          0
        </button>
        {btn(".", () => append("."), "bg-white")}
        {btn("+", () => append("+"), "bg-[#1a1a1a] text-white")}
        {btn("=", evaluate, "bg-black text-white")}
      </div>
      {/* Memory row */}
      <div className="grid grid-cols-3 gap-1 px-2 pb-2">
        {btn("MS", () => setMemory(display), "bg-[#F0EDE0] text-[11px]")}
        {btn("MR", () => { if (memory) setDisplay(memory); }, "bg-[#F0EDE0] text-[11px]")}
        {btn("MC", () => setMemory(""), "bg-[#F0EDE0] text-[11px]")}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MathSolver() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logSession } = useStudySession();

  // Restore state from sessionStorage so tab switches don't wipe results
  const [problem, setProblem] = useState(() => sessionStorage.getItem("math_problem") || "");
  const [steps, setSteps] = useState<SolutionStep[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("math_steps") || "[]");
    } catch {
      return [];
    }
  });
  const [solved, setSolved] = useState(() => sessionStorage.getItem("math_solved") === "true");
  const [activeSource, setActiveSource] = useState<any>(getActiveSource());
  const { save: saveHistory, entries: historyEntries = [] } = useToolHistory("math-solver") as any;
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const [loading, setLoading] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [visualizerTab, setVisualizerTab] = useState<"2d" | "table">("2d");

  // Freemium state
  // FIX BUG 4: initialize as null to avoid flicker
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    remaining("math_solver").then(setRemainingUses);
  }, [remaining]);

  const calcBtnRef = useRef<HTMLButtonElement>(null);
  const desktopCalcBtnRef = useRef<HTMLButtonElement>(null);

  // Re-sync active source when window gets focus
  useEffect(() => {
    const syncSource = () => setActiveSource(getActiveSource());
    syncSource();
    window.addEventListener("focus", syncSource);
    return () => window.removeEventListener("focus", syncSource);
  }, []);

  // Persist results to sessionStorage so tab switches don't wipe them
  useEffect(() => { sessionStorage.setItem("math_problem", problem); }, [problem]);
  useEffect(() => { sessionStorage.setItem("math_steps", JSON.stringify(steps)); }, [steps]);
  useEffect(() => { sessionStorage.setItem("math_solved", String(solved)); }, [solved]);

  const symbols = ["+", "−", "×", "÷", "^", "√", "x²", "sin(", "cos(", "tan(", "log(", "ln(", "π", "e", "=", "(", ")", "x", "y"];

  const appendSymbol = (sym: string) => {
    setProblem((prev) => prev + sym);
  };

  const loadSampleProblem = (type?: string) => {
    if (type === "chem") {
      setProblem("Balance: C3H8 + O2 -> CO2 + H2O");
    } else if (type === "physics") {
      setProblem("F = ma. If mass is 12kg and acceleration is 3m/s^2, what is Force?");
    } else {
      setProblem("2x^2 + 5x - 3 = 0");
    }
    setSolved(false);
    setSteps([]);
  };

  const handleSolve = async () => {
    if (!problem.trim()) return;

    // Freemium gate
    if (!isPro) {
      const allowed = await canUse("math_solver");
      if (!allowed) {
        setShowUpgrade(true);
        return;
      }
    }

    setLoading(true);
    setSolved(false);

    try {
      const sourceCtx = buildAIContext();
      const sourceNote = sourceCtx ? `\n\nAdditional context from student's source material:\n${sourceCtx}` : "";

      const promptText = `Solve the following mathematical or scientific problem and provide a detailed, educationally robust step-by-step breakdown: "${problem}"${sourceNote}

Return strictly a valid raw JSON array containing solution steps. Every element must be an object with: "stepNumber" (integer starting at 1), "description" (text explanation of the step), "mathBlock" (optional short string of formula or simplified state for this step). Only return the raw JSON array. No markdown codeblocks, no explanations, no formatting wrap!`;

      const systemPrompt = "You are a master advanced mathematics scientific reasoning system. You output solution steps strictly formatted as raw JSON arrays with no markdown formatting wraps.";

      // FIX BUG 2: removed callGroqWithModel hack — call callGroq directly with feature key
      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        systemPrompt,
        "llama-3.3-70b-versatile",
        1024,
        "math_solver"
      );

      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }
      const generated = JSON.parse(sanitized);

      if (Array.isArray(generated) && generated.length > 0) {
        setSteps(generated);
        setSolved(true);
        saveHistory({
          prompt: problem,
          preview: generated[0]?.description?.slice(0, 120) || "",
          output: JSON.stringify(generated),
          model: "rex-ai",
          meta: `${generated.length} steps`,
        });

        // Write to study_sessions so Dashboard + Analytics pick it up, and
        // update the streak — both now handled in one place by the shared
        // hook (see src/hooks/useStudySession.ts) instead of duplicated,
        // independently-buggy inline code.
        if (user?.id) {
          await logSession({
            title: problem.trim().slice(0, 80) || "Math & Science",
            durationMinutes: 5,
          });
        }
      } else {
        throw new Error("Invalid structure returned");
      }
    } catch (err) {
      console.error("AI Solver error, serving backup steps:", err);
      const fallbackSteps: SolutionStep[] = [
        { stepNumber: 1, description: "Identify the pattern of the problem. It contains standard variables and operations.", mathBlock: `${problem}` },
        { stepNumber: 2, description: "Simplify any terms and move constants together where applicable.", mathBlock: "Rearranging factors..." },
        { stepNumber: 3, description: "Evaluate expression elements or solve for target variable step-by-step.", mathBlock: "Final estimated calculation complete." },
      ];
      setSteps(fallbackSteps);
      setSolved(true);
    } finally {
      setLoading(false);
    }

    // FIX BUG 3: always log usage after generation (success or fallback)
    if (!isPro) {
      try {
        await logUsage("math_solver");
      } catch {}
      remaining("math_solver").then(setRemainingUses);
    }
  };

  // ─── Shared: solution step cards ───────────────────────────────────────────
  const StepCard = ({ st, sIdx }: { st: SolutionStep; sIdx: number; key?: number }) => (
    <React.Fragment>
      <div className="flex items-start gap-4">
        <div
          className={`w-8 h-8 shrink-0 rounded-full border-2 border-black flex items-center justify-center font-black text-[13px] ${
            sIdx === steps.length - 1 ? "bg-[#E8534A] text-white" : "bg-black text-white"
          }`}
        >
          {st.stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-black/80 leading-relaxed">{st.description}</p>
          {st.mathBlock && (
            <div className="font-mono mt-2 bg-[#1a1a1a] text-[#f0e68c] px-4 py-2.5 border-2 border-black text-[14px] font-bold break-all shadow-[2px_2px_0px_#000]">
              {st.mathBlock}
            </div>
          )}
        </div>
      </div>
      {sIdx < steps.length - 1 && <div className="h-px bg-black/10 w-full my-1" />}
    </React.Fragment>
  );

  // ─── Table view (numeric evaluation) ──────────────────────────────────────
  const TableView = () => {
    const values = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const evalAt = (x: number): string => {
      try {
        const expr = problem
          .toLowerCase()
          .replace(/\^/g, "**")
          .replace(/sin\(/g, "Math.sin(")
          .replace(/cos\(/g, "Math.cos(")
          .replace(/tan\(/g, "Math.tan(")
          .replace(/log\(/g, "Math.log10(")
          .replace(/ln\(/g, "Math.log(")
          .replace(/sqrt\(/g, "Math.sqrt(")
          .replace(/π/g, String(Math.PI))
          .split("=").pop()!
          .replace(/(?<![a-z])x(?![a-z])/g, `(${x})`);
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${expr}`)();
        return isFinite(result) ? (+result.toFixed(4)).toString() : "undef";
      } catch {
        return "—";
      }
    };
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-2 border-black text-[13px]">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-2 font-black text-left border-r-2 border-white/20">x</th>
              <th className="px-3 py-2 font-black text-left">f(x)</th>
            </tr>
          </thead>
          <tbody>
            {values.map((x, i) => (
              <tr key={x} className={i % 2 === 0 ? "bg-white" : "bg-[#F0EDE0]"}>
                <td className="px-3 py-1.5 font-bold border-r-2 border-black/10">{x}</td>
                <td className="px-3 py-1.5 font-mono font-bold text-[#E8534A]">{evalAt(x)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Right panel ───────────────────────────────────────────────────────────
  const RightPanel = () => (
    <div className="w-full flex flex-col gap-5 overflow-y-auto">
      {/* Solution Steps */}
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Solution Steps</h3>
        <div className="border-2 border-black bg-white p-5 flex flex-col gap-4 shadow-[3px_3px_0px_#000]">
          {!solved && !loading && (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <span className="material-symbols-outlined text-[40px] text-black/20">functions</span>
              <p className="text-[13px] font-bold text-black/40">Enter a problem and hit Solve to see the step-by-step breakdown here.</p>
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[32px]">autorenew</span>
              <p className="text-[13px] font-black text-black/50">AI computing solution...</p>
            </div>
          )}
          {solved && steps.map((st: SolutionStep, sIdx: number) => <StepCard key={st.stepNumber} st={st} sIdx={sIdx} />)}
        </div>
      </div>

      {/* Function Visualizer */}
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Function Visualizer</h3>
        <div className="border-2 border-black bg-[#FAF7F2] shadow-[3px_3px_0px_#000] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b-2 border-black">
            {(["2d", "table"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setVisualizerTab(tab)}
                className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest border-r-2 last:border-r-0 border-black transition-colors ${
                  visualizerTab === tab ? "bg-black text-white" : "bg-[#FAF7F2] text-black hover:bg-[#E2E2E2]"
                }`}
              >
                {tab === "2d" ? "2D Plot" : "Table"}
              </button>
            ))}
          </div>
          {/* Graph or table */}
          <div className="h-[240px] overflow-hidden flex items-center justify-center">
            {visualizerTab === "2d" ? (
              <FunctionVisualizer expression={solved ? problem : ""} />
            ) : (
              <div className="w-full h-full overflow-y-auto p-2">
                <TableView />
              </div>
            )}
          </div>
          {/* Caption */}
          <div className="px-4 py-2 border-t-2 border-black bg-[#F0EDE0]">
            <p className="text-[10px] font-bold text-black/50 font-mono truncate">
              {problem || "No expression entered"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── History Drawer ─────────────────────────────────────────────────────────
  const HistoryDrawer = ({ onClose }: { onClose: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">history</span>
          <h3 className="text-[16px] font-extrabold">Solve History</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {(historyEntries as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center opacity-40">
            <span className="material-symbols-outlined text-[32px]">functions</span>
            <p className="text-[12px] font-bold">No solves yet.<br />Hit Solve Problem to start!</p>
          </div>
        ) : (historyEntries as any[]).slice(0, 20).map((entry: any, i: number) => (
          <button
            key={i}
            onClick={() => {
              setProblem(entry.prompt || "");
              setSolved(false);
              setSteps([]);
              onClose();
            }}
            className="text-left bg-white border-2 border-black shadow-[2px_2px_0px_#000] p-3 rounded-lg hover:bg-[#F0EDE0] transition-colors"
          >
            <p className="font-extrabold text-[13px] line-clamp-2 mb-1">{entry.prompt || "Problem"}</p>
            <p className="text-[11px] text-black/40 font-bold">{entry.meta || ""} · {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ""}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      {showUpgrade && (
        <UpgradePrompt feature="math_solver" remaining={remainingUses} onClose={() => setShowUpgrade(false)} />
      )}

      {/* History drawer — slide in from right, works on both mobile + desktop */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="w-[85vw] max-w-[360px] bg-white border-l-2 border-black flex flex-col h-full shadow-[-4px_0_0_#000]">
            <HistoryDrawer onClose={() => setShowHistory(false)} />
          </div>
        </div>
      )}

      <SharedSidebar active="/math" />

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>
        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">MATH &amp; SCIENCE SOLVER</span>
            <div className="w-px h-6 bg-black/20" />
            {activeSource ? (
              <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0]">
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span className="text-[12px] font-bold truncate max-w-[200px]">{activeSource.name || activeSource}</span>
                <button onClick={() => navigate("/sources")} className="material-symbols-outlined text-[14px] hover:text-[#FF4D2E] transition-colors">close</button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/sources")}
                className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] hover:bg-[#E2E2E2] text-[12px] font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                Attach Source
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90"
            >
              S
            </div>
          </div>
        </header>

        {/* Desktop Dual Pane */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Left Pane — ~58% — input */}
          <div className="w-[58%] flex flex-col border-r-2 border-black overflow-y-auto">
            {/* Symbol bar */}
            <div className="px-8 pt-5 pb-3 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Quick Symbols</h3>
              <div className="flex flex-wrap gap-2">
                {symbols.map((sym, idx) => (
                  <button
                    key={idx}
                    onClick={() => appendSymbol(sym)}
                    className="px-3 h-9 border-2 border-black bg-white text-[13px] font-extrabold hover:bg-[#E2E2E2] active:scale-95 transition-all shadow-[2px_2px_0px_#000]"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Selector */}
            <div className="px-8 pt-5 pb-3 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Problem Mode</h3>
              <div className="flex gap-2">
                {[
                  { label: "Algebra", icon: "functions", type: "math" },
                  { label: "Physics", icon: "science", type: "physics" },
                  { label: "Chemistry", icon: "biotech", type: "chem" },
                ].map(({ label, icon, type }) => (
                  <button
                    key={type}
                    onClick={() => loadSampleProblem(type)}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 border-2 border-black bg-white hover:bg-[#E2E2E2] transition-all shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sample buttons */}
            <div className="px-8 pt-4 pb-2 shrink-0 flex items-center gap-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-black/50">Try a sample:</span>
              {[
                { label: "Algebra", type: "math" },
                { label: "Physics", type: "physics" },
                { label: "Chemistry", type: "chem" },
              ].map(({ label, type }) => (
                <button
                  key={type}
                  onClick={() => loadSampleProblem(type)}
                  className="px-3 py-1 border-2 border-black text-[12px] font-bold hover:bg-[#E2E2E2] bg-white transition-colors shadow-[2px_2px_0px_#000]"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="px-8 pt-3 pb-4 shrink-0">
              <div className="relative">
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleSolve(); }}
                  className="w-full h-52 p-5 bg-white border-2 border-black text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none"
                  style={{ boxShadow: "4px 4px 0px #000" }}
                  placeholder="Enter a math formula, balance a chemistry reaction, or describe a physics problem... (⌘+Enter to solve)"
                />
              </div>

              {/* Toolbar row */}
              <div className="flex items-center gap-3 mt-3">
                {/* Calculator toggle */}
                <div className="relative">
                  <button
                    ref={desktopCalcBtnRef}
                    onClick={() => setShowCalc((v) => !v)}
                    className={`w-11 h-11 border-2 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_#000] ${
                      showCalc ? "bg-black text-white" : "bg-white hover:bg-[#E2E2E2]"
                    }`}
                    title="Scientific Calculator"
                  >
                    <span className="material-symbols-outlined text-[22px]">calculate</span>
                  </button>
                  {showCalc && (
                    <div className="absolute top-14 left-0 z-50">
                      <ScientificCalculator onInsert={(val) => setProblem((prev) => prev + val)} onClose={() => setShowCalc(false)} />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="w-11 h-11 border-2 border-black bg-white flex items-center justify-center hover:bg-[#E2E2E2] transition-colors shadow-[2px_2px_0px_#000]"
                  title="History"
                >
                  <span className="material-symbols-outlined text-[22px]">history</span>
                </button>

                <button
                  onClick={() => {
                    setProblem("");
                    setSolved(false);
                    setSteps([]);
                    sessionStorage.removeItem("math_problem");
                    sessionStorage.removeItem("math_steps");
                    sessionStorage.removeItem("math_solved");
                  }}
                  className="w-11 h-11 border-2 border-black bg-white flex items-center justify-center hover:bg-[#ae2925] hover:text-white transition-colors shadow-[2px_2px_0px_#000]"
                  title="Clear"
                >
                  <span className="material-symbols-outlined text-[22px]">delete</span>
                </button>

                {/* Solve button */}
                <button onClick={handleSolve} disabled={loading} className="flex-1 relative group cursor-pointer">
                  <div className="w-full py-3 bg-[#E8534A] text-white border-2 border-black flex items-center justify-center gap-3 z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">functions</span>
                    <span className="font-black text-[14px] uppercase tracking-wider">
                      {loading ? "Computing..." : "Solve Problem"}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
                </button>
              </div>
            </div>

            {/* Spacer note */}
            <div className="px-8 pb-4 text-[11px] font-bold text-black/30 text-center">
              AI Solver can make mistakes. Verify important results with your textbook.
            </div>

            {!isPro && remainingUses !== null && remainingUses <= 4 && remainingUses > 0 && (
              <div className="px-8 pb-3 flex flex-col items-center gap-2">
                <p className="text-[12px] text-black/50 font-bold">{remainingUses} solve{remainingUses !== 1 ? "s" : ""} left today</p>
                {remainingUses <= 2 && <SoftWarning feature="math_solver" remaining={remainingUses} />}
              </div>
            )}
          </div>

          {/* Right Pane — 42% — results */}
          <div className="w-[42%] flex flex-col overflow-y-auto px-8 py-6 bg-[#FAF7F2]">
            {/* Stats Panel */}
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="border-2 border-black bg-white p-3 flex flex-col items-center gap-1 shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[#ae2925] text-[18px]">functions</span>
                <span className="text-[18px] font-black">{steps.length || 0}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/50">Steps</span>
              </div>
              <div className="border-2 border-black bg-white p-3 flex flex-col items-center gap-1 shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[#F5A623] text-[18px]">schedule</span>
                <span className="text-[18px] font-black">{loading ? "..." : solved ? "✓" : "—"}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/50">Status</span>
              </div>
              <div className="border-2 border-black bg-white p-3 flex flex-col items-center gap-1 shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[18px]">dataset</span>
                <span className="text-[18px] font-black">{problem.length || 0}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/50">Chars</span>
              </div>
            </div>

            <RightPanel />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT — DO NOT TOUCH (preserved + enhanced)
          ═══════════════════════════════════════════════════ */}
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>
        {/* Mobile TopAppBar */}
        <header className="flex items-center justify-between px-4 h-14 bg-[#FAF7F2] shrink-0 border-b-2 border-black z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center p-2 border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-[18px] font-black">AI Solver</h1>
          <button
            onClick={() => navigate("/sources")}
            className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">library_books</span>
          </button>
        </header>

        {/* Mobile scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-6 bg-[#FAF7F2]">
          {/* Header + sample buttons */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-black">Math & Science</h2>
            <div className="flex gap-1.5">
              {[
                { label: "Chem", type: "chem" },
                { label: "Phy", type: "physics" },
                { label: "Math", type: "math" },
              ].map(({ label, type }) => (
                <button
                  key={type}
                  onClick={() => loadSampleProblem(type)}
                  className="px-2 py-1 text-[11px] border-2 border-black bg-white font-bold hover:bg-[#E2E2E2] shadow-[1px_1px_0px_#000]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Source Chip */}
          {activeSource ? (
            <div className="flex items-center gap-2 bg-[#e9f2ff] border-2 border-black px-3 py-2 shadow-[2px_2px_0px_#000] mb-4">
              <span className="material-symbols-outlined text-[16px]">attach_file</span>
              <span className="text-[12px] font-bold flex-1 truncate">Active: {activeSource.name || activeSource}</span>
              <button onClick={() => navigate("/sources")} className="text-[11px] font-bold text-[#ae2925] hover:underline shrink-0">Change ›</button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/sources")}
              className="flex items-center gap-2 bg-white border-2 border-dashed border-black/30 px-3 py-2 hover:border-black transition-colors w-full mb-4"
            >
              <span className="material-symbols-outlined text-[16px]">library_books</span>
              <span className="text-[12px] font-bold text-black/50">Attach from Source Library (optional)</span>
              <span className="material-symbols-outlined text-[14px] ml-auto">chevron_right</span>
            </button>
          )}

          {/* Symbol bar */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 select-none" style={{ scrollbarWidth: "none" }}>
            {symbols.map((sym, idx) => (
              <button
                key={idx}
                onClick={() => appendSymbol(sym)}
                className="shrink-0 px-3 h-10 border-2 border-black bg-white font-extrabold text-[13px] hover:bg-[#E2E2E2] active:scale-95 shadow-[2px_2px_0px_#000]"
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative mb-4">
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full h-36 p-4 bg-white border-2 border-black text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none"
              style={{ boxShadow: "4px 4px 0px #000" }}
              placeholder="Type your math formula, chemistry reaction, or physics problem..."
            />
          </div>

          {/* Toolbar */}
          <div className="flex gap-2 mb-4">
            <div className="relative">
              <button
                ref={calcBtnRef}
                onClick={() => setShowCalc((v) => !v)}
                className={`w-11 h-11 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000] transition-all ${
                  showCalc ? "bg-black text-white" : "bg-white hover:bg-[#E2E2E2]"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">calculate</span>
              </button>
              {showCalc && (
                <div className="absolute top-14 left-0 z-50">
                  <ScientificCalculator onInsert={(val) => setProblem((prev) => prev + val)} onClose={() => setShowCalc(false)} />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHistory(true)}
              className="w-11 h-11 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[22px]">history</span>
            </button>

            <button
              onClick={() => {
                setProblem("");
                setSolved(false);
                setSteps([]);
                sessionStorage.removeItem("math_problem");
                sessionStorage.removeItem("math_steps");
                sessionStorage.removeItem("math_solved");
              }}
              className="w-11 h-11 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[22px]">delete</span>
            </button>

            <button onClick={handleSolve} disabled={loading} className="flex-1 relative group cursor-pointer">
              <div className="w-full py-3 bg-[#E8534A] text-white border-2 border-black flex items-center justify-center gap-2 z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
                <span className="material-symbols-outlined text-[18px]">functions</span>
                <span className="font-black text-[13px] uppercase tracking-wide">
                  {loading ? "Computing..." : "Solve Problem"}
                </span>
              </div>
              <div className="absolute inset-0 bg-black translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
            </button>
          </div>

          {/* Free tier counter — mobile */}
          {!isPro && remainingUses !== null && remainingUses <= 4 && remainingUses > 0 && (
            <div className="mb-3 flex flex-col items-center gap-1">
              <p className="text-[12px] text-black/50 font-bold">{remainingUses} solve{remainingUses !== 1 ? "s" : ""} left today</p>
              {remainingUses <= 2 && <SoftWarning feature="math_solver" remaining={remainingUses} />}
            </div>
          )}

          {/* Solution Steps — mobile */}
          {(solved || loading) && (
            <div className="mt-2">
              <h3 className="text-[14px] font-black uppercase tracking-wider mb-3">Solution Steps</h3>
              <div className="bg-white border-2 border-black p-4 flex flex-col gap-4 shadow-[3px_3px_0px_#000]">
                {loading && (
                  <div className="flex items-center gap-3 py-4 justify-center">
                    <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[24px]">autorenew</span>
                    <span className="text-[13px] font-black text-black/50">AI computing...</span>
                  </div>
                )}
                {solved && steps.map((st: SolutionStep, sIdx: number) => <StepCard key={st.stepNumber} st={st} sIdx={sIdx} />)}
              </div>
            </div>
          )}

          {/* Function Visualizer — mobile */}
          {solved && (
            <div className="mt-5">
              <h3 className="text-[14px] font-black uppercase tracking-wider mb-3">Function Visualizer</h3>
              <div className="border-2 border-black bg-[#FAF7F2] shadow-[3px_3px_0px_#000] overflow-hidden">
                <div className="flex border-b-2 border-black">
                  {(["2d", "table"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setVisualizerTab(tab)}
                      className={`flex-1 py-2 text-[11px] font-black uppercase tracking-widest border-r-2 last:border-r-0 border-black ${
                        visualizerTab === tab ? "bg-black text-white" : "bg-[#FAF7F2] text-black"
                      }`}
                    >
                      {tab === "2d" ? "2D Plot" : "Table"}
                    </button>
                  ))}
                </div>
                <div className="h-[200px] overflow-hidden">
                  {visualizerTab === "2d" ? (
                    <FunctionVisualizer expression={problem} />
                  ) : (
                    <div className="w-full h-full overflow-y-auto p-2">
                      <TableView />
                    </div>
                  )}
                </div>
                <div className="px-3 py-1.5 border-t-2 border-black bg-[#F0EDE0]">
                  <p className="text-[10px] font-bold text-black/50 font-mono truncate">{problem}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
