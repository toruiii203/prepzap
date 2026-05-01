import React, { useState, useEffect, useRef, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { TrendingUp, Award, Plus, Check, X, Zap as ZapIcon, LogOut, ChevronDown } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { levelFromXp, xpToNextLevel, xpProgressPercent, tierFromLevel, tierEmojiFromLevel } from "@/lib/xp"

// ─── Theme Types ──────────────────────────────────────────────────────────────
type BgTheme = "pure" | "starfield" | "nebula" | "aurora" | "pulse"

// ─── Data Types ───────────────────────────────────────────────────────────────
interface CheckItem  { id: string; text: string; done: boolean }
interface ActivityItem { id: string; label: string; score: string; created_at: string }
interface WeakArea   { subject: string; accuracy: number }
interface Achievement { key: string; emoji: string; label: string; earned: boolean }

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = "#E8B923"
const TEAL = "#00C4B4"

// ─── Icon factory ─────────────────────────────────────────────────────────────
const Ic = (d: React.ReactNode, stroke = TEAL) => (
  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={stroke}
    strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const ICONS: Record<string, React.ReactNode> = {
  "BrainBot":    Ic(<><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M12 3v3M9 9V7a3 3 0 016 0v2"/><circle cx="9.5" cy="14" r="0.8" fill={TEAL}/><circle cx="14.5" cy="14" r="0.8" fill={TEAL}/></>),
  "Practice":    Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 9h6M9 12h6M9 15h4"/></>),
  "Flashcards":  Ic(<><rect x="2" y="5" width="10" height="14" rx="1"/><rect x="12" y="5" width="10" height="14" rx="1"/></>),
  "Feynman":     Ic(<><path d="M12 2L8 10H3l7 6-3 8 5-4 5 4-3-8 7-6h-5z"/></>),
  "Math Solver": Ic(<><path d="M4 20h4l10-10-4-4L4 16v4z"/><line x1="14" y1="6" x2="18" y2="10"/></>),
  "Daily Quiz":  Ic(<><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  "Error Hunt":  Ic(<><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>),
  "Mind Map":    Ic(<><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/></>),
  "Concepts":    Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 12h6M12 9v6"/></>),
  "Roadmap":     Ic(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
  "Pomodoro":    Ic(<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></>),
  "Progress":    Ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  "Sources":     Ic(<><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>),
  "Cram Mode":   Ic(<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>),
  "Confidence":  Ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
  "High Yield":  Ic(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
  "Mistakes":    Ic(<><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill={TEAL}/></>),
  "Recall Mode": Ic(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>),
  "Study DNA":   Ic(<><path d="M6 3c0 6 12 6 12 12S6 21 6 21"/><path d="M18 3c0 6-12 6-12 12s12 6 12 6"/></>),
  "Settings":    Ic(<><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>),
  "Go Pro":      Ic(<><path d="M3 17l3-8 6 4 6-4 3 8H3z"/><line x1="3" y1="19" x2="21" y2="19"/></>, GOLD),
  "Flip Script": Ic(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/></>),
  "Spot Error":  Ic(<><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></>),
  "Build Def":   Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M8 12h8M8 8h5M8 16h3"/></>),
  "Blank Map":   Ic(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>),
  "Boss Round":  Ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
}

const quickActions = [
  // ── Core study tools (highest daily use) ──────────────────────────────────
  { href:"/ai-tutor",       label:"BrainBot",    description:"Ask anything, anytime" },
  { href:"/practice",       label:"Practice",    description:"AI question sets" },
  { href:"/flashcards",     label:"Flashcards",  description:"Spaced repetition" },
  { href:"/daily5",         label:"Daily Quiz",  description:"Quick daily rounds" },
  { href:"/cram",           label:"Cram Mode",   description:"Emergency study plan" },
  { href:"/recall",         label:"Recall Mode", description:"Type from memory" },
  { href:"/confidence",     label:"Confidence",  description:"Know what you know" },
  { href:"/high-yield",     label:"High Yield",  description:"Most testable concepts" },
  // ── Deep learning tools ───────────────────────────────────────────────────
  { href:"/feynman",        label:"Feynman",     description:"Teach it to learn it" },
  { href:"/math",           label:"Math Solver", description:"Step-by-step solutions" },
  { href:"/spot-error",     label:"Error Hunt",  description:"Find & fix mistakes" },
  { href:"/blank-map",      label:"Mind Map",    description:"Map & connect ideas" },
  { href:"/build-def",      label:"Concepts",    description:"Build definitions from memory" },
  { href:"/tool-architect", label:"Roadmap",     description:"Zero to mastery on any topic" },
  { href:"/mistakes",       label:"Mistakes",    description:"Track & fix errors" },
  // ── Visual & creative tools ───────────────────────────────────────────────
  { href:"/visual-learner",  label:"Visual Learner", description:"See it to remember it" },
  { href:"/flip-script",     label:"Flip Script",    description:"Rewrite to understand" },
  { href:"/focus-state",     label:"Focus State",    description:"Deep focus mode" },
  { href:"/boss-round",      label:"Boss Round",     description:"Ultimate challenge mode" },
  // ── Tracking & utilities ──────────────────────────────────────────────────
  { href:"/sources",        label:"Sources",     description:"Your study files" },
  { href:"/timer",          label:"Pomodoro",    description:"Focus timer with sounds" },
  { href:"/analytics",      label:"Progress",    description:"Track your performance" },
  { href:"/study-dna",      label:"Study DNA",   description:"Your learner profile" },
  { href:"/settings",       label:"Settings",    description:"Preferences & plan" },
  { href:"/pricing",        label:"Go Pro",      description:"Unlock everything", isGoPro: true },
]

// ─── Background Canvas Hook ───────────────────────────────────────────────────
function useStarfield(ref: React.RefObject<HTMLCanvasElement>, theme: BgTheme) {
  const themeRef = useRef(theme)
  useEffect(() => { themeRef.current = theme }, [theme])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let W = 0, H = 0, raf = 0

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap at 2x — no benefit beyond that
      W = Math.floor(window.innerWidth)
      H = Math.floor(window.innerHeight)
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + "px"
      canvas.style.height = H + "px"
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    setSize()
    window.addEventListener("resize", setSize)

    // BUG 2 FIX: stars now have velocity (vx, vy) so they drift across screen
    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.004 + Math.random() * 0.009,
      teal: Math.random() > 0.8,
      vx: (Math.random() - 0.5) * 0.00012,  // drift velocity X
      vy: (Math.random() - 0.5) * 0.00008,  // drift velocity Y
    }))

    // BUG 3 FIX: nebula clouds are off-center, multi-color (purple/magenta/teal/indigo), larger spread
    const NEBULA_COLORS = [
      "100,40,220",   // deep purple
      "180,0,180",    // magenta
      "0,196,180",    // teal
      "60,0,200",     // indigo
      "220,60,120",   // rose-purple
      "0,120,220",    // blue
      "140,0,255",    // violet
    ]
    const clouds = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      rx: 0.14 + Math.random() * 0.20,   // bigger clouds
      ry: 0.08 + Math.random() * 0.14,
      dx: (Math.random() - 0.5) * 0.00005,
      dy: (Math.random() - 0.5) * 0.00003,
      color: NEBULA_COLORS[i % NEBULA_COLORS.length],
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
    }))

    // BUG 1 FIX: separate aurora and pulse state — no more shared variable
    let auroraTick = 0
    let pulseVal = 0, pulseDelta = 0.012

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = "#0A0A0A"
      ctx.fillRect(0, 0, W, H)
      const t = themeRef.current

      if (t === "starfield") {
        for (const s of stars) {
          // BUG 2 FIX: move star position each frame (drift), wrap around edges
          s.x += s.vx; s.y += s.vy
          if (s.x < 0) s.x = 1; if (s.x > 1) s.x = 0
          if (s.y < 0) s.y = 1; if (s.y > 1) s.y = 0
          // twinkle alpha still applies on top of drift
          s.phase += s.speed
          const a = (Math.sin(s.phase) + 1) * 0.45 + 0.1
          ctx.beginPath()
          ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2)
          ctx.fillStyle = s.teal ? `rgba(0,196,180,${a})` : `rgba(240,240,240,${a})`
          ctx.fill()
        }
      }

      if (t === "nebula") {
        // BUG 3 FIX: multi-color off-center drifting clouds — distinctly different from pulse
        for (const c of clouds) {
          c.x += c.dx; c.y += c.dy
          if (c.x < -0.25) c.x = 1.25; if (c.x > 1.25) c.x = -0.25
          if (c.y < -0.2) c.y = 1.2; if (c.y > 1.2) c.y = -0.2
          c.phase += c.speed
          const a = (Math.sin(c.phase) + 1) * 0.07 + 0.03
          const cx = c.x * W, cy = c.y * H
          const rx = c.rx * W, ry = c.ry * H
          const sy = ry / rx
          ctx.save()
          ctx.scale(1, sy)
          const gr = ctx.createRadialGradient(cx, cy / sy, 0, cx, cy / sy, rx)
          gr.addColorStop(0, `rgba(${c.color},${a * 1.8})`)
          gr.addColorStop(0.4, `rgba(${c.color},${a})`)
          gr.addColorStop(1, "rgba(0,0,0,0)")
          ctx.beginPath()
          ctx.arc(cx, cy / sy, rx, 0, Math.PI * 2)
          ctx.fillStyle = gr
          ctx.fill()
          ctx.restore()
        }
      }

      if (t === "aurora") {
        // BUG 1 FIX: use auroraTick, not pulse
        auroraTick += 0.012
        const bands = [
          { yRatio: 0.25, color: "0,220,160" },
          { yRatio: 0.45, color: "0,160,220" },
          { yRatio: 0.65, color: "80,0,220" },
          { yRatio: 0.82, color: "0,220,120" },
        ]
        bands.forEach((b, i) => {
          const wave = Math.sin(auroraTick * 1.5 + i * 1.3) * H * 0.06
          const thick = H * 0.12
          const a = (Math.sin(auroraTick * 0.8 + i) * 0.5 + 0.5) * 0.28 + 0.08
          const gy = b.yRatio * H + wave
          const g = ctx.createLinearGradient(0, gy - thick, 0, gy + thick)
          g.addColorStop(0, "rgba(0,0,0,0)")
          g.addColorStop(0.5, `rgba(${b.color},${a})`)
          g.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = g
          ctx.fillRect(0, gy - thick, W, thick * 2)
        })
      }

      if (t === "pulse") {
        // BUG 1 FIX: use pulseVal/pulseDelta — fully independent from aurora
        pulseVal += pulseDelta
        if (pulseVal > 1 || pulseVal < 0) pulseDelta *= -1
        pulseVal = Math.max(0, Math.min(1, pulseVal))
        const a = pulseVal * 0.25 + 0.08
        const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75)
        gr.addColorStop(0, `rgba(0,196,180,${a})`)
        gr.addColorStop(0.5, `rgba(0,100,120,${a * 0.4})`)
        gr.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = gr
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", setSize) }
  }, [ref])
}

