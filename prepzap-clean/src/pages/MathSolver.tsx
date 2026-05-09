import { CompanionSidebar } from "@/components/CompanionSidebar";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
/**
 * MathSolver.tsx — Studenius
 * Textarea replaced with a dedicated math input panel:
 *   • Monospace font, 16px, centered
 *   • Quick-insert symbol row above input (x², √, π, ∫, ±, ≠, ≤, ≥, ÷, ×)
 *   • Each symbol inserts at cursor position
 *   • Feels like a calculator notepad
 */

import { useState, useRef } from "react"
import { callGroq } from "@/lib/groq"
import { buildAIContext, getActiveSource, loadLibrary } from "@/lib/sourceContext"
import { ToolPageShell, useModel } from "@/components/ToolPageShell"
import { ToolHistoryPanel, HistoryButton } from "@/pages/ToolHistory"
import { Brain } from "lucide-react"

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL   = "#8b1a2a"
const GOLD   = "#f0a040"
const BG     = "#160810"
const CARD   = "#1f0b13"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"
const FONT   = "'Nunito', system-ui, sans-serif"
const MONO   = "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace"

// ── Math symbols ──────────────────────────────────────────────────────────────
const handleHistorySelect = (entry: { prompt: string; output: string; [key: string]: any }) => {
    try {
      const parsed = JSON.parse(entry.output)
      setResult(parsed)
      setProblem(entry.prompt)
      setPhase("result")
    } catch {
      setProblem(entry.prompt)
      setPhase("input")
    }
  }

const SYMBOLS = [
  { display: "x²", insert: "²" },
  { display: "√",  insert: "√" },
  { display: "π",  insert: "π" },
  { display: "∫",  insert: "∫" },
  { display: "±",  insert: "±" },
  { display: "≠",  insert: "≠" },
  { display: "≤",  insert: "≤" },
  { display: "≥",  insert: "≥" },
  { display: "÷",  insert: "÷" },
  { display: "×",  insert: "×" },
  { display: "∞",  insert: "∞" },
  { display: "θ",  insert: "θ" },
  { display: "Σ",  insert: "Σ" },
  { display: "Δ",  insert: "Δ" },
  { display: "∂",  insert: "∂" },
]

interface MathSolution {
  steps: Array<{ step: number; description: string; work: string }>
  finalAnswer: string
  explanation: string
  tips: string[]
  difficulty: "easy" | "medium" | "hard"
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MathSolver() {
  const { model, setModel } = useModel()

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [entries, setEntries] = useState(() => loadHistory("mathsolver"));
  const [toolHistory, setToolHistory] = useState(() => loadHistory("math-solver"));
  const [phase, setPhase]     = useState<"input"|"loading"|"result">("input")
  const [problem, setProblem] = useState("")
  const [result, setResult]   = useState<MathSolution|null>(null)
  const [error, setError]     = useState<string|null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveHistory = (entry: { prompt: string; preview: string; output: string; model: string; meta?: string }) => {
    const newEntry = addHistoryEntry("mathsolver", entry)
    setEntries(loadHistory("mathsolver"))
    return newEntry
  }
  const removeHistory = (id: string) => {
    deleteHistoryEntry("mathsolver", id)
    setEntries(loadHistory("mathsolver"))
  }
  const clearHistory = () => {
    deleteHistoryEntry("mathsolver", "all")
    setEntries([])
  }

  const canSubmit = problem.trim().length >= 3

  // ── Symbol insertion at cursor ─────────────────────────────────────────────
  const insertSymbol = (sym: string) => {
    const el = textareaRef.current
    if (!el) { setProblem(p => p + sym); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const next  = problem.slice(0, start) + sym + problem.slice(end)
    setProblem(next)
    // Restore cursor after symbol
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + sym.length
      el.focus()
    })
  }

  // ── History restore ────────────────────────────────────────────────────────
  const handleHistorySelect = (entry: { prompt: string; output: string; [key: string]: any }) => {    try {
      const parsed = JSON.parse(entry.output)
      setResult(parsed)
      setProblem(entry.prompt)
      setPhase("result")
    } catch {
      setProblem(entry.prompt)
      setPhase("input")
    }
  }

