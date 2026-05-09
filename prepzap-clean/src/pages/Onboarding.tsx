import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

// ─── Design tokens (fox warm theme) ───────────────────────────────────────────
const GOLD  = "#f0a040"
const TEAL  = "#8b1a2a"
const BG    = "#160810"
const SURF  = "#1f0b13"
const SURF2 = "#2a0e18"
const BORD  = "rgba(139,26,42,0.35)"
const TEXT1 = "#f5ede8"
const TEXT2 = "rgba(245,237,232,0.55)"
const TEXT3 = "rgba(245,237,232,0.28)"

// ─── Data ─────────────────────────────────────────────────────────────────────

const GOALS = [
  { id:"exams",    icon:"📝", label:"Ace my exams" },
  { id:"habits",   icon:"📅", label:"Build study habits" },
  { id:"concepts", icon:"💡", label:"Master tough concepts" },
  { id:"speed",    icon:"⚡", label:"Study faster & smarter" },
  { id:"career",   icon:"🎓", label:"Prep for a career/license" },
  { id:"fun",      icon:"🔥", label:"Learn for fun" },
]

const LEVELS = [
  { id:"hs",   label:"High School" },
  { id:"col",  label:"College / University" },
  { id:"grad", label:"Graduate / Post-grad" },
  { id:"pro",  label:"Professional / Self-study" },
]

// ─── SVG Mascot Helper ────────────────────────────────────────────────────────
function Mascot({ pose }: { pose: "curious" | "waving" | "thinking" | "excited" | "celebrating" }) {
  // A stylized, inline SVG fox mascot.
  // Poses change subtly based on the prop to give it personality.
  const yOffset = pose === "excited" || pose === "celebrating" ? -5 : 0;
  const rotation = pose === "curious" ? 10 : pose === "thinking" ? -10 : 0;
  const eyeScale = pose === "excited" || pose === "celebrating" ? 1.2 : 1;
  const armRot = pose === "waving" ? -30 : pose === "celebrating" ? -150 : 20;

  return (
    <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: `translateY(${yOffset}px) rotate(${rotation}deg)`, transition: "all 0.3s ease-out" }}>
      <g stroke={BORD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Tail */}
        <path d="M 30,70 Q 10,80 15,50 Q 25,60 35,65" fill={GOLD} />
        <path d="M 15,50 Q 10,40 25,45" fill="#fff" />
        {/* Body */}
        <path d="M 35,80 C 35,50 65,50 65,80 Z" fill={GOLD} />
        <path d="M 40,80 C 40,60 60,60 60,80 Z" fill="#fff" stroke="none" />
        {/* Head */}
        <polygon points="25,25 35,45 45,35" fill={GOLD} />
        <polygon points="75,25 65,45 55,35" fill={GOLD} />
        <path d="M 30,50 Q 50,25 70,50 Q 50,75 30,50" fill={GOLD} />
        {/* Face details */}
        <circle cx="42" cy="48" r={3 * eyeScale} fill="#000" />
        <circle cx="58" cy="48" r={3 * eyeScale} fill="#000" />
        <circle cx="50" cy="55" r="2.5" fill="#000" />
        {/* Arms */}
        <g transform={`translate(35, 65) rotate(${-armRot})`}>
           <path d="M 0,0 L -10,15" stroke={GOLD} strokeWidth="6" />
        </g>
        <g transform={`translate(65, 65) rotate(${armRot})`}>
           <path d="M 0,0 L 10,15" stroke={GOLD} strokeWidth="6" />
        </g>
      </g>
    </svg>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────
