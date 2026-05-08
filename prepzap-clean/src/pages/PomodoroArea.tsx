import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { levelFromXp } from "@/lib/xp"
import { BottomNav } from "@/components/BottomNav"

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = "#f0a040"
const MAROON = "#8b1a2a"
const BG     = "#160810"
const SURF   = "#1f0b13"
const SURF2  = "#2a0e18"
const BORDER = "rgba(139,26,42,0.35)"
const BORDHV = "rgba(240,160,64,0.45)"
const TEXT   = "#f5ede8"
const TEXT2  = "rgba(245,237,232,0.55)"
const TEXT3  = "rgba(245,237,232,0.28)"

// ─── Fox Avatar SVG ───────────────────────────────────────────────────────────
function FoxAvatar({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <ellipse cx="50" cy="68" rx="34" ry="26" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      <ellipse cx="50" cy="48" rx="28" ry="26" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      <ellipse cx="29" cy="24" rx="10" ry="13" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      <ellipse cx="71" cy="24" rx="10" ry="13" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      <ellipse cx="29" cy="22" rx="5" ry="8" fill="#e06060"/>
      <ellipse cx="71" cy="22" rx="5" ry="8" fill="#e06060"/>
      <ellipse cx="40" cy="46" rx="5.5" ry="7" fill="#1a0000"/>
      <ellipse cx="60" cy="46" rx="5.5" ry="7" fill="#1a0000"/>
      <ellipse cx="41.5" cy="44" rx="2" ry="3" fill="white"/>
      <ellipse cx="61.5" cy="44" rx="2" ry="3" fill="white"/>
      <ellipse cx="50" cy="55" rx="4" ry="2.5" fill="#c05020" stroke="#1a0000" strokeWidth="1.5"/>
      <path d="M41 59 Q50 64 59 59" stroke="#1a0000" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <rect x="26" y="29" width="48" height="7" rx="3" fill="#1a0000"/>
      <rect x="30" y="15" width="40" height="17" rx="4" fill="#1a0000"/>
      <rect x="32" y="16" width="36" height="14" rx="3" fill="#222"/>
      <line x1="46" y1="15" x2="42" y2="4" stroke="#1a0000" strokeWidth="2"/>
      <circle cx="41" cy="3" r="3" fill={GOLD} stroke="#1a0000" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── Pomodoro timer hook ───────────────────────────────────────────────────────
function useTimer(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds(s => {
        if (s <= 1) { setRunning(false); return 0 }
        return s - 1
      }), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
  return { seconds, setSeconds, running, setRunning, fmt }
}

// ─── Place definitions ─────────────────────────────────────────────────────────
const PLACES = [
  { id: "library",   label: "The Library",     desc: "Silent zone · Deep work",     icon: "ti ti-books",          minLevel: 1,  timerMode: "flow",      ambience: "White noise" },
  { id: "cafe",      label: "Fox Café",         desc: "Chill vibes · Pomodoro 25/5", icon: "ti ti-coffee",          minLevel: 1,  timerMode: "pomodoro",  ambience: "Café sounds" },
  { id: "grove",     label: "Study Grove",      desc: "Nature sounds · Flow state",  icon: "ti ti-trees",           minLevel: 1,  timerMode: "flow",      ambience: "Nature sounds" },
  { id: "tower",     label: "Scholar's Tower",  desc: "Power sessions · 50/10",      icon: "ti ti-building-castle", minLevel: 5,  timerMode: "long",      ambience: "Lo-fi beats" },
  { id: "midnight",  label: "Midnight Den",     desc: "Night owl mode · Custom",     icon: "ti ti-moon",            minLevel: 8,  timerMode: "custom",    ambience: "Rain sounds" },
  { id: "academy",   label: "Grand Academy",    desc: "Elite focus · 90-min blocks", icon: "ti ti-building",        minLevel: 12, timerMode: "long",      ambience: "Orchestra" },
]

const TIMER_PRESETS: Record<string, number> = {
  pomodoro: 25 * 60,
  flow:     45 * 60,
  long:     50 * 60,
  custom:   30 * 60,
}

// ─── Mock online users per place (would come from Supabase presence) ──────────
const MOCK_USERS: Record<string, number> = {
  library: 4, cafe: 2, grove: 6, tower: 0, midnight: 0, academy: 0,
}

// ─── PomodoroArea page ────────────────────────────────────────────────────────
export default function PomodoroArea() {
  const { user } = useAuth()
  const [xp, setXp]               = useState(0)
  const [activePlace, setActivePlace] = useState<string | null>(null)
  const [customMinutes, setCustomMinutes] = useState(30)
  const [sessionNote, setSessionNote]     = useState("")
  const [completedPomos, setCompletedPomos] = useState(0)

  const place = PLACES.find(p => p.id === activePlace) ?? null
  const initSecs = place ? TIMER_PRESETS[place.timerMode] ?? (customMinutes * 60) : 25 * 60
  const timer = useTimer(initSecs)
  const level = levelFromXp(xp)

  useEffect(() => {
    if (!user) return
    supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setXp(data.xp ?? 0) })
  }, [user])

  // Reset timer when place changes
  useEffect(() => {
    if (!place) return
    timer.setRunning(false)
    timer.setSeconds(TIMER_PRESETS[place.timerMode] ?? customMinutes * 60)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlace])

  // Award XP when timer hits zero
  useEffect(() => {
    if (timer.seconds === 0 && !timer.running && activePlace && user) {
      const earned = Math.round((initSecs / 60) / 2)
      setCompletedPomos(p => p + 1)
      const newXp = xp + earned
      setXp(newXp)
      supabase.from("profiles").update({ xp: newXp }).eq("id", user.id)
      supabase.from("activity_log").insert({ user_id: user.id, label: `Pomodoro session: ${place?.label}`, score: `+${earned} XP` })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.seconds])

  const pct = place ? ((TIMER_PRESETS[place.timerMode] ?? customMinutes * 60) - timer.seconds) / (TIMER_PRESETS[place.timerMode] ?? customMinutes * 60) * 100 : 0

  const card: React.CSSProperties = { background: SURF, border: `2px solid ${BORDER}`, borderRadius: 14 }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', system-ui, sans-serif" }}>

      {/* ── NAV ── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 54, borderBottom: `2px solid ${BORDER}`, background: "#1c0910" }}>
        <Link to="/dashboard" style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: GOLD, letterSpacing: 1, textDecoration: "none" }}>STUDENIUS</Link>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: TEXT }}>
          <i className="ti ti-clock" style={{ color: GOLD, marginRight: 8 }}/>Pomodoro Area
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: GOLD, color: BG, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>⚡ {xp} XP</div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: MAROON, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FoxAvatar size={28}/>
          </div>
        </div>
      </nav>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, height: "calc(100vh - 54px)" }}>

        {/* ── LEFT: Place grid ── */}
        <div style={{ overflowY: "auto", padding: 24 }}>
          <div style={{ marginBottom: 6, fontFamily: "'Fredoka One', cursive", fontSize: 22, color: TEXT }}>Pick your spot</div>
          <div style={{ fontSize: 13, color: TEXT3, marginBottom: 24 }}>Your avatar appears here while you study · other students can see you</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            {PLACES.map(p => {
              const locked = level < p.minLevel
              const active = activePlace === p.id
              const online = MOCK_USERS[p.id] ?? 0
              return (
                <div key={p.id}
                  onClick={() => !locked && setActivePlace(active ? null : p.id)}
                  style={{
                    ...card,
                    padding: 18,
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.4 : 1,
                    transition: "all .2s",
                    position: "relative",
                    borderColor: active ? GOLD : BORDER,
                    background: active ? SURF2 : SURF,
                    transform: active ? "translateY(-3px)" : "none",
                  }}
                  onMouseEnter={e => { if (!locked && !active) (e.currentTarget as HTMLElement).style.borderColor = BORDHV }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = BORDER }}>

                  {active && (
                    <div style={{ position: "absolute", top: -1, left: -1, right: -1, height: 3, background: GOLD, borderRadius: "14px 14px 0 0" }}/>
                  )}

                  {!locked && online > 0 && (
                    <div style={{ position: "absolute", top: 10, right: 10, background: MAROON, color: GOLD, fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>
                      {online + (active ? 1 : 0)} here
                    </div>
                  )}
                  {locked && (
                    <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 10, color: TEXT3, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                      <i className="ti ti-lock" style={{ fontSize: 10 }}/> Lv. {p.minLevel}
                    </div>
                  )}

                  <i className={p.icon} style={{ fontSize: 34, color: locked ? TEXT3 : active ? GOLD : GOLD, display: "block", marginBottom: 10 }}/>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 15, color: TEXT, marginBottom: 3 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: TEXT3 }}>{p.desc}</div>
                  {!locked && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: TEXT3, fontWeight: 700 }}>
                      <i className="ti ti-music" style={{ fontSize: 10 }}/>{p.ambience}
                    </div>
                  )}
                  {active && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, background: MAROON, borderRadius: 8, padding: "4px 10px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }}/>
                      <span style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}>You're here</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Who's studying now */}
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 15, color: GOLD, marginBottom: 12 }}>
            <i className="ti ti-users" style={{ fontSize: 14, marginRight: 6 }}/>Currently Studying
          </div>
          <div style={{ display: "flex", flex: 1, gap: 10, flexWrap: "wrap" }}>
            {PLACES.filter(p => (MOCK_USERS[p.id] ?? 0) > 0 && level >= p.minLevel).map(p => (
              <div key={p.id} style={{ ...card, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <i className={p.icon} style={{ fontSize: 18, color: GOLD }}/>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: TEXT3 }}>{MOCK_USERS[p.id]} studying</div>
                </div>
                <div style={{ display: "flex", marginLeft: 4 }}>
                  {Array.from({ length: Math.min(MOCK_USERS[p.id], 3) }).map((_, i) => (
                    <div key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: MAROON, border: `2px solid ${GOLD}`, marginLeft: i > 0 ? -6 : 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FoxAvatar size={20}/>
                    </div>
                  ))}
                  {MOCK_USERS[p.id] > 3 && <div style={{ width: 22, height: 22, borderRadius: "50%", background: SURF2, border: `2px solid ${BORDER}`, marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: TEXT3, fontWeight: 700 }}>+{MOCK_USERS[p.id]-3}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Timer panel ── */}
        <div style={{ background: "#1c0910", borderLeft: `2px solid ${BORDER}`, padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {!activePlace ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
              <i className="ti ti-map-pin" style={{ fontSize: 40, color: TEXT3 }}/>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: TEXT2 }}>Pick a spot to start</div>
              <div style={{ fontSize: 12, color: TEXT3 }}>Select a study location on the left to begin your Pomodoro session</div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 18, color: GOLD, marginBottom: 4 }}>{place?.label}</div>
                <div style={{ fontSize: 12, color: TEXT3 }}>{place?.ambience}</div>
              </div>

              {/* Circular timer */}
              <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
                <svg width={180} height={180} viewBox="0 0 180 180" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                  <circle cx="90" cy="90" r="80" fill="none" stroke={SURF2} strokeWidth="10"/>
                  <circle cx="90" cy="90" r="80" fill="none" stroke={GOLD} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - pct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s linear" }}/>
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 36, color: TEXT, letterSpacing: 2 }}>{timer.fmt(timer.seconds)}</div>
                  <div style={{ fontSize: 11, color: TEXT3, marginTop: 2 }}>{place?.timerMode === "pomodoro" ? "25 min focus" : place?.timerMode === "long" ? "50 min focus" : "Flow session"}</div>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => timer.setRunning(r => !r)}
                  style={{ flex: 1, padding: "10px 0", background: timer.running ? SURF2 : GOLD, border: `2px solid ${timer.running ? BORDER : GOLD}`, color: timer.running ? TEXT : BG, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Fredoka One', cursive", borderRadius: 10, transition: "all .2s" }}>
                  {timer.running ? "⏸ Pause" : timer.seconds === 0 ? "↺ Restart" : "▶ Start"}
                </button>
                <button onClick={() => { timer.setRunning(false); timer.setSeconds(TIMER_PRESETS[place!.timerMode] ?? customMinutes * 60) }}
                  style={{ padding: "10px 14px", background: "transparent", border: `2px solid ${BORDER}`, color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", borderRadius: 10, fontWeight: 700, transition: "all .2s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = BORDHV)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}>
                  ↺
                </button>
              </div>

              {/* Custom timer if mode = custom */}
              {place?.timerMode === "custom" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Custom Duration</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {[15, 20, 25, 30, 45, 60].map(m => (
                      <button key={m} onClick={() => { setCustomMinutes(m); timer.setSeconds(m * 60) }}
                        style={{ padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", borderRadius: 8, transition: "all .15s", background: customMinutes === m ? GOLD : SURF2, color: customMinutes === m ? BG : TEXT2, border: `1.5px solid ${customMinutes === m ? GOLD : BORDER}`, fontWeight: 700 }}>
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Session note */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Session goal</div>
                <textarea value={sessionNote} onChange={e => setSessionNote(e.target.value)}
                  placeholder="What are you working on? (optional)"
                  rows={2}
                  style={{ width: "100%", background: SURF2, border: `1.5px solid ${BORDER}`, color: TEXT, fontSize: 12, padding: "8px 10px", fontFamily: "inherit", outline: "none", borderRadius: 8, resize: "none", boxSizing: "border-box" }}/>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: SURF, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: GOLD }}>{completedPomos}</div>
                  <div style={{ fontSize: 10, color: TEXT3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Completed</div>
                </div>
                <div style={{ background: SURF, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: GOLD }}>{Math.round(completedPomos * (TIMER_PRESETS[place?.timerMode ?? "pomodoro"] ?? 1500) / 60)}</div>
                  <div style={{ fontSize: 10, color: TEXT3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Mins Today</div>
                </div>
              </div>

              {/* Leave button */}
              <button onClick={() => { timer.setRunning(false); setActivePlace(null) }}
                style={{ width: "100%", padding: "9px 0", background: "transparent", border: `1.5px solid ${BORDER}`, color: TEXT3, fontSize: 12, cursor: "pointer", fontFamily: "inherit", borderRadius: 10, fontWeight: 700, transition: "all .2s", marginTop: "auto" }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = "#e84040"); (e.currentTarget.style.color = "#e84040") }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = BORDER); (e.currentTarget.style.color = TEXT3) }}>
                Leave spot
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav/>
    </div>
  )
}
