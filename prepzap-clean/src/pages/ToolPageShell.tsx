/**
 * ToolPageShell — shared wrapper for all Studenius tool pages.
 *
 * Provides:
 *  • Animated canvas background (same 5 themes as Dashboard, persisted in localStorage)
 *  • Dark sticky nav with STUDENIUS logo, Study Tools dropdown, Source Library selector,
 *    Pricing link, and avatar
 *  • Theme strip below nav
 *  • All tool pages just wrap their content in <ToolPageShell>
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
const GOLD = "#E8B923"
const THEME_KEY = "studenius_bg_theme"

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

// ─── Canvas hook ──────────────────────────────────────────────────────────────
function useCanvasBg(ref: React.RefObject<HTMLCanvasElement>, theme: BgTheme) {
  const themeRef = useRef(theme)
  useEffect(() => { themeRef.current = theme }, [theme])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let W = 0, H = 0, raf = 0

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = Math.floor(window.innerWidth); H = Math.floor(window.innerHeight)
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + "px"; canvas.style.height = H + "px"
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr)
    }
    setSize(); window.addEventListener("resize", setSize)

    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.4,
      phase: Math.random() * Math.PI * 2, speed: 0.004 + Math.random() * 0.009,
      teal: Math.random() > 0.8,
      vx: (Math.random() - 0.5) * 0.00012, vy: (Math.random() - 0.5) * 0.00008,
    }))
    const NEBULA_COLORS = ["100,40,220","180,0,180","0,196,180","60,0,200","220,60,120","0,120,220","140,0,255"]
    const clouds = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      rx: 0.14 + Math.random() * 0.20, ry: 0.08 + Math.random() * 0.14,
      dx: (Math.random() - 0.5) * 0.00005, dy: (Math.random() - 0.5) * 0.00003,
      color: NEBULA_COLORS[i % NEBULA_COLORS.length],
      phase: Math.random() * Math.PI * 2, speed: 0.002 + Math.random() * 0.003,
    }))
    let auroraTick = 0, pulseVal = 0, pulseDelta = 0.012

    const draw = () => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, W, H)
      const t = themeRef.current
      if (t === "starfield") {
        for (const s of stars) {
          s.x += s.vx; s.y += s.vy
          if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0
          if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0
          s.phase += s.speed
          const a = (Math.sin(s.phase) + 1) * 0.45 + 0.1
          ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
          ctx.fillStyle = s.teal ? `rgba(0,196,180,${a})` : `rgba(240,240,240,${a})`; ctx.fill()
        }
      }
      if (t === "nebula") {
        for (const c of clouds) {
          c.x += c.dx; c.y += c.dy
          if (c.x < -0.25) c.x = 1.25; if (c.x > 1.25) c.x = -0.25
          if (c.y < -0.2) c.y = 1.2; if (c.y > 1.2) c.y = -0.2
          c.phase += c.speed
          const a = (Math.sin(c.phase) + 1) * 0.07 + 0.03
          const cx = c.x * W, cy = c.y * H, rx = c.rx * W, ry = c.ry * H, sy = ry / rx
          ctx.save(); ctx.scale(1, sy)
          const gr = ctx.createRadialGradient(cx, cy / sy, 0, cx, cy / sy, rx)
          gr.addColorStop(0, `rgba(${c.color},${a * 1.8})`); gr.addColorStop(0.4, `rgba(${c.color},${a})`); gr.addColorStop(1, "rgba(0,0,0,0)")
          ctx.beginPath(); ctx.arc(cx, cy / sy, rx, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill(); ctx.restore()
        }
      }
      if (t === "aurora") {
        auroraTick += 0.012
        const bands = [{ yRatio: 0.25, color: "0,220,160" }, { yRatio: 0.45, color: "0,160,220" }, { yRatio: 0.65, color: "80,0,220" }, { yRatio: 0.82, color: "0,220,120" }]
        bands.forEach((b, i) => {
          const wave = Math.sin(auroraTick * 1.5 + i * 1.3) * H * 0.06
          const thick = H * 0.12, a = (Math.sin(auroraTick * 0.8 + i) * 0.5 + 0.5) * 0.28 + 0.08
          const gy = b.yRatio * H + wave
          const g = ctx.createLinearGradient(0, gy - thick, 0, gy + thick)
          g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.5, `rgba(${b.color},${a})`); g.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = g; ctx.fillRect(0, gy - thick, W, thick * 2)
        })
      }
      if (t === "pulse") {
        pulseVal += pulseDelta; if (pulseVal > 1 || pulseVal < 0) pulseDelta *= -1
        pulseVal = Math.max(0, Math.min(1, pulseVal))
        const a = pulseVal * 0.25 + 0.08
        const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75)
        gr.addColorStop(0, `rgba(0,196,180,${a})`); gr.addColorStop(0.5, `rgba(0,100,120,${a * 0.4})`); gr.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", setSize) }
  }, [ref])
}

// ─── Mini theme swatch ────────────────────────────────────────────────────────
function ThemeSwatch({ id, active, onClick }: { id: BgTheme; active: boolean; onClick(): void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const LABELS: Record<BgTheme, string> = { pure: "Pure", starfield: "Stars", nebula: "Nebula", aurora: "Aurora", pulse: "Pulse" }

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext("2d"); if (!ctx) return
    let raf = 0
    const W = 72, H = 36
    const dpr = window.devicePixelRatio || 1
    c.width = W * dpr; c.height = H * dpr; c.style.width = W + "px"; c.style.height = H + "px"
    ctx.scale(dpr, dpr)
    const SS = Array.from({ length: 10 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 0.5, ph: Math.random() * Math.PI * 2, sp: 0.025 + Math.random() * 0.03, tl: Math.random() > 0.7 }))
    const CL = Array.from({ length: 3 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 10 + Math.random() * 8, dx: (Math.random() - .5) * .25, dy: (Math.random() - .5) * .15, col: ["100,40,220", "180,0,180", "0,196,180"][Math.floor(Math.random()*3)], ph: Math.random() * Math.PI * 2, sp: 0.015 }))
    let pl = 0, pd = 0.018
    const draw = () => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0A0A0A"; ctx.fillRect(0, 0, W, H)
      if (id === "starfield") SS.forEach(s => { s.ph += s.sp; const a = (Math.sin(s.ph) + 1) * 0.45 + 0.1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = s.tl ? `rgba(0,196,180,${a})` : `rgba(240,240,240,${a})`; ctx.fill() })
      if (id === "nebula") CL.forEach(c => { c.x += c.dx; c.y += c.dy; if (c.x < -10) c.x = W + 10; if (c.x > W + 10) c.x = -10; if (c.y < -10) c.y = H + 10; if (c.y > H + 10) c.y = -10; c.ph += c.sp; const a = (Math.sin(c.ph) + 1) * 0.18 + 0.06; const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r); g.addColorStop(0, `rgba(${c.col},${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill() })
      if (id === "aurora") { pl += pd; const bands = [{ y: H * .3, color: "0,220,160" }, { y: H * .5, color: "0,160,220" }, { y: H * .7, color: "80,0,220" }]; bands.forEach((b, i) => { const wave = Math.sin(pl * 2 + i * 1.2) * H * 0.08; const a = (Math.sin(pl + i) * .5 + .5) * .35 + .1; const g = ctx.createLinearGradient(0, b.y + wave - 8, 0, b.y + wave + 8); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.5, `rgba(${b.color},${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, b.y + wave - 8, W, 16) }) }
      if (id === "pulse") { pl += pd; if (pl > 1 || pl < 0) pd *= -1; const a = pl * 0.1 + 0.02; const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6); g.addColorStop(0, `rgba(0,196,180,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H) }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [id])

  return (
    <button onClick={onClick} title={LABELS[id]} style={{ position: "relative", width: 72, height: 36, flexShrink: 0, border: "none", padding: 0, cursor: "pointer", overflow: "hidden", background: "transparent", borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent", transition: "border-color .2s" }}>
      <canvas ref={ref} style={{ display: "block", width: "72px", height: "36px" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "2px 0 3px", background: active ? "rgba(232,185,35,0.12)" : "rgba(0,0,0,0.55)", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: active ? GOLD : "#555", textAlign: "center", fontFamily: "'Inter',system-ui,sans-serif" }}>
        {LABELS[id]}
      </div>
    </button>
  )
}

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
