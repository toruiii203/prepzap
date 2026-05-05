/**
 * ToolPageShell — shared wrapper for all Studenius tool pages.
 *
 * Provides:
 *  • StarField canvas background (full Landing.tsx implementation — parallax, spiky stars)
 *  • CursorGlow — custom teal dot + trailing ring, active on every page
 *  • Dark sticky nav with STUDENIUS logo, Study Tools dropdown, Source chip,
 *    Pricing link, and avatar  (NO model selector — never reveal the AI provider)
 *  • All tool pages just wrap their content in <ToolPageShell>
 *
 * Fix summary applied:
 *  Fix 4 — Model selector removed from nav and from exports (useModel kept as no-op stub)
 *  Fix 6 — StarField replaces multi-theme canvas; theme strip removed
 *  Fix 7 — CursorGlow mounted globally inside this shell
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import {
  loadLibrary, getActiveSource, saveContext, onSourceChange,
  type SourceFile,
} from "@/lib/sourceContext"
import { ChevronDown, X } from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = "#00C4B4"
const VOID = "#03050F"

// Legacy type kept so pages that import it don't break at compile time
export type BgTheme = "pure" | "starfield" | "nebula" | "aurora" | "pulse"

const QUICK_TOOLS = [
  { href: "/ai-tutor",       label: "BrainBot",    desc: "Ask anything, anytime" },
  { href: "/practice",       label: "Practice",    desc: "AI question sets" },
  { href: "/flashcards",     label: "Flashcards",  desc: "Spaced repetition" },
  { href: "/feynman",        label: "Feynman",     desc: "Teach it to learn it" },
  { href: "/math",           label: "Math Solver",     desc: "Step-by-step solutions" },
  { href: "/daily5",         label: "Daily Quiz",  desc: "Quick daily rounds" },
  { href: "/spot-error",     label: "Error Hunt",  desc: "Find & fix mistakes" },
  { href: "/blank-map",      label: "Mind Map",    desc: "Map & connect ideas" },
  { href: "/build-def",      label: "Concepts",    desc: "Build from memory" },
  { href: "/tool-architect", label: "Roadmap",     desc: "Zero to mastery" },
  { href: "/timer",          label: "Pomodoro",    desc: "Focus timer" },
  { href: "/analytics",      label: "Progress",    desc: "Track performance" },
  { href: "/sources",        label: "Sources",     desc: "Your study files" },
  { href: "/cram",           label: "Cram Mode",   desc: "Emergency plan" },
  { href: "/confidence",     label: "Confidence",  desc: "Know what you know" },
  { href: "/high-yield",     label: "High Yield",  desc: "Most testable" },
  { href: "/mistakes",       label: "Mistakes",    desc: "Track & fix errors" },
  { href: "/recall",         label: "Recall Mode", desc: "Type from memory" },
  { href: "/study-dna",      label: "Study DNA",   desc: "Your learner profile" },
  { href: "/settings",       label: "Settings",    desc: "Preferences & plan" },
]

// ─── StarField (full Landing.tsx implementation) ─────────────────────────────
// Fix 6: Canonical starfield with parallax layers, warm stars, spiky bright stars.
// This is the ONLY background — no themes, no variants.
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef(0)
  useEffect(() => {
    const h = () => { scrollRef.current = window.scrollY }
    window.addEventListener("scroll", h, { passive: true })
    return () => window.removeEventListener("scroll", h)
  }, [])
  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!; let raf: number
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener("resize", resize)
    type Star = { x: number; y: number; r: number; o: number; phase: number; freq: number; layer: number; warm: boolean; spike: boolean }
    const stars: Star[] = []; const PARALLAX = [0.018, 0.055, 0.13]
    const addLayer = (n: number, rMin: number, rMax: number, layer: number, warmChance: number, spikes: number) => {
      for (let i = 0; i < n; i++) stars.push({
        x: Math.random() * c.width, y: Math.random() * c.height * 3,
        r: Math.random() * (rMax - rMin) + rMin, o: Math.random() * 0.7 + 0.15,
        phase: Math.random() * Math.PI * 2, freq: Math.random() * 0.006 + 0.001,
        layer, warm: Math.random() < warmChance, spike: i < spikes,
      })
    }
    addLayer(1800, 0.15, 0.65, 0, 0.04, 0); addLayer(400, 0.6, 1.4, 1, 0.06, 0); addLayer(80, 1.4, 3.0, 2, 0.12, 3)
    let t = 0
    function draw() {
      t++; ctx.clearRect(0, 0, c.width, c.height); const sy = scrollRef.current
      for (const s of stars) {
        const py = ((s.y - PARALLAX[s.layer] * sy) % (c.height * 3) + c.height * 3) % (c.height * 3)
        if (py < -4 || py > c.height + 4) continue
        const pulse = s.o * (0.55 + 0.45 * Math.sin(t * s.freq * 60 + s.phase))
        const col = s.warm ? `rgba(232,185,35,${pulse * 0.75})` : s.layer === 2 ? `rgba(120,180,255,${pulse})` : s.layer === 1 ? `rgba(180,240,235,${pulse * 0.85})` : `rgba(200,220,255,${pulse})`
        ctx.beginPath(); ctx.arc(s.x, py, s.r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill()
        if (s.layer === 2) {
          const g = ctx.createRadialGradient(s.x, py, 0, s.x, py, s.r * 3.5)
          g.addColorStop(0, s.warm ? `rgba(232,185,35,${pulse * 0.35})` : `rgba(120,180,255,${pulse * 0.3})`); g.addColorStop(1, "transparent")
          ctx.beginPath(); ctx.arc(s.x, py, s.r * 3.5, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill()
        }
        if (s.spike) {
          const len = s.r * 14; ctx.save(); ctx.globalAlpha = pulse * 0.55
          ctx.strokeStyle = "rgba(120,180,255,0.6)"; ctx.lineWidth = 0.5;
          ([[1, 0], [0, 1]] as [number, number][]).forEach(([cx, cy]) => {
            ctx.beginPath(); ctx.moveTo(s.x - cx * len, py - cy * len); ctx.lineTo(s.x + cx * len, py + cy * len); ctx.stroke()
          })
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />
}

// ─── CursorGlow (Fix 7) ────────────────────────────────────────────────────────
// Teal dot + trailing ring. Must be active on every page.
function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -200, y: -200 })
  const smooth = useRef({ x: -200, y: -200 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener("mousemove", onMove, { passive: true })
    let raf: number
    const tick = () => {
      raf = requestAnimationFrame(tick)
      smooth.current.x += (pos.current.x - smooth.current.x) * 0.11
      smooth.current.y += (pos.current.y - smooth.current.y) * 0.11
      if (dotRef.current) { dotRef.current.style.left = pos.current.x + "px"; dotRef.current.style.top = pos.current.y + "px" }
      if (ringRef.current) { ringRef.current.style.left = smooth.current.x + "px"; ringRef.current.style.top = smooth.current.y + "px" }
    }
    tick()
    const hover = () => ringRef.current?.classList.add("hovered")
    const unhover = () => ringRef.current?.classList.remove("hovered")
    document.querySelectorAll("a,button").forEach(el => { el.addEventListener("mouseenter", hover); el.addEventListener("mouseleave", unhover) })
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf) }
  }, [])
  return (
    <>
      <div ref={dotRef} style={{ position: "fixed", width: 6, height: 6, background: TEAL, borderRadius: "50%", pointerEvents: "none", zIndex: 99999, transform: "translate(-50%,-50%)", transition: "opacity 0.2s" }} />
      <div ref={ringRef} style={{ position: "fixed", width: 32, height: 32, border: "1px solid rgba(0,196,180,0.4)", borderRadius: "50%", pointerEvents: "none", zIndex: 99998, transform: "translate(-50%,-50%)", transition: "width 0.2s,height 0.2s,border-color 0.2s" }} className="cursor-ring" />
    </>
  )
}

// Legacy stub — kept so pages that imported useCanvasBg don't break at compile time
// ─── Source Selector Pill ─────────────────────────────────────────────────────
function SourceSelectorPill() {
  const [sources, setSources] = useState<SourceFile[]>(() => loadLibrary())
  const [active, setActive] = useState<SourceFile | null>(() => getActiveSource())
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const unsub = onSourceChange(() => {
      setSources(loadLibrary())
      setActive(getActiveSource())
    })
    return unsub
  }, [])

  const select = (s: SourceFile | null) => {
    saveContext(s ? s.id : null)
    setActive(s)
    setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: active ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.04)", border: `0.5px solid ${active ? "rgba(0,196,180,0.35)" : "#252525"}`, color: active ? TEAL : "#555", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", cursor: "pointer", fontFamily: "'Inter',system-ui,sans-serif", transition: "all .2s", whiteSpace: "nowrap", maxWidth: 200 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = active ? "rgba(0,196,180,0.35)" : "#252525"; e.currentTarget.style.color = active ? TEAL : "#555" }}
      >
        <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
          {active ? active.name.replace(/\.[^.]+$/, "").slice(0, 18) + (active.name.length > 22 ? "…" : "") : "Source Library"}
        </span>
        <ChevronDown size={9} style={{ flexShrink: 0, opacity: 0.5 }} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 260, background: "#0E0E0E", border: "0.5px solid #252525", zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: "'Inter',system-ui,sans-serif" }}>
          <div style={{ padding: "8px 10px", borderBottom: "0.5px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" }}>Source Library</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 2 }}><X size={11} /></button>
          </div>

          <button onClick={() => select(null)} style={{ width: "100%", padding: "7px 10px", background: !active ? "rgba(0,196,180,0.06)" : "transparent", border: "none", borderBottom: "0.5px solid #1A1A1A", color: !active ? TEAL : "#555", fontSize: 10, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            General AI (no source)
          </button>

          {sources.length === 0 ? (
            <div style={{ padding: "10px", fontSize: 10, color: "#333", textAlign: "center" }}>
              No sources yet —{" "}
              <Link to="/sources" style={{ color: TEAL, textDecoration: "none" }} onClick={() => setOpen(false)}>add one</Link>
            </div>
          ) : (
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {sources.map(s => (
                <button key={s.id} onClick={() => select(s)} style={{ width: "100%", padding: "7px 10px", background: active?.id === s.id ? "rgba(0,196,180,0.06)" : "transparent", border: "none", borderBottom: "0.5px solid #141414", color: active?.id === s.id ? TEAL : "#C0C0C0", fontSize: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, transition: "background .15s" }}
                  onMouseEnter={e => { if (active?.id !== s.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                  onMouseLeave={e => { if (active?.id !== s.id) e.currentTarget.style.background = "transparent" }}>
                  <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke={active?.id === s.id ? TEAL : "#555"} strokeWidth={1.7} strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.name}</span>
                  {active?.id === s.id && <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke={TEAL} strokeWidth={2}><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>
          )}
          <div style={{ padding: "6px 10px", borderTop: "0.5px solid #1A1A1A" }}>
            <Link to="/sources" onClick={() => setOpen(false)} style={{ fontSize: 9, color: "#555", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = TEAL)} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
              Manage Source Library →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Study Tools Dropdown ─────────────────────────────────────────────────────
function StudyToolsDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#555", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Inter',system-ui,sans-serif", transition: "color .2s", padding: "4px 0" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
        STUDY TOOLS <ChevronDown size={9} style={{ marginTop: 1 }} />
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 320, background: "#0E0E0E", border: "0.5px solid #252525", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.7)", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "'Inter',system-ui,sans-serif" }}>
            <div style={{ padding: "8px 10px", gridColumn: "1/-1", borderBottom: "0.5px solid #1A1A1A" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#333" }}>All Tools</span>
            </div>
            {QUICK_TOOLS.map(t => (
              <Link key={t.href} to={t.href} onClick={() => setOpen(false)} style={{ textDecoration: "none", padding: "7px 10px", borderBottom: "0.5px solid #111", display: "flex", flexDirection: "column", gap: 1, transition: "background .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,196,180,0.04)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#C0C0C0" }}>{t.label}</span>
                <span style={{ fontSize: 9, color: "#444" }}>{t.desc}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Model Selector ───────────────────────────────────────────────────────────
export const AI_MODELS = [
  { id: "gemini-2.0-flash",  label: "Gemini 2.0 Flash", provider: "OpenRouter", badge: "Fast" },
  { id: "gemini-2.0-flash", label: "Llama 3.3 70B",   provider: "OpenRouter", badge: "Balanced" },
  { id: "gemini-2.0-flash",        label: "Gemini 2.0 Flash", provider: "OpenRouter", badge: "Smart" },
] as const

export type ModelId = typeof AI_MODELS[number]["id"]
export const MODEL_KEY = "studenius_selected_model"

export function useModel() {
  const [model, setModelState] = useState<ModelId>(() => {
    const saved = localStorage.getItem(MODEL_KEY)
    return (AI_MODELS.find(m => m.id === saved)?.id ?? "gemini-2.0-flash") as ModelId
  })
  const setModel = (id: ModelId) => { setModelState(id); localStorage.setItem(MODEL_KEY, id) }
  return { model, setModel }
}

export function ModelPicker({ model, setModel }: { model: ModelId; setModel: (id: ModelId) => void }) {
  const [open, setOpen] = useState(false)
  const current = AI_MODELS.find(m => m.id === model) ?? AI_MODELS[0]

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.03)", border: "0.5px solid #252525", color: "#C0C0C0", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',system-ui,sans-serif", transition: "all .2s", whiteSpace: "nowrap" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#C0C0C0" }}>
        <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.7}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
        {current.label}
        <span style={{ fontSize: 8, padding: "1px 4px", background: "rgba(0,196,180,0.12)", color: TEAL, fontWeight: 700, letterSpacing: "0.06em" }}>{current.badge}</span>
        <ChevronDown size={9} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, width: 220, background: "#0E0E0E", border: "0.5px solid #252525", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.7)", fontFamily: "'Inter',system-ui,sans-serif" }}>
            <div style={{ padding: "7px 10px", borderBottom: "0.5px solid #1A1A1A" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#333" }}>AI Model</span>
            </div>
            {AI_MODELS.map(m => (
              <button key={m.id} onClick={() => { setModel(m.id); setOpen(false) }} style={{ width: "100%", padding: "8px 10px", background: model === m.id ? "rgba(0,196,180,0.06)" : "transparent", border: "none", borderBottom: "0.5px solid #141414", color: model === m.id ? TEAL : "#C0C0C0", fontSize: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background .15s" }}
                onMouseEnter={e => { if (model !== m.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                onMouseLeave={e => { if (model !== m.id) e.currentTarget.style.background = "transparent" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 1 }}>{m.label}</div>

                </div>
                <span style={{ fontSize: 8, padding: "1px 4px", background: model === m.id ? "rgba(0,196,180,0.12)" : "rgba(255,255,255,0.05)", color: model === m.id ? TEAL : "#555", fontWeight: 700 }}>{m.badge}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main ToolPageShell ───────────────────────────────────────────────────────
interface ToolPageShellProps {
  children: React.ReactNode
  /** Show model picker in the tool header row */
  showModelPicker?: boolean
  model?: ModelId
  setModel?: (id: ModelId) => void
}

