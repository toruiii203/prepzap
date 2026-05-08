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
const AVATARS = ["🧠","⚡","🎯","🔬","📐","🦅","🐉","🌌","🏆","⚔️","🎲","🔭"]

const SUBJECTS = [
  "Mathematics","Physics","Chemistry","Biology",
  "History","Literature","Computer Science","Economics",
  "Psychology","Philosophy","Engineering","Medicine",
  "Law","Accounting","Political Science","Languages",
]

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

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6,
          background: i === current ? TEAL : i < current ? TEAL+"55" : BORD,
          transition: "all 0.3s ease",
        }}/>
      ))}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [step,      setStep]      = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [checking,  setChecking]  = useState(true)

  // ── Skip if already onboarded ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setChecking(false); return }
    supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarded) navigate("/dashboard", { replace: true })
        else setChecking(false)
      })
  }, [navigate, user])

  // step 0 — welcome (no input)
  // step 1 — name
  const [name,      setName]      = useState("")
  // step 2 — avatar
  const [avatar,    setAvatar]    = useState("🧠")
  // step 3 — level
  const [level,     setLevel]     = useState("")
  // step 4 — subjects
  const [subjects,  setSubjects]  = useState<string[]>([])
  // step 5 — goals
  const [goals,     setGoals]     = useState<string[]>([])

  const TOTAL = 6 // steps 0–5

  const canNext = () => {
    if (step === 1) return name.trim().length > 0
    if (step === 3) return level !== ""
    if (step === 4) return subjects.length > 0
    if (step === 5) return goals.length > 0
    return true
  }

  const toggleArr = <T,>(arr: T[], val: T, set: (v: T[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const finish = async () => {
    setSaving(true)
    try {
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          display_name: name.trim(),
          avatar_emoji: avatar,
          grade_level: level,
          subjects,
          goals,
          onboarded: true,
        })
      }
    } catch (_err) {
      // Fall through to dashboard even if profile save fails.
    }
    setSaving(false)
    navigate("/dashboard")
  }

  const next = () => {
    if (step < TOTAL - 1) setStep(s => s + 1)
    else finish()
  }
  const back = () => { if (step > 0) setStep(s => s - 1) }

  // ── Slide animation state ──────────────────────────────────────────────────
  const [visible, setVisible] = useState(true)
  const [dir, setDir] = useState<1|-1>(1)
  const goTo = (newStep: number) => {
    setDir(newStep > step ? 1 : -1)
    setVisible(false)
    setTimeout(() => { setStep(newStep); setVisible(true) }, 180)
  }
  const handleNext = () => { if (!canNext()) return; if (step < TOTAL-1) goTo(step+1); else finish() }
  const handleBack = () => { if (step > 0) goTo(step-1) }

  if (checking) return null

  return (
    <div style={{ position:"fixed", inset:0, background:BG, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", fontFamily:"'Nunito',sans-serif",
      color:TEXT1, overflow:"hidden" }}>

      {/* ── Card ── */}
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:420,
        padding:"0 20px", display:"flex", flexDirection:"column", gap:0 }}>

        {/* Header bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom:28 }}>
          {/* Logo wordmark */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:8, height:8, background:GOLD }}/>
            <span style={{ fontSize:13, fontWeight:700, letterSpacing:"0.12em",
              textTransform:"uppercase", color:GOLD, fontFamily:"'Fredoka One',cursive" }}>Studenius</span>
          </div>
          <StepDots total={TOTAL} current={step}/>
        </div>

        {/* Step content */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : `translateY(${dir * 12}px)`,
          transition: "opacity 0.18s ease, transform 0.18s ease",
          minHeight: 340,
          display:"flex", flexDirection:"column", gap:20,
        }}>

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Welcome
                </div>
                <h1 style={{ fontSize:28, fontWeight:400, lineHeight:1.15, margin:0, fontFamily:"'Fredoka One',cursive",
                  letterSpacing:"-0.02em" }}>
                  Your AI study<br/>
                  <span style={{ color:GOLD }}>companion</span> is ready.
                </h1>
              </div>
              <p style={{ fontSize:13, color:TEXT2, lineHeight:1.7, margin:0 }}>
                Studenius adapts to how <em>you</em> learn — with AI-powered
                quizzes, flashcards, a tutor, and tools built for students who
                take their progress seriously.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  ["⚡","Personalized AI practice sessions"],
                  ["🧠","BrainBot tutor available 24/7"],
                  ["📈","Track XP, streaks & weak areas"],
                ].map(([icon, txt]) => (
                  <div key={txt} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"10px 12px", background:SURF, border:`1.5px solid ${BORD}`, borderRadius: 10 }}>
                    <span style={{ fontSize:15 }}>{icon}</span>
                    <span style={{ fontSize:12, color:TEXT2 }}>{txt}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── STEP 1: Name ── */}
          {step === 1 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 1 of 5
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What should we call you?
                </h2>
                <p style={{ fontSize:12, color:TEXT2, marginTop:6, marginBottom:0 }}>
                  This is how you'll appear in Studenius.
                </p>
              </div>
              <div>
                <div style={{ fontSize:9, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:"#555", marginBottom:6 }}>
                  Your name
                </div>
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleNext()}
                  placeholder="e.g. Alex, Mika, Rey..."
                  maxLength={32}
                  style={{ width:"100%", background:SURF2, border:`0.5px solid ${BORD}`,
                    color:TEXT1, fontSize:15, padding:"12px 14px", fontFamily:"inherit",
                    outline:"none", boxSizing:"border-box", letterSpacing:"0.01em",
                    transition:"border-color .2s" }}
                  onFocus={e => { e.currentTarget.style.borderColor = TEAL }}
                  onBlur={e  => { e.currentTarget.style.borderColor = BORD }}
                />
                {name.trim().length > 0 && (
                  <div style={{ marginTop:10, fontSize:12, color:TEXT2 }}>
                    Nice to meet you,{" "}
                    <span style={{ color:TEAL, fontWeight:700 }}>{name.trim()}</span> 👋
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 2: Avatar ── */}
          {step === 2 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 2 of 5
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  Pick your avatar
                </h2>
                <p style={{ fontSize:12, color:TEXT2, marginTop:6, marginBottom:0 }}>
                  Choose an emoji that represents your study spirit.
                </p>
              </div>
              {/* Selected preview */}
              <div style={{ display:"flex", alignItems:"center", gap:12,
                padding:"14px 16px", background:SURF, border:`1.5px solid ${BORD}`, borderRadius: 10 }}>
                <span style={{ fontSize:32 }}>{avatar}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700 }}>{name || "You"}</div>
                  <div style={{ fontSize:10, color:TEXT3 }}>Your study identity</div>
                </div>
              </div>
              {/* Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setAvatar(a)} style={{
                    fontSize:22, padding:"10px 0", cursor:"pointer", border:"none",
                    background: avatar === a ? "rgba(240,160,64,0.15)" : SURF,
                    borderRadius: 8,
                    outline: avatar === a ? `1.5px solid ${GOLD}` : `1.5px solid ${BORD}`,
                    transition:"all .15s",
                  }}>
                    {a}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STEP 3: Level ── */}
          {step === 3 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 3 of 5
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What's your level?
                </h2>
                <p style={{ fontSize:12, color:TEXT2, marginTop:6, marginBottom:0 }}>
                  We'll calibrate content difficulty for you.
                </p>
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

          {/* ── STEP 4: Subjects ── */}
          {step === 4 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 4 of 5
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What do you study?
                </h2>
                <p style={{ fontSize:12, color:TEXT2, marginTop:6, marginBottom:0 }}>
                  Pick all that apply — you can change this later.
                </p>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {SUBJECTS.map(s => {
                  const on = subjects.includes(s)
                  return (
                    <button key={s} onClick={() => toggleArr(subjects, s, setSubjects)} style={{
                      padding:"7px 12px", fontSize:11, cursor:"pointer",
                      borderRadius: 999,
                      background: on ? "rgba(240,160,64,0.18)" : SURF2,
                      border: `1.5px solid ${on ? GOLD : BORD}`,
                      color: on ? TEXT1 : TEXT2,
                      fontFamily:"inherit", fontWeight: on ? 600 : 400,
                      transition:"all .15s",
                    }}>
                      {s}
                    </button>
                  )
                })}
              </div>
              {subjects.length > 0 && (
                <div style={{ fontSize:10, color:TEXT3 }}>
                  {subjects.length} subject{subjects.length > 1 ? "s" : ""} selected
                </div>
              )}
            </>
          )}

          {/* ── STEP 5: Goals ── */}
          {step === 5 && (
            <>
              <div>
                <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em",
                  textTransform:"uppercase", color:GOLD, marginBottom:10 }}>
                  Step 5 of 5
                </div>
                <h2 style={{ fontSize:22, fontWeight:400, margin:0, letterSpacing:"-0.01em", fontFamily:"'Fredoka One',cursive" }}>
                  What's your main goal?
                </h2>
                <p style={{ fontSize:12, color:TEXT2, marginTop:6, marginBottom:0 }}>
                  Choose everything that motivates you.
                </p>
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

        </div>

        {/* ── Nav buttons ── */}
        <div style={{ display:"flex", gap:10, marginTop:28 }}>
          {step > 0 && (
            <button onClick={handleBack} style={{
              padding:"13px 0", width:52, background:"transparent",
              border:`0.5px solid ${BORD}`, color:"#555", fontSize:16,
              cursor:"pointer", fontFamily:"inherit", transition:"all .2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#555" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORD }}>
              ←
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canNext() || saving}
            style={{
              flex:1, padding:"13px 0",
              background: canNext() ? (step === TOTAL-1 ? GOLD : TEAL) : SURF2,
              border:"none",
              color: canNext() ? "#000" : "#333",
              fontSize:12, fontWeight:700, letterSpacing:"0.08em",
              textTransform:"uppercase", cursor: canNext() ? "pointer" : "default",
              fontFamily:"inherit", transition:"all .2s",
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? "Saving..." : step === TOTAL-1 ? "Let's go →" : step === 0 ? "Get Started →" : "Continue →"}
          </button>
        </div>

        {/* Skip link */}
        {step === 0 && (
          <button onClick={() => navigate("/dashboard")} style={{
            marginTop:14, background:"none", border:"none", color:TEXT3,
            fontSize:11, cursor:"pointer", fontFamily:"inherit",
            textDecoration:"underline", textDecorationColor:TEXT3,
          }}>
            Skip for now
          </button>
        )}

      </div>
    </div>
  )
}
