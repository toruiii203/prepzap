import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { buddies } from "@/data/buddies"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

// ─── Per-step theme config ────────────────────────────────────────────────────
const STEPS_CONFIG = [
  {
    bg: "#1a1a4e",
    accent: "#ffffff",
    pill: "rgba(255,255,255,0.15)",
    character: "🐺",
    characterLabel: "Wolf",
    floatColor: "rgba(255,255,255,0.06)",
  },
  {
    bg: "#7c3aed",
    accent: "#fbbf24",
    pill: "rgba(251,191,36,0.15)",
    character: "🦌",
    characterLabel: "Deer",
    floatColor: "rgba(251,191,36,0.07)",
  },
  {
    bg: "#ea580c",
    accent: "#ffffff",
    pill: "rgba(255,255,255,0.15)",
    character: "🦌",
    characterLabel: "Deer",
    floatColor: "rgba(255,255,255,0.06)",
  },
  {
    bg: "#db2777",
    accent: "#ffffff",
    pill: "rgba(255,255,255,0.15)",
    character: "🐰",
    characterLabel: "Bunny",
    floatColor: "rgba(255,255,255,0.06)",
  },
  {
    bg: "#7c3aed",
    accent: "#fbbf24",
    pill: "rgba(251,191,36,0.15)",
    character: "🦉",
    characterLabel: "Owl",
    floatColor: "rgba(251,191,36,0.07)",
  },
]

// ─── Data ─────────────────────────────────────────────────────────────────────
const GOALS = [
  { id: "exams",    icon: "📝", label: "Ace my exams" },
  { id: "habits",   icon: "📅", label: "Build study habits" },
  { id: "concepts", icon: "💡", label: "Master tough concepts" },
  { id: "speed",    icon: "⚡", label: "Study faster & smarter" },
  { id: "career",   icon: "🎓", label: "Prep for a career/license" },
  { id: "fun",      icon: "🔥", label: "Learn for fun" },
]

const LEVELS = [
  { id: "hs",   label: "High School",             icon: "🏫" },
  { id: "col",  label: "College / University",    icon: "🎓" },
  { id: "grad", label: "Graduate / Post-grad",    icon: "📚" },
  { id: "pro",  label: "Professional / Self-study", icon: "💼" },
]

function toggleArr<T>(arr: T[], val: T, set: React.Dispatch<React.SetStateAction<T[]>>) {
  set(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
}

// ─── Floating sparkles background ────────────────────────────────────────────
function Sparkles({ color }: { color: string }) {
  const sparks = [
    { top: "10%", left: "8%",  size: 18, delay: 0 },
    { top: "20%", left: "88%", size: 12, delay: 0.4 },
    { top: "55%", left: "5%",  size: 10, delay: 0.8 },
    { top: "70%", left: "92%", size: 16, delay: 0.2 },
    { top: "85%", left: "15%", size: 8,  delay: 1.1 },
    { top: "40%", left: "94%", size: 14, delay: 0.6 },
    { top: "30%", left: "3%",  size: 9,  delay: 1.3 },
    { top: "90%", left: "80%", size: 11, delay: 0.9 },
  ]
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {sparks.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          top: s.top, left: s.left,
          width: s.size, height: s.size,
          opacity: 0.5,
          animation: `sparkFloat 3s ease-in-out ${s.delay}s infinite alternate`,
        }}>
          <svg viewBox="0 0 24 24" fill={color}>
            <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z" />
          </svg>
        </div>
      ))}
    </div>
  )
}

