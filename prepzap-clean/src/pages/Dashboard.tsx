import React, { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { TrendingUp, Award, Plus, Check, X, Zap as ZapIcon, LogOut } from "lucide-react"
import { BottomNav } from "@/components/BottomNav"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { levelFromXp, xpToNextLevel, xpProgressPercent, tierFromLevel, tierEmojiFromLevel } from "@/lib/xp"

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

// ─── Data Types ───────────────────────────────────────────────────────────────
interface CheckItem    { id: string; text: string; done: boolean }
interface ActivityItem { id: string; label: string; score: string; created_at: string }
interface WeakArea     { subject: string; accuracy: number }
interface Achievement  { key: string; icon: string; label: string; earned: boolean }
interface VideoSpot { id: string; title: string; url: string; thumb: string; source: "default" | "custom" }
interface StudySession {
  id: string
  title: string
  date: string
  duration_minutes: number
  color: string
}

// ─── Fox Avatar SVG ───────────────────────────────────────────────────────────
function FoxAvatar({ size = 80 }: { size?: number }) {
  const s = size / 100
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      {/* Body */}
      <ellipse cx="50" cy="68" rx="34" ry="26" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      {/* Head */}
      <ellipse cx="50" cy="48" rx="28" ry="26" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      {/* Ears */}
      <ellipse cx="29" cy="24" rx="10" ry="13" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      <ellipse cx="71" cy="24" rx="10" ry="13" fill="#f4803a" stroke="#1a0000" strokeWidth="2.5"/>
      <ellipse cx="29" cy="22" rx="5" ry="8" fill="#e06060"/>
      <ellipse cx="71" cy="22" rx="5" ry="8" fill="#e06060"/>
      {/* Eyes */}
      <ellipse cx="40" cy="46" rx="5.5" ry="7" fill="#1a0000"/>
      <ellipse cx="60" cy="46" rx="5.5" ry="7" fill="#1a0000"/>
      <ellipse cx="41.5" cy="44" rx="2" ry="3" fill="white"/>
      <ellipse cx="61.5" cy="44" rx="2" ry="3" fill="white"/>
      {/* Nose */}
      <ellipse cx="50" cy="55" rx="4" ry="2.5" fill="#c05020" stroke="#1a0000" strokeWidth="1.5"/>
      {/* Smile */}
      <path d="M41 59 Q50 64 59 59" stroke="#1a0000" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Grad cap brim */}
      <rect x="26" y="29" width="48" height="7" rx="3" fill="#1a0000"/>
      {/* Grad cap top */}
      <rect x="30" y="15" width="40" height="17" rx="4" fill="#1a0000"/>
      <rect x="32" y="16" width="36" height="14" rx="3" fill="#222"/>
      {/* Tassel string */}
      <line x1="46" y1="15" x2="42" y2="4" stroke="#1a0000" strokeWidth="2"/>
      {/* Tassel ball */}
      <circle cx="41" cy="3" r="3" fill={GOLD} stroke="#1a0000" strokeWidth="1.5"/>
    </svg>
  )
}

