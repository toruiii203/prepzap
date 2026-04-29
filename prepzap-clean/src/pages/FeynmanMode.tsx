/**
 * FeynmanMode.tsx — Studenius
 * Textarea replaced with a document-editor writing surface.
 * Full-width clean surface, monospace-weight Inter, word count, fading placeholder.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { callGroq } from "@/lib/groq"
import { buildAIContext, getActiveSource, loadLibrary } from "@/lib/sourceContext"
import { ToolPageShell, useModel } from "@/components/ToolPageShell"
import { useToolHistory, HistoryButton, ToolHistoryPanel, type HistoryEntry } from "@/components/ToolHistory"

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL  = "#00C4B4"
const GOLD  = "#E8B923"
const BG    = "#0A0A0A"
const CARD  = "#0E0E0E"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"

const FONT = "'Inter', system-ui, sans-serif"

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
  const { entries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("feynman")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [phase, setPhase]           = useState<"setup"|"teaching"|"feedback">("setup")
  const [topic, setTopic]           = useState("")
  const [topicInput, setTopicInput] = useState("")
  const [explanation, setExplanation] = useState("")
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string|null>(null)
  const [feedback, setFeedback]     = useState<FeedbackResult|null>(null)
  const [round, setRound]           = useState(1)
  const [activeSource]              = useState(() => getActiveSource())
  const [showSourcePicker, setShowSourcePicker] = useState(false)
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
    setHistoryOpen(false)
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

      saveHistory({
        prompt: topic,
        preview: explanation.slice(0, 120),
        output: JSON.stringify(parsed),
        model,
        meta: `${parsed.masteryScore}% mastery`,
      })
    } catch (e: any) {
      setError(e.message ?? "Something went wrong. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAgain = () => {
    setRound(r => r + 1)
    setExplanation("")
    setFeedback(null)
    setPhase("teaching")
    setError(null)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const resetAll = () => {
    setPhase("setup"); setTopic(""); setTopicInput(""); setExplanation("")
    setFeedback(null); setRound(1); setError(null)
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Teach It to Learn It</h1>
      </div>
      <HistoryButton count={entries.length} onClick={() => setHistoryOpen(true)} />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // SETUP PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "setup") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <main style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
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

        {/* Source picker modal */}
        {showSourcePicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: 24, width: 340 }}>
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

      <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // TEACHING PHASE — Document editor surface
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "teaching") {
    const wc = wordCount(explanation)
    const canSubmit = wc >= 20

    return (
      <ToolPageShell showModelPicker model={model} setModel={setModel}>
        <main style={{ flex: 1, maxWidth: 720, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
          <HeaderRow />

          {/* Topic badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: 11, color: MUTED }}>Teaching:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, padding: "3px 10px", background: "rgba(0,196,180,0.06)", border: `0.5px solid rgba(0,196,180,0.2)`, color: TEAL }}>{topic}</span>
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

        <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
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
      <ToolPageShell showModelPicker model={model} setModel={setModel}>
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

        <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
      </ToolPageShell>
    )
  }

  return null
}
