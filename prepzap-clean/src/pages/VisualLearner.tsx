/**
 * VisualLearner.tsx — Studenius
 * Breaks any concept into 3-5 memorable visual scenes using Pollinations AI images.
 * Each scene is a storyboard card: photo, scene number, title, anchor phrase, why-it-works.
 *
 * Dashboard card: label "Visual Learner", description "See concepts, remember them"
 * Route: /visual-learner
 */

import { useState, useEffect } from "react"
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

// ── Safety blocklist ──────────────────────────────────────────────────────────
const BLOCKED = ["nude","naked","gore","violence","weapon","gun","knife","blood","death","war","sexy","adult","nsfw"]
function safeQuery(q: string): string {
  const lower = q.toLowerCase()
  for (const word of BLOCKED) {
    if (lower.includes(word)) return "abstract educational background texture"
  }
  return q
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Scene {
  id: string
  title: string
  anchorPhrase: string
  whyItWorks: string
  unsplashQuery: string   // reused as image prompt hint from AI
  imagePrompt?: string    // richer Pollinations prompt built client-side
}

interface StoryboardResult {
  concept: string
  scenes: Scene[]
}

interface SceneWithPhoto extends Scene {
  photoUrl?: string
  photoAlt?: string
  photoLoading: boolean
}

// ── Build a rich Pollinations prompt from scene data ─────────────────────────
// Combines the concept, scene title, and AI-suggested query into a detailed
// educational illustration prompt so images match the source content accurately.
function buildPollinationsPrompt(concept: string, scene: Scene): string {
  const base = safeQuery(scene.unsplashQuery)
  // Compose a descriptive educational prompt
  const prompt = [
    base,
    `related to ${concept}`,
    `scene: ${scene.title}`,
    "educational illustration",
    "photorealistic",
    "clear and vivid",
    "safe for school",
  ].join(", ")
  return encodeURIComponent(prompt)
}

// ── Fetch one Pollinations image (free, no API key, AI-generated) ─────────────
async function fetchPollinationsPhoto(
  concept: string,
  scene: Scene
): Promise<{ url: string; alt: string } | null> {
  try {
    const prompt = buildPollinationsPrompt(concept, scene)
    // Use a seed based on concept+sceneId so the image is stable on re-renders
    const seed = Math.abs(
      (concept + scene.id + scene.title)
        .split("")
        .reduce((acc, c) => acc + c.charCodeAt(0), 0)
    )
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=500&seed=${seed}&nologo=true&model=flux`
    return { url, alt: `${concept} — ${scene.title}` }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VisualLearner() {
  const { model, setModel } = useModel()
  const { entries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("visual-learner")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [phase, setPhase]         = useState<"setup"|"loading"|"result">("setup")
  const [concept, setConcept]     = useState("")
  const [conceptInput, setConceptInput] = useState("")
  const [scenes, setScenes]       = useState<SceneWithPhoto[]>([])
  const [error, setError]         = useState<string|null>(null)
  const [progress, setProgress]   = useState(0) // 0-100 during loading
  const [sourceChips, setSourceChips] = useState<string[]>([])
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const activeSource = getActiveSource()

  // Animate progress bar during loading
  useEffect(() => {
    if (phase !== "loading") { setProgress(0); return }
    setProgress(10)
    const interval = setInterval(() => {
      setProgress(p => p < 85 ? p + Math.random() * 8 : p)
    }, 600)
    return () => clearInterval(interval)
  }, [phase])

  // If source active — extract key concepts as chips
  useEffect(() => {
    if (!activeSource?.preview) return
    const extractChips = async () => {
      try {
        const raw = await callGroq(
          [{ role: "user", content: `Source text:\n${activeSource.preview}\n\nList 6 key concepts as a JSON array of short strings (2-4 words each). Return ONLY the JSON array.` }],
          "Extract key learnable concepts. Return ONLY a JSON array of strings. No markdown.",
          model,
          300
        )
        const chips = JSON.parse(raw.replace(/```json|```/gi, "").trim())
        if (Array.isArray(chips)) setSourceChips(chips.slice(0, 8))
      } catch { /* silent */ }
    }
    extractChips()
  }, [activeSource?.id])

  // ── History restore ────────────────────────────────────────────────────────
  const handleHistorySelect = (entry: HistoryEntry) => {
    setHistoryOpen(false)
    try {
      const parsed: StoryboardResult = JSON.parse(entry.output)
      setConcept(parsed.concept)
      // Restore scenes without photos (Pollinations URLs are deterministic — rebuild them)
      const restored: SceneWithPhoto[] = parsed.scenes.map(s => {
        const photo = buildPollinationsPrompt(parsed.concept, s)
        const seed = Math.abs(
          (parsed.concept + s.id + s.title)
            .split("")
            .reduce((acc, c) => acc + c.charCodeAt(0), 0)
        )
        return {
          ...s,
          photoUrl: `https://image.pollinations.ai/prompt/${photo}?width=800&height=500&seed=${seed}&nologo=true&model=flux`,
          photoAlt: `${parsed.concept} — ${s.title}`,
          photoLoading: false,
        }
      })
      setScenes(restored)
      setPhase("result")
    } catch { /* ignore */ }
  }

  // ── Generate storyboard ────────────────────────────────────────────────────
  const handleGenerate = async (conceptToUse?: string) => {
    const target = (conceptToUse ?? conceptInput).trim()
    if (!target) return

    setConcept(target)
    setPhase("loading")
    setError(null)

    const context = buildAIContext()
    const systemPrompt = `You are a visual memory expert trained in dual-coding theory.
You create vivid, concrete scene associations that make abstract concepts memorable.
Every scene must be grounded in a real, visual, photographable moment — no abstract metaphors.
The scenes must be directly and accurately related to the concept and any source material provided.

Return ONLY valid JSON (no markdown, no backticks):
{
  "concept": "<the concept name>",
  "scenes": [
    {
      "id": "s1",
      "title": "<scene title, 3-5 words>",
      "anchorPhrase": "<1 sentence the student says when they see this image>",
      "whyItWorks": "<1 sentence explaining the memory connection>",
      "unsplashQuery": "<4-6 words describing a specific, concrete, photographable or illustratable subject that visually represents this scene — be as specific and accurate to the concept as possible>"
    }
  ]
}
Generate 4 scenes. Make each scene visually distinct and directly tied to the concept.
If source material is provided, base the scenes on its actual content, not general knowledge.${context}`

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Create a visual storyboard for: "${target}"` }],
        systemPrompt,
        model,
        2000
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: StoryboardResult = JSON.parse(clean)

      // Init scenes with loading state
      const initialScenes: SceneWithPhoto[] = parsed.scenes.map(s => ({
        ...s, photoLoading: true
      }))
      setScenes(initialScenes)
      setProgress(90)
      setPhase("result")
      setProgress(100)

      // Fetch photos staggered — 1.5s apart to avoid Pollinations 429 rate limit
      ;(async () => {
        for (let i = 0; i < parsed.scenes.length; i++) {
         if (i > 0) await new Promise(r => setTimeout(r, 3000))
          const scene = parsed.scenes[i]
          fetchPollinationsPhoto(parsed.concept, scene).then(photo => {
            setScenes(prev => prev.map((s, idx) => idx === i
              ? { ...s, photoUrl: photo?.url, photoAlt: photo?.alt, photoLoading: false }
              : s
            ))
          })
        }
      })()

      saveHistory({
        prompt: target,
        preview: parsed.scenes[0]?.anchorPhrase ?? target,
        output: JSON.stringify(parsed),
        model,
        meta: `${parsed.scenes.length} scenes`,
      })
    } catch (e: any) {
      setError(e.message ?? "Could not generate storyboard. Try again.")
      setPhase("setup")
    }
  }

  const resetAll = () => {
    setPhase("setup"); setConcept(""); setConceptInput(""); setScenes([]); setError(null)
  }

  // ── Shared header ──────────────────────────────────────────────────────────
  const HeaderRow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {/* Eye icon */}
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.7}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL }}>
            Visual Learner
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>See It. Remember It.</h1>
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

        <p style={{ fontSize: 13, color: "#777", marginBottom: 28, lineHeight: 1.6 }}>
          Type any concept and get a 4-scene visual storyboard — each scene is an AI-generated image paired with a memory anchor phrase you'll actually remember.
        </p>

        <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, padding: "28px 24px" }}>
          {/* Active source chips */}
          {sourceChips.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>
                From "{activeSource?.name}" — pick a concept:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {sourceChips.map(chip => (
                  <button key={chip} onClick={() => handleGenerate(chip)}
                    style={{ padding: "5px 12px", background: "rgba(0,196,180,0.06)", border: `0.5px solid rgba(0,196,180,0.2)`, color: TEAL, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,196,180,0.12)" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,196,180,0.06)" }}>
                    {chip}
                  </button>
                ))}
              </div>
              <div style={{ height: 1, background: BORDER, margin: "24px 0" }} />
            </div>
          )}

          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8 }}>
            Or type your own concept
          </label>
          <input
            value={conceptInput}
            onChange={e => setConceptInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleGenerate()}
            placeholder="e.g. Mitosis, The French Revolution, Supply & Demand…"
            style={{ width: "100%", padding: "12px 14px", background: "#141414", border: `0.5px solid ${BORDER}`, color: TEXT, fontSize: 14, fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: 20 }}
          />

          {/* Example concepts */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 28 }}>
            {["Mitosis","Black Holes","The Immune System","Keynesian Economics","Neural Networks","The Water Cycle"].map(c => (
              <button key={c} onClick={() => setConceptInput(c)}
                style={{ padding: "4px 10px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#666", fontSize: 10, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#666" }}>
                {c}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(232,60,60,0.08)", border: "0.5px solid rgba(232,60,60,0.2)", color: "#E84040", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button
            onClick={() => handleGenerate()}
            disabled={!conceptInput.trim()}
            style={{
              width: "100%", padding: "14px 0",
              background: conceptInput.trim() ? TEAL : "#141414",
              color: conceptInput.trim() ? BG : "#333",
              fontSize: 13, fontWeight: 700, border: "none",
              cursor: conceptInput.trim() ? "pointer" : "not-allowed",
              fontFamily: FONT, letterSpacing: "0.06em", transition: "background .2s, color .2s",
            }}>
            Build My Visual Story
          </button>
        </div>
      </main>

      <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "loading") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500, padding: "40px 20px" }}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.5} style={{ marginBottom: 24 }}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <p style={{ fontSize: 15, color: TEXT, marginBottom: 8, fontWeight: 600 }}>Building your visual story…</p>
        <p style={{ fontSize: 12, color: MUTED, marginBottom: 32 }}>Finding the perfect scenes for "{concept}"</p>
        {/* Teal progress bar */}
        <div style={{ width: 280, height: 2, background: "#1A1A1A" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: TEAL, transition: "width 0.5s ease" }} />
        </div>
      </main>
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // RESULT PHASE — Storyboard grid
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "result") return (
    <ToolPageShell showModelPicker model={model} setModel={setModel}>
      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <HeaderRow />

        {/* Concept title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ height: 1, flex: 1, background: BORDER }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#888", padding: "4px 14px", border: `0.5px solid ${BORDER}` }}>{concept}</span>
          <div style={{ height: 1, flex: 1, background: BORDER }} />
        </div>

        {/* Storyboard grid — 2 columns on wide, 1 on narrow */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16, marginBottom: 32 }}>
          {scenes.map((scene, i) => (
            <SceneCard key={scene.id} scene={scene} index={i} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={resetAll}
            style={{ flex: 1, padding: "13px 0", background: TEAL, color: BG, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, letterSpacing: "0.06em" }}>
            New Concept
          </button>
          <button onClick={() => { setConcept(""); setConceptInput(""); setPhase("setup") }}
            style={{ padding: "13px 24px", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#888", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
            Back
          </button>
        </div>
      </main>

      <ToolHistoryPanel entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </ToolPageShell>
  )

  return null
}

// ── Scene card ────────────────────────────────────────────────────────────────
function SceneCard({ scene, index }: { scene: SceneWithPhoto; index: number }) {
  const TEAL   = "#00C4B4"
  const CARD   = "#0E0E0E"
  const BORDER = "#252525"
  const TEXT   = "#F0F0F0"
  const MUTED  = "#555"
  const FONT   = "'Inter', system-ui, sans-serif"

  return (
    <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, overflow: "hidden" }}>
      {/* Photo */}
      <div style={{ position: "relative", height: 200, background: "#111", overflow: "hidden" }}>
        {scene.photoLoading ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, border: `2px solid #222`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          </div>
        ) : scene.photoUrl ? (
          <img
            src={scene.photoUrl}
            alt={scene.photoAlt ?? scene.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="lazy"
            onError={e => {
              // If Pollinations fails to load, show the fallback placeholder
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
        ) : (
          // Fallback if no photo
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,196,180,0.05)" }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1} opacity={0.3}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        {/* Scene number badge */}
        <div style={{ position: "absolute", top: 10, left: 10, background: TEAL, color: "#0A0A0A", fontSize: 10, fontWeight: 800, padding: "3px 8px", letterSpacing: "0.08em", fontFamily: FONT }}>
          SCENE {index + 1}
        </div>

        {/* Gradient overlay at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)" }} />
      </div>

      {/* Content */}
      <div style={{ padding: "16px 18px" }}>
        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 12px", lineHeight: 1.3 }}>{scene.title}</h3>

        {/* Anchor phrase */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL, marginBottom: 5 }}>Anchor Phrase</div>
          <p style={{ fontSize: 13, color: "#D0D0D0", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{scene.anchorPhrase}"</p>
        </div>

        {/* Why it works */}
        <div style={{ paddingTop: 10, borderTop: `0.5px solid #1A1A1A` }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 5 }}>Why This Works</div>
          <p style={{ fontSize: 11, color: "#666", margin: 0, lineHeight: 1.55 }}>{scene.whyItWorks}</p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