// ─── Giant chibi character display ───────────────────────────────────────────
function CharacterDisplay({ emoji, step }: { emoji: string; step: number }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "flex-end",
      height: 180, position: "relative", marginBottom: -20,
    }}>
      {/* Glow blob behind character */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 160, height: 80,
        background: "rgba(255,255,255,0.1)",
        borderRadius: "50%", filter: "blur(24px)",
      }} />
      <div style={{
        fontSize: 120,
        lineHeight: 1,
        animation: "characterBob 2.5s ease-in-out infinite",
        filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.3))",
        zIndex: 2,
        userSelect: "none",
      }}>
        {emoji}
      </div>
    </div>
  )
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ total, current, accent }: { total: number; current: number; accent: string }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6,
          width: i === current ? 24 : 6,
          borderRadius: 99,
          background: i === current ? accent : "rgba(255,255,255,0.25)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const [step, setStep] = useState(0)
  const TOTAL = 5

  const [name, setName] = useState("")
  const [level, setLevel] = useState("")
  const [goals, setGoals] = useState<string[]>([])
  const [buddyId, setBuddyId] = useState("")
  const [saving, setSaving] = useState(false)
  const [animDir, setAnimDir] = useState<"forward" | "back">("forward")
  const [visible, setVisible] = useState(true)

  const theme = STEPS_CONFIG[step] ?? STEPS_CONFIG[0]

  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name)
  }, [profile])

  const canNext = () => {
    if (step === 0) return true
    if (step === 1) return name.trim().length > 1
    if (step === 2) return level !== ""
    if (step === 3) return goals.length > 0
    if (step === 4) return buddyId !== ""
    return false
  }

  const transition = (nextStep: number, dir: "forward" | "back") => {
    setAnimDir(dir)
    setVisible(false)
    setTimeout(() => {
      setStep(nextStep)
      setVisible(true)
    }, 220)
  }

  const handleNext = async () => {
    if (!canNext() || saving) return
    if (step < TOTAL - 1) { transition(step + 1, "forward"); return }

    setSaving(true)
    try {
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: name.trim(),
          study_level: level,
          goals,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        await refreshProfile()
      }
      localStorage.setItem(`buddy_${user?.id || "guest"}`, buddyId)
      navigate("/avatar")
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (step > 0) transition(step - 1, "back")
  }

  const slideStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible
      ? "translateY(0) scale(1)"
      : animDir === "forward"
        ? "translateY(16px) scale(0.98)"
        : "translateY(-16px) scale(0.98)",
    transition: "opacity 0.22s ease, transform 0.22s ease",
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.5s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&family=Fredoka+One&display=swap');
        * { box-sizing: border-box; }

        @keyframes characterBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes sparkFloat {
          0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          100% { transform: translateY(-14px) rotate(20deg); opacity: 0.7; }
        }
        @keyframes confettiDrop {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }

        .onb-chip {
          background: rgba(255,255,255,0.12);
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 99px;
          padding: 12px 18px;
          color: white;
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          width: 100%;
        }
        .onb-chip:hover {
          background: rgba(255,255,255,0.22);
          transform: scale(1.02);
        }
        .onb-chip.active {
          background: white;
          border-color: white;
          color: #1a1a4e;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .onb-input {
          width: 100%;
          background: rgba(255,255,255,0.12);
          border: 2px solid rgba(255,255,255,0.25);
          border-radius: 16px;
          padding: 16px 20px;
          font-size: 18px;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          color: white;
          outline: none;
          transition: border-color 0.2s;
        }
        .onb-input::placeholder { color: rgba(255,255,255,0.4); }
        .onb-input:focus { border-color: white; background: rgba(255,255,255,0.18); }
        .onb-btn-primary {
          width: 100%;
          padding: 18px;
          border-radius: 99px;
          border: none;
          background: white;
          font-family: 'Nunito', sans-serif;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.18s ease;
          letter-spacing: 0.01em;
        }
        .onb-btn-primary:hover:not(:disabled) {
          transform: scale(1.03);
          box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        }
        .onb-btn-primary:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .onb-btn-skip {
          background: transparent;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 99px;
          padding: 16px 24px;
          color: rgba(255,255,255,0.7);
          font-family: 'Nunito', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s ease;
          flex-shrink: 0;
        }
        .onb-btn-skip:hover {
          border-color: rgba(255,255,255,0.6);
          color: white;
        }
        .onb-btn-back {
          background: transparent;
          border: 2px solid rgba(255,255,255,0.25);
          border-radius: 99px;
          padding: 16px 20px;
          color: rgba(255,255,255,0.7);
          font-family: 'Nunito', sans-serif;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.18s ease;
          flex-shrink: 0;
        }
        .onb-btn-back:hover {
          border-color: white;
          color: white;
        }
        .buddy-card {
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.15);
          border-radius: 18px;
          padding: 14px 10px;
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-family: 'Nunito', sans-serif;
          font-weight: 700;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }
        .buddy-card:hover { background: rgba(255,255,255,0.18); transform: scale(1.04); }
        .buddy-card.active {
          background: white;
          border-color: white;
          color: #1a1a4e;
          box-shadow: 0 6px 24px rgba(0,0,0,0.25);
          transform: scale(1.06);
        }
      `}</style>

      {/* Sparkle background */}
      <Sparkles color="rgba(255,255,255,0.7)" />

      {/* Confetti strips scattered */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {["#fbbf24","#34d399","#f472b6","#60a5fa","#a78bfa"].map((c, i) => (
          <div key={i} style={{
            position: "absolute",
            top: -20,
            left: `${10 + i * 18}%`,
            width: 8, height: 22,
            background: c,
            borderRadius: 3,
            opacity: 0.6,
            animation: `confettiDrop ${3 + i * 0.7}s linear ${i * 0.5}s infinite`,
          }} />
        ))}
      </div>

      {/* Character area — top half */}
      <div style={{ ...slideStyle, width: "100%", maxWidth: 420, padding: "0 24px", zIndex: 2 }}>
        <CharacterDisplay emoji={theme.character} step={step} />
      </div>

      {/* Bottom sheet */}
      <div style={{
        width: "100%", maxWidth: 420,
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTopLeftRadius: 36, borderTopRightRadius: 36,
        padding: "28px 24px 40px",
        zIndex: 3,
        ...slideStyle,
      }}>

        <ProgressDots total={TOTAL} current={step} accent={theme.accent} />

        {/* Step header */}
        <div style={{ marginBottom: 20 }}>
          {step > 0 && (
            <div style={{
              display: "inline-block",
              background: theme.pill,
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: 99,
              padding: "4px 14px",
              fontSize: 11,
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              Step {step} of {TOTAL - 1}
            </div>
          )}
          <h1 style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: step === 0 ? 38 : 32,
            fontWeight: 400,
            color: "white",
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}>
            {step === 0 && "Your Learning\nJourney Starts\nHere"}
            {step === 1 && "What should\nwe call you?"}
            {step === 2 && "What's your\nlevel?"}
            {step === 3 && "What's your\nmain goal?"}
            {step === 4 && "Choose your\nbuddy"}
          </h1>
          <p style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 14,
            color: "rgba(255,255,255,0.65)",
            margin: "8px 0 0",
          }}>
            {step === 0 && "Tools that think with you"}
            {step === 1 && "You can always change this later"}
            {step === 2 && "We'll tailor your experience"}
            {step === 3 && "Pick all that apply"}
            {step === 4 && "Your companion on every study session"}
          </p>
        </div>

        {/* ── STEP 0: Welcome pills ── */}
        {step === 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {["🤖 AI Tools", "⚡ Smart Flashcards", "📊 Analytics", "🎯 Boss Rounds", "🧠 Feynman Mode"].map(tag => (
              <span key={tag} style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 99, padding: "6px 14px",
                fontSize: 12, fontFamily: "'Nunito', sans-serif",
                fontWeight: 700, color: "rgba(255,255,255,0.85)",
              }}>{tag}</span>
            ))}
          </div>
        )}

        {/* ── STEP 1: Name input ── */}
        {step === 1 && (
          <input
            className="onb-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleNext()}
            placeholder="e.g. Alex, Mika, Rey..."
            maxLength={32}
            autoFocus
          />
        )}

        {/* ── STEP 2: Level ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {LEVELS.map(l => (
              <button key={l.id}
                className={`onb-chip ${level === l.id ? "active" : ""}`}
                onClick={() => setLevel(l.id)}
              >
                <span style={{ fontSize: 18 }}>{l.icon}</span>
                {l.label}
                {level === l.id && <span style={{ marginLeft: "auto" }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 3: Goals ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {GOALS.map(g => {
              const on = goals.includes(g.id)
              return (
                <button key={g.id}
                  className={`onb-chip ${on ? "active" : ""}`}
                  onClick={() => toggleArr(goals, g.id, setGoals)}
                >
                  <span style={{ fontSize: 18 }}>{g.icon}</span>
                  {g.label}
                  {on && <span style={{ marginLeft: "auto" }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* ── STEP 4: Buddy picker ── */}
        {step === 4 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            maxHeight: 220,
            overflowY: "auto",
            paddingRight: 4,
          }}>
            {buddies.map(b => (
              <button key={b.id}
                className={`buddy-card ${buddyId === b.id ? "active" : ""}`}
                onClick={() => setBuddyId(b.id)}
              >
                <span style={{ fontSize: 30 }}>{b.emoji}</span>
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Nav buttons ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          {step > 0 && (
            <button className="onb-btn-back" onClick={handleBack}>←</button>
          )}
          <button
            className="onb-btn-primary"
            onClick={handleNext}
            disabled={!canNext() || saving}
            style={{ color: theme.bg }}
          >
            {saving ? "Saving..." : step === 0 ? "Get Started →" : step === TOTAL - 1 ? "To Avatar Studio →" : "Continue →"}
          </button>
          {step > 0 && step < TOTAL - 1 && (
            <button className="onb-btn-skip" onClick={() => transition(step + 1, "forward")}>
              Skip
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