// ─── Theme Panel Swatch ───────────────────────────────────────────────────────
function ThemePanel({ id, active, onClick }: { id: BgTheme; active: boolean; onClick(): void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const TITLES: Record<BgTheme, string> = {
    pure: "Pure Black",
    starfield: "Starfield",
    nebula: "Nebula",
    aurora: "Aurora",
    pulse: "Pulse"
  }

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext("2d"); if (!ctx) return
    let raf = 0
    const W = 90, H = 44
    const dpr = window.devicePixelRatio || 1
    c.width = W * dpr; c.height = H * dpr
    c.style.width = W + "px"; c.style.height = H + "px"
    ctx.scale(dpr, dpr)
    const SS = Array.from({ length: 12 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 0.6, ph: Math.random() * Math.PI * 2, sp: 0.025 + Math.random() * 0.03, tl: Math.random() > 0.7 }))
    const CL = Array.from({ length: 2 }, () => ({ x: 10 + Math.random() * 70, y: 5 + Math.random() * 34, r: 12 + Math.random() * 8, dx: (Math.random()-.5)*.3, dy: (Math.random()-.5)*.2, tl: Math.random()>.5, ph: Math.random()*Math.PI*2, sp: 0.015 }))
    let pl = 0, pd2 = 0.018
    const draw = () => {
      ctx.clearRect(0,0,W,H); ctx.fillStyle="#0A0A0A"; ctx.fillRect(0,0,W,H)
      if (id==="starfield") SS.forEach(s=>{s.ph+=s.sp;const a=(Math.sin(s.ph)+1)*0.45+0.1;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=s.tl?`rgba(0,196,180,${a})`:`rgba(240,240,240,${a})`;ctx.fill()})
      if (id==="nebula") CL.forEach(c=>{c.x+=c.dx;c.y+=c.dy;if(c.x<-10)c.x=W+10;if(c.x>W+10)c.x=-10;if(c.y<-10)c.y=H+10;if(c.y>H+10)c.y=-10;c.ph+=c.sp;const a=(Math.sin(c.ph)+1)*0.18+0.06;const g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,c.r);g.addColorStop(0,c.tl?`rgba(0,196,180,${a})`:`rgba(100,60,200,${a})`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fill()})
      if (id==="aurora"){pl+=pd2;const bands=[{y:H*0.3,color:"0,220,160"},{y:H*0.5,color:"0,160,220"},{y:H*0.7,color:"80,0,220"}];bands.forEach((b,i)=>{const wave=Math.sin(pl*2+i*1.2)*H*0.08;const a=(Math.sin(pl+i)*0.5+0.5)*0.35+0.1;const g=ctx.createLinearGradient(0,b.y+wave-10,0,b.y+wave+10);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(0.5,`rgba(${b.color},${a})`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(0,b.y+wave-10,W,20)})}
      if (id==="pulse"){pl+=pd2;if(pl>1||pl<0)pd2*=-1;const a=pl*0.1+0.02;const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.6);g.addColorStop(0,`rgba(0,196,180,${a})`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
      raf=requestAnimationFrame(draw)
    }
    draw()
    return ()=>cancelAnimationFrame(raf)
  },[id])

  return (
    <button
      onClick={onClick}
      title={TITLES[id]}
      style={{
        position: "relative",
        width: 90,
        height: 44,
        flexShrink: 0,
        border: "none",
        padding: 0,
        cursor: "pointer",
        overflow: "hidden",
        background: "transparent",
        borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
        transition: "border-color .2s",
      }}
    >
      <canvas ref={ref} style={{ display:"block", width:"90px", height:"44px" }}/>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "3px 0 4px",
        background: active ? "rgba(232,185,35,0.12)" : "rgba(0,0,0,0.55)",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: active ? GOLD : "#555",
        textAlign: "center",
        transition: "all .2s",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}>{TITLES[id]}</div>
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relTime(iso: string) {
  const d = Math.floor((Date.now()-new Date(iso).getTime())/60000)
  if(d<1)return"just now"; if(d<60)return`${d}m ago`; if(d<1440)return`${Math.floor(d/60)}h ago`; return`${Math.floor(d/1440)}d ago`
}
function greeting(){ const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening" }


// ─── Dashboard Study Tools Dropdown ─────────────────────────────────────────
const DASH_TOOLS = [
  {href:"/ai-tutor",label:"BrainBot",desc:"Ask anything"},
  {href:"/practice",label:"Practice",desc:"AI question sets"},
  {href:"/flashcards",label:"Flashcards",desc:"Spaced repetition"},
  {href:"/feynman",label:"Feynman",desc:"Teach to learn"},
  {href:"/math",label:"MathZap",desc:"Step-by-step math"},
  {href:"/daily5",label:"Daily Quiz",desc:"Quick rounds"},
  {href:"/spot-error",label:"Error Hunt",desc:"Find & fix mistakes"},
  {href:"/blank-map",label:"Mind Map",desc:"Connect ideas"},
  {href:"/build-def",label:"Concepts",desc:"Build from memory"},
  {href:"/tool-architect",label:"Roadmap",desc:"Zero to mastery"},
  {href:"/timer",label:"Pomodoro",desc:"Focus timer"},
  {href:"/analytics",label:"Progress",desc:"Track performance"},
  {href:"/sources",label:"Sources",desc:"Study files"},
  {href:"/cram",label:"Cram Mode",desc:"Emergency plan"},
  {href:"/confidence",label:"Confidence",desc:"Know what you know"},
  {href:"/high-yield",label:"High Yield",desc:"Most testable"},
  {href:"/mistakes",label:"Mistakes",desc:"Track & fix errors"},
  {href:"/recall",label:"Recall Mode",desc:"Type from memory"},
  {href:"/visual-learner",label:"Visual Learner",desc:"See it to remember it"},
  {href:"/flip-script",label:"Flip Script",desc:"Rewrite to understand"},
  {href:"/focus-state",label:"Focus State",desc:"Deep focus mode"},
  {href:"/boss-round",label:"Boss Round",desc:"Ultimate challenge"},
  {href:"/study-dna",label:"Study DNA",desc:"Your learner profile"},
  {href:"/settings",label:"Settings",desc:"Preferences & plan"},
]

function DashStudyToolsDropdown() {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",color:"#555",fontSize:9,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",cursor:"pointer",fontFamily:"inherit",transition:"color .2s",padding:"4px 0"}}
        onMouseEnter={e=>(e.currentTarget.style.color="#F0F0F0")} onMouseLeave={e=>(e.currentTarget.style.color="#555")}>
        STUDY TOOLS <ChevronDown size={9} style={{marginTop:1}}/>
      </button>
      {open&&(<>
        <div style={{position:"fixed",inset:0,zIndex:90}} onClick={()=>setOpen(false)}/>
        <div style={{position:"absolute",top:"calc(100% + 8px)",left:0,width:320,background:"#0E0E0E",border:"0.5px solid #252525",zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.7)",display:"grid",gridTemplateColumns:"1fr 1fr",fontFamily:"'Inter',system-ui,sans-serif"}}>
          <div style={{padding:"8px 10px",gridColumn:"1/-1",borderBottom:"0.5px solid #1A1A1A"}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"#333"}}>All Tools</span>
          </div>
          {DASH_TOOLS.map(t=>(
            <Link key={t.href} to={t.href} onClick={()=>setOpen(false)} style={{textDecoration:"none",padding:"7px 10px",borderBottom:"0.5px solid #111",display:"flex",flexDirection:"column",gap:1,transition:"background .15s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(0,196,180,0.04)"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent"}}>
              <span style={{fontSize:10,fontWeight:600,color:"#C0C0C0"}}>{t.label}</span>
              <span style={{fontSize:9,color:"#444"}}>{t.desc}</span>
            </Link>
          ))}
        </div>
      </>)}
    </div>
  )
}

// ─── Dashboard Source Pill ────────────────────────────────────────────────────
function DashSourcePill() {
  const [sources, setSources] = React.useState<any[]>([])
  const [active, setActive] = React.useState<any>(null)
  const [open, setOpen] = React.useState(false)

  React.useEffect(()=>{
    try{
      const lib = JSON.parse(localStorage.getItem("studenius_sources")||"[]")
      const activeId = localStorage.getItem("studenius_active_source")
      setSources(lib)
      setActive(lib.find((s:any)=>s.id===activeId)||null)
    }catch{}
  },[])

  const select = (s:any|null) => {
    if(s){localStorage.setItem("studenius_active_source",s.id)}
    else{localStorage.removeItem("studenius_active_source")}
    setActive(s); setOpen(false)
  }

  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:active?"rgba(0,196,180,0.08)":"rgba(255,255,255,0.04)",border:`0.5px solid ${active?"rgba(0,196,180,0.35)":"#252525"}`,color:active?TEAL:"#555",fontSize:9,fontWeight:600,letterSpacing:"0.06em",cursor:"pointer",fontFamily:"inherit",transition:"all .2s",whiteSpace:"nowrap",maxWidth:180}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=TEAL;e.currentTarget.style.color=TEAL}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=active?"rgba(0,196,180,0.35)":"#252525";e.currentTarget.style.color=active?TEAL:"#555"}}>
        <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        <span style={{overflow:"hidden",textOverflow:"ellipsis",maxWidth:120}}>
          {active?active.name.slice(0,16)+(active.name.length>16?"…":""):"Source Library"}
        </span>
        <ChevronDown size={9} style={{flexShrink:0,opacity:0.5}}/>
      </button>
      {open&&(<>
        <div style={{position:"fixed",inset:0,zIndex:90}} onClick={()=>setOpen(false)}/>
        <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,width:240,background:"#0E0E0E",border:"0.5px solid #252525",zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",fontFamily:"'Inter',system-ui,sans-serif"}}>
          <div style={{padding:"7px 10px",borderBottom:"0.5px solid #1A1A1A",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555"}}>Source Library</span>
            <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:2}}><X size={11}/></button>
          </div>
          <button onClick={()=>select(null)} style={{width:"100%",padding:"7px 10px",background:!active?"rgba(0,196,180,0.06)":"transparent",border:"none",borderBottom:"0.5px solid #1A1A1A",color:!active?TEAL:"#555",fontSize:10,fontWeight:600,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
            General AI (no source)
          </button>
          {sources.length===0?(
            <div style={{padding:"10px",fontSize:10,color:"#333",textAlign:"center"}}>
              No sources yet — <Link to="/sources" style={{color:TEAL,textDecoration:"none"}} onClick={()=>setOpen(false)}>add one</Link>
            </div>
          ):(
            <div style={{maxHeight:180,overflowY:"auto"}}>
              {sources.map((s:any)=>(
                <button key={s.id} onClick={()=>select(s)} style={{width:"100%",padding:"7px 10px",background:active?.id===s.id?"rgba(0,196,180,0.06)":"transparent",border:"none",borderBottom:"0.5px solid #141414",color:active?.id===s.id?TEAL:"#C0C0C0",fontSize:10,cursor:"pointer",textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:7}}>
                  <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke={active?.id===s.id?TEAL:"#555"} strokeWidth={1.7} strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{s.name}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{padding:"6px 10px",borderTop:"0.5px solid #1A1A1A"}}>
            <Link to="/sources" onClick={()=>setOpen(false)} style={{fontSize:9,color:"#555",textDecoration:"none",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}
              onMouseEnter={e=>(e.currentTarget.style.color=TEAL)} onMouseLeave={e=>(e.currentTarget.style.color="#555")}>
              Manage Source Library →
            </Link>
          </div>
        </div>
      </>)}
    </div>
  )
}

// ─── Achievement SVG Icons ─────────────────────────────────────────────────────
function AchievementIcon({id, earned}: {id:string; earned:boolean}) {
  const color = earned ? GOLD : "#333"
  const icons: Record<string,React.ReactNode> = {
    target:  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/></svg>,
    flame:   <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><path d="M12 2c0 0-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>,
    bolt:    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    trophy:  <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><path d="M6 9H3V4h3M18 9h3V4h-3M6 9a6 6 0 0012 0M12 15v4M8 19h8"/></svg>,
    gem:     <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>,
    book:    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/></svg>,
  }
  return <>{icons[id] ?? icons.target}</>
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bgTheme, setBgTheme] = useState<BgTheme>(() => (localStorage.getItem("studenius_bg_theme") as BgTheme) || "starfield")
  useStarfield(canvasRef, bgTheme)

  // State
  const [xp,setXp]           = useState(0)
  const [streak,setStreak]   = useState(0)
  const [todayMin,setTodayMin] = useState(0)
  const [weeklySessionCount,setWeeklySessionCount] = useState(0)
  const [qa,setQa]           = useState(0)
  const [activity,setActivity] = useState<ActivityItem[]>([])
  const [weak,setWeak]       = useState<WeakArea[]>([])
  const [loading,setLoading] = useState(true)
  const [showAll,setShowAll] = useState(false)

  const [checks,setChecks] = useState<CheckItem[]>(()=>{try{return JSON.parse(localStorage.getItem("pz_checklist")||"[]")}catch{return[]}})
  const [cInput,setCInput] = useState("")

  // ── Calendar state ──
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()) // 0-indexed
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null) // "YYYY-MM-DD"
  const [calSessions, setCalSessions] = useState<{id:string;title:string;date:string;duration_minutes:number;color:string}[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<{id:string;title:string;date:string;duration_minutes:number;color:string}[]>([])

  // ── Add Session inline state ──
  const SESSION_PALETTE = ["#10b981","#3b82f6","#a855f7","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316","#6366f1"]
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [sessionTitle,    setSessionTitle]    = useState("")
  const [sessionColor,    setSessionColor]    = useState(SESSION_PALETTE[0])
  const [sessionDate,     setSessionDate]     = useState(() => new Date().toISOString().split("T")[0])
  const [sessionDuration, setSessionDuration] = useState(30)
  const openSessionModal = (date?: string) => {
    setSessionTitle(""); setSessionColor(SESSION_PALETTE[0])
    setSessionDate(date ?? new Date().toISOString().split("T")[0])
    setSessionDuration(30); setShowSessionModal(true)
  }
  const saveSession = async () => {
    if (!sessionTitle.trim() || !user) return
    try {
      const { data } = await supabase.from("study_sessions").insert({
        user_id: user.id, title: sessionTitle.trim(),
        date: sessionDate, duration_minutes: sessionDuration, color: sessionColor,
      }).select().single()
      if (data) {
        setCalSessions(prev => [...prev, data])
        setUpcomingSessions(prev => {
          const updated = [...prev, data].sort((a,b)=>a.date.localeCompare(b.date))
          return updated
        })
        // Award XP for logging a session
        const newXp = xp + Math.round(sessionDuration / 2)
        setXp(newXp)
        await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id)
        await supabase.from("activity_log").insert({ user_id: user.id, label: `Study session: ${sessionTitle.trim()}`, score: `+${Math.round(sessionDuration/2)} XP` })
      }
    } catch {}
    setShowSessionModal(false)
  }

  // Load calendar sessions
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const today = new Date().toISOString().slice(0,10)
      const { data } = await supabase.from("study_sessions").select("*").eq("user_id", user.id).order("date")
      if (data) {
        setCalSessions(data)
        setUpcomingSessions(data.filter((s:any) => s.date >= today))
      }
    }
    load()
  }, [user])

  useEffect(()=>{localStorage.setItem("pz_checklist",JSON.stringify(checks))},[checks])

  const addCheck = ()=>{ if(!cInput.trim())return; setChecks(p=>[...p,{id:Date.now().toString(),text:cInput.trim(),done:false}]); setCInput("") }
  const toggleCheck = (id:string)=>setChecks(p=>p.map(c=>c.id===id?{...c,done:!c.done}:c))
  const removeCheck = (id:string)=>setChecks(p=>p.filter(c=>c.id!==id))

  // Load data
  useEffect(()=>{
    if(!user)return
    const load=async()=>{
      setLoading(true)
      try{
        const{data:prof}=await supabase.from("profiles").select("xp,streak,plan").eq("id",user.id).maybeSingle()
        if(prof){setXp(prof.xp??0);setStreak(prof.streak??0)}
        const today=new Date().toISOString().slice(0,10)
        const weekAgo=new Date(Date.now()-7*86400000).toISOString().slice(0,10)
        // Weekly hours from study_sessions
        const{data:sess}=await supabase.from("study_sessions").select("duration_minutes").eq("user_id",user.id).gte("date",weekAgo)
        if(sess)setTodayMin(sess.reduce((s:number,r:any)=>s+(r.duration_minutes??0),0))
        // Activity log — no limit so heatmap and Sessions Done are accurate
        const{data:acts}=await supabase.from("activity_log").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(500)
        if(acts)setActivity(acts)
        // Weekly sessions count
        const{data:weeklySess}=await supabase.from("study_sessions").select("id").eq("user_id",user.id).gte("date",weekAgo)
        if(weeklySess)setWeeklySessionCount(weeklySess.length)
        const{data:ans}=await supabase.from("question_attempts").select("correct").eq("user_id",user.id).gte("created_at",today)
        if(ans){setQa(ans.length)}
        const{data:w}=await supabase.from("weak_areas").select("subject,accuracy").eq("user_id",user.id).order("accuracy").limit(4)
        if(w)setWeak(w)
      }catch{}
      setLoading(false)
    }
    load()
  },[user])

  const level=levelFromXp(xp), tier=tierFromLevel(level), tierEmoji=tierEmojiFromLevel(level)
  const toNext=xpToNextLevel(xp), xpPct=xpProgressPercent(xp)
  const dailyGoal=60, dailyPct=Math.min(100,Math.round(todayMin/dailyGoal*100))

  const achievements: Achievement[] = [
    {key:"first",emoji:"target",label:"First Step",earned:xp>0},
    {key:"s3",emoji:"flame",label:"3-Day Streak",earned:streak>=3},
    {key:"s7",emoji:"bolt",label:"Week Strong",earned:streak>=7},
    {key:"x500",emoji:"trophy",label:"500 XP",earned:xp>=500},
    {key:"x1000",emoji:"gem",label:"1000 XP",earned:xp>=1000},
    {key:"q50",emoji:"book",label:"50 Qs",earned:qa>=50},
  ]

  const displayName=(user?.user_metadata?.username||user?.user_metadata?.full_name||user?.email?.split("@")[0]||"Student").toUpperCase()
  const displayed=showAll?quickActions:quickActions.slice(0,20)

  // Heatmap — 13 weeks × 7 days, column-first (like GitHub contribution graph)
  const heatmap = useMemo(() => {
    // Count activity events per calendar day
    const dayCounts: Record<string, number> = {}
    activity.forEach(item => {
      const day = item.created_at.slice(0, 10)
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })

    // Build 91 cells: cell[0] = oldest day (91 days ago), cell[90] = today
    // But we render column-first: col 0 = week 13 ago, col 12 = current week
    // Each column has 7 rows (Sun→Sat). We align so today falls on correct weekday row.
    const now = new Date()
    const todayDow = now.getDay() // 0=Sun…6=Sat
    // Total cells = 13 cols × 7 rows = 91
    // Last cell index = 90 (today), first = 0 (90 days ago adjusted to week start)
    // We'll build an array of { dateStr, level } for 91 slots
    const cells: { date: string; level: string }[] = []
    for (let i = 90; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = dayCounts[key] || 0
      const level = count === 0 ? "" : count === 1 ? "l1" : count <= 3 ? "l2" : count <= 6 ? "l3" : "l4"
      cells.push({ date: key, level })
    }

    // Pad the start so col 0 row 0 = Sunday of the oldest week
    // Find how many empty days to prepend so first cell lands on Sunday
    const firstDow = new Date(cells[0].date).getDay()
    const padStart = firstDow // days before the first real day in that week
    const padEnd = 6 - new Date(cells[cells.length - 1].date).getDay()

    const padded = [
      ...Array(padStart).fill({ date: "", level: "pad" }),
      ...cells,
      ...Array(padEnd).fill({ date: "", level: "pad" }),
    ]

    return padded
  }, [activity])

  const heatmapCols = Math.ceil(heatmap.length / 7)

  // Shared styles
  const card: React.CSSProperties = { background:"rgba(10,10,10,0.65)", border:"1px solid #252525" }

  const metrics = [
    { label:"Day Streak",   value:streak,                  sub:streak>0?`${streak} day${streak!==1?"s":""}` :"Start today", accent:GOLD, ibg:"#1A1400", ibr:"#2A2000",
      icon:<svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={GOLD} strokeWidth={1.7} strokeLinecap="round"><path d="M12 2c0 0-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg> },
    { label:"Hours / Week", value:(todayMin/60).toFixed(1), sub:`Goal: ${dailyGoal/60}h/wk`,             accent:TEAL, ibg:"#001A18", ibr:"#002A26",
      icon:<svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={TEAL} strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> },
    { label:"Sessions Done", value:weeklySessionCount,      sub:"This week",                           accent:TEAL, ibg:"#001A18", ibr:"#002A26",
      icon:<svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={TEAL} strokeWidth={1.7} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label:"Goal",          value:`${dailyPct}%`,           sub:dailyPct>0?"Keep going!":"Set a goal", accent:GOLD, ibg:"#1A1400", ibr:"#2A2000",
      icon:<svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke={GOLD} strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/></svg> },
  ]

  const SB_BTN = (label: string, href: string) => {
    const icons: Record<string,React.ReactNode> = {
      "Study Planner": <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
      "AI Tutor":      <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
      "Go Pro ↗":      <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="#E8B923" strokeWidth={1.7} strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    }
    return (
      <Link key={href} to={href} style={{textDecoration:"none"}}>
        <button style={{width:"100%",padding:"7px 9px",background:"transparent",border:"0.5px solid #1E1E1E",color:"#555",fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",letterSpacing:"0.04em",textAlign:"left",display:"flex",alignItems:"center",gap:6}}
          onMouseEnter={e=>{(e.currentTarget.style.borderColor=TEAL);(e.currentTarget.style.color=TEAL)}}
          onMouseLeave={e=>{(e.currentTarget.style.borderColor="#1E1E1E");(e.currentTarget.style.color="#555")}}>
          {icons[label] && <span style={{flexShrink:0,opacity:0.7}}>{icons[label]}</span>}
          {label}
        </button>
      </Link>
    )
  }

  // ── Responsive helpers ────────────────────────────────────────────────────
  // We use a CSS-variable-based approach via a style tag for responsive breakpoints
  // since Tailwind compiler isn't guaranteed. We inject once.
  useEffect(() => {
    const id = "studenius-responsive"
    if (document.getElementById(id)) return
    const s = document.createElement("style")
    s.id = id
    s.textContent = `
      *, *::before, *::after { -webkit-font-smoothing: antialiased !important; -moz-osx-font-smoothing: grayscale !important; text-rendering: optimizeLegibility !important; }
      @media (max-width: 767px) {
        .sdn-metrics { grid-template-columns: repeat(2, 1fr) !important; }
        .sdn-quickstart { grid-template-columns: repeat(3, 1fr) !important; }
        .sdn-cal-row { grid-template-columns: 1fr !important; }
        .sdn-sidebar { display: none !important; }
        .sdn-main { padding: 14px 14px 100px !important; }
        .sdn-greeting-name { font-size: 18px !important; }
      }
    `
    document.head.appendChild(s)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  return (
    <div style={{minHeight:"100vh",background:"#0A0A0A",color:"#F0F0F0",fontFamily:"'Inter',system-ui,sans-serif",position:"relative"}}>
      {/* Animated canvas — fixed behind everything */}
      <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,zIndex:0,pointerEvents:"none"}}/>

      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",minHeight:"100vh",WebkitFontSmoothing:"antialiased",MozOsxFontSmoothing:"grayscale",transform:"translateZ(0)"}}>

        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:52,borderBottom:"0.5px solid #1E1E1E",background:"rgba(8,8,8,0.6)",flexShrink:0}}>
          <span style={{fontSize:14,fontWeight:700,letterSpacing:"0.2em"}}>STUDENIUS</span>
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <DashStudyToolsDropdown />
            <DashSourcePill />
            <Link to="/pricing" style={{fontSize:9,fontWeight:600,letterSpacing:"0.14em",color:"#555",textDecoration:"none",transition:"color .2s",textTransform:"uppercase"}}
              onMouseEnter={e=>(e.currentTarget.style.color="#F0F0F0")}
              onMouseLeave={e=>(e.currentTarget.style.color="#555")}>PRICING</Link>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {/* Avatar */}
            <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${TEAL},#0097A7)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#0A0A0A",cursor:"pointer"}}
              onClick={()=>navigate("/settings")}>
              {displayName.slice(0,2)}
            </div>
          </div>
        </nav>



        {/* ── THEME STRIP ─────────────────────────────────────────────────── */}
        <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto",borderBottom:"0.5px solid #1A1A1A",background:"rgba(8,8,8,0.7)",flexShrink:0,scrollbarWidth:"none",msOverflowStyle:"none"}}>
          <div style={{padding:"0 12px",flexShrink:0,fontSize:7,letterSpacing:"0.16em",textTransform:"uppercase",color:"#333",fontWeight:700,whiteSpace:"nowrap"}}>Theme</div>
          <div style={{width:"0.5px",height:28,background:"#1E1E1E",flexShrink:0}}/>
          {(["pure","starfield","nebula","aurora","pulse"] as BgTheme[]).map(id=>(
            <ThemePanel key={id} id={id} active={bgTheme===id} onClick={()=>{ setBgTheme(id); localStorage.setItem("studenius_bg_theme",id) }}/>
          ))}
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────────── */}
        <div style={{display:"flex",flex:1,overflow:"hidden",maxWidth:1400,margin:"0 auto",width:"100%"}}>

          {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
          <div className="sdn-main" style={{flex:1,padding:"18px 20px 80px 22px",overflowY:"auto",background:"transparent"}}>

            {/* Greeting */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:3}}>Study Planner</div>
              <div className="sdn-greeting-name" style={{fontSize:20,fontWeight:600,letterSpacing:"-0.02em",lineHeight:1.2}}>
                {greeting()}, {displayName} <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginLeft:4}}><path d="M7 11V7a2 2 0 014 0v4M11 9V5a2 2 0 014 0v6M15 9a2 2 0 014 0v4a8 8 0 01-16 0v-4"/></svg>
              </div>
            </div>

            {/* Metrics — 2×2 on mobile, 4-in-a-row on desktop */}
            <div className="sdn-metrics" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:14}}>
              {metrics.map(m=>(
                <div key={m.label} style={{...card,padding:11,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:1.5,background:m.accent}}/>
                  <div style={{width:24,height:24,borderRadius:5,background:m.ibg,border:`0.5px solid ${m.ibr}`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}>{m.icon}</div>
                  <div style={{fontSize:20,fontWeight:700,letterSpacing:"-0.03em",lineHeight:1,fontVariantNumeric:"tabular-nums",marginBottom:2}}>{m.value}</div>
                  <div style={{fontSize:9,color:"#555",letterSpacing:"0.1em",textTransform:"uppercase"}}>{m.label}</div>
                  <div style={{fontSize:9,color:TEAL,marginTop:2}}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Standalone Calendar ──────────────────────────────────── */}
            {(()=>{
              const today = new Date()
              const todayStr = today.toISOString().slice(0,10)
              const firstDay = new Date(calYear, calMonth, 1).getDay() // 0=Sun
              const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
              const monthLabel = new Date(calYear, calMonth).toLocaleString("default",{month:"long",year:"numeric"})
              // sessions indexed by date
              const sessByDate: Record<string, typeof calSessions> = {}
              calSessions.forEach(s => { if(!sessByDate[s.date])sessByDate[s.date]=[]; sessByDate[s.date].push(s) })
              const selectedSessions = calSelectedDate ? (sessByDate[calSelectedDate]??[]) : []

              const prevMonth=()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else{setCalMonth(m=>m-1)} }
              const nextMonth=()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else{setCalMonth(m=>m+1)} }

              return (
                <div style={{...card,padding:14,marginBottom:12}}>
                  {/* Header */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:600,letterSpacing:"0.04em"}}>{monthLabel}</span>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <button onClick={()=>openSessionModal(calSelectedDate??todayStr)}
                        style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:TEAL,border:"none",color:"#0A0A0A",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em"}}>
                        <Plus size={10}/> Add Session
                      </button>
                      <div style={{display:"flex",gap:3}}>
                        <button onClick={prevMonth} style={{width:20,height:20,border:"0.5px solid #2A2A2A",background:"transparent",color:"#555",cursor:"pointer",fontSize:13,borderRadius:3,lineHeight:1}}>‹</button>
                        <button onClick={nextMonth} style={{width:20,height:20,border:"0.5px solid #2A2A2A",background:"transparent",color:"#555",cursor:"pointer",fontSize:13,borderRadius:3,lineHeight:1}}>›</button>
                      </div>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
                      <div key={d} style={{fontSize:8,color:"#444",padding:"2px 0",textAlign:"center",textTransform:"uppercase",letterSpacing:"0.06em"}}>{d}</div>
                    ))}
                    {Array(firstDay).fill(null).map((_,i)=><div key={"pad"+i}/>)}
                    {Array.from({length:daysInMonth},(_,i)=>{
                      const day=i+1
                      const dateStr=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
                      const isToday=dateStr===todayStr
                      const isSelected=dateStr===calSelectedDate
                      const hasSessions=(sessByDate[dateStr]?.length??0)>0
                      const dotColors=sessByDate[dateStr]?.slice(0,3).map(s=>s.color)??[]
                      return (
                        <div key={day} onClick={()=>setCalSelectedDate(isSelected?null:dateStr)}
                          style={{position:"relative",aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:4,cursor:"pointer",
                            background:isSelected?"rgba(0,196,180,0.15)":isToday?"rgba(232,185,35,0.12)":"transparent",
                            border:`1px solid ${isSelected?TEAL:isToday?"rgba(232,185,35,0.4)":"transparent"}`,
                            transition:"all .15s"}}
                          onMouseEnter={e=>{if(!isSelected&&!isToday)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)"}}
                          onMouseLeave={e=>{if(!isSelected&&!isToday)(e.currentTarget as HTMLElement).style.background="transparent"}}>
                          <span style={{fontSize:11,color:isSelected?TEAL:isToday?GOLD:"#888",fontWeight:isToday||isSelected?700:400}}>{day}</span>
                          {hasSessions&&(
                            <div style={{display:"flex",gap:2,marginTop:2}}>
                              {dotColors.map((c,ci)=><div key={ci} style={{width:4,height:4,borderRadius:"50%",background:c}}/>)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Selected day sessions panel */}
                  {calSelectedDate&&(
                    <div style={{marginTop:12,borderTop:"0.5px solid #1E1E1E",paddingTop:10}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                        <span style={{fontSize:10,fontWeight:600,color:"#AAA"}}>
                          {new Date(calSelectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                        </span>
                        <button onClick={()=>openSessionModal(calSelectedDate)}
                          style={{fontSize:9,color:TEAL,background:"transparent",border:`0.5px solid ${TEAL}`,padding:"2px 7px",cursor:"pointer",fontFamily:"inherit"}}>
                          + Add
                        </button>
                      </div>
                      {selectedSessions.length===0?(
                        <div style={{fontSize:10,color:"#333",padding:"6px 0"}}>No sessions — click + Add to schedule one.</div>
                      ):(
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {selectedSessions.map(s=>(
                            <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 9px",background:"rgba(20,20,20,0.7)",border:"0.5px solid #1E1E1E"}}>
                              <div style={{width:3,height:28,background:s.color,flexShrink:0,borderRadius:2}}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:11,fontWeight:500,color:"#F0F0F0"}}>{s.title}</div>
                                <div style={{fontSize:9,color:"#555",fontFamily:"monospace"}}>{s.duration_minutes<60?`${s.duration_minutes}min`:`${s.duration_minutes/60}h`}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Checklist */}
            <div style={{...card,padding:12,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:checks.length>0?8:3}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"#555"}}>Today's Checklist</div>
                <span style={{background:"#001A18",color:TEAL,border:"0.5px solid #002A26",fontSize:9,fontWeight:700,padding:"2px 6px",letterSpacing:"0.08em"}}>{checks.filter(c=>c.done).length}/{checks.length}</span>
              </div>
              {checks.length===0&&<div style={{fontSize:10,color:"#333",paddingBottom:4}}>No tasks yet. Add something to get started.</div>}
              {checks.map(c=>(
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:"0.5px solid #1A1A1A"}}>
                  <button onClick={()=>toggleCheck(c.id)} style={{width:13,height:13,borderRadius:2,border:`1px solid ${c.done?TEAL:"#2A2A2A"}`,background:c.done?TEAL:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,padding:0}}>
                    {c.done&&<Check size={8} color="#0A0A0A" strokeWidth={3}/>}
                  </button>
                  <span style={{flex:1,fontSize:11,color:c.done?"#444":"#CCC",textDecoration:c.done?"line-through":"none"}}>{c.text}</span>
                  <button onClick={()=>removeCheck(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#333",padding:2}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#666"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#333"}><X size={10}/></button>
                </div>
              ))}
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,padding:"5px 7px",border:"0.5px solid #1E1E1E",background:"rgba(13,13,13,0.8)"}}>
                <Plus size={10} color="#333"/>
                <input value={cInput} onChange={e=>setCInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCheck()}
                  placeholder="Add a task and press Enter..."
                  style={{background:"transparent",border:"none",outline:"none",color:"#AAAAAA",fontSize:11,flex:1,fontFamily:"inherit"}}/>
              </div>
            </div>

            {/* XP Bar */}
            <div style={{...card,padding:"10px 12px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:GOLD}}/>
                  <span style={{fontSize:10,color:GOLD,fontWeight:600,letterSpacing:"0.06em"}}>Level {level} — {tier} {tierEmoji}</span>
                </div>
                <span style={{background:"#1A1400",color:GOLD,border:"0.5px solid #2A2000",fontSize:9,fontWeight:700,padding:"2px 6px",letterSpacing:"0.08em"}}>{xp.toLocaleString()} XP</span>
              </div>
              <div style={{height:3,background:"#1A1A1A",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(0.4,xpPct)}%`,background:GOLD,borderRadius:2,transition:"width .6s ease"}}/>
              </div>
              <div style={{fontSize:9,color:"#444",marginTop:3}}>{toNext} XP to Level {level+1}</div>
              {xp===0&&<div style={{fontSize:10,color:"#444",marginTop:5,padding:"4px 7px",background:"#0D0D0D",border:"0.5px solid #1E1E1E"}}>Log a session or complete practice questions to earn XP.</div>}
            </div>

            {/* Quick Start */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"#555"}}>Quick Start</span>
              <button onClick={()=>setShowAll(s=>!s)} style={{background:"none",border:"none",color:"#444",fontSize:9,cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                {showAll?"SHOW LESS":`+${quickActions.length-20} MORE`}
              </button>
            </div>
            {/* 5 cols desktop, 3 cols mobile */}
            <div className="sdn-quickstart" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:13}}>
              {displayed.map((a,i)=>(
                <Link to={a.href} key={i} style={{textDecoration:"none"}}>
                  <div style={{...card,padding:"9px 6px 8px",textAlign:"center",cursor:"pointer",transition:"all .18s"}}
                    onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background="rgba(20,20,20,0.95)";el.style.borderColor="#2E2E2E";el.style.transform="translateY(-1px)"}}
                    onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="rgba(17,17,17,0.85)";el.style.borderColor="#1E1E1E";el.style.transform=""}}>
                    <div style={{width:30,height:30,borderRadius:6,background:"#141414",border:"0.5px solid #222",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 5px"}}>
                      {ICONS[a.label]??<ZapIcon size={13} color={TEAL}/>}
                    </div>
                    <div style={{fontSize:9,fontWeight:600,color:"#CCC",letterSpacing:"0.04em",lineHeight:1.3}}>{a.label}</div>
                    <div style={{fontSize:8,color:"#333",marginTop:1,lineHeight:1.3}}>{a.description}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Recent Activity */}
            <div style={{...card,borderTop:`2px solid ${GOLD}`,padding:12,marginBottom:13}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:9}}>
                <TrendingUp size={12} color="#555"/>
                <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"#555"}}>Recent Activity</span>
              </div>
              {loading?(
                <div style={{display:"flex",flexDirection:"column",gap:4}}>{[1,2,3].map(i=><div key={i} style={{height:38,background:"#1A1A1A"}}/>)}</div>
              ):activity.length===0?(
                <div style={{fontSize:10,textAlign:"center",padding:"12px 0",color:"#333"}}>No activity yet — start studying to see your history!</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {activity.map(item=>(
                    <div key={item.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 8px",background:"rgba(20,20,20,0.6)",border:"0.5px solid #1A1A1A"}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:4,height:4,background:TEAL,flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:11,fontWeight:500,color:"#F0F0F0"}}>{item.label}</div>
                          <div style={{fontSize:9,color:"#444",fontFamily:"monospace"}}>{relTime(item.created_at)}</div>
                        </div>
                      </div>
                      <span style={{fontSize:9,padding:"2px 5px",background:"#0D0D0D",border:"0.5px solid #1E1E1E",color:"#555",fontFamily:"monospace"}}>{item.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── SIDEBAR (desktop only) ───────────────────────────────────── */}
          <div className="sdn-sidebar" style={{width:210,flexDirection:"column",padding:"14px 13px 20px",background:"rgba(8,8,8,0.6)",borderLeft:"0.5px solid #1A1A1A",overflowY:"auto",flexShrink:0,display:"flex"}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:2}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
            <div style={{fontSize:9,letterSpacing:"0.1em",textTransform:"uppercase",color:"#444",marginBottom:11}}>Upcoming Sessions</div>
            {upcomingSessions.length===0?(
              <div style={{textAlign:"center",padding:"9px 0 11px"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:"#141414",border:"0.5px solid #222",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}>
                  <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="#333" strokeWidth={1.5} strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div style={{fontSize:10,color:"#333",marginBottom:6}}>No upcoming sessions</div>
                <button onClick={()=>openSessionModal()} style={{background:"transparent",border:"0.5px solid #1E1E1E",color:"#555",fontSize:10,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
                  onMouseEnter={e=>{(e.currentTarget.style.borderColor=TEAL);(e.currentTarget.style.color=TEAL)}}
                  onMouseLeave={e=>{(e.currentTarget.style.borderColor="#1E1E1E");(e.currentTarget.style.color="#555")}}>
                  + Schedule one
                </button>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
                {upcomingSessions.slice(0,5).map(s=>{
                  const d=new Date(s.date+"T12:00:00")
                  const label=d.toLocaleDateString("en-US",{month:"short",day:"numeric"})
                  return (
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",background:"rgba(20,20,20,0.6)",border:"0.5px solid #1A1A1A"}}>
                      <div style={{width:3,height:28,background:s.color,flexShrink:0,borderRadius:2}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:500,color:"#F0F0F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title}</div>
                        <div style={{fontSize:9,color:"#555",fontFamily:"monospace"}}>{s.duration_minutes<60?`${s.duration_minutes}min`:`${s.duration_minutes/60}h`}</div>
                      </div>
                      <span style={{fontSize:9,color:"#444",flexShrink:0}}>{label}</span>
                    </div>
                  )
                })}
                {upcomingSessions.length>5&&<div style={{fontSize:9,color:"#444",textAlign:"center"}}>+{upcomingSessions.length-5} more</div>}
              </div>
            )}

            <div style={{height:.5,background:"#1A1A1A",margin:"0 0 9px"}}/>

            {/* Heatmap — 7-row × N-col grid (day rows, week columns) */}
            <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#444",marginBottom:5}}>Study Heatmap · 13 weeks</div>
            <div style={{display:"grid",gridTemplateRows:"repeat(7,1fr)",gridTemplateColumns:`repeat(${heatmapCols},1fr)`,gridAutoFlow:"column",gap:2}}>
              {heatmap.map((cell,i)=>(
                <div key={i} title={cell.date || undefined} style={{aspectRatio:"1",borderRadius:1,
                  background:cell.level==="l4"?TEAL:cell.level==="l3"?"#009988":cell.level==="l2"?"#006B62":cell.level==="l1"?"#003D38":cell.level==="pad"?"transparent":"#141414"
                }}/>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:3,marginBottom:9}}>
              <span style={{fontSize:8,color:"#333"}}>13 wks ago</span>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <span style={{fontSize:8,color:"#333"}}>Less</span>
                {["#141414","#003D38","#006B62","#009988",TEAL].map((c,i)=>(
                  <div key={i} style={{width:7,height:7,borderRadius:1,background:c}}/>
                ))}
                <span style={{fontSize:8,color:"#333"}}>More</span>
              </div>
              <span style={{fontSize:8,color:"#333"}}>Today</span>
            </div>

            <div style={{height:.5,background:"#1A1A1A",margin:"0 0 9px"}}/>

            {/* XP sidebar card */}
            <div style={{...card,borderTop:`2px solid ${GOLD}`,padding:"9px 10px",marginBottom:9}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Level {level} — {tier}</div>
                  <div style={{fontSize:16,fontWeight:700,fontFamily:"monospace",letterSpacing:"-0.02em"}}>{xp.toLocaleString()} XP</div>
                </div>
                <div style={{width:30,height:30,background:"#1A1A1A",border:"1px solid #2A2A2A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{tierEmoji}</div>
              </div>
              <div style={{height:2,background:"#1A1A1A",borderRadius:1,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(.4,xpPct)}%`,background:`linear-gradient(90deg,${GOLD},${TEAL})`,transition:"width .6s"}}/>
              </div>
              <div style={{fontSize:9,color:"#444",marginTop:3,fontFamily:"monospace"}}>{toNext} XP to Level {level+1}</div>
            </div>

            {/* Streak */}
            <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#444",marginBottom:4}}>Streak</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round"><path d="M12 2c0 0-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>
              <span style={{fontSize:12,color:GOLD,fontWeight:600}}>{streak} day{streak!==1?"s":""}</span>
              {streak===0&&<span style={{fontSize:9,color:"#444"}}>Start today</span>}
            </div>

            <div style={{height:.5,background:"#1A1A1A",margin:"0 0 9px"}}/>

            {/* Focus Areas */}
            <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#444",marginBottom:6}}>Focus Areas</div>
            {loading?<div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:9}}>{[1,2].map(i=><div key={i} style={{height:22,background:"#1A1A1A"}}/>)}</div>
            :weak.length===0?<div style={{fontSize:10,color:"#333",marginBottom:9}}>Complete practice to see weak areas</div>
            :<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:9}}>
              {weak.map(a=>(
                <div key={a.subject}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:10,color:"#AAA"}}>{a.subject}</span>
                    <span style={{fontSize:9,color:"#555",fontFamily:"monospace"}}>{a.accuracy}%</span>
                  </div>
                  <div style={{height:2,background:"#1A1A1A"}}>
                    <div style={{height:"100%",width:`${a.accuracy}%`,background:GOLD,transition:"width .6s"}}/>
                  </div>
                </div>
              ))}
            </div>}

            <div style={{height:.5,background:"#1A1A1A",margin:"0 0 9px"}}/>

            {/* Quick Actions */}
            <div style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#444",marginBottom:5}}>Quick Actions</div>
            <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:9}}>
              {SB_BTN("Study Planner","/planner")}
              {SB_BTN("AI Tutor","/ai-tutor")}
              {SB_BTN("Go Pro ↗","/pricing")}
            </div>

            {/* Achievements */}
            <div style={{height:.5,background:"#1A1A1A",margin:"0 0 9px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6}}>
              <Award size={10} color="#555"/>
              <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#444"}}>Achievements</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginBottom:11}}>
              {achievements.map(a=>(
                <div key={a.key} title={a.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 3px",background:a.earned?"#1A1400":"#0D0D0D",border:`0.5px solid ${a.earned?"#2A2000":"#1A1A1A"}`,opacity:a.earned?1:.3,transition:"opacity .3s"}}>
                  <AchievementIcon id={a.emoji} earned={a.earned} />
                  <span style={{fontSize:7,fontWeight:600,color:a.earned?GOLD:"#444",textAlign:"center",lineHeight:1.2}}>{a.label}</span>
                </div>
              ))}
            </div>

            {/* Sign out */}
            <button onClick={async()=>{await supabase.auth.signOut();navigate("/login")}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:5,padding:"6px 8px",background:"transparent",border:"0.5px solid #1E1E1E",color:"#555",fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
              onMouseEnter={e=>{(e.currentTarget.style.borderColor="#E84040");(e.currentTarget.style.color="#E84040")}}
              onMouseLeave={e=>{(e.currentTarget.style.borderColor="#1E1E1E");(e.currentTarget.style.color="#555")}}>
              <LogOut size={10}/>Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Session Modal ── */}
      {showSessionModal && (
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)"}} onClick={()=>setShowSessionModal(false)}/>
          <div style={{position:"relative",width:"100%",maxWidth:400,background:"#0E0E0E",border:"1px solid #252525",padding:20,zIndex:10,display:"flex",flexDirection:"column",gap:14}}>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.04em"}}>Add Study Session</span>
              <button onClick={()=>setShowSessionModal(false)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:4,lineHeight:1}}>
                <X size={14}/>
              </button>
            </div>

            {/* Title */}
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>What are you studying?</div>
              <input autoFocus
                value={sessionTitle} onChange={e=>setSessionTitle(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&saveSession()}
                placeholder="e.g. Chapter 5, Calculus problems..."
                style={{width:"100%",background:"#141414",border:"0.5px solid #252525",color:"#F0F0F0",fontSize:12,padding:"8px 10px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            </div>

            {/* Color */}
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Color</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {SESSION_PALETTE.map(c=>(
                  <button key={c} onClick={()=>setSessionColor(c)}
                    style={{width:18,height:18,borderRadius:"50%",background:c,border:"none",cursor:"pointer",
                      outline:sessionColor===c?`2px solid ${c}`:"none",outlineOffset:2,
                      transform:sessionColor===c?"scale(1.25)":"scale(1)",transition:"transform .15s"}}/>
                ))}
              </div>
            </div>

            {/* Date + Duration */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Date</div>
                <input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}
                  style={{width:"100%",background:"#141414",border:"0.5px solid #252525",color:"#F0F0F0",fontSize:11,padding:"6px 8px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Duration</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {[15,30,45,60,90,120].map(d=>(
                    <button key={d} onClick={()=>setSessionDuration(d)}
                      style={{padding:"3px 7px",fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                        background:sessionDuration===d?sessionColor:"#141414",
                        color:sessionDuration===d?"#fff":"#555",
                        border:`0.5px solid ${sessionDuration===d?sessionColor:"#252525"}`}}>
                      {d<60?`${d}m`:`${d/60}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview */}
            {sessionTitle.trim() && (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`${sessionColor}10`,border:`0.5px solid ${sessionColor}40`}}>
                <div style={{width:3,height:28,background:sessionColor,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:500,color:"#F0F0F0"}}>{sessionTitle}</div>
                  <div style={{fontSize:10,color:"#555",fontFamily:"monospace"}}>{sessionDuration<60?`${sessionDuration}min`:`${sessionDuration/60}h`} · {sessionDate}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowSessionModal(false)}
                style={{flex:1,padding:"8px 0",background:"transparent",border:"0.5px solid #252525",color:"#555",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#555"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525"}}>
                Cancel
              </button>
              <button onClick={saveSession} disabled={!sessionTitle.trim()}
                style={{flex:1,padding:"8px 0",background:sessionTitle.trim()?sessionColor:"#1A1A1A",border:"none",color:sessionTitle.trim()?"#fff":"#333",fontSize:11,fontWeight:600,cursor:sessionTitle.trim()?"pointer":"default",fontFamily:"inherit",transition:"all .2s"}}>
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
