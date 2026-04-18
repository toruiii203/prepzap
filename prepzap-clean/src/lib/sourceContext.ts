/**
 * PrepZap — Source-First Architecture
 * Global Source Context: manages which sources are active across the entire app.
 * Uses localStorage for persistence + a custom event bus for cross-component sync.
 */

export interface SourceFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  preview?: string          // first ~500 chars of text content
  fullText?: string         // up to 8000 chars for RAG injection
  tags?: string[]
  mastery?: "red" | "yellow" | "green"  // Confidence Heatmap
}

export type SourceMode = "all" | "selected" | "none"

export interface SourceContextState {
  mode: SourceMode
  selectedIds: string[]     // active when mode === "selected"
}

// ── Storage keys ─────────────────────────────────────────────────────────────
const LS_LIBRARY  = "pz_source_library"
const LS_CONTEXT  = "pz_source_context"
const EVENT_KEY   = "pz_source_changed"

// ── Helpers ───────────────────────────────────────────────────────────────────
export function loadLibrary(): SourceFile[] {
  try { return JSON.parse(localStorage.getItem(LS_LIBRARY) || "[]") } catch { return [] }
}

export function saveLibrary(files: SourceFile[]) {
  localStorage.setItem(LS_LIBRARY, JSON.stringify(files))
  window.dispatchEvent(new Event(EVENT_KEY))
}

export function loadContext(): SourceContextState {
  try {
    const raw = localStorage.getItem(LS_CONTEXT)
    return raw ? JSON.parse(raw) : { mode: "none", selectedIds: [] }
  } catch {
    return { mode: "none", selectedIds: [] }
  }
}

export function saveContext(ctx: SourceContextState) {
  localStorage.setItem(LS_CONTEXT, JSON.stringify(ctx))
  window.dispatchEvent(new Event(EVENT_KEY))
}

export function onSourceChange(cb: () => void) {
  window.addEventListener(EVENT_KEY, cb)
  return () => window.removeEventListener(EVENT_KEY, cb)
}

/**
 * Build the AI context string to inject into every tool prompt.
 * Returns empty string when mode is "none".
 * Truncates per-source to avoid token limits.
 */
export function buildAIContext(maxCharsPerSource = 5000, maxSources = 3): string {
  const ctx   = loadContext()
  const files = loadLibrary()
  if (ctx.mode === "none" || files.length === 0) return ""

  const active = ctx.mode === "all"
    ? files.slice(0, maxSources)
    : files.filter(f => ctx.selectedIds.includes(f.id)).slice(0, maxSources)

  if (active.length === 0) return ""

  const parts = active
    .filter(f => f.fullText || f.preview)
    .map(f => {
      // For image captures, include a description but not the raw base64 in text context
      if (f.type === "image/jpeg" || f.type === "image/png") {
        return `=== SOURCE: ${f.name} ===\n[Camera capture image — use buildImageMessages() to get vision content]`
      }
      const raw  = f.fullText || f.preview || ""
      const text = raw.length > maxCharsPerSource ? raw.slice(0, maxCharsPerSource) + "\n[…truncated]" : raw
      return `=== SOURCE: ${f.name} ===\n${text}`
    })

  if (parts.length === 0) return ""

  return `\n\n--- STUDY SOURCES (base your answer on this material) ---\n${parts.join("\n\n")}\n--- END SOURCES ---`
}

/**
 * Returns Anthropic-format image content blocks for any image sources.
 * Inject these into the messages array alongside text for vision analysis.
 */
export function buildImageMessages(maxSources = 3): Array<{type: string; source: {type: string; media_type: string; data: string}}> {
  const ctx   = loadContext()
  const files = loadLibrary()
  if (ctx.mode === "none" || files.length === 0) return []

  const active = ctx.mode === "all"
    ? files.slice(0, maxSources)
    : files.filter(f => ctx.selectedIds.includes(f.id)).slice(0, maxSources)

  return active
    .filter(f => (f.type === "image/jpeg" || f.type === "image/png") && f.fullText)
    .map(f => {
      // Extract base64 from stored dataUrl
      const fullText = f.fullText || ""
      const dataMatch = fullText.match(/DATA:(data:image\/[^;]+;base64,(.+))/)
      if (!dataMatch) return null
      const base64 = dataMatch[2]
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: f.type as "image/jpeg" | "image/png",
          data: base64,
        }
      }
    })
    .filter(Boolean) as Array<{type: string; source: {type: string; media_type: string; data: string}}>
}

/**
 * Returns a short label for the context bar pill.
 */
export function contextLabel(): string {
  const ctx   = loadContext()
  const files = loadLibrary()
  if (ctx.mode === "none") return "General AI"
  if (ctx.mode === "all")  return `All Sources (${files.length})`
  const n = ctx.selectedIds.length
  if (n === 0) return "No source selected"
  if (n === 1) { const f = files.find(x => x.id === ctx.selectedIds[0]); return f?.name ?? "1 source" }
  return `${n} sources`
}

// Legacy single-source helpers (backward compat with SourcePicker)
export function getActiveSource(): SourceFile | null {
  const ctx   = loadContext()
  const files = loadLibrary()
  if (ctx.mode === "none") return null
  if (ctx.mode === "all" && files.length > 0) return files[0]
  const sel = files.find(f => ctx.selectedIds.includes(f.id))
  return sel ?? null
}
