import { CompanionSidebar } from "@/components/CompanionSidebar";
import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
/**
 * FeynmanMode.tsx — Studenius
 * Textarea replaced with a document-editor writing surface.
 * Full-width clean surface, monospace-weight Nunito, word count, fading placeholder.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { callGroq } from "@/lib/groq"
import { buildAIContext, getActiveSource, loadLibrary } from "@/lib/sourceContext"
import { ToolPageShell, useModel } from "@/components/ToolPageShell"

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL  = "#8b1a2a"
const GOLD  = "#f0a040"
const BG    = "#160810"
const CARD  = "#1f0b13"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"

const FONT = "'Nunito', system-ui, sans-serif"

const SUGGESTED = [
  "Photosynthesis","Newton's Laws","Supply & Demand","DNA Replication",
  "Quantum Superposition","The Water Cycle","Cellular Respiration",
  "Electromagnetic Induction","Natural Selection","Thermodynamics",
]

// ── Word count helper ─────────────────────────────────────────────────────────
function wordCount(s: string) {
  return s.trim() === "" ? 0 : s.trim().split(/\s+/).length
}

// ── Feedback types ────────────────────────────────────────────────────────────
interface FeedbackItem { type: "strength" | "gap" | "hint"; text: string }
interface FeedbackResult {
  masteryScore: number
  summary: string
  feedback: FeedbackItem[]
  followUpQuestion: string
  conceptsCovered: string[]
  conceptsMissing: string[]
  encouragement: string
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FeynmanMode() {
  const { model, setModel } = useModel()

  const [phase, setPhase]           = useState<"setup"|"teaching"|"feedback">("setup")
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("feynman"));
  const [topic, setTopic]           = useState("")
  const [topicInput, setTopicInput] = useState("")
  const [explanation, setExplanation] = useState("")
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string|null>(null)
  const [feedback, setFeedback]     = useState<FeedbackResult|null>(null)
  const [round, setRound]           = useState(1)
  const [activeSource]              = useState(() => getActiveSource())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.max(320, el.scrollHeight) + "px"
  }, [explanation])

  // ── History restore ────────────────────────────────────────────────────────
  const handleHistorySelect = (entry: HistoryEntry) => {
        try {
      const parsed = JSON.parse(entry.output)
      setTopic(entry.prompt)
      setFeedback(parsed)
      setPhase("feedback")
    } catch {
      // output wasn't JSON — restore as explanation
      setTopic(entry.prompt)
      setExplanation(entry.output)
      setPhase("teaching")
    }
  }

  // ── Start session ──────────────────────────────────────────────────────────
  const handleStart = () => {
    const libs = loadLibrary()
    if (!topicInput.trim() && libs.length > 1) { setShowSourcePicker(true); return }
    const t = topicInput.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "the source material"
    setTopic(t)
    setPhase("teaching")
    setExplanation("")
    setError(null)
    textareaRef.current?.focus()
  }

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!explanation.trim() || isLoading) return
    setIsLoading(true)
    setError(null)

    const context = buildAIContext()
    const systemPrompt = `You are a Feynman Technique evaluator. Evaluate the student's explanation of "${topic}".
Return ONLY valid JSON:
{
  "masteryScore": <0-100>,
  "summary": "<2 sentences>",
  "feedback": [
    {"type": "strength"|"gap"|"hint", "text": "<sentence>"}
  ],
  "followUpQuestion": "<probing question>",
  "conceptsCovered": ["<concept>"],
  "conceptsMissing": ["<concept>"],
  "encouragement": "<1 sentence motivational note>"
}
Be strict but fair. Penalize jargon and vague handwaving.${context}`

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Topic: "${topic}"\n\nStudent explanation:\n${explanation}` }],
        systemPrompt,
        model,
        1200
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: FeedbackResult = JSON.parse(clean)
      setFeedback(parsed)
      setPhase("feedback")

      addHistoryEntry("feynman", {
        prompt: topic,
        preview: explanation.slice(0, 120),
        output: JSON.stringify(parsed),
        model,
        meta: `${parsed.masteryScore}`,
      });
      setToolHistory(loadHistory("feynman")); setTopic(""); setTopicInput(""); setExplanation("")
      setFeedback(null); setRound(1); setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(`Error: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Shared header row ──────────────────────────────────────────────────────
  const HeaderRow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.7}>
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL }}>
            Feynman Mode
          </span>
          {round > 1 && (
            <span style={{ fontSize: 9, padding: "1px 6px", background: `rgba(232,185,35,0.12)`, color: GOLD, border: `0.5px solid rgba(232,185,35,0.25)`, fontWeight: 700 }}>
              Round {round}
            </span>
          )}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Feynman</h1>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // SETUP PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "setup") return (
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b1a2a", marginBottom: 2 }}>Feynman History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("feynman", "all"); setToolHistory([]); }}
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
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No feynman history yet</div>
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

        <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: "32px 28px" }}>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: 1.6 }}>
            Pick a concept. Then explain it as if you're teaching a curious 12-year-old.<br/>
            The AI evaluates your understanding and finds the gaps.
          </p>

          {activeSource && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "8px 12px", background: "rgba(0,196,180,0.05)", border: `0.5px solid rgba(0,196,180,0.2)` }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.7}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={{ fontSize: 11, color: TEAL }}>{activeSource.name}</span>
              <span style={{ fontSize: 10, color: "#555", marginLeft: "auto" }}>Active source</span>
            </div>
          )}

          {/* Topic input */}
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8 }}>
            What concept do you want to master?
          </label>
          <input
            value={topicInput}
            onChange={e => setTopicInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleStart()}
            placeholder={activeSource ? `Or leave blank to use "${activeSource.name}"` : "e.g. Photosynthesis, Newton's First Law..."}
            style={{ width: "100%", padding: "12px 14px", background: "#141414", border: `0.5px solid ${BORDER}`, color: TEXT, fontSize: 14, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
          />

          {/* Suggested chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14, marginBottom: 28 }}>
            {SUGGESTED.map(s => (
              <button key={s} onClick={() => setTopicInput(s)}
                style={{ padding: "4px 10px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#777", fontSize: 10, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#777" }}>
                {s}
              </button>
            ))}
          </div>

          <button onClick={handleStart}
            style={{ width: "100%", padding: "13px 0", background: TEAL, color: BG, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, letterSpacing: "0.06em", transition: "opacity .2s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Start Teaching Session
          </button>

          {!topicInput.trim() && !activeSource && (
            <p style={{ fontSize: 10, color: "#444", textAlign: "center", marginTop: 10 }}>
              Type a concept or activate a source first
            </p>
          )}
        </div>

        {showSourcePicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setShowSourcePicker(false)} />
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: 24, width: 340, position: "relative", zIndex: 1 }}>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Pick a source to teach from:</p>
              {loadLibrary().map(s => (
                <button key={s.id}
                  onClick={() => { setTopicInput(s.name.replace(/\.\w+$/, "")); setShowSourcePicker(false); setTimeout(handleStart, 0) }}
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
  // TEACHING PHASE — Document editor surface
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "teaching") {
    const wc = wordCount(explanation)
    const canSubmit = wc >= 20

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
        <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
          <HeaderRow />

          {/* Topic badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: 11, color: MUTED }}>Teaching:</span>
            <span style={{ fontSize: 13, fontWeight: 600, padding: "3px 10px", background: "rgba(0,196,180,0.06)", border: `0.5px solid rgba(0,196,180,0.2)`, color: TEAL }}>{topic}</span>
            <button onClick={resetAll} style={{ marginLeft: "auto", fontSize: 10, color: MUTED, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>← Change topic</button>
          </div>

          {/* Prompt card */}
          <div style={{ padding: "14px 18px", background: "rgba(0,196,180,0.04)", border: `0.5px solid rgba(0,196,180,0.15)`, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0, lineHeight: 1.7 }}>
              Pretend I'm a curious 12-year-old who's never heard of <strong style={{ color: TEXT }}>{topic}</strong>. Explain it in simple terms — no jargon. Just write freely below.
            </p>
          </div>

          {/* ── Document editor surface ─────────────────────────────────── */}
          <div style={{ position: "relative", background: "#0D0D0D", border: `0.5px solid ${BORDER}` }}>
            <textarea
              ref={textareaRef}
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Start writing your explanation here…"
              style={{
                width: "100%",
                minHeight: 320,
                padding: "28px 32px",
                background: "transparent",
                border: "none",
                outline: "none",
                color: TEXT,
                fontSize: 15,
                fontFamily: FONT,
                fontWeight: 300,
                lineHeight: 1.85,
                resize: "none",
                boxSizing: "border-box",
                caretColor: TEAL,
                // Fading placeholder via CSS injected once
              }}
            />
            {/* Word count */}
            <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: 10, color: canSubmit ? "#444" : "#333", fontFamily: FONT, userSelect: "none" }}>
              {wc} {wc === 1 ? "word" : "words"}{!canSubmit && wc > 0 ? ` — write a bit more` : ""}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(232,60,60,0.08)", border: "0.5px solid rgba(232,60,60,0.2)", color: "#E84040", fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleAnalyze}
            disabled={!canSubmit || isLoading}
            style={{
              marginTop: 16, width: "100%", padding: "14px 0",
              background: canSubmit && !isLoading ? TEAL : "#141414",
              color: canSubmit && !isLoading ? BG : "#333",
              fontSize: 13, fontWeight: 700, border: "none",
              cursor: canSubmit && !isLoading ? "pointer" : "not-allowed",
              fontFamily: FONT, letterSpacing: "0.06em",
              transition: "background .2s, color .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {isLoading ? (
              <>
                <span style={{ width: 14, height: 14, border: `2px solid rgba(10,10,10,0.3)`, borderTopColor: BG, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                Analyzing Your Understanding…
              </>
            ) : "Analyze My Understanding"}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
      </ToolPageShell>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FEEDBACK PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "feedback" && feedback) {
    const strengths = feedback.feedback.filter(f => f.type === "strength")
    const gaps      = feedback.feedback.filter(f => f.type === "gap")
    const hints     = feedback.feedback.filter(f => f.type === "hint")

    const scoreColor = feedback.masteryScore >= 80 ? TEAL : feedback.masteryScore >= 60 ? GOLD : "#E84040"

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
        <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
          <HeaderRow />

          {/* Score card */}
          <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: "28px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 28 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>Mastery Score</div>
              <div style={{ fontSize: 52, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{feedback.masteryScore}<span style={{ fontSize: 24 }}>%</span></div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 6 }}>{feedback.masteryScore >= 85 ? "Expert" : feedback.masteryScore >= 70 ? "Proficient" : feedback.masteryScore >= 50 ? "Developing" : "Beginner"}</div>
            </div>
            <div style={{ flex: 1 }}>
              {/* Score bar */}
              <div style={{ height: 4, background: "#1A1A1A", marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${feedback.masteryScore}%`, background: scoreColor, transition: "width 0.8s ease" }} />
              </div>
              <p style={{ fontSize: 13, color: "#A0A0A0", lineHeight: 1.6, margin: 0 }}>{feedback.summary}</p>
            </div>
          </div>

          {/* Concepts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Concepts Covered", items: feedback.conceptsCovered, color: TEAL, borderColor: "rgba(0,196,180,0.2)", bg: "rgba(0,196,180,0.04)" },
              { label: "Concepts Missing", items: feedback.conceptsMissing, color: "#E84040", borderColor: "rgba(232,64,64,0.2)", bg: "rgba(232,64,64,0.04)" },
            ].map(({ label, items, color, borderColor, bg }) => (
              <div key={label} style={{ background: bg, border: `0.5px solid ${borderColor}`, padding: "14px 16px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color, marginBottom: 10 }}>{label}</div>
                {items.length === 0
                  ? <span style={{ fontSize: 11, color: "#444" }}>{label.includes("Missing") ? "Nothing critical!" : "Keep going"}</span>
                  : items.map(c => (
                    <span key={c} style={{ display: "inline-block", fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,0.04)", border: `0.5px solid #252525`, color: "#C0C0C0", marginRight: 5, marginBottom: 5 }}>{c}</span>
                  ))}
              </div>
            ))}
          </div>

          {/* Feedback sections */}
          {[
            { label: "Strengths", items: strengths, color: TEAL, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            { label: "Knowledge Gaps", items: gaps, color: "#E84040", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
            { label: "Hints & Suggestions", items: hints, color: GOLD, icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
          ].filter(s => s.items.length > 0).map(section => (
            <div key={section.label} style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={section.color} strokeWidth={1.7}><path d={section.icon}/></svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: section.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{section.label}</span>
              </div>
              {section.items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: section.color, fontSize: 12, flexShrink: 0, marginTop: 1 }}>—</span>
                  <span style={{ fontSize: 13, color: "#C0C0C0", lineHeight: 1.6 }}>{item.text}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Follow-up question */}
          <div style={{ background: "rgba(0,196,180,0.04)", border: `0.5px solid rgba(0,196,180,0.2)`, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL, marginBottom: 10 }}>AI Challenge</div>
            <p style={{ fontSize: 14, color: TEXT, fontStyle: "italic", margin: 0, lineHeight: 1.7 }}>"{feedback.followUpQuestion}"</p>
          </div>

          {/* Encouragement */}
          <div style={{ padding: "14px 20px", background: "rgba(232,185,35,0.04)", border: `0.5px solid rgba(232,185,35,0.2)`, marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: GOLD }}>{feedback.encouragement}</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleTryAgain}
              style={{ flex: 1, padding: "13px 0", background: TEAL, color: BG, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, letterSpacing: "0.06em" }}>
              Try Again — Round {round + 1}
            </button>
            <button onClick={resetAll}
              style={{ padding: "13px 24px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              New Topic
            </button>
          </div>
        </main>
      </ToolPageShell>
    )
  }

  return null
}