// ─── Tool icon map ────────────────────────────────────────────────────────────
const Ic = (d: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={GOLD}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)
const ICONS: Record<string, React.ReactNode> = {
  "BrainBot":      Ic(<><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M12 3v3M9 9V7a3 3 0 016 0v2"/><circle cx="9.5" cy="14" r="0.8" fill={GOLD}/><circle cx="14.5" cy="14" r="0.8" fill={GOLD}/></>),
  "Practice":      Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 9h6M9 12h6M9 15h4"/></>),
  "Flashcards":    Ic(<><rect x="2" y="5" width="10" height="14" rx="1"/><rect x="12" y="5" width="10" height="14" rx="1"/></>),
  "Feynman":       Ic(<><path d="M12 2L8 10H3l7 6-3 8 5-4 5 4-3-8 7-6h-5z"/></>),
  "Math Solver":   Ic(<><path d="M4 20h4l10-10-4-4L4 16v4z"/><line x1="14" y1="6" x2="18" y2="10"/></>),
  "Daily Quiz":    Ic(<><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  "Error Hunt":    Ic(<><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>),
  "Mind Map":      Ic(<><circle cx="6" cy="12" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><line x1="8" y1="11" x2="16" y2="7"/><line x1="8" y1="13" x2="16" y2="17"/></>),
  "Concepts":      Ic(<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 12h6M12 9v6"/></>),
  "Roadmap":       Ic(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
  "Pomodoro":      Ic(<><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></>),
  "Progress":      Ic(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  "Sources":       Ic(<><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>),
  "Cram Mode":     Ic(<><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></>),
  "Confidence":    Ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
  "High Yield":    Ic(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>),
  "Mistakes":      Ic(<><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill={GOLD}/></>),
  "Recall Mode":   Ic(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>),
  "Study DNA":     Ic(<><path d="M6 3c0 6 12 6 12 12S6 21 6 21"/><path d="M18 3c0 6-12 6-12 12s12 6 12 6"/></>),
  "Visual Learner":Ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>),
  "Flip Script":   Ic(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><line x1="9" y1="10" x2="15" y2="10"/></>),
  "Focus State":   Ic(<><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></>),
  "Boss Round":    Ic(<><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>),
  "Go Pro":        Ic(<><path d="M3 17l3-8 6 4 6-4 3 8H3z"/><line x1="3" y1="19" x2="21" y2="19"/></>),
  "Settings":      Ic(<><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>),
}

const quickActions = [
  { href:"/ai-tutor",       label:"BrainBot",       description:"Ask anything, anytime" },
  { href:"/practice",       label:"Practice",        description:"AI question sets" },
  { href:"/flashcards",     label:"Flashcards",      description:"Spaced repetition" },
  { href:"/daily5",         label:"Daily Quiz",      description:"Quick daily rounds" },
  { href:"/cram",           label:"Cram Mode",       description:"Emergency study plan" },
  { href:"/recall",         label:"Recall Mode",     description:"Type from memory" },
  { href:"/confidence",     label:"Confidence",      description:"Know what you know" },
  { href:"/high-yield",     label:"High Yield",      description:"Most testable concepts" },
  { href:"/feynman",        label:"Feynman",         description:"Teach it to learn it" },
  { href:"/math",           label:"Math Solver",     description:"Step-by-step solutions" },
  { href:"/spot-error",     label:"Error Hunt",      description:"Find & fix mistakes" },
  { href:"/blank-map",      label:"Mind Map",        description:"Map & connect ideas" },
  { href:"/build-def",      label:"Concepts",        description:"Build definitions" },
  { href:"/tool-architect", label:"Roadmap",         description:"Zero to mastery" },
  { href:"/mistakes",       label:"Mistakes",        description:"Track & fix errors" },
  { href:"/visual-learner", label:"Visual Learner",  description:"See it to remember" },
  { href:"/flip-script",    label:"Flip Script",     description:"Rewrite to understand" },
  { href:"/focus-state",    label:"Focus State",     description:"Deep focus mode" },
  { href:"/boss-round",     label:"Boss Round",      description:"Ultimate challenge" },
  { href:"/sources",        label:"Sources",         description:"Your study files" },
  { href:"/timer",          label:"Pomodoro",        description:"Focus timer" },
  { href:"/analytics",      label:"Progress",        description:"Track performance" },
  { href:"/study-dna",      label:"Study DNA",       description:"Your learner profile" },
  { href:"/settings",       label:"Settings",        description:"Preferences & plan" },
  { href:"/pricing",        label:"Go Pro",          description:"Unlock everything" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "just now"
  if (d < 60) return `${d}m ago`
  if (d < 1440) return `${Math.floor(d / 60)}h ago`
  return `${Math.floor(d / 1440)}d ago`
}
function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

// ─── Card style ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: SURF,
  border: `2px solid ${BORDER}`,
  borderRadius: 14,
}

// ─── Section title ────────────────────────────────────────────────────────────
function SecTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 15, color: GOLD }}>{children}</span>
      <div style={{ flex: 1, height: 2, background: BORDER, borderRadius: 2 }}/>
    </div>
  )
}

// ─── Achievement icons ────────────────────────────────────────────────────────
function AchievementIcon({ id, earned }: { id: string; earned: boolean }) {
  const color = earned ? GOLD : "#3a1020"
  const icons: Record<string, React.ReactNode> = {
    target: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/></svg>,
    flame:  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><path d="M12 2c0 0-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg>,
    bolt:   <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    trophy: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><path d="M6 9H3V4h3M18 9h3V4h-3M6 9a6 6 0 0012 0M12 15v4M8 19h8"/></svg>,
    gem:    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/></svg>,
    book:   <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/></svg>,
  }
  return <>{icons[id] ?? icons.target}</>
}

// ─── Pomodoro Area preview places ────────────────────────────────────────────
const PLACES = [
  { label: "The Library",     desc: "Deep focus · No timer",  icon: "ti ti-books",          users: 3, locked: false },
  { label: "Fox Café",        desc: "Cozy · Pomodoro",        icon: "ti ti-coffee",          users: 1, locked: false },
  { label: "Scholar's Tower", desc: "Unlock at Level 5",      icon: "ti ti-building-castle", users: 0, locked: true  },
]

