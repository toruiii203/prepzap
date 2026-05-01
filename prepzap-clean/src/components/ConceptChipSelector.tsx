/**
 * ConceptChipSelector.tsx — Studenius / PrepZap
 *
 * Shared entry component. Reads the active source, extracts key concepts
 * as clickable teal chip buttons, and also exposes a manual text input +
 * a "Surprise Me 🎲" button that picks a random concept.
 *
 * Usage:
 *   <ConceptChipSelector
 *     onSelect={(concept) => handleGenerate(concept)}
 *     placeholder="e.g. Mitosis, Supply & Demand…"
 *     label="Subject / Topic"
 *   />
 */

import { useState, useEffect } from "react"
import { callGroq } from "@/lib/groq"
import { getActiveSource } from "@/lib/sourceContext"

// ── Design tokens (matches app-wide dark-luxe system) ────────────────────────
const TEAL   = "#00C4B4"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"
const CARD   = "#0E0E0E"
const FONT   = "'Inter', system-ui, sans-serif"

// Fallback topic bank used when no source is active
const FALLBACK_TOPICS = [
  "Mitosis", "Black Holes", "Supply & Demand", "The Water Cycle",
  "Newton's Laws", "DNA Replication", "The French Revolution",
  "Keynesian Economics", "Neural Networks", "Photosynthesis",
  "The Immune System", "Quantum Mechanics", "Climate Change",
  "World War II", "Natural Selection", "Thermodynamics",
]

interface Props {
  onSelect: (concept: string) => void
  placeholder?: string
  label?: string
  /** Extra static chips to show when no source is active (optional) */
  staticChips?: string[]
}

export function ConceptChipSelector({
  onSelect,
  placeholder = "e.g. Mitosis, Supply & Demand…",
  label = "Subject / Topic",
  staticChips,
}: Props) {
  const [manualInput, setManualInput] = useState("")
  const [sourceChips, setSourceChips] = useState<string[]>([])
  const [chipsLoading, setChipsLoading] = useState(false)
  const activeSource = getActiveSource()

  // ── Extract concept chips from active source ────────────────────────────
  useEffect(() => {
    if (!activeSource?.preview) { setSourceChips([]); return }
    let cancelled = false
    setChipsLoading(true)
    ;(async () => {
      try {
        const raw = await callGroq(
          [{ role: "user", content: `Source text:\n${activeSource.preview}\n\nList 6–8 key concepts as a JSON array of short strings (2–4 words each). Return ONLY the JSON array.` }],
          "Extract key learnable concepts. Return ONLY a JSON array of strings. No markdown, no preamble.",
          "gemini-2.0-flash",
          300
        )
        const chips = JSON.parse(raw.replace(/```json|```/gi, "").trim())
        if (!cancelled && Array.isArray(chips)) setSourceChips(chips.slice(0, 8))
      } catch { /* silent — fall through to manual input */ }
      finally { if (!cancelled) setChipsLoading(false) }
    })()
    return () => { cancelled = true }
  }, [activeSource?.id])

  // ── Surprise Me: random concept from source chips or fallback bank ──────
  const handleSurprise = () => {
    const pool = sourceChips.length > 0 ? sourceChips : (staticChips ?? FALLBACK_TOPICS)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    onSelect(pick)
  }

  // ── Chips to display when no source is active ───────────────────────────
  const displayStaticChips = !activeSource && (staticChips ?? FALLBACK_TOPICS.slice(0, 8))

  return (
    <div style={{ fontFamily: FONT }}>

      {/* ── Source chips ─────────────────────────────────────────────────── */}
      {activeSource && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: MUTED, marginBottom: 10,
          }}>
            {chipsLoading
              ? "Reading your source…"
              : sourceChips.length > 0
                ? `From "${activeSource.name}" — pick a concept:`
                : `Active: "${activeSource.name}"`}
          </div>

          {chipsLoading && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[80, 110, 70, 95, 85, 100].map((w, i) => (
                <div key={i} style={{
                  width: w, height: 28,
                  background: "rgba(0,196,180,0.04)",
                  border: `0.5px solid ${BORDER}`,
                  animation: "pz-shimmer 1.4s ease-in-out infinite",
                }} />
              ))}
            </div>
          )}

          {!chipsLoading && sourceChips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {sourceChips.map(chip => (
                <ChipButton key={chip} label={chip} onClick={() => onSelect(chip)} />
              ))}
            </div>
          )}

          <div style={{ height: 1, background: BORDER, margin: "20px 0" }} />
        </div>
      )}

      {/* ── Static/fallback chips when no source ─────────────────────────── */}
      {displayStaticChips && displayStaticChips.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: MUTED, marginBottom: 10,
          }}>
            Quick picks:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {displayStaticChips.map(chip => (
              <button
                key={chip}
                onClick={() => setManualInput(chip)}
                style={{
                  padding: "4px 10px",
                  background: "transparent",
                  border: `0.5px solid ${BORDER}`,
                  color: "#666",
                  fontSize: 10,
                  cursor: "pointer",
                  fontFamily: FONT,
                  transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#666" }}
              >
                {chip}
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: BORDER, margin: "20px 0" }} />
        </div>
      )}

      {/* ── Manual input ──────────────────────────────────────────────────── */}
      <label style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: MUTED,
        display: "block", marginBottom: 8,
      }}>
        {activeSource ? "Or type your own:" : label}
      </label>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={manualInput}
          onChange={e => setManualInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && manualInput.trim()) onSelect(manualInput.trim()) }}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "11px 14px",
            background: "#141414",
            border: `0.5px solid ${BORDER}`,
            color: TEXT,
            fontSize: 14,
            fontFamily: FONT,
            outline: "none",
          }}
        />

        {/* Surprise Me button */}
        <button
          onClick={handleSurprise}
          title="Surprise Me — pick a random concept"
          style={{
            padding: "11px 14px",
            background: "rgba(0,196,180,0.06)",
            border: `0.5px solid rgba(0,196,180,0.25)`,
            color: TEAL,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: FONT,
            whiteSpace: "nowrap",
            transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,196,180,0.12)" }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,196,180,0.06)" }}
        >
          🎲
        </button>
      </div>

      {/* ── Primary CTA ───────────────────────────────────────────────────── */}
      <button
        onClick={() => { if (manualInput.trim()) onSelect(manualInput.trim()) }}
        disabled={!manualInput.trim()}
        style={{
          width: "100%",
          padding: "13px 0",
          background: manualInput.trim() ? TEAL : "#141414",
          color: manualInput.trim() ? "#0A0A0A" : "#333",
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: manualInput.trim() ? "pointer" : "not-allowed",
          fontFamily: FONT,
          letterSpacing: "0.06em",
          transition: "background .2s, color .2s",
        }}
      >
        Continue →
      </button>

      {/* shimmer keyframes */}
      <style>{`
        @keyframes pz-shimmer {
          0%,100% { opacity:.3 }
          50%      { opacity:.7 }
        }
      `}</style>
    </div>
  )
}

// ── Chip button sub-component ─────────────────────────────────────────────────
function ChipButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        background: "rgba(0,196,180,0.06)",
        border: `0.5px solid rgba(0,196,180,0.2)`,
        color: TEAL,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONT,
        transition: "all .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,196,180,0.15)"; e.currentTarget.style.borderColor = "rgba(0,196,180,0.5)" }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,196,180,0.06)"; e.currentTarget.style.borderColor = "rgba(0,196,180,0.2)" }}
    >
      {label}
    </button>
  )
}
