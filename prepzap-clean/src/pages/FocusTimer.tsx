import { useState, useEffect, useCallback, useRef } from "react"
import {
  Play, Pause, RotateCcw, Settings,
  Coffee, Brain,
  X, Bell, AlarmClock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ToolPageShell } from "@/pages/ToolPageShell"
import { cn } from "@/lib/utils"

type TimerMode = "focus" | "shortBreak" | "longBreak"
interface TimerSettings {
  focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number;
  sessionsUntilLongBreak: number; autoStartBreaks: boolean; autoStartFocus: boolean;
  autoSnooze: boolean;
}

const LS_KEY = "pz_timer_v2"
const defaultSettings: TimerSettings = {
  focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15,
  sessionsUntilLongBreak: 4, autoStartBreaks: false, autoStartFocus: false,
  autoSnooze: false,
}

interface PersistedTimer {
  mode: TimerMode; seconds: number; isRunning: boolean;
  sessions: number; settings: TimerSettings; endTimestamp?: number;
}

function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<ReturnType<typeof setNunitoval> | null>(null)

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") ctxRef.current = new AudioContext()
    return ctxRef.current
  }

  const playOnce = useCallback(() => {
    try {
      const ctx = getCtx()
      const playTone = (delay: number, freq: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = "sine"
        gain.gain.setValueAtTime(0, ctx.currentTime + delay)
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 1.2)
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 1.2)
      }
      playTone(0, 880); playTone(0.5, 1100); playTone(1.0, 880)
    } catch {}
  }, [])

  const startLoop = useCallback(() => {
    playOnce()
    intervalRef.current = setNunitoval(playOnce, 3000)
  }, [playOnce])

  const stopLoop = useCallback(() => {
    if (intervalRef.current) { clearNunitoval(intervalRef.current); intervalRef.current = null }
  }, [])

  useEffect(() => () => stopLoop(), [stopLoop])
  return { startLoop, stopLoop, playOnce }
}

const motivationalQuotes = [
  "The secret of getting ahead is getting started.",
  "Small progress is still progress.",
  "You don't have to be perfect, just consistent.",
  "Every expert was once a beginner.",
  "Focus on progress, not perfection.",
  "Your future self will thank you for studying today.",
  "One question at a time. One session at a time.",
]

const TEAL = "#f0a040"