function ProgressBar({ total, current }: { total: number; current: number }) {
  const percent = total > 1 ? (current / (total - 1)) * 100 : 100;
  return (
    <div style={{ width: "100%", height: 6, background: BORD, borderRadius: 3, position: "relative", marginBottom: 20 }}>
      <div style={{ width: `${percent}%`, height: "100%", background: GOLD, borderRadius: 3, transition: "width 0.4s ease-out" }} />
      <div style={{
        position: "absolute", top: -8, left: `calc(${percent}% - 10px)`, width: 20, height: 20,
        transition: "left 0.4s ease-out", display: "flex", alignItems: "center", justifyContent: "center"
      }}>
         <svg width="16" height="16" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill={GOLD} /><circle cx="50" cy="50" r="10" fill="#000" /></svg>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  // Steps: 0=Welcome, 1=Name, 2=Level, 3=Goals, 4=Avatar
  const [step, setStep] = useState(0)
  const TOTAL = 5

  const [name, setName] = useState("")
  const [level, setLevel] = useState("")
  const [goals, setGoals] = useState<string[]>([])

  const [saving, setSaving] = useState(false)

  // Pre-fill if we have profile data
  useEffect(() => {
    if (profile?.full_name) {
      setName(profile.full_name)
    }
  }, [profile])

  const toggleArr = (arr: string[], item: string, set: (a: string[]) => void) => {
    if (arr.includes(item)) set(arr.filter(x => x !== item))
    else set([...arr, item])
  }

  const canNext = () => {
    if (step === 0) return true
    if (step === 1) return name.trim().length > 1
    if (step === 2) return level !== ""
    if (step === 3) return goals.length > 0
    if (step === 4) return true // Avatar step always can next (it saves and finishes)
    return false
  }

  const handleNext = async () => {
    if (!canNext() || saving) return

    if (step < TOTAL - 1) {
      setStep(s => s + 1)
      return
    }

    // Step 4 (Avatar) acts as the submit step in this structure
    // but the Avatar page itself will handle the complex layer saving.
    // We just mark onboarding as done or save basic metadata.
    setSaving(true)
    try {
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: name.trim(),
          // storing level/goals loosely if you have columns or inside metadata
        })

        await supabase.auth.updateUser({
          data: {
            full_name: name.trim(),
            onboarding_complete: true,
            level,
            goals,
          }
        })

        await refreshProfile()
      }
      navigate("/avatar")
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const getPose = () => {
    switch(step) {
      case 0: return "curious";
      case 1: return "waving";
      case 2: return "thinking";
      case 3: return "excited";
      case 4: return "celebrating";
      default: return "curious";
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: TEXT1,
      fontFamily: "'Nunito', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20
    }}>

      <div style={{
        width: "100%", maxWidth: 440,
        display: "flex", flexDirection: "column",
      }}>

        {step > 0 && <ProgressBar total={TOTAL} current={step} />}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Mascot pose={getPose()} />
        </div>

        <div style={{
          background: SURF, border: `1.5px solid ${BORD}`,
          borderRadius: 16, padding: "32px 24px",
          display: "flex", flexDirection: "column", gap: 24,
          boxShadow: `0 8px 32px ${BG}`, position: "relative",
          animation: "fadeIn 0.3s ease-out"
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                Welcome
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: "-0.01em", fontFamily: "'Fredoka One', cursive", color: GOLD }}>
                Enter Studenius
              </h1>
              <p style={{ fontSize: 14, color: TEXT2, marginTop: 12, lineHeight: 1.5 }}>
                A world built for learning. Let's set up your profile and craft your study companion so you can start conquering your goals.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
                <span style={{ background: SURF2, padding: "6px 12px", borderRadius: 20, fontSize: 11, color: GOLD, border: `1px solid ${BORD}` }}>🦊 AI Tools</span>
                <span style={{ background: SURF2, padding: "6px 12px", borderRadius: 20, fontSize: 11, color: GOLD, border: `1px solid ${BORD}` }}>✨ Avatars</span>
              </div>
            </div>
          )}

          {/* ── STEP 1: Name ── */}
          {step === 1 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 1 of 4
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What should we call you?
                </h2>
              </div>
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleNext()}
                  placeholder="e.g. Alex, Mika, Rey..."
                  maxLength={32}
                  style={{ width:"100%", background:SURF2, border:`1px solid ${BORD}`,
                    color:TEXT1, fontSize:15, padding:"12px 14px", fontFamily:"inherit",
                    outline:"none", boxSizing:"border-box", letterSpacing:"0.01em", borderRadius: 8,
                    transition:"border-color .2s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                  onBlur={e  => { e.currentTarget.style.borderColor = BORD }}
                />
              </div>
            </>
          )}

          {/* ── STEP 2: Level ── */}
          {step === 2 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 2 of 4
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What's your level?
                </h2>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {LEVELS.map(l => (
                  <button key={l.id} onClick={() => setLevel(l.id)} style={{
                    padding:"14px 16px", textAlign:"left", cursor:"pointer",
                    borderRadius: 10,
                    background: level === l.id ? "rgba(240,160,64,0.12)" : SURF,
                    border: `1.5px solid ${level === l.id ? GOLD : BORD}`,
                    color: level === l.id ? TEXT1 : TEXT2,
                    fontSize:13, fontWeight: level === l.id ? 700 : 400,
                    fontFamily:"inherit", transition:"all .15s",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                  }}>
                    {l.label}
                    {level === l.id && (
                      <span style={{ color:GOLD, fontSize:11 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STEP 3: Goals ── */}
          {step === 3 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 3 of 4
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What's your main goal?
                </h2>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {GOALS.map(g => {
                  const on = goals.includes(g.id)
                  return (
                    <button key={g.id} onClick={() => toggleArr(goals, g.id, setGoals)} style={{
                      padding:"13px 16px", textAlign:"left", cursor:"pointer",
                      background: on ? `${GOLD}0D` : SURF,
                      border: `1.5px solid ${on ? GOLD : BORD}`, borderRadius: 10,
                      color: on ? TEXT1 : TEXT2,
                      fontSize:13, fontWeight: on ? 600 : 400,
                      fontFamily:"inherit", transition:"all .15s",
                      display:"flex", alignItems:"center", gap:12,
                    }}>
                      <span style={{ fontSize:17 }}>{g.icon}</span>
                      {g.label}
                      {on && <span style={{ marginLeft:"auto", color:GOLD, fontSize:11 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* ── STEP 4: Avatar Creator Intro ── */}
          {step === 4 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                Step 4 of 4
              </div>
              <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive", color: GOLD }}>
                Create Your Avatar
              </h2>
              <p style={{ fontSize:14, color:TEXT2, marginTop:12, marginBottom:20 }}>
                Next, you'll design your study companion in the Avatar Studio.
              </p>
            </div>
          )}

        </div>

        {/* ── Nav buttons ── */}
        <div style={{ display:"flex", gap:10, marginTop:28 }}>
          {step > 0 && (
            <button onClick={handleBack} style={{
              padding:"13px 0", width:52, background:"transparent",
              border:`1px solid ${BORD}`, color: TEXT2, fontSize:16,
              cursor:"pointer", fontFamily:"inherit", transition:"all .2s", borderRadius: 8
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORD; e.currentTarget.style.color = TEXT2; }}>
              ←
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canNext() || saving}
            style={{
              flex:1, padding:"13px 0", borderRadius: 8,
              background: canNext() ? GOLD : SURF2,
              border:"none",
              color: canNext() ? "#000" : TEXT3,
              fontSize:13, fontWeight:700, letterSpacing:"0.05em",
              cursor: canNext() ? "pointer" : "default",
              fontFamily:"inherit", transition:"all .2s",
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? "Saving..." : step === TOTAL-1 ? "To Avatar Studio →" : step === 0 ? "Get Started →" : "Continue →"}
          </button>
        </div>

      </div>
    </div>
  )
}
