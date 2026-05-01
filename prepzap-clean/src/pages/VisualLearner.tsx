/**
 * VisualLearner.tsx — Studenius
 * Breaks any concept into 4 memorable visual scenes.
 * Images: Google Custom Search → LoremFlickr → Source Unsplash → Picsum (fallback chain)
 *
 * Dashboard card: label "Visual Learner", description "See concepts, remember them"
 * Route: /visual-learner
 */

import { useState, useEffect } from "react"
import { callGroq } from "@/lib/groq"
import { buildAIContext, getActiveSource } from "@/lib/sourceContext"
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
  unsplashQuery: string
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

// ── Stable numeric seed from strings ─────────────────────────────────────────
function makeSeed(...parts: string[]): number {
  return Math.abs(
    parts.join("").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  )
}

// ── Image provider URL builders ───────────────────────────────────────────────

// 1. Wikimedia/Wikipedia — free, unlimited, no key needed.
//    Searches Wikipedia for the concept + scene title and grabs the lead image.
//    Best for science, history, biology, geography — canonical, accurate images.
async function wikimediaImageUrl(concept: string, scene: Scene): Promise<string | null> {
  // Try scene title first, then concept, then unsplashQuery words
  const queries = [
    `${scene.title} ${concept}`,
    concept,
    safeQuery(scene.unsplashQuery),
  ]

  for (const q of queries) {
    try {
      const search = encodeURIComponent(q)
      // Step 1: find the top Wikipedia article for the query
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${search}&srlimit=3&format=json&origin=*`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!searchRes.ok) continue
      const searchData = await searchRes.json()
      const pages = searchData?.query?.search ?? []
      if (!pages.length) continue

      // Step 2: for each result, try to get the page image
      for (const page of pages.slice(0, 2)) {
        const title = encodeURIComponent(page.title)
        const imgRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&pithumbsize=800&format=json&origin=*`,
          { signal: AbortSignal.timeout(5000) }
        )
        if (!imgRes.ok) continue
        const imgData = await imgRes.json()
        const imgPages = Object.values(imgData?.query?.pages ?? {}) as any[]
        const thumb = imgPages[0]?.thumbnail?.source
        if (thumb) return thumb
      }
    } catch { /* try next query */ }
  }
  return null
}

// 2. Pexels — free API, unlimited, high quality keyword-matched photos.
//    Get a free key at https://www.pexels.com/api/
//    Add to .env.local: NEXT_PUBLIC_PEXELS_KEY=your_key_here
async function pexelsImageUrl(concept: string, scene: Scene): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_PEXELS_KEY
  if (!key) return null

  const q = encodeURIComponent(`${safeQuery(scene.unsplashQuery)} ${concept}`)
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${q}&per_page=3&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    // Pick a photo based on seed for variety but stability
    const photos = data?.photos ?? []
    if (!photos.length) return null
    const idx = makeSeed(concept, scene.id) % photos.length
    return photos[idx]?.src?.large ?? photos[0]?.src?.large ?? null
  } catch {
    return null
  }
}

// 3. LoremFlickr — free, no key, pulls real Flickr CC photos by keyword
function loremFlickrUrl(scene: Scene): string {
  const keyword = encodeURIComponent(safeQuery(scene.unsplashQuery).split(" ").slice(0, 2).join(","))
  const seed = makeSeed(scene.id, scene.title)
  return `https://loremflickr.com/800/500/${keyword}?lock=${seed}`
}

// 4. Source Unsplash — free, no key, keyword-matched
function sourceUnsplashUrl(scene: Scene): string {
  const keyword = encodeURIComponent(safeQuery(scene.unsplashQuery))
  const seed = makeSeed(scene.id, scene.title)
  return `https://source.unsplash.com/800x500/?${keyword}&sig=${seed}`
}

// 5. Picsum — always works, random but stable per seed (last resort)
function picsumUrl(concept: string, scene: Scene): string {
  const seed = makeSeed(concept, scene.id, scene.title)
  return `https://picsum.photos/seed/${seed}/800/500`
}

