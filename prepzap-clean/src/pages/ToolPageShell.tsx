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

import { useState, useEffect, useRef } from "react"
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

// ─── Icon factory (matches Dashboard.tsx exactly) ─────────────────────────────
const TEAL_ICON = "#00C4B4"
const Ic = (d: React.ReactNode, stroke = TEAL_ICON) => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={stroke}
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const TOOL_ICONS: Record<string, React.ReactNode> = {
  "BrainBot":      Ic(<><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M12 3v3M9 9V7a3 3 0 016 0v2"/><circle cx="9.5" cy="14" r="0.8" fill={TEAL_ICON}/><circle cx="14.5" cy="14" r="0.8" fill={TEAL_ICON}/></>),
  "Practice":      Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 9h6M9 12h6M9 15h4"/></>),
  "Flashcards":    Ic(<><rect x="2" y="5" width="10" height="14" rx="1"/><rect x="12" y="5" width="10" height="14" rx="1"/></>),
  "Daily Quiz":    Ic(<><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  "Cram Mode":     Ic(<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>),
  "Recall Mode":   Ic(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>),
  "Confidence":    Ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
  "High Yield":    Ic(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
  "Feynman":       Ic(<><path d="M12 2L8 10H3l7 6-3 8 5-4 5 4-3-8 7-6h-5z"/></>),
  "Math Solver":   Ic(<><path d="M4 20h4l10-10-4-4L4 16v4z"/><line x1="14" y1="6" x2="18" y2="10"/></>),
  "Error Hunt":    Ic(<><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>),
  "Mind Map":      Ic(<><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/></>),
  "Concepts":      Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 12h6M12 9v6"/></>),
  "Roadmap":       Ic(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
  "Mistakes":      Ic(<><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill={TEAL_ICON}/></>),
  "Visual Learner":Ic(<><rect x="3" y="3" width="18" height="14" rx="1"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="3"/></>),
  "Flip Script":   Ic(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/></>),
  "Focus State":   Ic(<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></>),
  "Boss Round":    Ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
  "Sources":       Ic(<><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>),
  "Pomodoro":      Ic(<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></>),
}

// Routes and descriptions match Dashboard.tsx quickActions exactly
const QUICK_TOOLS = [
  { href: "/ai-tutor",       label: "BrainBot",       desc: "Ask anything, anytime" },
  { href: "/practice",       label: "Practice",       desc: "AI question sets" },
  { href: "/flashcards",     label: "Flashcards",     desc: "Spaced repetition" },
  { href: "/daily5",         label: "Daily Quiz",     desc: "Quick daily rounds" },
  { href: "/cram",           label: "Cram Mode",      desc: "Emergency study plan" },
  { href: "/recall",         label: "Recall Mode",    desc: "Type from memory" },
  { href: "/confidence",     label: "Confidence",     desc: "Know what you know" },
  { href: "/high-yield",     label: "High Yield",     desc: "Most testable concepts" },
  { href: "/feynman",        label: "Feynman",        desc: "Teach it to learn it" },
  { href: "/math",           label: "Math Solver",    desc: "Step-by-step solutions" },
  { href: "/spot-error",     label: "Error Hunt",     desc: "Find & fix mistakes" },
  { href: "/blank-map",      label: "Mind Map",       desc: "Map & connect ideas" },
  { href: "/build-def",      label: "Concepts",       desc: "Build definitions from memory" },
  { href: "/tool-architect", label: "Roadmap",        desc: "Zero to mastery on any topic" },
  { href: "/mistakes",       label: "Mistakes",       desc: "Track & fix errors" },
  { href: "/visual-learner", label: "Visual Learner", desc: "See it to remember it" },
  { href: "/flip-script",    label: "Flip Script",    desc: "Rewrite to understand" },
  { href: "/focus-state",    label: "Focus State",    desc: "Deep focus mode" },
  { href: "/boss-round",     label: "Boss Round",     desc: "Ultimate challenge mode" },
  { href: "/sources",        label: "Sources",        desc: "Your study files" },
  { href: "/timer",          label: "Pomodoro",       desc: "Focus timer with sounds" },
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
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 340, background: "rgba(3,5,15,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "0.5px solid rgba(0,196,180,0.18)", borderBottom: "0.5px solid rgba(0,196,180,0.18)", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.7)", display: "grid", gridTemplateColumns: "1fr 1fr", fontFamily: "'Inter',system-ui,sans-serif" }}>
            <div style={{ padding: "8px 10px", gridColumn: "1/-1", borderBottom: "0.5px solid #1A1A1A" }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#333" }}>All Tools</span>
            </div>
            {QUICK_TOOLS.map(t => (
              <Link key={t.href} to={t.href} onClick={() => setOpen(false)} style={{ textDecoration: "none", padding: "8px 10px", borderBottom: "0.5px solid #111", display: "flex", alignItems: "flex-start", gap: 8, transition: "background .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,196,180,0.04)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}>
                {/* Icon box matching dashboard tile style */}
                <div style={{ width: 22, height: 22, flexShrink: 0, border: "0.5px solid #1A2626", background: "rgba(0,196,180,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  {TOOL_ICONS[t.label]}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#C0C0C0" }}>{t.label}</span>
                  <span style={{ fontSize: 9, color: "#444" }}>{t.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Model stub exports (Fix 4) ───────────────────────────────────────────────
// Model selector is REMOVED from the UI. These stubs keep existing page imports
// from breaking at compile time. The model/setModel props on ToolPageShell are
// accepted but silently ignored — nothing is rendered in the nav.
export type ModelId = string
export const MODEL_KEY = "studenius_selected_model"
export const AI_MODELS = [{ id: "default", label: "Studenius AI", provider: "internal", badge: "" }] as const

export function useModel() {
  // Returns a stable object — pages can still destructure { model, setModel }
  // without errors, but neither value is consumed by the shell UI.
  const [model] = useState<ModelId>("default")
  const setModel = (_id: ModelId) => { /* intentionally empty — Fix 4 */ }
  return { model, setModel }
}

/** @deprecated — model picker removed per Fix 4. Component renders nothing. */
export function ModelPicker(_props: { model: ModelId; setModel: (id: ModelId) => void }) {
  return null
}

// ─── CursorGlow CSS injected once into <head> ─────────────────────────────────
const CURSOR_CSS = `
  *, *::before, *::after { -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; }
  * { cursor: none !important; }
  .cursor-ring.hovered { width: 48px !important; height: 48px !important; border-color: rgba(0,196,180,0.7) !important; }
`

// ─── Main ToolPageShell ───────────────────────────────────────────────────────
interface ToolPageShellProps {
  children: React.ReactNode
  /** @deprecated — model picker removed per Fix 4. Prop accepted but ignored. */
  showModelPicker?: boolean
  /** @deprecated — accepted but ignored. */
  model?: ModelId
  /** @deprecated — accepted but ignored. */
  setModel?: (id: ModelId) => void
}

export function ToolPageShell({ children }: ToolPageShellProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const displayName = (
    user?.user_metadata?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "S"
  ).toUpperCase().slice(0, 2)

  // Inject global styles (font smoothing + cursor override) once per mount
  useEffect(() => {
    const id = "studenius-tool-styles"
    if (document.getElementById(id)) return
    const s = document.createElement("style")
    s.id = id
    s.textContent = CURSOR_CSS
    document.head.appendChild(s)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: VOID, color: "#F0F0F0", fontFamily: "'Inter',system-ui,sans-serif", position: "relative" }}>
      {/* Fix 6: Full Landing.tsx StarField — parallax layers, warm/spiky stars */}
      <StarField />
      {/* Fix 7: Custom teal cursor — dot + trailing ring */}
      <CursorGlow />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", transform: "translateZ(0)" }}>

        {/* ── Nav (Fix 3 + Fix 4: no model selector, no theme strip) ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 48, borderBottom: "0.5px solid #1E1E1E", background: "rgba(3,5,15,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", flexShrink: 0, position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Link to="/dashboard" style={{ textDecoration: "none" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "#E0E8F0", fontFamily: "'Geist Mono','Courier New',monospace" }}>STUDENIUS</span>
            </Link>
            <div style={{ width: 1, height: 14, background: "#222" }} />
            <StudyToolsDropdown />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Source chip — Fix 5 */}
            <SourceSelectorPill />
            {/* PRICING link — Fix 3 */}
            <Link to="/pricing" style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
              PRICING
            </Link>
            {/* User avatar — Fix 3 */}
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},#0097A7)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#03050F", cursor: "pointer", flexShrink: 0 }}
              onClick={() => navigate("/settings")}>
              {displayName}
            </div>
          </div>
        </nav>

        {/* Theme strip REMOVED — Fix 6 */}

        {/* ── Content ── */}
        {children}
      </div>
    </div>
  )
}
