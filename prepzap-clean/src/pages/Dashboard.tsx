import React, { useState, useEffect, useRef, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { TrendingUp, Award, Plus, Check, X, Zap as ZapIcon, LogOut, ChevronDown } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { levelFromXp, xpToNextLevel, xpProgressPercent, tierFromLevel, tierEmojiFromLevel } from "@/lib/xp"

// ─── Theme Types ──────────────────────────────────────────────────────────────
type BgTheme = "pure" | "starfield" | "planets" | "milkyway" | "constellations"

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

    // ── Planets theme data ────────────────────────────────────────────────────
    // orbitR kept ≤ 0.32 so planets never go offscreen; only ONE ring planet (Saturn)
    const PLANET_DEFS = [
      { color: "180,120,60",  ring: true,  r: 26, orbitR: 0.28, orbitY: 0.44, speed: 0.00018, phase: 0.0 },  // Saturn – big, one ring only
      { color: "100,160,220", ring: false, r: 16, orbitR: 0.22, orbitY: 0.60, speed: 0.00028, phase: 1.8 },  // Ice giant
      { color: "220,80,60",   ring: false, r: 12, orbitR: 0.18, orbitY: 0.28, speed: 0.00042, phase: 3.5 },  // Red planet
      { color: "160,200,140", ring: false, r:  9, orbitR: 0.30, orbitY: 0.74, speed: 0.00022, phase: 2.1 },  // Green gas
    ]
    const planets = PLANET_DEFS.map(p => ({ ...p }))
    let planetTick = 0

    // ── Milky Way theme data ───────────────────────────────────────────────────
    const mwStars = Array.from({ length: 500 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.0 + 0.2,
      brightness: Math.random(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.006,
    }))
    let mwAngle = 0

    // ── Constellations theme data ──────────────────────────────────────────────
    let constellationTick = 0
    // Each constellation: array of [x,y] anchor points (0-1 normalized) + edges between indices
    const CONSTELLATIONS = [
      { pts: [[0.12,0.18],[0.19,0.12],[0.26,0.16],[0.31,0.10],[0.24,0.23],[0.17,0.28]], edges: [[0,1],[1,2],[2,3],[2,4],[4,5],[0,4]] },
      { pts: [[0.55,0.08],[0.63,0.14],[0.70,0.09],[0.68,0.22],[0.60,0.26],[0.52,0.20]], edges: [[0,1],[1,2],[1,3],[3,4],[4,5],[5,0]] },
      { pts: [[0.78,0.40],[0.85,0.33],[0.92,0.38],[0.88,0.50],[0.80,0.55],[0.74,0.47]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3]] },
      { pts: [[0.10,0.55],[0.18,0.48],[0.25,0.54],[0.22,0.65],[0.14,0.70],[0.08,0.63]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]] },
      { pts: [[0.42,0.60],[0.50,0.54],[0.58,0.58],[0.55,0.70],[0.48,0.76],[0.40,0.70],[0.44,0.62]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,3],[0,5]] },
      { pts: [[0.28,0.80],[0.36,0.75],[0.44,0.80],[0.40,0.90],[0.32,0.92]], edges: [[0,1],[1,2],[2,3],[3,4],[4,0]] },
      { pts: [[0.68,0.72],[0.76,0.66],[0.84,0.70],[0.82,0.82],[0.72,0.85]], edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,3]] },
    ]
    // Give each star a twinkle phase
    const constStarPhases = CONSTELLATIONS.map(c => c.pts.map(() => Math.random() * Math.PI * 2))
    // Moving "shooting" star particles
    const shooters = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random(), y: Math.random() * 0.5,
      vx: 0.0012 + Math.random() * 0.0008, vy: 0.0006 + Math.random() * 0.0004,
      tail: 0.06 + Math.random() * 0.04, alpha: 0, life: Math.random() * 300, maxLife: 200 + Math.random() * 200
    }))

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

      if (t === "planets") {
        planetTick++
        // Background dust stars
        for (const s of stars) {
          s.phase += s.speed * 0.3
          const a = (Math.sin(s.phase) + 1) * 0.25 + 0.05
          ctx.beginPath()
          ctx.arc(s.x * W, s.y * H, s.r * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(220,220,255,${a})`
          ctx.fill()
        }
        // Draw each planet orbiting
        for (const p of planets) {
          const angle = planetTick * p.speed + p.phase
          const px = W / 2 + Math.cos(angle) * p.orbitR * W
          const py = p.orbitY * H + Math.sin(angle) * p.orbitR * W * 0.18
          // Planet body glow
          const glow = ctx.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, p.r * 0.1, px, py, p.r * 1.8)
          glow.addColorStop(0, `rgba(${p.color},0.15)`)
          glow.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(px, py, p.r * 1.8, 0, Math.PI * 2)
          ctx.fill()
          // Planet body
          const grad = ctx.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, 0, px, py, p.r)
          grad.addColorStop(0, `rgba(${p.color},0.95)`)
          grad.addColorStop(0.6, `rgba(${p.color},0.7)`)
          grad.addColorStop(1, `rgba(0,0,0,0.6)`)
          ctx.beginPath()
          ctx.arc(px, py, p.r, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()
          // Saturn-style ring
          if (p.ring) {
            ctx.save()
            ctx.translate(px, py)
            ctx.scale(1, 0.28)
            ctx.beginPath()
            ctx.arc(0, 0, p.r * 1.9, 0, Math.PI * 2)
            ctx.lineWidth = p.r * 0.45
            ctx.strokeStyle = `rgba(${p.color},0.35)`
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      if (t === "milkyway") {
        mwAngle += 0.0003
        const cx = W / 2, cy = H / 2
        // Galactic core glow — much brighter
        const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45)
        coreGlow.addColorStop(0, "rgba(255,240,200,0.45)")
        coreGlow.addColorStop(0.3, "rgba(220,160,80,0.22)")
        coreGlow.addColorStop(0.7, "rgba(100,60,160,0.10)")
        coreGlow.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = coreGlow
        ctx.fillRect(0, 0, W, H)
        // Rotating star field — boosted alpha
        for (const s of mwStars) {
          s.phase += s.speed
          const distFromCenter = Math.sqrt((s.x - 0.5) ** 2 + (s.y - 0.5) ** 2)
          const warmth = Math.max(0, 1 - distFromCenter * 2.5)
          const r = Math.round(200 + warmth * 55)
          const g2 = Math.round(200 + warmth * 30)
          const b2 = Math.round(220 - warmth * 80)
          const dx = (s.x - 0.5) * W, dy = (s.y - 0.5) * H
          const rotX = cx + dx * Math.cos(mwAngle) - dy * Math.sin(mwAngle)
          const rotY = cy + dx * Math.sin(mwAngle) + dy * Math.cos(mwAngle)
          const twinkle = (Math.sin(s.phase) + 1) * 0.4 + 0.25  // raised floor
          const a = twinkle * (0.5 + s.brightness * 0.5)          // much brighter
          const bandDist = Math.abs((s.x - 0.5) * Math.cos(0.4) - (s.y - 0.5) * Math.sin(0.4))
          const bandBoost = Math.max(0, 1 - bandDist * 3.5)
          if (Math.random() < 0.001 && bandBoost < 0.1) continue
          ctx.beginPath()
          ctx.arc(rotX, rotY, s.r * (1 + bandBoost * 0.8), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g2},${b2},${Math.min(1, a * (0.8 + bandBoost * 0.8))})`
          ctx.fill()
        }
        // Arm nebulosity overlay — brighter purples/blues
        const armColors = ["80,60,180", "120,50,160", "60,80,200"]
        for (let i = 0; i < 3; i++) {
          const armAngle = mwAngle * 0.5 + (i * Math.PI * 2) / 3
          const armX = cx + Math.cos(armAngle) * W * 0.22
          const armY = cy + Math.sin(armAngle) * H * 0.22
          const armG = ctx.createRadialGradient(armX, armY, 0, armX, armY, W * 0.30)
          armG.addColorStop(0, `rgba(${armColors[i]},0.14)`)
          armG.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = armG
          ctx.fillRect(0, 0, W, H)
        }
      }

      if (t === "constellations") {
        constellationTick++
        // Faint background stars
        for (const s of stars) {
          s.phase += s.speed * 0.4
          const a = (Math.sin(s.phase) + 1) * 0.2 + 0.04
          ctx.beginPath()
          ctx.arc(s.x * W, s.y * H, s.r * 0.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,210,255,${a})`
          ctx.fill()
        }
        // Draw each constellation
        CONSTELLATIONS.forEach((con, ci) => {
          const drift = constellationTick * 0.00006 * (ci % 2 === 0 ? 1 : -1)
          const floatY = Math.sin(constellationTick * 0.001 + ci * 1.3) * 0.012
          const pts = con.pts.map(([px, py]) => [px * W + drift * W, (py + floatY) * H])
          // Draw edges
          for (const [a, b] of con.edges) {
            const lineAlpha = 0.18 + Math.sin(constellationTick * 0.008 + ci) * 0.06
            ctx.beginPath()
            ctx.moveTo(pts[a][0], pts[a][1])
            ctx.lineTo(pts[b][0], pts[b][1])
            ctx.strokeStyle = `rgba(150,200,255,${lineAlpha})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
          // Draw stars at vertices
          pts.forEach(([sx, sy], si) => {
            constStarPhases[ci][si] += 0.022
            const ta = (Math.sin(constStarPhases[ci][si]) + 1) * 0.45 + 0.3
            const sr = 1.8 + Math.sin(constStarPhases[ci][si] * 0.7) * 0.5
            // Glow
            const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4)
            sg.addColorStop(0, `rgba(180,220,255,${ta * 0.5})`)
            sg.addColorStop(1, "rgba(0,0,0,0)")
            ctx.fillStyle = sg
            ctx.beginPath()
            ctx.arc(sx, sy, sr * 4, 0, Math.PI * 2)
            ctx.fill()
            // Star dot
            ctx.beginPath()
            ctx.arc(sx, sy, sr, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(220,240,255,${ta})`
            ctx.fill()
          })
        })
        // Shooting stars
        for (const sh of shooters) {
          sh.life++
          if (sh.life > sh.maxLife) {
            sh.x = Math.random() * 0.6; sh.y = Math.random() * 0.4
            sh.life = 0; sh.maxLife = 200 + Math.random() * 300
          }
          const progress = sh.life / sh.maxLife
          sh.alpha = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) * 6.67 : 1
          const ex = sh.x * W, ey = sh.y * H
          const tx2 = ex - sh.tail * W * sh.vx * 80, ty2 = ey - sh.tail * H * sh.vy * 80
          sh.x += sh.vx; sh.y += sh.vy
          const grad = ctx.createLinearGradient(tx2, ty2, ex, ey)
          grad.addColorStop(0, "rgba(200,230,255,0)")
          grad.addColorStop(1, `rgba(255,255,255,${sh.alpha * 0.8})`)
          ctx.beginPath()
          ctx.moveTo(tx2, ty2)
          ctx.lineTo(ex, ey)
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.2
          ctx.stroke()
        }
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
    planets: "Planets",
    milkyway: "Milky Way",
    constellations: "Constellations"
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
      if (id==="planets"){
        // Mini planet orbiting
        const px2=W/2+Math.cos(pl*0.0008)*W*0.3, py2=H/2+Math.sin(pl*0.0008)*H*0.12
        const pg=ctx.createRadialGradient(px2,py2,0,px2,py2,8);pg.addColorStop(0,"rgba(180,120,60,0.9)");pg.addColorStop(1,"rgba(0,0,0,0.5)");ctx.beginPath();ctx.arc(px2,py2,8,0,Math.PI*2);ctx.fillStyle=pg;ctx.fill()
        const px3=W/2+Math.cos(pl*0.0014+2)*W*0.2, py3=H/2+Math.sin(pl*0.0014+2)*H*0.1
        const pg2=ctx.createRadialGradient(px3,py3,0,px3,py3,5);pg2.addColorStop(0,"rgba(100,160,220,0.9)");pg2.addColorStop(1,"rgba(0,0,0,0.5)");ctx.beginPath();ctx.arc(px3,py3,5,0,Math.PI*2);ctx.fillStyle=pg2;ctx.fill()
        pl+=pd2*20
      }
      if (id==="milkyway"){
        pl+=0.001
        CL.forEach(c=>{c.x+=c.dx;c.y+=c.dy;if(c.x<-5)c.x=W+5;if(c.x>W+5)c.x=-5;const dx=c.x-W/2,dy=c.y-H/2;const rx2=W/2+dx*Math.cos(pl)-dy*Math.sin(pl),ry2=H/2+dx*Math.sin(pl)+dy*Math.cos(pl);c.ph+=c.sp;const a=(Math.sin(c.ph)+1)*0.3+0.1;const wm=Math.max(0,1-Math.abs((c.x/W-0.5)*Math.cos(0.4)-(c.y/H-0.5)*Math.sin(0.4))*4);const g=ctx.createRadialGradient(rx2,ry2,0,rx2,ry2,c.r*(1+wm));g.addColorStop(0,`rgba(220,200,160,${a*(0.5+wm*0.8)})`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(rx2,ry2,c.r*(1+wm),0,Math.PI*2);ctx.fill()})
        SS.forEach(s=>{s.ph+=s.sp;const a=(Math.sin(s.ph)+1)*0.3+0.1;const dx=s.x-W/2,dy=s.y-H/2;const rx2=W/2+dx*Math.cos(pl)-dy*Math.sin(pl),ry2=H/2+dx*Math.sin(pl)+dy*Math.cos(pl);ctx.beginPath();ctx.arc(rx2,ry2,s.r*0.7,0,Math.PI*2);ctx.fillStyle=`rgba(220,210,180,${a})`;ctx.fill()})
      }
      if (id==="cosmos"){
        pl+=pd2*0.8
        ctx.save();ctx.translate(W/2,H/2)
        const rings2=[{r:8,color:"0,196,180",sp:0.02},{r:14,color:"120,60,220",sp:0.015},{r:20,color:"220,120,60",sp:0.01}]
        rings2.forEach((rg,i)=>{const a2=pl*rg.sp+i;ctx.save();ctx.rotate(a2);ctx.scale(1,0.35);ctx.beginPath();ctx.arc(0,0,rg.r,0,Math.PI*2);ctx.strokeStyle=`rgba(${rg.color},0.5)`;ctx.lineWidth=1.5;ctx.stroke();ctx.restore()})
        const sg=ctx.createRadialGradient(0,0,0,0,0,5);sg.addColorStop(0,"rgba(255,255,255,0.8)");sg.addColorStop(0.5,"rgba(0,196,180,0.4)");sg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=sg;ctx.fillRect(-5,-5,10,10)
        ctx.restore()
      }
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
  const localDateStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
  const [sessionDate,     setSessionDate]     = useState(() => localDateStr())
  const [sessionDuration, setSessionDuration] = useState(30)
  const openSessionModal = (date?: string) => {
    setSessionTitle(""); setSessionColor(SESSION_PALETTE[0])
    setSessionDate(date ?? localDateStr())
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

  // ── Session edit state ──
  const [editSession, setEditSession] = useState<{id:string;title:string;date:string;duration_minutes:number;color:string}|null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editDuration, setEditDuration] = useState(30)
  const openEdit = (s: typeof editSession) => {
    if (!s) return
    setEditSession(s); setEditTitle(s.title); setEditColor(s.color); setEditDate(s.date); setEditDuration(s.duration_minutes)
  }
  const saveEdit = async () => {
    if (!editSession || !editTitle.trim()) return
    await supabase.from("study_sessions").update({ title:editTitle.trim(), color:editColor, date:editDate, duration_minutes:editDuration }).eq("id", editSession.id)
    const updated = { ...editSession, title:editTitle.trim(), color:editColor, date:editDate, duration_minutes:editDuration }
    setCalSessions(prev => prev.map(s => s.id===editSession.id ? updated : s))
    const todayL = localDateStr()
    setUpcomingSessions(prev => prev.map(s => s.id===editSession.id ? updated : s).filter(s=>s.date>=todayL).sort((a,b)=>a.date.localeCompare(b.date)))
    setEditSession(null)
  }
  const deleteSession = async (id: string) => {
    await supabase.from("study_sessions").delete().eq("id", id)
    setCalSessions(prev => prev.filter(s => s.id !== id))
    setUpcomingSessions(prev => prev.filter(s => s.id !== id))
  }
  const [calSessionsCollapsed, setCalSessionsCollapsed] = useState(false)
  const [upcomingCollapsed, setUpcomingCollapsed] = useState(false)

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
        const _d=new Date(), _ld=`${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`
        const today=_ld
        const _w=new Date(_d); _w.setDate(_w.getDate()-7)
        const weekAgo=`${_w.getFullYear()}-${String(_w.getMonth()+1).padStart(2,"0")}-${String(_w.getDate()).padStart(2,"0")}`
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
          {(["pure","starfield","planets","milkyway","cosmos"] as BgTheme[]).map(id=>(
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

            {/* Calendar + Sessions — same 2-col layout as before */}
            {(()=>{
              const today = new Date()
              const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`
              const firstDay = new Date(calYear, calMonth, 1).getDay()
              const daysInMonth = new Date(calYear, calMonth+1, 0).getDate()
              const monthLabel = new Date(calYear, calMonth).toLocaleString("default",{month:"long",year:"numeric"})
              const sessByDate: Record<string, typeof calSessions> = {}
              calSessions.forEach(s => { if(!sessByDate[s.date])sessByDate[s.date]=[]; sessByDate[s.date].push(s) })
              const selectedSessions = calSelectedDate ? (sessByDate[calSelectedDate]??[]) : []
              const prevMonth=()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else{setCalMonth(m=>m-1)} }
              const nextMonth=()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else{setCalMonth(m=>m+1)} }

              return (
                <div className="sdn-cal-row" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
                  {/* Left — compact calendar */}
                  <div style={{...card,padding:12}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.04em"}}>{monthLabel}</span>
                      <div style={{display:"flex",gap:3}}>
                        <button onClick={prevMonth} style={{width:19,height:19,border:"0.5px solid #2A2A2A",background:"transparent",color:"#555",cursor:"pointer",fontSize:12,borderRadius:3,lineHeight:1}}>‹</button>
                        <button onClick={nextMonth} style={{width:19,height:19,border:"0.5px solid #2A2A2A",background:"transparent",color:"#555",cursor:"pointer",fontSize:12,borderRadius:3,lineHeight:1}}>›</button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,textAlign:"center"}}>
                      {["M","T","W","T","F","S","S"].map((d,i)=><div key={i} style={{fontSize:8,color:"#444",padding:"2px 0",textTransform:"uppercase"}}>{d}</div>)}
                      {Array(firstDay===0?6:firstDay-1).fill(null).map((_,i)=><div key={"pad"+i}/>)}
                      {Array.from({length:daysInMonth},(_,i)=>{
                        const day=i+1
                        const dateStr=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
                        const isToday=dateStr===todayStr
                        const isSelected=dateStr===calSelectedDate
                        const dotColors=sessByDate[dateStr]?.slice(0,3).map(s=>s.color)??[]
                        return (
                          <div key={day} onClick={()=>setCalSelectedDate(isSelected?null:dateStr)}
                            style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:10,padding:"3px 1px",borderRadius:3,cursor:"pointer",
                              color:isSelected?TEAL:isToday?"#0A0A0A":"#555",
                              background:isSelected?"rgba(0,196,180,0.18)":isToday?GOLD:"transparent",
                              fontWeight:isToday||isSelected?700:400,transition:"all .15s"}}
                            onMouseEnter={e=>{if(!isToday&&!isSelected)(e.currentTarget as HTMLElement).style.color="#F0F0F0"}}
                            onMouseLeave={e=>{if(!isToday&&!isSelected)(e.currentTarget as HTMLElement).style.color="#555"}}>
                            {day}
                            {dotColors.length>0&&(
                              <div style={{display:"flex",gap:1,marginTop:1}}>
                                {dotColors.map((c,ci)=><div key={ci} style={{width:3,height:3,borderRadius:"50%",background:isToday?"rgba(0,0,0,0.5)":c}}/>)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right — selected day sessions (or today if nothing selected) */}
                  <div style={{...card,padding:12}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                      <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:"#555"}}>
                        {calSelectedDate
                          ? new Date(calSelectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})
                          : new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                      </div>
                      {selectedSessions.length>0&&(
                        <button onClick={()=>setCalSessionsCollapsed(c=>!c)}
                          style={{background:"none",border:"none",color:"#444",fontSize:9,cursor:"pointer",padding:"0 2px",letterSpacing:"0.06em",fontFamily:"inherit",transition:"color .15s"}}
                          onMouseEnter={e=>(e.currentTarget.style.color=TEAL)} onMouseLeave={e=>(e.currentTarget.style.color="#444")}>
                          {calSessionsCollapsed?`show (${selectedSessions.length})`:"hide"}
                        </button>
                      )}
                    </div>
                    {selectedSessions.length===0?(
                      <div style={{textAlign:"center",paddingTop:10}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:"#141414",border:"0.5px solid #222",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 7px"}}>
                          <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="#444" strokeWidth={1.5} strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                        <div style={{fontSize:10,color:"#333",marginBottom:8}}>No sessions — add one!</div>
                        <button onClick={()=>openSessionModal(calSelectedDate??todayStr)}
                          style={{background:"transparent",border:"0.5px solid #2A2A2A",color:"#555",fontSize:10,padding:"5px 11px",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
                          onMouseEnter={e=>{(e.currentTarget.style.borderColor=TEAL);(e.currentTarget.style.color=TEAL)}}
                          onMouseLeave={e=>{(e.currentTarget.style.borderColor="#2A2A2A");(e.currentTarget.style.color="#555")}}>
                          + Add Session
                        </button>
                      </div>
                    ):!calSessionsCollapsed?(
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {selectedSessions.map(s=>(
                          <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"rgba(20,20,20,0.7)",border:"0.5px solid #1E1E1E"}}>
                            <div style={{width:3,alignSelf:"stretch",background:s.color,flexShrink:0,borderRadius:2}}/>
                            <div style={{flex:1}}>
                              <div style={{fontSize:11,fontWeight:500,color:"#F0F0F0"}}>{s.title}</div>
                              <div style={{fontSize:9,color:"#555",fontFamily:"monospace"}}>{s.duration_minutes<60?`${s.duration_minutes}min`:`${s.duration_minutes/60}h`}</div>
                            </div>
                            {/* Edit */}
                            <button onClick={()=>openEdit(s)} title="Edit"
                              style={{background:"none",border:"none",cursor:"pointer",color:"#333",padding:"2px 3px",lineHeight:1,transition:"color .15s"}}
                              onMouseEnter={e=>(e.currentTarget.style.color=TEAL)} onMouseLeave={e=>(e.currentTarget.style.color="#333")}>
                              <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            {/* Delete */}
                            <button onClick={()=>deleteSession(s.id)} title="Remove"
                              style={{background:"none",border:"none",cursor:"pointer",color:"#333",padding:"2px 3px",lineHeight:1,transition:"color .15s"}}
                              onMouseEnter={e=>(e.currentTarget.style.color="#E84040")} onMouseLeave={e=>(e.currentTarget.style.color="#333")}>
                              <X size={10}/>
                            </button>
                          </div>
                        ))}
                        <button onClick={()=>openSessionModal(calSelectedDate??todayStr)}
                          style={{marginTop:2,background:"transparent",border:"0.5px solid #1E1E1E",color:"#444",fontSize:9,padding:"3px 0",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
                          onMouseEnter={e=>{(e.currentTarget.style.borderColor=TEAL);(e.currentTarget.style.color=TEAL)}}
                          onMouseLeave={e=>{(e.currentTarget.style.borderColor="#1E1E1E");(e.currentTarget.style.color="#444")}}>
                          + Add another
                        </button>
                      </div>
                    ):null}
                  </div>
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

            {/* Upcoming — styled like Image 5 */}
            <div style={{marginBottom:11}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}>
                <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke={GOLD} strokeWidth={1.7} strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                <span style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",flex:1}}>Upcoming</span>
                {upcomingSessions.length>0&&(
                  <button onClick={()=>setUpcomingCollapsed(c=>!c)}
                    style={{background:"none",border:"none",color:"#444",fontSize:8,cursor:"pointer",padding:0,letterSpacing:"0.06em",fontFamily:"inherit",transition:"color .15s"}}
                    onMouseEnter={e=>(e.currentTarget.style.color=TEAL)} onMouseLeave={e=>(e.currentTarget.style.color="#444")}>
                    {upcomingCollapsed?`show (${upcomingSessions.length})`:"hide"}
                  </button>
                )}
              </div>
              {upcomingSessions.length===0?(
                <div style={{fontSize:10,color:"#333",padding:"4px 0 6px"}}>No upcoming sessions</div>
              ):!upcomingCollapsed?(
                <div style={{display:"flex",flexDirection:"column",gap:0}}>
                  {upcomingSessions.map(s=>{
                    const d=new Date(s.date+"T12:00:00")
                    const label=d.toLocaleDateString("en-US",{month:"short",day:"numeric"})
                    return (
                      <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderBottom:"0.5px solid #141414"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
                          <div style={{width:7,height:7,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                          <span style={{fontSize:10,color:"#CCC",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{s.title}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0,marginLeft:4}}>
                          <span style={{fontSize:9,color:"#444"}}>{label}</span>
                          {/* Edit */}
                          <button onClick={()=>openEdit(s)} title="Edit"
                            style={{background:"none",border:"none",cursor:"pointer",color:"#333",padding:"1px 2px",lineHeight:1,transition:"color .15s"}}
                            onMouseEnter={e=>(e.currentTarget.style.color=TEAL)} onMouseLeave={e=>(e.currentTarget.style.color="#333")}>
                            <svg viewBox="0 0 24 24" width={9} height={9} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          {/* Delete */}
                          <button onClick={()=>deleteSession(s.id)} title="Remove"
                            style={{background:"none",border:"none",cursor:"pointer",color:"#333",padding:"1px 2px",lineHeight:1,transition:"color .15s"}}
                            onMouseEnter={e=>(e.currentTarget.style.color="#E84040")} onMouseLeave={e=>(e.currentTarget.style.color="#333")}>
                            <X size={9}/>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ):null}
            </div>

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

      {/* ── Edit Session Modal ── */}
      {editSession && (
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)"}} onClick={()=>setEditSession(null)}/>
          <div style={{position:"relative",width:"100%",maxWidth:400,background:"#0E0E0E",border:"1px solid #252525",padding:20,zIndex:10,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.04em"}}>Edit Session</span>
              <button onClick={()=>setEditSession(null)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",padding:4}}><X size={14}/></button>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Title</div>
              <input autoFocus value={editTitle} onChange={e=>setEditTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveEdit()}
                style={{width:"100%",background:"#141414",border:"0.5px solid #252525",color:"#F0F0F0",fontSize:12,padding:"8px 10px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Color</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {SESSION_PALETTE.map(c=>(
                  <button key={c} onClick={()=>setEditColor(c)}
                    style={{width:18,height:18,borderRadius:"50%",background:c,border:"none",cursor:"pointer",
                      outline:editColor===c?`2px solid ${c}`:"none",outlineOffset:2,
                      transform:editColor===c?"scale(1.25)":"scale(1)",transition:"transform .15s"}}/>
                ))}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Date</div>
                <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)}
                  style={{width:"100%",background:"#141414",border:"0.5px solid #252525",color:"#F0F0F0",fontSize:11,padding:"6px 8px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555",marginBottom:5}}>Duration</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {[15,30,45,60,90,120].map(d=>(
                    <button key={d} onClick={()=>setEditDuration(d)}
                      style={{padding:"3px 7px",fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                        background:editDuration===d?editColor:"#141414",
                        color:editDuration===d?"#fff":"#555",
                        border:`0.5px solid ${editDuration===d?editColor:"#252525"}`}}>
                      {d<60?`${d}m`:`${d/60}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{ deleteSession(editSession.id); setEditSession(null) }}
                style={{padding:"8px 12px",background:"transparent",border:"0.5px solid #3A1A1A",color:"#E84040",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#1A0808"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
                Delete
              </button>
              <button onClick={()=>setEditSession(null)}
                style={{flex:1,padding:"8px 0",background:"transparent",border:"0.5px solid #252525",color:"#555",fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#555"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#252525"}}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={!editTitle.trim()}
                style={{flex:1,padding:"8px 0",background:editTitle.trim()?editColor:"#1A1A1A",border:"none",color:editTitle.trim()?"#fff":"#333",fontSize:11,fontWeight:600,cursor:editTitle.trim()?"pointer":"default",fontFamily:"inherit",transition:"all .2s"}}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
