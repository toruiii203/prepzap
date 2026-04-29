/**
 * FlipScript.tsx — Studenius
 * Textarea replaced with 3 structured argument panels:
 *   1. Your Main Argument
 *   2. Your Evidence or Example
 *   3. What You Think I'll Counter With
 * All three combine into a single AI prompt on submit.
 */

import { useState } from "react"
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

interface DebateResult {
  counterArgument: string
  weaknesses: string[]
  strengths: string[]
  rebuttal: string
  verdict: string
  score: number // 0-100 how strong the original argument is
}

// ── Panel component ───────────────────────────────────────────────────────────
function ArgumentPanel({
  label,
  sublabel,
  value,
  onChange,
  placeholder,
  index,
}: {
  label: string
  sublabel?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  index: number
}) {
  const colors = [TEAL, GOLD, "#A67FE8"]

  return (
    <div style={{ position: "relative" }}>
      {/* Panel label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase",
          color: colors[index], fontFamily: FONT,
        }}>
          {String(index + 1).padStart(2, "0")} — {label}
        </span>
        {sublabel && (
          <span style={{ fontSize: 9, color: "#444", letterSpacing: "0.06em" }}>{sublabel}</span>
        )}
      </div>

      {/* Input area */}
      <div style={{ position: "relative", background: "#111", border: `0.5px solid ${BORDER}` }}>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{
            width: "100%",
            padding: "16px 18px",
            background: "transparent",
            border: "none",
            outline: "none",
            color: TEXT,
            fontSize: 14,
            fontFamily: FONT,
            fontWeight: 300,
            lineHeight: 1.75,
            resize: "vertical",
            boxSizing: "border-box",
            caretColor: colors[index],
          }}
        />
        {/* Accent line */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: value.trim() ? colors[index] : "transparent", transition: "background .3s" }} />
        {/* Char count */}
        {value.length > 0 && (
          <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9, color: "#333", fontFamily: FONT }}>
            {value.length}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FlipScript() {
  const { model, setModel } = useModel()
  const { entries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("flipscript")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [phase, setPhase]         = useState<"input"|"loading"|"result">("input")
  const [mainArg, setMainArg]     = useState("")
  const [evidence, setEvidence]   = useState("")
  const [anticipated, setAnticipated] = useState("")
  const [topic, setTopic]         = useState("")
  const [result, setResult]       = useState<DebateResult|null>(null)
  const [error, setError]         = useState<string|null>(null)
  const [showSourcePicker, setShowSourcePicker] = useState(false)

  const canSubmit = mainArg.trim().length >= 10 && evidence.trim().length >= 10

  // ── History restore ────────────────────────────────────────────────────────
  const handleHistorySelect = (entry: HistoryEntry) => {
    setHistoryOpen(false)
    try {
      const parsed = JSON.parse(entry.output)
      setResult(parsed)
      setTopic(entry.prompt)
      setPhase("result")
    } catch {
      setPhase("input")
    }
  }

  // ── Generate from source ───────────────────────────────────────────────────
  const handleGenerateFromSource = () => {
    const libs = loadLibrary()
    if (libs.length > 1) { setShowSourcePicker(true); return }
    const src = getActiveSource()
    if (src) setMainArg(`Based on my study of "${src.name.replace(/\.\w+$/, "")}"`)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return
    setPhase("loading")
    setError(null)

    const context = buildAIContext()
    const combinedArgument = `MAIN ARGUMENT:\n${mainArg}\n\nEVIDENCE / EXAMPLE:\n${evidence}\n\nANTICIPATED COUNTER:\n${anticipated || "(Not provided)"}`
    const shortTopic = mainArg.slice(0, 60) + (mainArg.length > 60 ? "…" : "")
    setTopic(shortTopic)

    const systemPrompt = `You are a rigorous debate coach and Socratic challenger. 
A student has presented a structured argument. Your job is to:
1. Steel-man their argument (find its best form)
2. Then systematically dismantle it with the strongest counter-argument
3. Point out weaknesses but also genuine strengths
4. Provide a suggested rebuttal the student could use
5. Give a verdict score

Return ONLY valid JSON:
{
  "counterArgument": "<2-3 sentences, the strongest possible counter>",
  "weaknesses": ["<specific weakness>"],
  "strengths": ["<genuine strength>"],
  "rebuttal": "<how the student could respond to your counter>",
  "verdict": "<1 sentence overall assessment>",
  "score": <0-100 strength of original argument>
}${context}`

    try {
      const raw = await callGroq(
        [{ role: "user", content: combinedArgument }],
        systemPrompt,
        model,
        1024
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: DebateResult = JSON.parse(clean)
      setResult(parsed)
      setPhase("result")

      saveHistory({
        prompt: shortTopic,
        preview: parsed.counterArgument.slice(0, 120),
        output: JSON.stringify(parsed),
        model,
        meta: `${parsed.score}% strength`,
      })
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.")
      setPhase("input")
    }
  }

  const resetAll = () => {
    setPhase("input"); setMainArg(""); setEvidence(""); setAnticipated("")
    setResult(null); setError(null)
  }

  // ── Shared header ──────────────────────────────────────────────────────────
  const HeaderRow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.7}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL }}>
            FlipScript
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Argue. Get Challenged. Sharpen.</h1>
      </div>
      <HistoryButton count={entries.length} onClick={() => setHistoryOpen(true)} />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // INPUT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "input") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <HeaderRow />

        <p style={{ fontSize: 13, color: "#777", marginBottom: 28, lineHeight: 1.6 }}>
          Build your argument in three parts. The AI will counter it as hard as it can — then help you defend yourself.
        </p>

        {/* Source chip */}
        {getActiveSource() && (
          <button onClick={handleGenerateFromSource}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "rgba(0,196,180,0.05)", border: `0.5px solid rgba(0,196,180,0.2)`, color: TEAL, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT, marginBottom: 24, letterSpacing: "0.08em" }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Generate from Active Source
          </button>
        )}

        {/* Three panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          <ArgumentPanel
            index={0}
            label="Your Main Argument"
            sublabel="The core claim you're making"
            value={mainArg}
            onChange={setMainArg}
            placeholder="State your position clearly. What do you believe and why? e.g. 'Renewable energy should fully replace fossil fuels within 20 years because…'"
          />
          <ArgumentPanel
            index={1}
            label="Your Evidence or Example"
            sublabel="Data, case, or analogy that supports it"
            value={evidence}
            onChange={setEvidence}
            placeholder="Give a concrete example, statistic, or case study that backs your argument…"
          />
          <ArgumentPanel
            index={2}
            label="What You Think I'll Counter With"
            sublabel="Optional — anticipate the pushback"
            value={anticipated}
            onChange={setAnticipated}
            placeholder="What's the most obvious objection to your argument? Naming it first shows you've thought it through…"
          />
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(232,60,60,0.08)", border: "0.5px solid rgba(232,60,60,0.2)", color: "#E84040", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "14px 0",
            background: canSubmit ? TEAL : "#141414",
            color: canSubmit ? BG : "#333",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: FONT, letterSpacing: "0.06em", transition: "background .2s, color .2s",
          }}>
          Flip My Argument
        </button>

        {!canSubmit && (
          <p style={{ fontSize: 10, color: "#444", textAlign: "center", marginTop: 10 }}>
            Fill in your main argument and evidence first
          </p>
        )}

        {/* Source picker modal */}
        {showSourcePicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: 24, width: 340 }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Pick a source:</p>
              {loadLibrary().map(s => (
                <button key={s.id}
                  onClick={() => { setMainArg(`Based on my study of "${s.name.replace(/\.\w+$/, "")}"`); setShowSourcePicker(false) }}
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
        <div style={{ width: 40, height: 40, border: `2px solid #222`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: 20 }} />
        <p style={{ fontSize: 13, color: "#666" }}>Building the strongest counter-argument…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // RESULT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "result" && result) {
    const scoreColor = result.score >= 75 ? TEAL : result.score >= 50 ? GOLD : "#E84040"

    return (
      <ToolPageShell showModelPicker model={model} setModel={setModel}>
        <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
          <HeaderRow />

          {/* Argument strength score */}
          <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: "24px 28px", marginBottom: 16, display: "flex", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>Argument Strength</div>
              <div style={{ fontSize: 46, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{result.score}<span style={{ fontSize: 22 }}>%</span></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 3, background: "#1A1A1A", marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${result.score}%`, background: scoreColor, transition: "width 0.8s ease" }} />
              </div>
              <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{result.verdict}"</p>
            </div>
          </div>

          {/* Counter-argument */}
          <div style={{ background: "rgba(232,64,64,0.04)", border: `0.5px solid rgba(232,64,64,0.2)`, padding: "20px 24px", marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#E84040", marginBottom: 12 }}>
              — The Counter-Argument
            </div>
            <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.75, margin: 0 }}>{result.counterArgument}</p>
          </div>

          {/* Strengths + Weaknesses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { label: "Strengths", items: result.strengths, color: TEAL, bg: "rgba(0,196,180,0.04)", border: "rgba(0,196,180,0.2)" },
              { label: "Weaknesses", items: result.weaknesses, color: "#E84040", bg: "rgba(232,64,64,0.04)", border: "rgba(232,64,64,0.2)" },
            ].map(({ label, items, color, bg, border }) => (
              <div key={label} style={{ background: bg, border: `0.5px solid ${border}`, padding: "16px 18px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color, marginBottom: 10 }}>{label}</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                    <span style={{ color, fontSize: 12, flexShrink: 0 }}>—</span>
                    <span style={{ fontSize: 12, color: "#B0B0B0", lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Rebuttal */}
          <div style={{ background: "rgba(232,185,35,0.04)", border: `0.5px solid rgba(232,185,35,0.2)`, padding: "20px 24px", marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>
              — How to Defend Yourself
            </div>
            <p style={{ fontSize: 13, color: "#C0C0C0", lineHeight: 1.7, margin: 0 }}>{result.rebuttal}</p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setPhase("input") }}
              style={{ flex: 1, padding: "13px 0", background: TEAL, color: BG, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, letterSpacing: "0.06em" }}>
              Refine My Argument
            </button>
            <button onClick={resetAll}
              style={{ padding: "13px 24px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              New Argument
            </button>
          </div>
        </main>

        <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </ToolPageShell>
    )
  }

  return null
}