// ── Test if a URL actually responds OK ───────────────────────────────────────
async function urlLoads(url: string, timeoutMs = 6000): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Main image fetcher: Wikimedia → Pexels → LoremFlickr → Unsplash → Picsum ─
async function fetchScenePhoto(
  concept: string,
  scene: Scene
): Promise<{ url: string; alt: string }> {
  const alt = `${concept} — ${scene.title}`

  // 1. Wikimedia — free, unlimited, highly accurate for educational topics
  try {
    const url = await wikimediaImageUrl(concept, scene)
    if (url) return { url, alt }
  } catch { /* fall through */ }

  // 2. Pexels — free API key, unlimited, high quality (add NEXT_PUBLIC_PEXELS_KEY)
  try {
    const url = await pexelsImageUrl(concept, scene)
    if (url) return { url, alt }
  } catch { /* fall through */ }

  // 3. LoremFlickr — no key needed, keyword-matched real photos
  try {
    const url = loremFlickrUrl(scene)
    if (await urlLoads(url, 5000)) return { url, alt }
  } catch { /* fall through */ }

  // 3. Source Unsplash (keyword-matched, no API key needed)
  try {
    const url = sourceUnsplashUrl(scene)
    if (await urlLoads(url, 5000)) return { url, alt }
  } catch { /* fall through */ }

  // 4. Picsum — always works, random but stable per seed
  return { url: picsumUrl(concept, scene), alt }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VisualLearner() {
  const { model, setModel } = useModel()
  const { entries, save: saveHistory, remove: removeHistory, clear: clearHistory } = useToolHistory("visual-learner")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [phase, setPhase]           = useState<"setup"|"loading"|"result">("setup")
  const [concept, setConcept]       = useState("")
  const [conceptInput, setConceptInput] = useState("")
  const [scenes, setScenes]         = useState<SceneWithPhoto[]>([])
  const [error, setError]           = useState<string|null>(null)
  const [progress, setProgress]     = useState(0)
  const [sourceChips, setSourceChips] = useState<string[]>([])
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

  // Extract key concept chips from active source
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
      // Restore with Pollinations URL — SceneCard onError will cascade to fallbacks if needed
      const restored: SceneWithPhoto[] = parsed.scenes.map(s => ({
        ...s,
        photoUrl: loremFlickrUrl(s),
        photoAlt: `${parsed.concept} — ${s.title}`,
        photoLoading: false,
      }))
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
      "unsplashQuery": "<Wikipedia-optimized search phrase: use the exact scientific/historical term plus diagram or photograph where applicable. Examples: water cycle evaporation diagram, mitosis cell division diagram, black hole event horizon photograph, French Revolution guillotine, supply demand curve economics. Must be 3-7 words, highly specific, matching a real Wikipedia article title or image.>"
    }
  ]
}
Generate 4 scenes. Make each scene visually distinct and directly tied to the concept.
Each unsplashQuery must target a SPECIFIC Wikipedia-searchable subject — not vague words like evaporation alone, but water evaporation sunlight ocean diagram.
If source material is provided, base the scenes on its actual content, not general knowledge.\${context}`

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Create a visual storyboard for: "${target}"` }],
        systemPrompt,
        model,
        2000
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: StoryboardResult = JSON.parse(clean)

      setScenes(parsed.scenes.map(s => ({ ...s, photoLoading: true })))
      setProgress(90)
      setPhase("result")
      setProgress(100)

      // Sequential fetching with full fallback chain per scene
      // 800ms gap between scenes to be polite to all providers
      ;(async () => {
        for (let i = 0; i < parsed.scenes.length; i++) {
          const scene = parsed.scenes[i]
          const photo = await fetchScenePhoto(parsed.concept, scene)
          setScenes(prev => prev.map((s, idx) => idx === i
            ? { ...s, photoUrl: photo.url, photoAlt: photo.alt, photoLoading: false }
            : s
          ))
          if (i < parsed.scenes.length - 1) {
            await new Promise(r => setTimeout(r, 800))
          }
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

  // ── Regenerate a single scene ─────────────────────────────────────────────
  const handleRegenerateScene = async (index: number) => {
    const scene = scenes[index]
    if (!scene || scene.photoLoading) return

    // Mark this scene as loading
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, photoLoading: true } : s))

    try {
      // Ask AI for a fresh scene with a different angle
      const systemPrompt = `You are a visual memory expert. Generate ONE alternative scene for a concept.
Return ONLY valid JSON (no markdown, no backticks):
{
  "id": "${scene.id}",
  "title": "<scene title, 3-5 words>",
  "anchorPhrase": "<1 sentence the student says when they see this image>",
  "whyItWorks": "<1 sentence explaining the memory connection>",
  "unsplashQuery": "<Wikipedia-optimized search phrase: exact scientific/historical term plus diagram or photograph where applicable. 3-7 words, matching a real Wikipedia article title or image.>"
}
Make it visually DIFFERENT from: "${scene.title}". Same concept, fresh angle.`

      const raw = await callGroq(
        [{ role: "user", content: `Generate an alternative scene for the concept: "${concept}". Current scene was: "${scene.title}". Give me something visually different.` }],
        systemPrompt,
        model,
        600
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: Scene = JSON.parse(clean)

      // Fetch new photo for the regenerated scene
      const photo = await fetchScenePhoto(concept, parsed)

      setScenes(prev => prev.map((s, i) => i === index
        ? { ...parsed, photoUrl: photo.url, photoAlt: photo.alt, photoLoading: false }
        : s
      ))
    } catch {
      // On error, just try a fresh image for the existing scene data
      const photo = await fetchScenePhoto(concept, scene)
      setScenes(prev => prev.map((s, i) => i === index
        ? { ...s, photoUrl: photo.url, photoAlt: photo.alt, photoLoading: false }
        : s
      ))
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

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ height: 1, flex: 1, background: BORDER }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#888", padding: "4px 14px", border: `0.5px solid ${BORDER}` }}>{concept}</span>
          <div style={{ height: 1, flex: 1, background: BORDER }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16, marginBottom: 32 }}>
          {scenes.map((scene, i) => (
            <SceneCard key={scene.id} scene={scene} index={i} concept={concept} onRegenerate={() => handleRegenerateScene(i)} />
          ))}
        </div>

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
function SceneCard({ scene, index, concept, onRegenerate }: { scene: SceneWithPhoto; index: number; concept: string; onRegenerate: () => void }) {
  const TEAL   = "#00C4B4"
  const CARD   = "#0E0E0E"
  const BORDER = "#252525"
  const TEXT   = "#F0F0F0"
  const MUTED  = "#555"
  const FONT   = "'Inter', system-ui, sans-serif"

  // DOM-level fallback cascade: Wikimedia/Pexels already resolved by fetchScenePhoto.
  // This handles render-time failures: LoremFlickr → Unsplash → Picsum
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const src = img.src
    const seed = Math.abs((concept + scene.id + scene.title).split("").reduce((a, c) => a + c.charCodeAt(0), 0))
    const safeQ = safeQuery(scene.unsplashQuery)

    if (src.includes("wikipedia") || src.includes("wikimedia") || src.includes("pexels")) {
      // Wikimedia/Pexels image failed at render time → try LoremFlickr
      const keyword = encodeURIComponent(safeQ.split(" ").slice(0, 2).join(","))
      img.src = `https://loremflickr.com/800/500/${keyword}?lock=${seed}`
    } else if (src.includes("loremflickr")) {
      const keyword = encodeURIComponent(safeQ)
      img.src = `https://source.unsplash.com/800x500/?${keyword}&sig=${seed}`
    } else if (src.includes("unsplash")) {
      img.src = `https://picsum.photos/seed/${seed}/800/500`
    } else {
      img.style.display = "none"
    }
  }

  return (
    <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, overflow: "hidden" }}>
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
            onError={handleImgError}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,196,180,0.05)" }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1} opacity={0.3}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}

        <div style={{ position: "absolute", top: 10, left: 10, background: TEAL, color: "#0A0A0A", fontSize: 10, fontWeight: 800, padding: "3px 8px", letterSpacing: "0.08em", fontFamily: FONT }}>
          SCENE {index + 1}
        </div>

        {/* Regenerate button — top right */}
        <button
          onClick={onRegenerate}
          disabled={scene.photoLoading}
          title="Regenerate this scene"
          style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, background: "rgba(10,10,10,0.75)", border: "0.5px solid #333", color: scene.photoLoading ? "#333" : "#888", cursor: scene.photoLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", transition: "all .2s", borderRadius: 2 }}
          onMouseEnter={e => { if (!scene.photoLoading) { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = scene.photoLoading ? "#333" : "#888" }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: scene.photoLoading ? "spin 0.7s linear infinite" : "none" }}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: "linear-gradient(to top, rgba(10,10,10,0.9), transparent)" }} />
      </div>

      <div style={{ padding: "16px 18px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: "0 0 12px", lineHeight: 1.3 }}>{scene.title}</h3>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL, marginBottom: 5 }}>Anchor Phrase</div>
          <p style={{ fontSize: 13, color: "#D0D0D0", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>"{scene.anchorPhrase}"</p>
        </div>

        <div style={{ paddingTop: 10, borderTop: `0.5px solid #1A1A1A` }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 5 }}>Why This Works</div>
          <p style={{ fontSize: 11, color: "#666", margin: 0, lineHeight: 1.55 }}>{scene.whyItWorks}</p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