  // ── Solve ──────────────────────────────────────────────────────────────────
  const handleSolve = async () => {
    if (!canSubmit) return
    setPhase("loading")
    setError(null)

    const context = buildAIContext()
    const systemPrompt = `You are an expert math tutor. Solve the given math problem with clear step-by-step working.
Return ONLY valid JSON — no markdown, no backticks:
{
  "steps": [
    {"step": 1, "description": "<what we're doing>", "work": "<the actual calculation shown>"}
  ],
  "finalAnswer": "<the answer, clean>",
  "explanation": "<1-2 sentences on the key insight>",
  "tips": ["<helpful tip>"],
  "difficulty": "easy"|"medium"|"hard"
}
Show ALL working. Be thorough. Simplify notation for clarity.${context}`

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Solve this math problem step by step:\n${problem}` }],
        systemPrompt,
        model,
        1500
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: MathSolution = JSON.parse(clean)
      setResult(parsed)
      setPhase("result")

      saveHistory({
        prompt: problem,
        preview: `Answer: ${parsed.finalAnswer}`,
        output: JSON.stringify(parsed),
        model,
        meta: parsed.difficulty,
      })
    } catch (e: any) {
      setError(e.message ?? "Could not solve. Check your input and try again.")
      setPhase("input")
    }
  }

  const resetAll = () => {
    setPhase("input"); setProblem(""); setResult(null); setError(null)
  }

  // ── Shared header ──────────────────────────────────────────────────────────
  const HeaderRow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.7}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL }}>
            MathZap
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Math Solver</h1>
      </div>
      <HistoryButton count={entries.length} onClick={() => setHistoryOpen(true)} />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // INPUT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "input") return (
    <ToolPageShell key="shell">
      <CompanionSidebar />
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b1a2a", marginBottom: 2 }}>Math Solver History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("math-solver", "all"); setToolHistory([]); }}
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
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No math solver history yet</div>
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
      <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <a href="/dashboard" style={{ fontSize: 10, color: "#444", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, letterSpacing: "0.06em" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#8b1a2a")} onMouseLeave={e => (e.currentTarget.style.color = "#444")}>
            <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>
            DASHBOARD
          </a>
        </div>
        <HeaderRow />

        {/* Source chip */}
        {getActiveSource() && (
          <button
            onClick={() => {
              const libs = loadLibrary()
              if (libs.length > 1) { setShowSourcePicker(true) }
              else {
                const src = getActiveSource()
                if (src) setProblem(`From "${src.name.replace(/\.\w+$/, "")}" — `)
              }
            }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(0,196,180,0.05)", border: `0.5px solid rgba(0,196,180,0.2)`, color: TEAL, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT, marginBottom: 24, letterSpacing: "0.08em" }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Generate from Active Source
          </button>
        )}

        {/* ── Math input panel ─────────────────────────────────────────── */}
        <div style={{ background: CARD, border: `0.5px solid ${BORDER}` }}>
          {/* Symbol row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "12px 14px", borderBottom: `0.5px solid ${BORDER}`, background: "#0C0C0C" }}>
            {SYMBOLS.map(({ display, insert }) => (
              <button
                key={display}
                onClick={() => insertSymbol(insert)}
                title={`Insert ${display}`}
                style={{
                  padding: "4px 9px",
                  background: "#141414",
                  border: `0.5px solid ${BORDER}`,
                  color: "#B0B0B0",
                  fontSize: 13,
                  fontFamily: MONO,
                  cursor: "pointer",
                  transition: "all .15s",
                  lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL; e.currentTarget.style.background = "rgba(0,196,180,0.06)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#B0B0B0"; e.currentTarget.style.background = "#141414" }}>
                {display}
              </button>
            ))}
          </div>

          {/* Main input area */}
          <div style={{ position: "relative" }}>
            <textarea
              ref={textareaRef}
              value={problem}
              onChange={e => setProblem(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSolve() }}
              placeholder={"Type your math problem here…\n\ne.g.  Solve for x:  2x² + 5x - 3 = 0\n      Integrate:  ∫ x² dx from 0 to 3\n      Simplify:   (3x + 2)(x - 5)"}
              rows={8}
              style={{
                width: "100%",
                padding: "24px 28px",
                background: "transparent",
                border: "none",
                outline: "none",
                color: TEXT,
                fontSize: 16,
                fontFamily: MONO,
                fontWeight: 400,
                lineHeight: 1.8,
                resize: "vertical",
                boxSizing: "border-box",
                caretColor: TEAL,
                letterSpacing: "0.02em",
              }}
            />
            {/* Cmd+Enter hint */}
            <div style={{ position: "absolute", bottom: 12, right: 14, fontSize: 9, color: "#2A2A2A", fontFamily: FONT, userSelect: "none" }}>
              ⌘↵ to solve
            </div>
          </div>
        </div>

        {/* Example problems */}
        <div style={{ marginTop: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#333", marginBottom: 8 }}>Quick examples</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              "Solve: 2x² + 5x - 3 = 0",
              "∫ x² dx from 0 to 3",
              "Find the derivative of x³ + 2x",
              "Simplify: (3x + 2)(x - 5)",
              "If sin(θ) = 0.5, find θ",
            ].map(ex => (
              <button key={ex} onClick={() => setProblem(ex)}
                style={{ padding: "4px 10px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#555", fontSize: 10, fontFamily: MONO, cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#555" }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(232,60,60,0.08)", border: "0.5px solid rgba(232,60,60,0.2)", color: "#E84040", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSolve}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "14px 0",
            background: canSubmit ? TEAL : "#141414",
            color: canSubmit ? BG : "#333",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: FONT, letterSpacing: "0.06em",
            transition: "background .2s, color .2s",
          }}>
          Solve Step by Step
        </button>

        {showSourcePicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setShowSourcePicker(false)} />
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: 24, width: 340, position: "relative", zIndex: 1 }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Pick a source:</p>
              {loadLibrary().map(s => (
                <button key={s.id}
                  onClick={() => { setProblem(`From "${s.name.replace(/\.\w+$/, "")}" — `); setShowSourcePicker(false) }}
                  style={{ width: "100%", padding: "10px 12px", background: "transparent", border: `0.5px solid ${BORDER}`, color: TEXT, fontSize: 12, cursor: "pointer", fontFamily: FONT, marginBottom: 6, textAlign: "left" }}>
                  {s.name}
                </button>
              ))}
              <button onClick={() => setShowSourcePicker(false)}
                style={{ width: "100%", padding: "8px 0", marginTop: 6, background: "transparent", border: `0.5px solid ${BORDER}`, color: MUTED, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>

      <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "loading") return (
    <ToolPageShell key="shell">
      <CompanionSidebar />
      
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>
        <div style={{ fontSize: 32, fontFamily: MONO, color: TEAL, marginBottom: 16, letterSpacing: "0.1em" }}>∫ dx</div>
        <div style={{ width: 32, height: 32, border: `2px solid #222`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: 16 }} />
        <p style={{ fontSize: 13, color: "#666" }}>Working through the steps…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // RESULT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "result" && result) {
    const diffColor = result.difficulty === "easy" ? TEAL : result.difficulty === "medium" ? GOLD : "#E84040"

    return (
      <ToolPageShell key="shell">
      <CompanionSidebar />
      
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>
        <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
          <HeaderRow />

          {/* Problem recap */}
          <div style={{ background: "#0C0C0C", border: `0.5px solid ${BORDER}`, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontFamily: MONO, color: "#A0A0A0", flex: 1, marginRight: 16 }}>{problem}</span>
            <span style={{ fontSize: 9, padding: "2px 8px", background: `rgba(0,0,0,0.4)`, border: `0.5px solid ${diffColor}`, color: diffColor, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0 }}>{result.difficulty}</span>
          </div>

          {/* Final answer — prominent */}
          <div style={{ background: "rgba(0,196,180,0.06)", border: `0.5px solid rgba(0,196,180,0.3)`, padding: "20px 24px", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: TEAL, marginBottom: 8 }}>Final Answer</div>
            <div style={{ fontSize: 28, fontFamily: MONO, color: TEXT, letterSpacing: "0.05em" }}>{result.finalAnswer}</div>
          </div>

          {/* Steps */}
          <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, marginBottom: 16 }}>
            <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${BORDER}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>Step-by-Step Working</span>
            </div>
            {result.steps.map((step, i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < result.steps.length - 1 ? `0.5px solid #141414` : "none", display: "flex", gap: 16 }}>
                {/* Step number */}
                <div style={{ flexShrink: 0, width: 24, height: 24, background: "rgba(0,196,180,0.08)", border: `0.5px solid rgba(0,196,180,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: TEAL }}>
                  {step.step}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#777", marginBottom: 6 }}>{step.description}</div>
                  <div style={{ fontSize: 14, fontFamily: MONO, color: TEXT, lineHeight: 1.6, padding: "8px 12px", background: "#0C0C0C", border: `0.5px solid #1A1A1A` }}>
                    {step.work}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div style={{ padding: "16px 20px", background: "rgba(232,185,35,0.04)", border: `0.5px solid rgba(232,185,35,0.2)`, marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, marginBottom: 8 }}>Key Insight</div>
            <p style={{ fontSize: 13, color: "#B0B0B0", margin: 0, lineHeight: 1.65 }}>{result.explanation}</p>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div style={{ padding: "16px 20px", background: CARD, border: `0.5px solid ${BORDER}`, marginBottom: 24 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>Tips</div>
              {result.tips.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                  <span style={{ color: TEAL, fontSize: 12 }}>—</span>
                  <span style={{ fontSize: 12, color: "#888", lineHeight: 1.55 }}>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setPhase("input")}
              style={{ flex: 1, padding: "13px 0", background: TEAL, color: BG, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, letterSpacing: "0.06em" }}>
              Solve Another
            </button>
            <button onClick={resetAll}
              style={{ padding: "13px 24px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              Clear
            </button>
          </div>
        </main>

        <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </ToolPageShell>
    )
  }

  return null
}