export default function FocusTimer() {
  const loadPersisted = (): Partial<PersistedTimer> => {
    try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : {}; } catch { return {} }
  }
  const p = loadPersisted()
  const calcSecs = (p: Partial<PersistedTimer>): number => {
    if (p.isRunning && p.endTimestamp) return Math.max(0, Math.ceil((p.endTimestamp - Date.now()) / 1000))
    return p.seconds ?? (p.settings?.focusMinutes ?? defaultSettings.focusMinutes) * 60
  }

  const [settings, setSettings] = useState<TimerSettings>(p.settings ?? defaultSettings)
  const [mode, setMode]         = useState<TimerMode>(p.mode ?? "focus")
  const [seconds, setSeconds]   = useState<number>(calcSecs(p))
  const [isRunning, setIsRunning] = useState(p.isRunning ?? false)
  const [sessions, setSessions] = useState(p.sessions ?? 0)
  const [showSettings, setShowSettings] = useState(false)
  const [quote, setQuote]       = useState(motivationalQuotes[0])
  const [todayFocusMins, setTodayFocusMins] = useState(0)
  const [alarmActive, setAlarmActive] = useState(false)
  const autoSnoozeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beep = useBeep()

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw) return
        const saved: PersistedTimer = JSON.parse(raw)
        if (saved.isRunning && saved.endTimestamp) {
          const remaining = Math.max(0, Math.ceil((saved.endTimestamp - Date.now()) / 1000))
          setSeconds(remaining)
        }
      } catch {}
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  useEffect(() => {
    if (!isRunning) {
      const newSecs = mode === "focus" ? settings.focusMinutes * 60
        : mode === "shortBreak" ? settings.shortBreakMinutes * 60
        : settings.longBreakMinutes * 60
      setSeconds(newSecs)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focusMinutes, settings.shortBreakMinutes, settings.longBreakMinutes])

  useEffect(() => {
    const endTimestamp = isRunning ? Date.now() + seconds * 1000 : undefined
    const data: PersistedTimer = { mode, seconds, isRunning, sessions, settings, endTimestamp }
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
  }, [mode, seconds, isRunning, sessions, settings])

  useEffect(() => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
    const ss = String(seconds % 60).padStart(2, "0")
    document.title = isRunning ? `${mm}:${ss} ${mode === "focus" ? "🎯" : "☕"} Studenius` : "Pomodoro Timer · Studenius"
    return () => { document.title = "Studenius" }
  }, [seconds, isRunning, mode])

  const dismissAlarm = useCallback((snooze5 = false) => {
    beep.stopLoop()
    setAlarmActive(false)
    if (autoSnoozeRef.current) { clearTimeout(autoSnoozeRef.current); autoSnoozeRef.current = null }
    if (snooze5) { setSeconds(s => s + 300); setIsRunning(true) }
  }, [beep])

  const handleComplete = useCallback(() => {
    setIsRunning(false)
    setAlarmActive(true)
    beep.startLoop()
    if (settings.autoSnooze) autoSnoozeRef.current = setTimeout(() => dismissAlarm(), 30000)
    if (Notification.permission === "granted") {
      new Notification(mode === "focus" ? "🎉 Focus session complete!" : "⚡ Break done!", {
        body: mode === "focus" ? `${settings.focusMinutes}-min session complete. Take a break!` : "Keep the momentum going.",
      })
    }
    if (mode === "focus") {
      const n = sessions + 1; setSessions(n)
      setTodayFocusMins(m => m + settings.focusMinutes)
      setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)])
      const next = n % settings.sessionsUntilLongBreak === 0 ? "longBreak" : "shortBreak"
      setMode(next)
      setSeconds(next === "longBreak" ? settings.longBreakMinutes * 60 : settings.shortBreakMinutes * 60)
      if (settings.autoStartBreaks) setIsRunning(true)
    } else {
      setMode("focus"); setSeconds(settings.focusMinutes * 60)
      if (settings.autoStartFocus) setIsRunning(true)
    }
  }, [mode, sessions, settings, beep, dismissAlarm])

  useEffect(() => {
    if (!isRunning) return
    if (seconds === 0) { handleComplete(); return }
    const t = setNunitoval(() => {
      setSeconds(() => {
        try {
          const raw = localStorage.getItem(LS_KEY)
          if (raw) {
            const saved: PersistedTimer = JSON.parse(raw)
            if (saved.endTimestamp) return Math.max(0, Math.ceil((saved.endTimestamp - Date.now()) / 1000))
          }
        } catch {}
        return Math.max(0, seconds - 1)
      })
    }, 1000)
    return () => clearNunitoval(t)
  }, [isRunning, seconds, handleComplete])

  const handleStart = () => {
    if (!isRunning && Notification.permission === "default") Notification.requestPermission()
    setIsRunning(v => !v)
  }

  const handleModeChange = (m: TimerMode) => {
    setMode(m); setIsRunning(false)
    setSeconds(m === "focus" ? settings.focusMinutes * 60 : m === "shortBreak" ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60)
    beep.stopLoop(); setAlarmActive(false)
  }

  const totalSeconds = mode === "focus" ? settings.focusMinutes * 60 : mode === "shortBreak" ? settings.shortBreakMinutes * 60 : settings.longBreakMinutes * 60
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0")
  const secs = String(seconds % 60).padStart(2, "0")

  const modeConfig = {
    focus:      { label: "Focus",       color: "#f0a040", ring: "#f0a040", grad: "linear-gradient(135deg,#f0a040,#c87030)" },
    shortBreak: { label: "Short Break", color: TEAL,      ring: TEAL,      grad: `linear-gradient(135deg,${TEAL},#c87030)` },
    longBreak:  { label: "Long Break",  color: "#f0a040", ring: "#f0a040", grad: "linear-gradient(135deg,#f0a040,#8b1a2a)" },
  }
  const cur = modeConfig[mode]
  const circ = 2 * Math.PI * 54

  return (
    <ToolPageShell>
      <main style={{ flex: 1, padding: "24px 16px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, background: cur.grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain style={{ width: 14, height: 14, color: "#fff" }} />
              </div>
              <div>
                <h1 style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Focus Timer</h1>
                <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em" }}>POMODORO</p>
              </div>
            </div>
            <button onClick={() => setShowSettings(v => !v)}
              style={{ width: 32, height: 32, border: "0.5px solid #252525", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555" }}>
              <Settings style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Running banner */}
          {isRunning && (
            <div style={{ marginBottom: 16, padding: "8px 14px", background: "rgba(248,113,113,0.08)", border: "0.5px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, background: "#f87171", borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 11, color: "#f87171" }}>Timer runs in background — tab title shows countdown</span>
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ display: "flex", border: "0.5px solid #252525", background: "rgba(255,255,255,0.02)", marginBottom: 32 }}>
            {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map(m => (
              <button key={m} onClick={() => handleModeChange(m)}
                style={{ flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", background: mode === m ? "rgba(255,255,255,0.06)" : "transparent", color: mode === m ? "#F0F0F0" : "#555", transition: "all .2s", fontFamily: "'Nunito',system-ui,sans-serif" }}>
                {m === "focus" ? "Focus" : m === "shortBreak" ? "Short Break" : "Long Break"}
              </button>
            ))}
          </div>

          {/* Timer circle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
            <div style={{ position: "relative", width: 208, height: 208, marginBottom: 20 }}>
              <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1A1A1A" strokeWidth="5" />
                <circle cx="60" cy="60" r="54" fill="none" stroke={cur.ring} strokeWidth="5"
                  strokeDasharray={circ} strokeDashoffset={circ - (circ * progress) / 100}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${cur.ring}60)` }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 48, fontWeight: 700, fontFamily: "monospace", color: cur.color, letterSpacing: "-2px" }}>{mins}:{secs}</span>
                <span style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{cur.label}</span>
                {sessions > 0 && <span style={{ fontSize: 11, color: "#555", marginTop: 2 }}>🍅 {sessions} sessions</span>}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => { setIsRunning(false); setSeconds(totalSeconds); beep.stopLoop(); setAlarmActive(false) }}
                style={{ width: 44, height: 44, border: "0.5px solid #252525", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555" }}>
                <RotateCcw style={{ width: 16, height: 16 }} />
              </button>
              <button onClick={handleStart}
                style={{ width: 128, height: 44, background: cur.grad, border: "none", fontWeight: 600, fontSize: 13, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'Nunito',system-ui,sans-serif", transition: "opacity .2s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                {isRunning ? <><Pause style={{ width: 16, height: 16 }} />Pause</> : <><Play style={{ width: 16, height: 16 }} />Start</>}
              </button>
              <button onClick={() => { if (Notification.permission === "default") Notification.requestPermission() }}
                title="Enable notifications"
                style={{ width: 44, height: 44, border: "0.5px solid #252525", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#555" }}>
                <Bell style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Alarm */}
            {alarmActive && (
              <div style={{ marginTop: 16, width: "100%", padding: "12px 14px", background: "rgba(248,113,113,0.1)", border: "0.5px solid rgba(248,113,113,0.3)", animation: "pulse 1.5s infinite" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <AlarmClock style={{ width: 16, height: 16, color: "#f87171", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171", flex: 1 }}>
                    {mode === "focus" ? "🎉 Session complete! Take a break." : "⚡ Break over — time to focus!"}
                  </span>
                  <button onClick={() => dismissAlarm(false)}
                    style={{ padding: "4px 10px", background: "#f87171", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                    Dismiss
                  </button>
                </div>
                <button onClick={() => dismissAlarm(true)}
                  style={{ width: "100%", padding: "8px", border: "0.5px solid rgba(248,113,113,0.3)", background: "transparent", color: "#f87171", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
                  <Coffee style={{ width: 14, height: 14 }} /> Snooze 5 min
                </button>
              </div>
            )}

            <p style={{ fontSize: 11, color: "#444", marginTop: 16, fontStyle: "italic", textAlign: "center", maxWidth: 280 }}>"{quote}"</p>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Sessions", val: sessions },
              { label: "Focused",  val: `${todayFocusMins}m` },
              { label: "Streak",   val: "12🔥" },
            ].map(item => (
              <div key={item.label} style={{ padding: 12, background: "rgba(255,255,255,0.02)", border: "0.5px solid #1E1E1E", textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#F0F0F0", margin: "0 0 4px", fontFamily: "monospace" }}>{item.val}</p>
                <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #252525" }}>
              <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #1A1A1A", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" }}>Timer Settings</span>
                <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer" }}><X style={{ width: 14, height: 14 }} /></button>
              </div>
              <div style={{ padding: "12px 14px" }}>
                {([
                  { key: "focusMinutes" as const,         label: "Focus duration (min)",       min: 1, max: 90 },
                  { key: "shortBreakMinutes" as const,    label: "Short break (min)",           min: 1, max: 30 },
                  { key: "longBreakMinutes" as const,     label: "Long break (min)",            min: 5, max: 60 },
                  { key: "sessionsUntilLongBreak" as const, label: "Sessions until long break", min: 1, max: 10 },
                ]).map(({ key, label, min, max }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#999" }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => setSettings(s => ({ ...s, [key]: Math.max(min, s[key] - 1) }))}
                        style={{ width: 28, height: 28, border: "0.5px solid #252525", background: "rgba(255,255,255,0.03)", color: "#F0F0F0", cursor: "pointer", fontFamily: "monospace", fontSize: 14 }}>−</button>
                      <span style={{ width: 32, textAlign: "center", fontSize: 13, fontFamily: "monospace", color: "#F0F0F0" }}>{settings[key]}</span>
                      <button onClick={() => setSettings(s => ({ ...s, [key]: Math.min(max, s[key] + 1) }))}
                        style={{ width: 28, height: 28, border: "0.5px solid #252525", background: "rgba(255,255,255,0.03)", color: "#F0F0F0", cursor: "pointer", fontFamily: "monospace", fontSize: 14 }}>+</button>
                    </div>
                  </div>
                ))}
                {([
                  { key: "autoStartBreaks" as const,  label: "Auto-start breaks" },
                  { key: "autoStartFocus" as const,   label: "Auto-start focus sessions" },
                  { key: "autoSnooze" as const,       label: "Auto-dismiss alarm after 30s" },
                ]).map(({ key, label }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#999" }}>{label}</span>
                    <button onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                      style={{ width: 40, height: 20, background: settings[key] ? TEAL : "#252525", border: "none", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                      <div style={{ position: "absolute", top: 2, left: settings[key] ? 22 : 2, width: 16, height: 16, background: "#fff", transition: "left .2s" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </ToolPageShell>
  )
}
