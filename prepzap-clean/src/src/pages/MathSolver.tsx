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
import { useToolHistory, HistoryButton, ToolHistoryPanel, type HistoryEntry } from "@/components/ToolHistory"

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL   = "#00C4B4"
const GOLD   = "#E8B923"
const BG     = "#0A0A0A"
const CARD   = "#0E0E0E"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"
const FONT   = "'Inter', system-ui, sans-serif"
const MONO   = "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace"

// ── Math symbols ──────────────────────────────────────────────────────────────
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
  const { entries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("mathsolver")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [phase, setPhase]     = useState<"input"|"loading"|"result">("input")
  const [problem, setProblem] = useState("")
  const [result, setResult]   = useState<MathSolution|null>(null)
  const [error, setError]     = useState<string|null>(null)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
  const handleHistorySelect = (entry: HistoryEntry) => {
    setHistoryOpen(false)
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Step-by-Step Solutions</h1>
      </div>
      <HistoryButton count={entries.length} onClick={() => setHistoryOpen(true)} />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // INPUT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "input") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
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

        {/* Source picker modal */}
        {showSourcePicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: 24, width: 340 }}>
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
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
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
      <ToolPageShell showModelPicker model={model} setModel={setModel}>
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
