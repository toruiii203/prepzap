import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import {
  Play, Pause, RotateCcw, Settings,
  Coffee, Brain,
  ChevronLeft, X, Bell, AlarmClock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/Navbar"
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    intervalRef.current = setInterval(playOnce, 3000)
  }, [playOnce])

  const stopLoop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
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
    document.title = isRunning ? `${mm}:${ss} ${mode === "focus" ? "🎯" : "☕"} PrepZap` : "Pomodoro Timer · PrepZap"
    return () => { document.title = "PrepZap" }
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
    const t = setInterval(() => {
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
    return () => clearInterval(t)
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
    focus:      { label: "Focus",       color: "text-rose-400",    ring: "#f87171", grad: "from-rose-500 to-orange-500" },
    shortBreak: { label: "Short Break", color: "text-emerald-400", ring: "#34d399", grad: "from-zinc-500 to-teal-500" },
    longBreak:  { label: "Long Break",  color: "text-blue-400",    ring: "#60a5fa", grad: "from-blue-500 to-indigo-500" },
  }
  const cur = modeConfig[mode]
  const circ = 2 * Math.PI * 54

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 py-6">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/dashboard"><Button variant="ghost" size="sm" className="gap-1 text-muted-foreground"><ChevronLeft className="h-4 w-4" />Dashboard</Button></Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <div className="w-7 h-7 rounded-none bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center"><Brain className="h-4 w-4 text-white" /></div>
                Focus Timer
              </h1>
            </div>
            <button onClick={() => setShowSettings(v=>!v)} className="w-8 h-8 rounded-none border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {isRunning && (
            <div className="mb-4 px-4 py-2.5 rounded-none bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-none bg-rose-400 animate-pulse" />
              Timer runs in background — tab title shows countdown
            </div>
          )}

          <div className="flex rounded-none border border-border p-1 bg-muted/30 mb-6">
            {(["focus","shortBreak","longBreak"] as TimerMode[]).map(m => (
              <button key={m} onClick={() => handleModeChange(m)}
                className={cn("flex-1 py-2 text-xs font-medium rounded-none transition-all", mode===m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {m==="focus" ? "Focus" : m==="shortBreak" ? "Short Break" : "Long Break"}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center mb-8">
            <div className="relative w-52 h-52 mb-5">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
                <circle cx="60" cy="60" r="54" fill="none" stroke={cur.ring} strokeWidth="5"
                  strokeDasharray={circ} strokeDashoffset={circ - (circ * progress) / 100}
                  strokeLinecap="round" className="transition-all duration-1000"
                  style={{filter:`drop-shadow(0 0 8px ${cur.ring}60)`}} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-5xl font-bold font-mono tabular-nums tracking-tight", cur.color)}>{mins}:{secs}</span>
                <span className="text-xs text-muted-foreground mt-1 font-medium">{cur.label}</span>
                {sessions > 0 && <span className="text-xs text-muted-foreground mt-0.5">🍅 {sessions} sessions</span>}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setIsRunning(false); setSeconds(totalSeconds); beep.stopLoop(); setAlarmActive(false) }}
                className="w-11 h-11 rounded-none border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={handleStart}
                className={cn("w-32 h-11 rounded-none font-semibold text-sm flex items-center justify-center gap-2 text-white transition-all shadow-lg",
                  `bg-gradient-to-r ${cur.grad}`, isRunning ? "opacity-90 hover:opacity-100" : "hover:scale-105")}>
                {isRunning ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Start</>}
              </button>
              <button onClick={() => { if (Notification.permission === "default") Notification.requestPermission() }}
                className="w-11 h-11 rounded-none border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                title="Enable notifications">
                <Bell className="h-4 w-4" />
              </button>
            </div>

            {alarmActive && (
              <div className="mt-4 w-full space-y-2 px-4 py-3 rounded-none bg-rose-500/15 border border-rose-500/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <AlarmClock className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="text-sm font-semibold text-rose-400 flex-1">
                    {mode === "focus" ? "🎉 Session complete! Take a break." : "⚡ Break over — time to focus!"}
                  </span>
                  <button onClick={() => dismissAlarm(false)} className="px-3 py-1.5 rounded-none bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors shrink-0">Dismiss</button>
                </div>
                <button onClick={() => dismissAlarm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-none border border-rose-500/30 text-xs text-rose-300 hover:bg-rose-500/10 transition-colors">
                  <Coffee className="h-3.5 w-3.5" /> Snooze 5 min
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4 italic text-center max-w-xs">"{quote}"</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Sessions", val: sessions },
              { label: "Focused", val: `${todayFocusMins}m` },
              { label: "Streak", val: "12🔥" },
            ].map(item => (
              <Card key={item.label} className="border-border">
                <CardContent className="p-3 text-center">
                  <p className="text-xl font-bold">{item.val}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {showSettings && (
            <Card className="border-border">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Settings</CardTitle>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {([
                  { key: "focusMinutes" as const, label: "Focus duration (min)", min: 1, max: 90 },
                  { key: "shortBreakMinutes" as const, label: "Short break (min)", min: 1, max: 30 },
                  { key: "longBreakMinutes" as const, label: "Long break (min)", min: 5, max: 60 },
                  { key: "sessionsUntilLongBreak" as const, label: "Sessions until long break", min: 1, max: 10 },
                ]).map(({ key, label, min, max }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <Label className="text-sm text-muted-foreground">{label}</Label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSettings(s => ({ ...s, [key]: Math.max(min, s[key]-1) }))} className="w-7 h-7 rounded-none border border-border flex items-center justify-center text-sm hover:bg-muted">−</button>
                      <span className="w-8 text-center text-sm font-mono font-medium">{settings[key]}</span>
                      <button onClick={() => setSettings(s => ({ ...s, [key]: Math.min(max, s[key]+1) }))} className="w-7 h-7 rounded-none border border-border flex items-center justify-center text-sm hover:bg-muted">+</button>
                    </div>
                  </div>
                ))}
                {([
                  { key: "autoStartBreaks" as const, label: "Auto-start breaks" },
                  { key: "autoStartFocus" as const, label: "Auto-start focus sessions" },
                  { key: "autoSnooze" as const, label: "Auto-dismiss alarm after 30s" },
                ]).map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">{label}</Label>
                    <button onClick={() => setSettings(s => ({ ...s, [key]: !s[key] }))}
                      className={cn("w-10 h-5 rounded-none transition-colors relative", settings[key] ? "bg-primary" : "bg-muted border border-border")}>
                      <div className={cn("w-4 h-4 rounded-none bg-white shadow-sm absolute top-0.5 transition-transform", settings[key] ? "left-5" : "left-0.5")} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