export function ToolPageShell({ children, showModelPicker, model, setModel }: ToolPageShellProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [bgTheme, setBgTheme] = useState<BgTheme>(() => {
    return (localStorage.getItem(THEME_KEY) as BgTheme) || "starfield"
  })

  const setTheme = (t: BgTheme) => { setBgTheme(t); localStorage.setItem(THEME_KEY, t) }

  useCanvasBg(canvasRef, bgTheme)

  const displayName = (
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "S"
  ).toUpperCase().slice(0, 2)

  // inject font smoothing once
  useEffect(() => {
    const id = "studenius-tool-styles"
    if (document.getElementById(id)) return
    const s = document.createElement("style")
    s.id = id
    s.textContent = `*, *::before, *::after { -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }`
    document.head.appendChild(s)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#F0F0F0", fontFamily: "'Inter',system-ui,sans-serif", position: "relative" }}>
      {/* Canvas bg */}
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", transform: "translateZ(0)" }}>

        {/* ── Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 48, borderBottom: "0.5px solid #1E1E1E", background: "rgba(8,8,8,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", color: "#F0F0F0" }}>STUDENIUS</span>
            </Link>
            <div style={{ width: 1, height: 14, background: "#222" }} />
            <StudyToolsDropdown />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <SourceSelectorPill />
            {showModelPicker && model && setModel && <ModelPicker model={model} setModel={setModel} />}
            <Link to="/pricing" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
              PRICING
            </Link>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},#0097A7)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#0A0A0A", cursor: "pointer", flexShrink: 0 }}
              onClick={() => navigate("/settings")}>
              {displayName}
            </div>
          </div>
        </nav>

        {/* ── Theme strip ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", borderBottom: "0.5px solid #1A1A1A", background: "rgba(8,8,8,0.7)", flexShrink: 0, scrollbarWidth: "none" }}>
          <div style={{ padding: "0 10px", flexShrink: 0, fontSize: 7, letterSpacing: "0.16em", textTransform: "uppercase", color: "#333", fontWeight: 700, whiteSpace: "nowrap" }}>Theme</div>
          <div style={{ width: "0.5px", height: 24, background: "#1E1E1E", flexShrink: 0 }} />
          {(["pure", "starfield", "nebula", "aurora", "pulse"] as BgTheme[]).map(id => (
            <ThemeSwatch key={id} id={id} active={bgTheme === id} onClick={() => setTheme(id)} />
          ))}
        </div>

        {/* ── Content ── */}
        {children}
      </div>
    </div>
  )
}
