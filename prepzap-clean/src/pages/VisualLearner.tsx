import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
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

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL   = "#00C4B4"
const GOLD   = "#E8B923"
const BG     = "#03050F"
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
  exactWikipediaTitle?: string  // Groq-supplied exact Wikipedia article title for direct lookup
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
//    Step 1: If Groq supplied an exactWikipediaTitle, do a direct article lookup (fastest, most accurate).
//    Step 2: Fall back to keyword search, shortest/most specific first.
async function wikimediaImageUrl(concept: string, scene: Scene): Promise<string | null> {

  // ── Helper: fetch lead image for a known Wikipedia article title ─────────
  async function fetchImageForTitle(articleTitle: string): Promise<string | null> {
    try {
      const title = encodeURIComponent(articleTitle)
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&pithumbsize=800&format=json&origin=*`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) return null
      const data = await res.json()
      const pages = Object.values(data?.query?.pages ?? {}) as any[]
      const thumb = pages[0]?.thumbnail?.source
      if (thumb && !thumb.includes("Flag_of") && !thumb.includes("OOjs") && !thumb.includes("commons-logo")) {
        return thumb
      }
    } catch { /* fall through */ }
    return null
  }

  // ── Step 1: Direct lookup via Groq-supplied exact Wikipedia article title ─
  if (scene.exactWikipediaTitle) {
    const img = await fetchImageForTitle(scene.exactWikipediaTitle)
    if (img) return img
  }

  // ── Step 2: Keyword search — shortest/most specific first ─────────────────
  const queryWords = safeQuery(scene.unsplashQuery).split(" ").filter(w => w.length > 2)
  const coreKeyword = queryWords.slice(0, 2).join(" ")
  const shortPhrase = queryWords.slice(0, 3).join(" ")
  const fullQuery   = safeQuery(scene.unsplashQuery)

  const searchQueries = [
    coreKeyword,
    shortPhrase,
    fullQuery,
    concept,
    `${coreKeyword} ${concept}`,
  ].filter((q, i, arr) => q.trim() && arr.indexOf(q) === i) // dedupe

  for (const q of searchQueries) {
    try {
      const search = encodeURIComponent(q)
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${search}&srlimit=5&format=json&origin=*`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!searchRes.ok) continue
      const searchData = await searchRes.json()
      const pages: Array<{ title: string }> = searchData?.query?.search ?? []
      if (!pages.length) continue

      for (const page of pages.slice(0, 3)) {
        const img = await fetchImageForTitle(page.title)
        if (img) return img
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("visual"));
  const [phase, setPhase]           = useState<"setup"|"loading"|"result"|"gallery">("setup")
  const [concept, setConcept]       = useState("")
  const [conceptInput, setConceptInput] = useState("")
  const [scenes, setScenes]         = useState<SceneWithPhoto[]>([])
  const [error, setError]           = useState<string|null>(null)
  const [progress, setProgress]     = useState(0)
  const [sourceChips, setSourceChips] = useState<string[]>([])
  const [savedImages, setSavedImages] = useState<{url:string;concept:string;anchor:string;savedAt:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem("pz_visual_saved") || "[]") } catch { return [] }
  })
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
      "unsplashQuery": "<3-7 word image search phrase, specific and visual. Examples: evaporation water sunlight, mitosis cell division, black hole event horizon, guillotine French Revolution, supply demand curve>",
      "exactWikipediaTitle": "<The EXACT title of the most relevant Wikipedia article for this scene's image. Must be a real Wikipedia article title you are confident exists. Examples: Evaporation, Mitosis, Black hole, Guillotine, Supply and demand. If unsure, leave as empty string.>"
    }
  ]
}
Generate 4 scenes. Make each scene visually distinct and directly tied to the concept.
The exactWikipediaTitle is the most important field — it should be the precise Wikipedia article title whose lead image best represents this scene. Think: what would you search on Wikipedia to find the perfect image?
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

      addHistoryEntry("visual", {
        prompt: target,
        preview: parsed.scenes[0]?.anchorPhrase ?? target,
        output: JSON.stringify(parsed),
        model,
        meta: `${parsed.scenes.length}`,
      });
      setToolHistory(loadHistory("visual")); setConcept(""); setConceptInput(""); setScenes([]); setError(null)
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
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL }}>
            Visual Learner
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Visual Learner</h1>
      </div>
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // SETUP PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "setup") return (
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
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00C4B4", marginBottom: 2 }}>Visual Learner History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("visual", "all"); setToolHistory([]); }}
                style={{ fontSize: 10, color: "#444", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: "2px 6px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}>Clear all</button>
            )}
            <button onClick={() => setSidebarOpen(false)}
              style={{ width: 26, height: 26, border: "0.5px solid #1E2A2A", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
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
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No visual learner history yet</div>
              <div style={{ fontSize: 11, color: "#333" }}>Sessions will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...toolHistory].reverse().map((entry) => (
                <div key={entry.id}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A2626", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
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
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
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
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING PHASE
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "loading") return (
    <ToolPageShell key="shell">
      
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 500, padding: "40px 20px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
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
    <ToolPageShell key="shell">
      
      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
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
          {savedImages.length > 0 && (
            <button onClick={() => setPhase("gallery")}
              style={{ padding: "13px 24px", background: "rgba(0,196,180,0.06)", border: `0.5px solid rgba(0,196,180,0.25)`, color: "#00C4B4", fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              ♡ My Images ({savedImages.length})
            </button>
          )}
        </div>
      </main>
    </ToolPageShell>
  )

  // Gallery phase
  if (phase === "gallery") return (
    <ToolPageShell key="shell">
      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>My Visual Images</h1>
            <p style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{savedImages.length} saved memories</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {savedImages.length > 0 && (
              <button onClick={() => {
                  setSavedImages([]);
                  localStorage.removeItem("pz_visual_saved");
                }}
                style={{ padding: "6px 12px", fontSize: 11, background: "transparent", border: "0.5px solid #252525", color: "#555", cursor: "pointer", fontFamily: FONT }}>
                Clear all
              </button>
            )}
            <button onClick={() => setPhase("setup")}
              style={{ padding: "6px 12px", fontSize: 11, background: "transparent", border: "0.5px solid #252525", color: "#888", cursor: "pointer", fontFamily: FONT }}>
              ← Back
            </button>
          </div>
        </div>
        {savedImages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#444" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>♡</div>
            <p style={{ fontSize: 14 }}>No saved images yet. Hit ♡ Save on any scene card.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {savedImages.map((img, i) => (
              <div key={i} style={{ border: "0.5px solid #1A1A1A", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                <img src={img.url} alt={img.concept} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#00C4B4", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{img.concept}</div>
                  <p style={{ fontSize: 11, color: "#888", margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>"{img.anchor}"</p>
                  <button onClick={() => {
                      const updated = savedImages.filter((_, j) => j !== i);
                      setSavedImages(updated);
                      localStorage.setItem("pz_visual_saved", JSON.stringify(updated));
                    }}
                    style={{ marginTop: 8, fontSize: 9, color: "#444", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: FONT }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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

        <div style={{ position: "absolute", top: 10, left: 10, background: TEAL, color: "#03050F", fontSize: 10, fontWeight: 800, padding: "3px 8px", letterSpacing: "0.08em", fontFamily: FONT }}>
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

        <div style={{ paddingTop: 10, borderTop: `0.5px solid #1A1A1A`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED, marginBottom: 5 }}>Why This Works</div>
            <p style={{ fontSize: 11, color: "#666", margin: 0, lineHeight: 1.55 }}>{scene.whyItWorks}</p>
          </div>
          {scene.photoUrl && (
            <button
              onClick={() => {
                const entry = { url: scene.photoUrl!, concept, anchor: scene.anchorPhrase, savedAt: new Date().toISOString() };
                setSavedImages(prev => {
                  const updated = [entry, ...prev.filter(s => s.url !== scene.photoUrl)];
                  localStorage.setItem("pz_visual_saved", JSON.stringify(updated));
                  return updated;
                });
              }}
              title="Save to my images"
              style={{ flexShrink: 0, padding: "4px 8px", fontSize: 10, background: "rgba(0,196,180,0.06)", border: "0.5px solid rgba(0,196,180,0.2)", color: "#00C4B4", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,196,180,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,196,180,0.06)"; }}>
              ♡ Save
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
