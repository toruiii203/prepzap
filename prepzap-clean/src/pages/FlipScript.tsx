import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
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

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL   = "#8b1a2a"
const GOLD   = "#f0a040"
const BG     = "#160810"
const CARD   = "#1f0b13"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"
const FONT   = "'Nunito', system-ui, sans-serif"

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("flip-script"));
  const [phase, setPhase]         = useState<"input"|"loading"|"result">("input")
  const [mainArg, setMainArg]     = useState("")
  const [evidence, setEvidence]   = useState("")
  const [anticipated, setAnticipated] = useState("")
  const [topic, setTopic]         = useState("")
  const [result, setResult]       = useState<DebateResult|null>(null)
  const [error, setError]         = useState<string|null>(null)

  const canSubmit = mainArg.trim().length >= 10 && evidence.trim().length >= 10

  // ── History restore ────────────────────────────────────────────────────────
  const handleHistorySelect = (entry: HistoryEntry) => {
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

      addHistoryEntry("flip-script", {
        prompt: shortTopic,
        preview: parsed.counterArgument.slice(0, 120),
        output: JSON.stringify(parsed),
        model,
        meta: `${parsed.score}`,
      });
      setToolHistory(loadHistory("flip-script")); setMainArg(""); setEvidence(""); setAnticipated("")
      setResult(null); setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(`Error: ${msg}`)
    } finally {
      setIsLoading(false)
    }
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Flip Script</h1>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // INPUT PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "input") return (
    <ToolPageShell key="shell">
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b1a2a", marginBottom: 2 }}>Flip Script History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("flip-script", "all"); setToolHistory([]); }}
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
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No flip script history yet</div>
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
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
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

        {showSourcePicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setShowSourcePicker(false)} />
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: 24, width: 340, position: "relative", zIndex: 1 }}>
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
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "loading") return (
    <ToolPageShell key="shell">
      
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
      <ToolPageShell key="shell">
      
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#8b1a2a" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b1a2a"; e.currentTarget.style.color = "#8b1a2a"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#8b1a2a" }} />}
          </button>
        </div>
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
      </ToolPageShell>
    )
  }

  return null
}