const DEFAULT_VIDEO_SPOTS: VideoSpot[] = [
  { id: "d1", title: "Pomodoro Lofi", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk", thumb: "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg", source: "default" },
  { id: "d2", title: "Deep Focus Music", url: "https://www.youtube.com/watch?v=lTRiuFIWV54", thumb: "https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg", source: "default" },
  { id: "d3", title: "Study With Me", url: "https://www.youtube.com/watch?v=5qap5aO4i9A", thumb: "https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg", source: "default" },
]

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [xp, setXp]                     = useState(0)
  const [streak, setStreak]             = useState(0)
  const [todayMin, setTodayMin]         = useState(0)
  const [weeklySessionCount, setWeeklySessionCount] = useState(0)
  const [qa, setQa]                     = useState(0)
  const [activity, setActivity]         = useState<ActivityItem[]>([])
  const [weak, setWeak]                 = useState<WeakArea[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAll, setShowAll]           = useState(false)
  const [avatarLabel, setAvatarLabel]   = useState("Avatar")

  const [checks, setChecks] = useState<CheckItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("pz_checklist") || "[]") } catch { return [] }
  })
  const [cInput, setCInput] = useState("")

  // Calendar state
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [calSelectedDate, setCalSelectedDate] = useState<string | null>(null)
  const [calSessions, setCalSessions]         = useState<StudySession[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([])

  const SESSION_PALETTE = ["#10b981","#3b82f6","#a855f7","#f59e0b","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316","#6366f1"]
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [sessionTitle,    setSessionTitle]    = useState("")
  const [sessionColor,    setSessionColor]    = useState(SESSION_PALETTE[0])
  const localDateStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
  const [sessionDate,     setSessionDate]     = useState(() => localDateStr())
  const [sessionDuration, setSessionDuration] = useState(30)
  const [videoSpots, setVideoSpots] = useState<VideoSpot[]>(() => {
    try {
      const raw = localStorage.getItem("pz_video_spots")
      if (!raw) return DEFAULT_VIDEO_SPOTS
      const parsed = JSON.parse(raw) as VideoSpot[]
      return parsed.length ? parsed : DEFAULT_VIDEO_SPOTS
    } catch {
      return DEFAULT_VIDEO_SPOTS
    }
  })
  const [videoTitle, setVideoTitle] = useState("")
  const [videoUrl, setVideoUrl] = useState("")

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
        setUpcomingSessions(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
        const newXp = xp + Math.round(sessionDuration / 2)
        setXp(newXp)
        await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id)
        await supabase.from("activity_log").insert({ user_id: user.id, label: `Study session: ${sessionTitle.trim()}`, score: `+${Math.round(sessionDuration/2)} XP` })
      }
    } catch (_err) {
      // Keep UI responsive even when save fails.
    }
    setShowSessionModal(false)
  }

  const deleteSession = async (id: string) => {
    await supabase.from("study_sessions").delete().eq("id", id)
    setCalSessions(prev => prev.filter(s => s.id !== id))
    setUpcomingSessions(prev => prev.filter(s => s.id !== id))
  }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase.from("study_sessions").select("*").eq("user_id", user.id).order("date")
      if (data) {
        const today = new Date().toISOString().slice(0, 10)
        setCalSessions(data)
        setUpcomingSessions(data.filter((s: StudySession) => s.date >= today))
      }
    }
    load()
  }, [user])

  useEffect(() => { localStorage.setItem("pz_checklist", JSON.stringify(checks)) }, [checks])
  useEffect(() => { localStorage.setItem("pz_video_spots", JSON.stringify(videoSpots)) }, [videoSpots])

  const addCheck    = () => { if (!cInput.trim()) return; setChecks(p => [...p, { id: Date.now().toString(), text: cInput.trim(), done: false }]); setCInput("") }
  const toggleCheck = (id: string) => setChecks(p => p.map(c => c.id === id ? { ...c, done: !c.done } : c))
  const removeCheck = (id: string) => setChecks(p => p.filter(c => c.id !== id))
  const addVideoSpot = () => {
    const title = videoTitle.trim()
    const url = videoUrl.trim()
    if (!title || !url) return
    const m = url.match(/(?:v=|youtu\.be\/)([\w-]{6,})/)
    const thumb = m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : "https://picsum.photos/seed/studenius/400/225"
    setVideoSpots(prev => [{ id: `c-${Date.now()}`, title, url, thumb, source: "custom" }, ...prev])
    setVideoTitle("")
    setVideoUrl("")
  }
  const resetVideoSpots = () => setVideoSpots(DEFAULT_VIDEO_SPOTS)
  const removeVideoSpot = (id: string) => setVideoSpots(prev => prev.filter(v => v.id !== id))

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      try {
        const { data: prof } = await supabase.from("profiles").select("xp,streak,plan").eq("id", user.id).maybeSingle()
        if (prof) { setXp(prof.xp ?? 0); setStreak(prof.streak ?? 0) }
        const d = new Date()
        const today = d.toISOString().slice(0, 10)
        const w = new Date(d); w.setDate(w.getDate() - 7)
        const weekAgo = w.toISOString().slice(0, 10)
        const { data: sess } = await supabase.from("study_sessions").select("duration_minutes").eq("user_id", user.id).gte("date", weekAgo)
        if (sess) setTodayMin(sess.reduce((s: number, r: { duration_minutes: number | null }) => s + (r.duration_minutes ?? 0), 0))
        const { data: acts } = await supabase.from("activity_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500)
        if (acts) setActivity(acts)
        const { data: ws } = await supabase.from("study_sessions").select("id").eq("user_id", user.id).gte("date", weekAgo)
        if (ws) setWeeklySessionCount(ws.length)
        const { data: ans } = await supabase.from("question_attempts").select("correct").eq("user_id", user.id).gte("created_at", today)
        if (ans) setQa(ans.length)
        const { data: wk } = await supabase.from("weak_areas").select("subject,accuracy").eq("user_id", user.id).order("accuracy").limit(4)
        if (wk) setWeak(wk)
      } catch (_err) {
        // Keep dashboard usable if one query fails.
      }
      setLoading(false)
    }
    load()
  }, [user])

  const level    = levelFromXp(xp)
  const tier     = tierFromLevel(level)
  const tierEmoji = tierEmojiFromLevel(level)
  const toNext   = xpToNextLevel(xp)
  const xpPct    = xpProgressPercent(xp)
  const dailyGoal = 60
  const dailyPct  = Math.min(100, Math.round(todayMin / dailyGoal * 100))

  const achievements: Achievement[] = [
    { key: "first", icon: "target", label: "First Step",   earned: xp > 0       },
    { key: "s3",    icon: "flame",  label: "3-Day Streak", earned: streak >= 3   },
    { key: "s7",    icon: "bolt",   label: "Week Strong",  earned: streak >= 7   },
    { key: "x500",  icon: "trophy", label: "500 XP",       earned: xp >= 500     },
    { key: "x1000", icon: "gem",    label: "1000 XP",      earned: xp >= 1000    },
    { key: "q50",   icon: "book",   label: "50 Qs",        earned: qa >= 50      },
  ]

  const displayName = (user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student").toUpperCase()
  const displayed   = showAll ? quickActions : quickActions.slice(0, 20)

  // Heatmap
  const heatmap = useMemo(() => {
    const dayCounts: Record<string, number> = {}
    activity.forEach(item => {
      const day = item.created_at.slice(0, 10)
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })
    const now = new Date()
    const cells: { date: string; level: string }[] = []
    for (let i = 90; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const count = dayCounts[key] || 0
      const lv = count === 0 ? "" : count === 1 ? "l1" : count <= 3 ? "l2" : count <= 6 ? "l3" : "l4"
      cells.push({ date: key, level: lv })
    }
    const firstDow = new Date(cells[0].date).getDay()
    const padEnd   = 6 - new Date(cells[cells.length - 1].date).getDay()
    return [
      ...Array(firstDow).fill({ date: "", level: "pad" }),
      ...cells,
      ...Array(padEnd).fill({ date: "", level: "pad" }),
    ]
  }, [activity])

  const heatmapCols = Math.ceil(heatmap.length / 7)

  const metrics = [
    { label: "Day Streak",    value: streak,                  sub: streak > 0 ? `${streak} days` : "Start today", accent: GOLD,
      icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round"><path d="M12 2c0 0-4 4-4 9a4 4 0 008 0c0-5-4-9-4-9z"/></svg> },
    { label: "Hrs / Week",    value: (todayMin / 60).toFixed(1), sub: `Goal: ${dailyGoal/60}h/wk`, accent: GOLD,
      icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> },
    { label: "Sessions",      value: weeklySessionCount,       sub: "This week", accent: GOLD,
      icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: "Goal",          value: `${dailyPct}%`,           sub: dailyPct > 0 ? "Keep going!" : "Set a goal", accent: GOLD,
      icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="7"/></svg> },
  ]

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', system-ui, sans-serif", position: "relative" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 54, borderBottom: `2px solid ${BORDER}`, background: "#1c0910", flexShrink: 0 }}>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: GOLD, letterSpacing: 1 }}>STUDENIUS</span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["Dashboard","Study Tools","Pomodoro Area","Shop","Pricing"].map((l, i) => (
            <Link key={l} to={i === 0 ? "/dashboard" : i === 1 ? "/ai-tutor" : i === 2 ? "/pomodoro-area" : i === 3 ? "/shop" : "/pricing"}
              style={{ color: i === 0 ? GOLD : TEXT2, fontSize: 12, fontWeight: 700, padding: "5px 12px", borderRadius: 20, textDecoration: "none", background: i === 0 ? MAROON : "transparent", transition: "all .2s" }}>
              {l}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: GOLD, color: BG, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            ⚡ {xp} XP
          </div>
          <div style={{ background: MAROON, border: `2px solid ${GOLD}`, borderRadius: 20, padding: "3px 12px 3px 5px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: GOLD, cursor: "pointer" }}
            onClick={() => navigate("/settings")}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#8b2030", border: `2px solid ${GOLD}`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FoxAvatar size={28}/>
            </div>
            {displayName}
          </div>
        </div>
      </nav>

      {/* ── BODY ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", height: "calc(100vh - 54px)" }}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <div className="sdn-sidebar" style={{ width: 160, background: "#1c0910", borderRight: `2px solid ${BORDER}`, padding: "14px 0", overflowY: "auto", flexShrink: 0 }}>
          {[
            { sec: "Study", items: [
              { href: "/dashboard",     label: "Dashboard",      icon: "ti ti-layout-dashboard" },
              { href: "/planner",       label: "Planner",        icon: "ti ti-calendar" },
              { href: "/ai-tutor",      label: "AI Tutor",       icon: "ti ti-brain" },
              { href: "/flashcards",    label: "Flashcards",     icon: "ti ti-cards" },
              { href: "/analytics",     label: "Analytics",      icon: "ti ti-chart-bar" },
            ]},
            { sec: "World", items: [
              { href: "/pomodoro-area", label: "Pomodoro Area",  icon: "ti ti-clock",          badge: "NEW" },
              { href: "/avatar",        label: "Avatar",         icon: "ti ti-shirt" },
              { href: "/shop",          label: "Shop",           icon: "ti ti-shopping-bag" },
            ]},
            { sec: "Account", items: [
              { href: "/settings",      label: "Settings",       icon: "ti ti-settings" },
            ]},
          ].map(group => (
            <div key={group.sec}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#6b3040", letterSpacing: "1.5px", padding: "0 14px", margin: "14px 0 5px", textTransform: "uppercase" }}>{group.sec}</div>
              {group.items.map(item => (
                <Link key={item.href} to={item.href} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: TEXT2, borderLeft: "3px solid transparent", transition: "all .15s", cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = SURF2; (e.currentTarget as HTMLElement).style.color = TEXT }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = TEXT2 }}>
                    <i className={item.icon} style={{ fontSize: 15 }}/>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {"badge" in item && item.badge && (
                      <span style={{ background: MAROON, color: GOLD, fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>{item.badge}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ))}
          {/* Sign out */}
          <div style={{ padding: "14px 14px 0", marginTop: 8, borderTop: `1px solid ${BORDER}` }}>
            <button onClick={async () => { await supabase.auth.signOut(); navigate("/login") }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "8px 0", background: "transparent", border: "none", color: TEXT3, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e84040")}
              onMouseLeave={e => (e.currentTarget.style.color = TEXT3)}>
              <LogOut size={13}/> Sign Out
            </button>
          </div>
        </div>

        {/* ── MAIN ─────────────────────────────────────────────────────────── */}
        <div className="sdn-main" style={{ flex: 1, overflowY: "auto", padding: "16px 12px 80px" }}>

          {/* Greeting */}
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, color: TEXT, marginBottom: 4 }}>{greeting()}, {displayName}</div>
          <div style={{ fontSize: 12, color: TEXT3, marginBottom: 20 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} &nbsp;·&nbsp; Level {level} — {tier} {tierEmoji}
          </div>

          {/* Study video carousel */}
          <div style={{ ...card, padding: 14, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <SecTitle>Study Video Carousel</SecTitle>
              <button onClick={resetVideoSpots} style={{ background: "transparent", border: `1.5px solid ${BORDER}`, color: TEXT3, borderRadius: 8, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                Reset Defaults
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={videoTitle}
                onChange={e => setVideoTitle(e.target.value)}
                placeholder="Video title"
                style={{ flex: 1, background: SURF2, border: `1.5px solid ${BORDER}`, color: TEXT, borderRadius: 8, fontSize: 11, padding: "7px 9px", outline: "none", fontFamily: "inherit" }}
              />
              <input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addVideoSpot()}
                placeholder="YouTube link"
                style={{ flex: 2, background: SURF2, border: `1.5px solid ${BORDER}`, color: TEXT, borderRadius: 8, fontSize: 11, padding: "7px 9px", outline: "none", fontFamily: "inherit" }}
              />
              <button
                onClick={addVideoSpot}
                style={{ background: GOLD, border: `2px solid ${GOLD}`, color: BG, borderRadius: 8, padding: "0 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Add
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x mandatory" }}>
              {videoSpots.map(v => (
                <a key={v.id} href={v.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", minWidth: 260, flex: "0 0 260px", scrollSnapAlign: "start" }}>
                  <div style={{ border: `2px solid ${BORDER}`, background: SURF2, borderRadius: 12, overflow: "hidden", position: "relative" }}>
                    <img src={v.thumb} alt={v.title} style={{ width: "100%", height: 130, objectFit: "cover", display: "block", filter: "saturate(0.85)" }} />
                    <div style={{ position: "absolute", top: 8, left: 8, background: MAROON, color: GOLD, fontSize: 9, fontWeight: 700, borderRadius: 999, padding: "2px 7px" }}>
                      {v.source === "custom" ? "Your pick" : "Default"}
                    </div>
                    {v.source === "custom" && (
                      <button
                        onClick={(e) => { e.preventDefault(); removeVideoSpot(v.id) }}
                        style={{ position: "absolute", top: 7, right: 7, background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 999, color: "#fff", width: 20, height: 20, cursor: "pointer", fontSize: 11, lineHeight: "20px" }}
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                    <div style={{ padding: "9px 10px" }}>
                      <div style={{ color: TEXT, fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>{v.title}</div>
                      <div style={{ color: TEXT3, fontSize: 10, marginTop: 3 }}>Click to open and study with this video</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="sdn-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}>
            {metrics.map(m => (
              <div key={m.label} style={{ ...card, padding: "18px 14px", textAlign: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: SURF2, border: `1.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>{m.icon}</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, color: GOLD, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 9, color: TEXT3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 5 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: TEXT2, marginTop: 3 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Calendar + Upcoming */}
          {(() => {
            const todayStr = localDateStr()
            const firstDay = new Date(calYear, calMonth, 1).getDay()
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
            const monthLabel = new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" })
            const sessByDate: Record<string, StudySession[]> = {}
            calSessions.forEach(s => { if (!sessByDate[s.date]) sessByDate[s.date] = []; sessByDate[s.date].push(s) })
            const selectedSessions = calSelectedDate ? (sessByDate[calSelectedDate] ?? []) : []
            const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else { setCalMonth(m => m - 1) } }
            const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else { setCalMonth(m => m + 1) } }
            return (
              <div className="sdn-cal-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div style={{ ...card, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{monthLabel}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["‹","›"].map((ch, i) => (
                        <button key={ch} onClick={i === 0 ? prevMonth : nextMonth}
                          style={{ width: 22, height: 22, border: `1.5px solid ${BORDER}`, background: "transparent", color: TEXT2, cursor: "pointer", fontSize: 14, borderRadius: 4, lineHeight: 1 }}>{ch}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, textAlign: "center" }}>
                    {["M","T","W","T","F","S","S"].map((d, i) => <div key={i} style={{ fontSize: 8, color: TEXT3, padding: "2px 0", textTransform: "uppercase" }}>{d}</div>)}
                    {Array(firstDay === 0 ? 6 : firstDay - 1).fill(null).map((_, i) => <div key={"pad"+i}/>)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1
                      const dateStr = `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
                      const isToday = dateStr === todayStr
                      const isSelected = dateStr === calSelectedDate
                      const dots = sessByDate[dateStr]?.slice(0, 3).map(s => s.color) ?? []
                      return (
                        <div key={day} onClick={() => setCalSelectedDate(isSelected ? null : dateStr)}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 10, padding: "4px 1px", borderRadius: 4, cursor: "pointer",
                            color: isSelected ? GOLD : isToday ? BG : TEXT2,
                            background: isSelected ? "rgba(240,160,64,0.2)" : isToday ? GOLD : "transparent",
                            fontWeight: isToday || isSelected ? 700 : 400, transition: "all .15s" }}>
                          {day}
                          {dots.length > 0 && <div style={{ display: "flex", gap: 1, marginTop: 1 }}>{dots.map((c, ci) => <div key={ci} style={{ width: 3, height: 3, borderRadius: "50%", background: isToday ? "rgba(0,0,0,0.4)" : c }}/>)}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div style={{ ...card, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    {calSelectedDate ? new Date(calSelectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>
                  {selectedSessions.length === 0 ? (
                    <div style={{ textAlign: "center", paddingTop: 12 }}>
                      <div style={{ fontSize: 11, color: TEXT3, marginBottom: 10 }}>No sessions — add one!</div>
                      <button onClick={() => openSessionModal(calSelectedDate ?? todayStr)}
                        style={{ background: "transparent", border: `1.5px solid ${BORDER}`, color: TEXT2, fontSize: 11, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", borderRadius: 8, fontWeight: 700, transition: "all .2s" }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = GOLD); (e.currentTarget.style.color = GOLD) }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = BORDER); (e.currentTarget.style.color = TEXT2) }}>
                        + Add Session
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedSessions.map(s => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", background: SURF2, borderRadius: 8, border: `1.5px solid ${BORDER}` }}>
                          <div style={{ width: 3, alignSelf: "stretch", background: s.color, borderRadius: 2, flexShrink: 0 }}/>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT }}>{s.title}</div>
                            <div style={{ fontSize: 9, color: TEXT3 }}>{s.duration_minutes < 60 ? `${s.duration_minutes}min` : `${s.duration_minutes/60}h`}</div>
                          </div>
                          <button onClick={() => deleteSession(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT3, padding: 2 }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#e84040")}
                            onMouseLeave={e => (e.currentTarget.style.color = TEXT3)}><X size={10}/></button>
                        </div>
                      ))}
                      <button onClick={() => openSessionModal(calSelectedDate ?? todayStr)}
                        style={{ background: "transparent", border: `1.5px dashed ${BORDER}`, color: TEXT3, fontSize: 10, padding: "5px 0", cursor: "pointer", fontFamily: "inherit", borderRadius: 8, fontWeight: 700, marginTop: 2, transition: "all .2s" }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = GOLD); (e.currentTarget.style.color = GOLD) }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = BORDER); (e.currentTarget.style.color = TEXT3) }}>
                        + Add another
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Checklist */}
          <div style={{ ...card, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <SecTitle>Today's Checklist</SecTitle>
              <span style={{ background: SURF2, color: GOLD, border: `1.5px solid ${BORDER}`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{checks.filter(c => c.done).length}/{checks.length}</span>
            </div>
            {checks.length === 0 && <div style={{ fontSize: 11, color: TEXT3, marginBottom: 8 }}>No tasks yet — add something to get started.</div>}
            {checks.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                <button onClick={() => toggleCheck(c.id)} style={{ width: 15, height: 15, borderRadius: 4, border: `2px solid ${c.done ? GOLD : BORDER}`, background: c.done ? GOLD : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
                  {c.done && <Check size={9} color={BG} strokeWidth={3}/>}
                </button>
                <span style={{ flex: 1, fontSize: 12, color: c.done ? TEXT3 : TEXT, textDecoration: c.done ? "line-through" : "none" }}>{c.text}</span>
                <button onClick={() => removeCheck(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT3, padding: 2 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#e84040")}
                  onMouseLeave={e => (e.currentTarget.style.color = TEXT3)}><X size={10}/></button>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", border: `1.5px solid ${BORDER}`, borderRadius: 8, background: SURF2 }}>
              <Plus size={11} color={TEXT3}/>
              <input value={cInput} onChange={e => setCInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addCheck()}
                placeholder="Add a task and press Enter..."
                style={{ background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 12, flex: 1, fontFamily: "inherit" }}/>
            </div>
          </div>

          {/* XP Bar */}
          <div style={{ ...card, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: GOLD }}>Level {level} — {tier} {tierEmoji}</span>
              <span style={{ background: SURF2, color: GOLD, border: `1.5px solid ${BORDER}`, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{xp.toLocaleString()} XP</span>
            </div>
            <div style={{ height: 8, background: SURF2, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              <div style={{ height: "100%", width: `${Math.max(0.4, xpPct)}%`, background: `linear-gradient(90deg, ${MAROON}, ${GOLD})`, borderRadius: 8, transition: "width .6s ease" }}/>
            </div>
            <div style={{ fontSize: 10, color: TEXT3, marginTop: 5 }}>{toNext} XP to Level {level + 1}</div>
          </div>

          {/* Quick Start */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <SecTitle>Quick Start</SecTitle>
            <button onClick={() => setShowAll(s => !s)} style={{ background: "none", border: "none", color: TEXT3, fontSize: 10, cursor: "pointer", fontWeight: 700 }}>
              {showAll ? "SHOW LESS" : `+${quickActions.length - 20} MORE`}
            </button>
          </div>
          <div className="sdn-quickstart tool-grid" style={{ marginBottom: 24 }}>
            {displayed.map((a, i) => (
              <Link to={a.href} key={i} style={{ textDecoration: "none" }}>
                <div style={{ ...card, padding: "16px 8px 14px", textAlign: "center", cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BORDHV; el.style.transform = "translateY(-3px)" }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BORDER; el.style.transform = "" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: SURF2, border: `1.5px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                    {ICONS[a.label] ?? <ZapIcon size={16} color={GOLD}/>}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>{a.label}</div>
                  <div style={{ fontSize: 9, color: TEXT3, marginTop: 2, lineHeight: 1.3 }}>{a.description}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pomodoro Area Preview */}
          <SecTitle>Pomodoro Area — Live Now</SecTitle>
          <div className="town-grid" style={{ marginBottom: 24 }}>
            {PLACES.map(p => (
              <Link key={p.label} to="/pomodoro-area" style={{ textDecoration: "none" }}>
                <div className={`place-card ${p.locked ? "locked" : ""}`}>
                  {!p.locked && p.users > 0 && (
                    <div style={{ position: "absolute", top: 10, right: 10, background: MAROON, color: GOLD, fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "2px 7px" }}>{p.users} studying</div>
                  )}
                  <i className={p.icon} style={{ fontSize: 32, color: p.locked ? TEXT3 : GOLD, display: "block", marginBottom: 10 }}/>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: TEXT }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: TEXT3, marginTop: 3 }}>{p.desc}</div>
                  {p.locked && (
                    <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 10, color: TEXT3, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                      <i className="ti ti-lock" style={{ fontSize: 10 }}/> Lv. 5
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Activity */}
          <div style={{ ...card, borderTop: `3px solid ${GOLD}`, padding: 16, marginBottom: 16 }}>
            <SecTitle><TrendingUp size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}/>Recent Activity</SecTitle>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{[1,2,3].map(i => <div key={i} style={{ height: 38, background: SURF2, borderRadius: 8 }}/>)}</div>
            ) : activity.length === 0 ? (
              <div style={{ fontSize: 11, textAlign: "center", padding: "12px 0", color: TEXT3 }}>No activity yet — start studying to see your history!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activity.slice(0, 8).map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: SURF2, borderRadius: 8, border: `1.5px solid ${BORDER}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, background: GOLD, borderRadius: "50%", flexShrink: 0 }}/>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{item.label}</div>
                        <div style={{ fontSize: 9, color: TEXT3 }}>{relTime(item.created_at)}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 7px", background: SURF, border: `1.5px solid ${BORDER}`, color: GOLD, borderRadius: 8, fontWeight: 700 }}>{item.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────── */}
        <div style={{ width: 200, background: "#1c0910", borderLeft: `2px solid ${BORDER}`, padding: 14, overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Avatar card */}
          <div style={{ ...card, padding: 14 }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: GOLD, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
              My{" "}
              <input
                className="editable-field"
                value={avatarLabel}
                onChange={e => setAvatarLabel(e.target.value)}
                maxLength={16}
                title="Click to rename"
                style={{ fontSize: 13, width: `${Math.max(4, avatarLabel.length + 1)}ch` }}
              />
              <i className="ti ti-pencil" style={{ fontSize: 10, color: TEXT3 }}/>
            </div>
            <div style={{ background: MAROON, borderRadius: 12, padding: 14, textAlign: "center", border: `2px solid #8b2030` }}>
              <FoxAvatar size={72}/>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 14, color: GOLD, marginTop: 6 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: TEXT2, marginTop: 2 }}>Bronze Fox · Lv. {level}</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: TEXT3, fontWeight: 700, marginBottom: 5 }}>
                <span>XP to Level {level + 1}</span><span>{xp} / {xp + toNext}</span>
              </div>
              <div style={{ height: 8, background: SURF2, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                <div style={{ height: "100%", width: `${Math.max(0.4, xpPct)}%`, background: `linear-gradient(90deg, ${MAROON}, ${GOLD})`, borderRadius: 8, transition: "width .6s" }}/>
              </div>
            </div>
          </div>

          {/* Today's Checklist mini */}
          <div style={{ ...card, padding: 14 }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: GOLD, marginBottom: 10 }}>Today's Checklist</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input type="text" placeholder="Quick add..." onKeyDown={e => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) { setChecks(p => [...p, { id: Date.now().toString(), text: (e.target as HTMLInputElement).value.trim(), done: false }]); (e.target as HTMLInputElement).value = "" } }}
                style={{ flex: 1, background: SURF2, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", fontSize: 11, color: TEXT, fontFamily: "inherit", outline: "none" }}/>
            </div>
            {checks.length === 0 && <div style={{ fontSize: 11, color: TEXT3 }}>No tasks yet</div>}
            {checks.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>
                <button onClick={() => toggleCheck(c.id)} style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${c.done ? GOLD : BORDER}`, background: c.done ? GOLD : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
                  {c.done && <Check size={8} color={BG} strokeWidth={3}/>}
                </button>
                <span style={{ flex: 1, color: c.done ? TEXT3 : TEXT, textDecoration: c.done ? "line-through" : "none", fontSize: 11 }}>{c.text}</span>
              </div>
            ))}
            {checks.length > 5 && <div style={{ fontSize: 10, color: TEXT3, marginTop: 5 }}>+{checks.length - 5} more</div>}
          </div>

          {/* Upcoming Sessions */}
          <div style={{ ...card, padding: 14 }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: GOLD, marginBottom: 10 }}>Upcoming Sessions</div>
            {upcomingSessions.length === 0 ? (
              <div style={{ fontSize: 11, color: TEXT3 }}>No sessions yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {upcomingSessions.slice(0, 4).map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }}/>
                    <span style={{ fontSize: 11, color: TEXT, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                    <span style={{ fontSize: 9, color: TEXT3 }}>{new Date(s.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => openSessionModal()}
              style={{ width: "100%", marginTop: 8, background: "transparent", border: `1.5px dashed ${BORDER}`, borderRadius: 8, padding: "6px 0", fontSize: 11, color: TEXT3, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = GOLD); (e.currentTarget.style.color = GOLD) }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = BORDER); (e.currentTarget.style.color = TEXT3) }}>
              + Add Session
            </button>
          </div>

          {/* Study Heatmap */}
          <div style={{ ...card, padding: 14 }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: GOLD, marginBottom: 10 }}>Study Heatmap</div>
            <div style={{ display: "grid", gridTemplateRows: "repeat(7,1fr)", gridTemplateColumns: `repeat(${heatmapCols},1fr)`, gridAutoFlow: "column", gap: 2 }}>
              {heatmap.map((cell, i) => (
                <div key={i} title={cell.date || undefined} style={{ aspectRatio: "1", borderRadius: 2,
                  background: cell.level === "l4" ? GOLD : cell.level === "l3" ? "#c07030" : cell.level === "l2" ? "#8b4020" : cell.level === "l1" ? "#4a2010" : cell.level === "pad" ? "transparent" : SURF2
                }}/>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 5 }}>
              <span style={{ fontSize: 8, color: TEXT3 }}>Less</span>
              {[SURF2,"#4a2010","#8b4020","#c07030",GOLD].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: 2, background: c }}/>)}
              <span style={{ fontSize: 8, color: TEXT3 }}>More</span>
            </div>
          </div>

          {/* Achievements */}
          <div style={{ ...card, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
              <Award size={12} color={TEXT3}/>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 13, color: GOLD }}>Achievements</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
              {achievements.map(a => (
                <div key={a.key} title={a.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 4px", background: a.earned ? SURF2 : "#1a0810", border: `1.5px solid ${a.earned ? BORDHV : BORDER}`, borderRadius: 8, opacity: a.earned ? 1 : 0.4, transition: "opacity .3s" }}>
                  <AchievementIcon id={a.icon} earned={a.earned}/>
                  <span style={{ fontSize: 8, fontWeight: 700, color: a.earned ? GOLD : TEXT3, textAlign: "center", lineHeight: 1.2 }}>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Session Modal ── */}
      {showSessionModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} onClick={() => setShowSessionModal(false)}/>
          <div style={{ position: "relative", width: "100%", maxWidth: 400, background: SURF, border: `2px solid ${BORDER}`, borderRadius: 16, padding: 22, zIndex: 10, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 16, color: GOLD }}>Add Study Session</span>
              <button onClick={() => setShowSessionModal(false)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 4 }}><X size={14}/></button>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>What are you studying?</div>
              <input autoFocus value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && saveSession()}
                placeholder="e.g. Chapter 5, Calculus problems..."
                style={{ width: "100%", background: SURF2, border: `1.5px solid ${BORDER}`, color: TEXT, fontSize: 12, padding: "8px 12px", fontFamily: "inherit", outline: "none", borderRadius: 8, boxSizing: "border-box" }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Color</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SESSION_PALETTE.map(c => (
                  <button key={c} onClick={() => setSessionColor(c)} style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: "none", cursor: "pointer", outline: sessionColor === c ? `2px solid ${c}` : "none", outlineOffset: 2, transform: sessionColor === c ? "scale(1.25)" : "scale(1)", transition: "transform .15s" }}/>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Date</div>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                  style={{ width: "100%", background: SURF2, border: `1.5px solid ${BORDER}`, color: TEXT, fontSize: 11, padding: "6px 10px", fontFamily: "inherit", outline: "none", borderRadius: 8, boxSizing: "border-box" }}/>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Duration</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[15,30,45,60,90,120].map(d => (
                    <button key={d} onClick={() => setSessionDuration(d)} style={{ padding: "3px 7px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", borderRadius: 6, transition: "all .15s", background: sessionDuration === d ? sessionColor : SURF2, color: sessionDuration === d ? "#fff" : TEXT2, border: `1.5px solid ${sessionDuration === d ? sessionColor : BORDER}` }}>
                      {d < 60 ? `${d}m` : `${d/60}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowSessionModal(false)}
                style={{ flex: 1, padding: "9px 0", background: "transparent", border: `1.5px solid ${BORDER}`, color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit", borderRadius: 8, fontWeight: 700, transition: "all .2s" }}>
                Cancel
              </button>
              <button onClick={saveSession} disabled={!sessionTitle.trim()}
                style={{ flex: 1, padding: "9px 0", background: sessionTitle.trim() ? sessionColor : SURF2, border: "none", color: sessionTitle.trim() ? "#fff" : TEXT3, fontSize: 12, fontWeight: 700, cursor: sessionTitle.trim() ? "pointer" : "default", fontFamily: "inherit", borderRadius: 8, transition: "all .2s" }}>
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Terms — required for Google Play Store approval */}
      <div style={{ textAlign: "center", padding: "10px 0 80px", borderTop: `1px solid ${BORDER}` }}>
        <Link to="/privacy" style={{ fontSize: 10, color: TEXT3, textDecoration: "none", marginRight: 20 }}>Privacy Policy</Link>
        <Link to="/terms" style={{ fontSize: 10, color: TEXT3, textDecoration: "none" }}>Terms of Service</Link>
      </div>

      <BottomNav/>
    </div>
  )
}
