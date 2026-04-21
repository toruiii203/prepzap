import { useState, useEffect, createContext, useContext } from "react"
import {
  CalendarDays, TrendingUp, Award, Target, ChevronRight,
  Plus, Check, Trash2, CheckSquare, ChevronLeft, X, Clock, Zap as ZapIcon
} from "lucide-react";
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"

// ─── Theme System ─────────────────────────────────────────────────────────────
type ThemeId = "obsidian" | "midnight" | "emerald" | "crimson"

interface LuxuryTheme {
  id: ThemeId
  label: string
  swatch: string      // solid dot color
  description: string
  vars: Record<string, string>
  accentA: string
  accentB: string
  accentC: string
}

const THEMES: LuxuryTheme[] = [
  {
    id: "obsidian",
    label: "Obsidian",
    swatch: "#C0A060",
    description: "Pure black · Gold accents",
    accentA: "#C0A060", accentB: "#E8C87A", accentC: "#9A7840",
    vars: {
      "--pz-bg":        "#000000",
      "--pz-surface":   "#0a0a0a",
      "--pz-surface2":  "#111111",
      "--pz-surface3":  "#181818",
      "--pz-border":    "rgba(192,160,96,0.12)",
      "--pz-border-hv": "rgba(192,160,96,0.28)",
      "--pz-text":      "#F0E8D4",
      "--pz-text-2":    "rgba(240,232,212,0.55)",
      "--pz-text-muted":"rgba(240,232,212,0.28)",
      "--pz-gold":      "#C0A060",
      "--pz-gold-dim":  "rgba(192,160,96,0.08)",
      "--pz-gold-glow": "rgba(192,160,96,0.05)",
      "--pz-teal":      "#C0A060",
      "--pz-teal-dim":  "rgba(192,160,96,0.06)",
      "--pz-violet":    "#A08040",
      "--pz-violet-dim":"rgba(160,128,64,0.07)",
      "--pz-rose":      "#9A7840",
      "--pz-amber":     "#E8C87A",
    }
  },
  {
    id: "midnight",
    label: "Midnight",
    swatch: "#6C8EEF",
    description: "Deep navy · Sapphire accents",
    accentA: "#4A6CF7", accentB: "#9BB5FF", accentC: "#2D4ED8",
    vars: {
      "--pz-bg":        "#050810",
      "--pz-surface":   "#0A0F1E",
      "--pz-surface2":  "#0F1628",
      "--pz-surface3":  "#151D34",
      "--pz-border":    "rgba(74,108,247,0.14)",
      "--pz-border-hv": "rgba(74,108,247,0.32)",
      "--pz-text":      "#E8EEFF",
      "--pz-text-2":    "rgba(232,238,255,0.55)",
      "--pz-text-muted":"rgba(232,238,255,0.28)",
      "--pz-gold":      "#6C8EEF",
      "--pz-gold-dim":  "rgba(74,108,247,0.10)",
      "--pz-gold-glow": "rgba(74,108,247,0.06)",
      "--pz-teal":      "#9BB5FF",
      "--pz-teal-dim":  "rgba(155,181,255,0.08)",
      "--pz-violet":    "#4A6CF7",
      "--pz-violet-dim":"rgba(74,108,247,0.08)",
      "--pz-rose":      "#7B9CFF",
      "--pz-amber":     "#A8C0FF",
    }
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: "#2ECC8A",
    description: "Dark forest · Emerald accents",
    accentA: "#2ECC8A", accentB: "#00FF9D", accentC: "#1A9966",
    vars: {
      "--pz-bg":        "#030A06",
      "--pz-surface":   "#060F08",
      "--pz-surface2":  "#0A1810",
      "--pz-surface3":  "#0F2018",
      "--pz-border":    "rgba(46,204,138,0.12)",
      "--pz-border-hv": "rgba(46,204,138,0.28)",
      "--pz-text":      "#D4F5E6",
      "--pz-text-2":    "rgba(212,245,230,0.55)",
      "--pz-text-muted":"rgba(212,245,230,0.28)",
      "--pz-gold":      "#2ECC8A",
      "--pz-gold-dim":  "rgba(46,204,138,0.08)",
      "--pz-gold-glow": "rgba(46,204,138,0.05)",
      "--pz-teal":      "#00FF9D",
      "--pz-teal-dim":  "rgba(0,255,157,0.07)",
      "--pz-violet":    "#1A9966",
      "--pz-violet-dim":"rgba(26,153,102,0.08)",
      "--pz-rose":      "#44E8A0",
      "--pz-amber":     "#80FFD0",
    }
  },
  {
    id: "crimson",
    label: "Crimson",
    swatch: "#E84040",
    description: "Black onyx · Ruby accents",
    accentA: "#E84040", accentB: "#FF7070", accentC: "#C02020",
    vars: {
      "--pz-bg":        "#060202",
      "--pz-surface":   "#0F0505",
      "--pz-surface2":  "#180808",
      "--pz-surface3":  "#200C0C",
      "--pz-border":    "rgba(232,64,64,0.12)",
      "--pz-border-hv": "rgba(232,64,64,0.28)",
      "--pz-text":      "#FFE8E8",
      "--pz-text-2":    "rgba(255,232,232,0.55)",
      "--pz-text-muted":"rgba(255,232,232,0.28)",
      "--pz-gold":      "#E84040",
      "--pz-gold-dim":  "rgba(232,64,64,0.08)",
      "--pz-gold-glow": "rgba(232,64,64,0.05)",
      "--pz-teal":      "#FF7070",
      "--pz-teal-dim":  "rgba(255,112,112,0.07)",
      "--pz-violet":    "#C02020",
      "--pz-violet-dim":"rgba(192,32,32,0.08)",
      "--pz-rose":      "#FF5555",
      "--pz-amber":     "#FF9090",
    }
  },
]

const ThemeCtx = createContext<{ theme: LuxuryTheme; setTheme: (t: LuxuryTheme) => void }>({ theme: THEMES[0], setTheme: () => {} })

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@keyframes pzGradShift{0%{background-position:0% center}100%{background-position:300% center}}
@keyframes pzGoldShift{0%{background-position:0% center}100%{background-position:300% center}}
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const I = ({ c, children }: { c: string; children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const ICONS: Record<string, React.ReactNode> = {
  "DailyZap":       <I c="#A855F7"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></I>,
  "ErrorSnap":      <I c="#00CFFF"><circle cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="3" strokeDasharray="2 2"/><line x1="11" y1="8" x2="11" y2="6"/><line x1="14" y1="11" x2="16" y2="11"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></I>,
  "Define":         <I c="#FF2DAF"><path d="M4 19V6a2 2 0 012-2h12a2 2 0 012 2v13"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></I>,
  "MindMap":        <I c="#A855F7"><circle cx="12" cy="12" r="2"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/><line x1="12" y1="12" x2="4" y2="6"/><line x1="12" y1="12" x2="20" y2="6"/><line x1="12" y1="12" x2="4" y2="18"/><line x1="12" y1="12" x2="20" y2="18"/></I>,
  "Apex":           <I c="#FFD700"><path d="M8 21h8M12 21v-4"/><path d="M5 6l2 7h10l2-7"/><path d="M5 6c-2 0-2-2 0-2h14c2 0 2 2 0 2"/></I>,
  "Practice":       <I c="#00CFFF"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="#00CFFF"/></I>,
  "Flashcards":     <I c="#FF2DAF"><rect x="5" y="7" width="14" height="10" rx="1"/><rect x="3" y="5" width="14" height="10" rx="1"/><line x1="6" y1="9" x2="13" y2="9"/><line x1="6" y1="12" x2="11" y2="12"/></I>,
  "Timer":          <I c="#A855F7"><circle cx="12" cy="13" r="8"/><line x1="12" y1="13" x2="12" y2="9"/><line x1="12" y1="13" x2="15" y2="15"/><line x1="9" y1="3" x2="15" y2="3"/><line x1="12" y1="5" x2="12" y2="2"/></I>,
  "BrainBot":       <I c="#00CFFF"><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M12 3v3M9 9V7a3 3 0 016 0v2"/><circle cx="9.5" cy="14" r="1" fill="#00CFFF"/><circle cx="14.5" cy="14" r="1" fill="#00CFFF"/><line x1="12" y1="17" x2="12" y2="19"/></I>,
  "Feynman Mode":   <I c="#FFD700"><path d="M4 17l8-14 8 14H4z"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></I>,
  "MathZap":        <I c="#FF2DAF"><path d="M8 4l-6 8 6 8"/><path d="M16 4l6 8-6 8"/><line x1="3" y1="12" x2="21" y2="12"/></I>,
  "Progress":       <I c="#A855F7"><rect x="3" y="3" width="18" height="18" rx="1"/><rect x="6" y="12" width="2" height="6"/><rect x="10" y="9" width="2" height="9"/><rect x="14" y="6" width="2" height="12"/><path d="M6 10l4-3 4 2 4-4" strokeWidth="1.2"/></I>,
  "Link":           <I c="#00CFFF"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="2"/><line x1="5" y1="5" x2="19" y2="5"/><line x1="5" y1="5" x2="5" y2="19"/><line x1="19" y1="5" x2="19" y2="19"/><line x1="5" y1="19" x2="19" y2="19"/><line x1="12" y1="12" x2="5" y2="5"/><line x1="12" y1="12" x2="19" y2="5"/><line x1="12" y1="12" x2="5" y2="19"/><line x1="12" y1="12" x2="19" y2="19"/></I>,
  "Why Engine":     <I c="#FFD700"><rect x="3" y="14" width="18" height="6" rx="1"/><line x1="8" y1="14" x2="8" y2="11"/><line x1="16" y1="14" x2="16" y2="11"/><line x1="8" y1="11" x2="16" y2="11"/><circle cx="12" cy="9" r="2"/><circle cx="12" cy="9" r="0.8" fill="#FFD700" stroke="none"/></I>,
  "Roadmap":        <I c="#FF2DAF"><polyline points="3,12 6,7 9,12 12,4 15,12 18,8 21,12"/></I>,
  "ZapQuiz":        <I c="#A855F7"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2.5-2.5 4.5"/><circle cx="12" cy="17.5" r="0.7" fill="#A855F7"/></I>,
  "Source Library": <I c="#00CFFF"><path d="M3 7l3-3h12l3 3v13H3z"/><line x1="7" y1="11" x2="17" y2="11"/><line x1="7" y1="14" x2="14" y2="14"/><line x1="7" y1="17" x2="11" y2="17"/></I>,
  "Suggestions":    <I c="#FFD700"><circle cx="12" cy="12" r="4"/>{[0,45,90,135,180,225,270,315].map((a,k)=><line key={k} x1={12+7*Math.cos(a*Math.PI/180)} y1={12+7*Math.sin(a*Math.PI/180)} x2={12+9.5*Math.cos(a*Math.PI/180)} y2={12+9.5*Math.sin(a*Math.PI/180)}/>)}</I>,
  "Settings":       <I c="#A855F7"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></I>,
  "Go Pro":         <I c="#FFD700"><path d="M3 17l3-8 6 4 6-4 3 8H3z"/><line x1="3" y1="19" x2="21" y2="19"/></I>,
}

// ─── Theme Pill ───────────────────────────────────────────────────────────────
export function ThemePill() {
  const { theme, setTheme } = useContext(ThemeCtx)
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", background:"var(--pz-surface3)", border:"1px solid var(--pz-border)" }}>
      <span style={{ fontSize:"8.5px", color:"var(--pz-text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, whiteSpace:"nowrap" }}>THEME</span>
      <div style={{ display:"flex", gap:5, alignItems:"center" }}>
        {THEMES.map(t => {
          const isActive = theme.id === t.id
          return (
            <button
              key={t.id}
              title={`${t.label} — ${t.description}`}
              onClick={() => setTheme(t)}
              style={{
                width: isActive ? 15 : 12,
                height: isActive ? 15 : 12,
                borderRadius: "50%",
                background: t.swatch,
                border: isActive ? `2px solid ${t.swatch}` : "2px solid rgba(255,255,255,0.12)",
                outline: isActive ? `2px solid ${t.swatch}40` : "none",
                outlineOffset: "2px",
                boxShadow: isActive ? `0 0 8px ${t.swatch}60` : "none",
                transition: "all 0.2s ease",
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Tool grid ────────────────────────────────────────────────────────────────
const quickActions = [
  { href:"/daily5",         label:"DailyZap",       description:"5 Qs in 3 min",         isNew:true   },
  { href:"/spot-error",     label:"ErrorSnap",      description:"Find the mistakes",      isNew:true   },
  { href:"/build-def",      label:"Define",         description:"Write from memory",      isNew:true   },
  { href:"/blank-map",      label:"MindMap",        description:"Draw connections",       isNew:true   },
  { href:"/boss-round",     label:"Apex",           description:"10 hard Qs for XP",     isNew:true   },
  { href:"/practice",       label:"Practice",       description:"AI question sets"                     },
  { href:"/flashcards",     label:"Flashcards",     description:"Spaced repetition"                    },
  { href:"/timer",          label:"Timer",          description:"Pomodoro + sounds"                    },
  { href:"/ai-tutor",       label:"BrainBot",       description:"Ask anything"                         },
  { href:"/feynman",        label:"Feynman Mode",   description:"Teach to master"                      },
  { href:"/math",           label:"MathZap",        description:"Step-by-step solutions"               },
  { href:"/analytics",      label:"Progress",       description:"Track progress"                       },
  { href:"/synthesis",      label:"Link",           description:"Connect concepts"                     },
  { href:"/why-engine",     label:"Why Engine",     description:"First-principles"                     },
  { href:"/tool-architect", label:"Roadmap",        description:"Zero to mastery"                      },
  { href:"/quiz-builder",   label:"ZapQuiz",        description:"Build your quiz"                      },
  { href:"/sources",        label:"Source Library", description:"Your study files"                     },
  { href:"/suggestions",    label:"Suggestions",    description:"Shape PrepZap"                        },
  { href:"/settings",       label:"Settings",       description:"Preferences & plan"                   },
  { href:"/pricing",        label:"Go Pro",         description:"Unlock everything",      isGoPro:true },
]

// ─── Static data ──────────────────────────────────────────────────────────────
const user = { name:"Migs", xp:2450, streak:12, plan:"free" as const, dailyGoalMinutes:60, todayMinutes:35, creditBalance:50 }

const recentActivity = [
  { label:"Completed 25 Biology questions", time:"2h ago",    score:"88%",      accent:"var(--pz-gold)"   },
  { label:"Flashcard session — Chemistry",  time:"4h ago",    score:"32 cards", accent:"var(--pz-teal)"   },
  { label:"Focus session — 25 min",         time:"Yesterday", score:"✅",       accent:"var(--pz-violet)" },
  { label:"Math Solver — Calculus",         time:"Yesterday", score:"Solved",   accent:"var(--pz-amber)"  },
]

const weakAreas = [
  { subject:"Organic Chemistry", accuracy:58, color:"var(--pz-text-muted)" },
  { subject:"Calculus",          accuracy:65, color:"var(--pz-text-2)"     },
  { subject:"Cell Biology",      accuracy:71, color:"var(--pz-text-2)"     },
]

const achievements = [
  { label:"7-Day Streak",  emoji:"🔥", earned:true  },
  { label:"100 Questions", emoji:"📚", earned:true  },
  { label:"First Exam",    emoji:"🎯", earned:true  },
  { label:"Top 10%",       emoji:"🏆", earned:false },
  { label:"30-Day Streak", emoji:"⚡", earned:false },
  { label:"Perfect Score", emoji:"⭐", earned:false },
]

// ─── Study Planner ────────────────────────────────────────────────────────────
const PALETTE = ["#10b981","#3b82f6","#a855f7","#f59e0b","#ef4444","#06b6d4","#ec4899"]
function todayStr() { return new Date().toISOString().split("T")[0] }

interface StudyEvent { id:string; title:string; date:string; duration:number; color:string; completed:boolean }
const SAMPLE_EVENTS: StudyEvent[] = [
  { id:"1", title:"Biology Review",    date:todayStr(), duration:60, color:"#10b981", completed:false },
  { id:"2", title:"Flashcard Session", date:todayStr(), duration:30, color:"#3b82f6", completed:true  },
  { id:"3", title:"Mock Exam — Math",  date:new Date(Date.now()+86400000).toISOString().split("T")[0], duration:90, color:"#a855f7", completed:false },
  { id:"4", title:"AI Tutor Session",  date:new Date(Date.now()+172800000).toISOString().split("T")[0], duration:45, color:"#f59e0b", completed:false },
]
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function StudyPlannerCard() {
  const [events, setEvents] = useState<StudyEvent[]>(() => { try { return JSON.parse(localStorage.getItem("pz_study_events")||"null")||SAMPLE_EVENTS } catch { return SAMPLE_EVENTS } })
  const [viewDate, setViewDate] = useState(new Date())
  const [sel, setSel] = useState(todayStr())
  const [modal, setModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newColor, setNewColor] = useState(PALETTE[0])
  const [newDur, setNewDur] = useState(30)
  useEffect(()=>{ localStorage.setItem("pz_study_events",JSON.stringify(events)) },[events])
  const yr=viewDate.getFullYear(), mo=viewDate.getMonth()
  const firstDay=new Date(yr,mo,1).getDay(), days=new Date(yr,mo+1,0).getDate(), today=todayStr()
  const ds=(d:number)=>`${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
  const evOn=(s:string)=>events.filter(e=>e.date===s)
  const selEvs=evOn(sel), done=selEvs.filter(e=>e.completed).length
  const upcoming=events.filter(e=>e.date>today&&!e.completed).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3)
  const S={background:"var(--pz-surface2)",border:"1px solid var(--pz-border)"} as React.CSSProperties
  return (
    <div className="rounded-none" style={S}>
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div><h2 className="text-xl font-bold" style={{color:"var(--pz-text)",fontFamily:"'DM Serif Display',serif"}}>Study Planner</h2><p className="text-xs mt-0.5 hidden sm:block" style={{color:"var(--pz-text-muted)"}}>Plan your sessions, hit your goals</p></div>
        <button onClick={()=>setModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-none text-xs md:text-sm font-semibold transition-opacity hover:opacity-80" style={{background:"var(--pz-teal)",color:"#0A0A0C"}}><Plus className="h-3 w-3 md:h-4 md:w-4"/>Add Session</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 py-4">
        {[{icon:"🔥",value:String(user.streak),label:"Day Streak"},{icon:"🕐",value:"12.5h",label:"Hours This Week"},{icon:"✅",value:"24",label:"Sessions Done"},{icon:"🎯",value:"78%",label:"Goal Completion"}].map(s=>(
          <div key={s.label} className="flex items-center gap-3 px-4 py-3 rounded-none" style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)"}}>
            <span className="text-xl">{s.icon}</span>
            <div><div className="text-xl font-bold" style={{color:"var(--pz-text)",fontFamily:"'DM Mono',monospace"}}>{s.value}</div><div className="text-[10px] leading-tight" style={{color:"var(--pz-text-muted)"}}>{s.label}</div></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-0 border-t" style={{borderColor:"var(--pz-border)"}}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" style={{color:"var(--pz-teal)"}}/><h3 className="font-semibold" style={{color:"var(--pz-text)"}}>{MONTHS[mo]} {yr}</h3></div>
            <div className="flex gap-1">
              <button onClick={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} className="w-7 h-7 rounded-none flex items-center justify-center" style={{border:"1px solid var(--pz-border)",color:"var(--pz-text-muted)"}}><ChevronLeft className="h-3.5 w-3.5"/></button>
              <button onClick={()=>setViewDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} className="w-7 h-7 rounded-none flex items-center justify-center" style={{border:"1px solid var(--pz-border)",color:"var(--pz-text-muted)"}}><ChevronRight className="h-3.5 w-3.5"/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-2">{DAY_LABELS.map(d=><div key={d} className="text-center text-xs font-medium py-1" style={{color:"var(--pz-text-muted)"}}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:days}).map((_,i)=>{
              const day=i+1,d=ds(day),evs=evOn(d),isT=d===today,isS=d===sel
              return <button key={day} onClick={()=>setSel(d)} className="flex flex-col items-center gap-0.5 py-1 rounded-none transition-all"
                style={{background:isS?"var(--pz-teal)":isT?"rgba(16,185,129,0.15)":"transparent",color:isS?"#0A0A0C":isT?"var(--pz-teal)":"var(--pz-text)"}}>
                <span className="text-xs font-medium w-7 h-7 flex items-center justify-center">{day}</span>
                <div className="flex gap-0.5 h-2 items-center">{evs.slice(0,3).map(ev=><div key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{background:isS?"rgba(0,0,0,0.4)":ev.color}}/>)}</div>
              </button>
            })}
          </div>
        </div>
        <div className="p-4 space-y-4" style={{borderLeft:"1px solid var(--pz-border)"}}>
          <div>
            <p className="font-semibold text-sm" style={{color:"var(--pz-text)"}}>{new Date(sel+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</p>
            {selEvs.length>0&&<div className="mt-1"><span className="text-[10px]" style={{color:"var(--pz-text-muted)"}}>{done}/{selEvs.length} done</span><div className="h-1 rounded-none mt-1" style={{background:"var(--pz-surface3)"}}><div className="h-full rounded-none" style={{width:`${selEvs.length?(done/selEvs.length)*100:0}%`,background:"var(--pz-teal)"}}/></div></div>}
          </div>
          <div className="space-y-2">
            {selEvs.length===0&&<p className="text-xs text-center py-4" style={{color:"var(--pz-text-muted)"}}>No sessions — add one!</p>}
            {selEvs.map(ev=>(
              <div key={ev.id} className="flex items-start gap-2.5 p-2.5 rounded-none group" style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)"}}>
                <button onClick={()=>setEvents(p=>p.map(e=>e.id===ev.id?{...e,completed:!e.completed}:e))} className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5" style={{background:ev.completed?ev.color:"transparent",borderColor:ev.completed?ev.color:"var(--pz-border)"}}>
                  {ev.completed&&<Check className="h-2.5 w-2.5 text-white"/>}
                </button>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate" style={{color:ev.completed?"var(--pz-text-muted)":"var(--pz-text)",textDecoration:ev.completed?"line-through":"none"}}>{ev.title}</p><div className="flex items-center gap-1 mt-0.5"><Clock className="h-2.5 w-2.5" style={{color:"var(--pz-text-muted)"}}/><span className="text-[10px]" style={{color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>{ev.duration}min</span></div></div>
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{background:ev.color}}/>
                <button onClick={()=>setEvents(p=>p.filter(e=>e.id!==ev.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{color:"var(--pz-text-muted)"}}><X className="h-3 w-3"/></button>
              </div>
            ))}
            <button onClick={()=>setModal(true)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-none text-xs"
              style={{border:"1px dashed var(--pz-border)",color:"var(--pz-text-muted)"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--pz-teal)";(e.currentTarget as HTMLElement).style.color="var(--pz-teal)"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--pz-border)";(e.currentTarget as HTMLElement).style.color="var(--pz-text-muted)"}}>
              <Plus className="h-3 w-3"/>Add another
            </button>
          </div>
          {upcoming.length>0&&<div><div className="flex items-center gap-1.5 mb-2"><span className="text-sm">🔔</span><span className="text-xs font-semibold" style={{color:"var(--pz-text)"}}>Upcoming</span></div><div className="space-y-1.5">{upcoming.map(ev=><div key={ev.id} className="flex items-center gap-2 px-2 py-1.5 rounded-none" style={{background:"var(--pz-surface3)"}}><div className="w-1.5 h-1.5 rounded-full" style={{background:ev.color}}/><span className="flex-1 text-xs truncate" style={{color:"var(--pz-text-2)"}}>{ev.title}</span><span className="text-[10px]" style={{color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>{new Date(ev.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span></div>)}</div></div>}
        </div>
      </div>
      {modal&&<><div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={()=>setModal(false)}/><div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 rounded-none shadow-2xl p-5 space-y-4" style={{background:"var(--pz-surface2)",border:"1px solid var(--pz-border)"}}><div className="flex items-center justify-between"><h3 className="font-semibold text-sm" style={{color:"var(--pz-text)"}}>Add Study Session</h3><button onClick={()=>setModal(false)} style={{color:"var(--pz-text-muted)"}}><X className="h-4 w-4"/></button></div><input autoFocus className="w-full px-3 py-2 rounded-none text-sm focus:outline-none" style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)",color:"var(--pz-text)"}} placeholder="Session title..." value={newTitle} onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&newTitle.trim()&&(setEvents(p=>[...p,{id:Date.now().toString(),title:newTitle.trim(),date:sel,duration:newDur,color:newColor,completed:false}]),setNewTitle(""),setModal(false))}/><div><p className="text-xs mb-2" style={{color:"var(--pz-text-muted)"}}>Duration</p><div className="flex gap-2 flex-wrap">{[15,25,30,45,60,90].map(d=><button key={d} onClick={()=>setNewDur(d)} className="px-2.5 py-1 rounded-none text-xs font-medium border" style={{background:newDur===d?"var(--pz-teal)":"var(--pz-surface3)",color:newDur===d?"#0A0A0C":"var(--pz-text-2)",borderColor:newDur===d?"var(--pz-teal)":"var(--pz-border)"}}>{d}m</button>)}</div></div><div><p className="text-xs mb-2" style={{color:"var(--pz-text-muted)"}}>Color</p><div className="flex gap-2">{PALETTE.map(c=><button key={c} onClick={()=>setNewColor(c)} className="w-5 h-5 rounded-full border-2" style={{background:c,borderColor:newColor===c?"white":"transparent"}}/>)}</div></div><div className="flex gap-2 pt-1"><button onClick={()=>{if(!newTitle.trim())return;setEvents(p=>[...p,{id:Date.now().toString(),title:newTitle.trim(),date:sel,duration:newDur,color:newColor,completed:false}]);setNewTitle("");setModal(false)}} className="flex-1 py-2 rounded-none text-sm font-semibold" style={{background:"var(--pz-teal)",color:"#0A0A0C"}}>Add Session</button><button onClick={()=>setModal(false)} className="flex-1 py-2 rounded-none text-sm" style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)",color:"var(--pz-text-muted)"}}>Cancel</button></div></div></>}
    </div>
  )
}

// ─── Checklist ────────────────────────────────────────────────────────────────
interface CheckTask { id:string; text:string; done:boolean }
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]

function ChecklistCard() {
  const [tasks,setTasks]=useState<CheckTask[]>(()=>{ try{return JSON.parse(localStorage.getItem("pz_dashboard_checklist")||"[]")}catch{return []} })
  const [newTask,setNewTask]=useState("")
  const todayIdx=(new Date().getDay()||7)-1
  useEffect(()=>{ localStorage.setItem("pz_dashboard_checklist",JSON.stringify(tasks)) },[tasks])
  const add=()=>{ if(!newTask.trim())return; setTasks(t=>[...t,{id:Date.now().toString(),text:newTask.trim(),done:false}]); setNewTask("") }
  return (
    <div className="p-5 rounded-none" style={{background:"var(--pz-surface2)",border:"1px solid var(--pz-border)"}}>
      <div className="flex items-center gap-2 mb-3"><CheckSquare className="h-4 w-4" style={{color:"var(--pz-text-2)"}}/><h2 className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Today's Checklist</h2><span className="ml-auto text-xs" style={{color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>{tasks.filter(t=>t.done).length}/{tasks.length}</span></div>
      <div className="flex justify-between mb-4">{DAYS.map((d,i)=>{ const dateNum=new Date(Date.now()+(i-todayIdx)*86400000).getDate(); return <div key={d} className="flex flex-col items-center gap-1"><span className="text-[10px]" style={{color:i===todayIdx?"var(--pz-teal)":"var(--pz-text-muted)"}}>{d}</span><div className="w-7 h-7 rounded-none flex items-center justify-center text-xs font-semibold" style={{background:i===todayIdx?"var(--pz-teal)":"var(--pz-surface3)",color:i===todayIdx?"#0A0A0C":"var(--pz-text-muted)",border:i===todayIdx?"none":"1px solid var(--pz-border)"}}>{dateNum}</div></div> })}</div>
      <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
        {tasks.map(t=><div key={t.id} className="flex items-center gap-2 group px-1"><button onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,done:!x.done}:x))} className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0" style={{background:t.done?"var(--pz-teal)":"transparent",borderColor:t.done?"var(--pz-teal)":"var(--pz-border)"}}>{t.done&&<Check className="h-2.5 w-2.5" style={{color:"#0A0A0C"}}/>}</button><span className="text-xs flex-1" style={{color:t.done?"var(--pz-text-muted)":"var(--pz-text)",textDecoration:t.done?"line-through":"none"}}>{t.text}</span><button onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{color:"var(--pz-text-muted)"}}><Trash2 className="h-3 w-3"/></button></div>)}
        {tasks.length===0&&<p className="text-xs text-center py-3" style={{color:"var(--pz-text-muted)"}}>No tasks yet — add one below</p>}
      </div>
      <div className="flex gap-2"><input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Add a task..." className="flex-1 px-3 py-1.5 rounded-none text-xs focus:outline-none" style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)",color:"var(--pz-text)"}}/><button onClick={add} className="w-7 h-7 rounded-none flex items-center justify-center flex-shrink-0" style={{background:"var(--pz-teal)",color:"#0A0A0C"}}><Plus className="h-3.5 w-3.5"/></button></div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [showAll,setShowAll]=useState(false)
  const [theme,setTheme]=useState<LuxuryTheme>(() => {
    const saved = localStorage.getItem("pz-theme")
    return THEMES.find(t => t.id === saved) ?? THEMES[0]
  })

  const applyTheme = (t: LuxuryTheme) => {
    setTheme(t)
    localStorage.setItem("pz-theme", t.id)
  }
  const hour=new Date().getHours()
  const greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening"
  const displayed=showAll?quickActions:quickActions.slice(0,6)
  const dailyProgress=Math.round((user.todayMinutes/user.dailyGoalMinutes)*100)
  const card={background:"var(--pz-surface2)",border:"1px solid var(--pz-border)"} as React.CSSProperties

  // Inject theme CSS variables directly onto document root — most reliable approach
  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    document.body.style.background = theme.vars["--pz-bg"] || ""
    document.body.style.color = theme.vars["--pz-text"] || ""
  }, [theme])

  // Apply on first render synchronously
  useEffect(() => {
    const saved = localStorage.getItem("pz-theme")
    const t = THEMES.find(x => x.id === saved) ?? THEMES[0]
    const root = document.documentElement
    Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    document.body.style.background = t.vars["--pz-bg"] || ""
  }, [])

  const themeStyle = `
  `

  return (
    <ThemeCtx.Provider value={{theme,setTheme:applyTheme}}>
      <style>{themeStyle}</style>
      <div className="min-h-screen flex flex-col" style={{background:theme.vars["--pz-bg"],color:theme.vars["--pz-text"]}}>
        <Navbar isLoggedIn user={{name:user.name,xp:user.xp,streak:user.streak,plan:user.plan}} extraRight={<ThemePill/>}/>
        <main className="flex-1 py-6 lg:py-10">
          <div className="container mx-auto px-4 lg:px-8 max-w-7xl">

            {/* Greeting */}
            <div className="flex items-start justify-between mb-6">
              <div><h1 className="text-2xl sm:text-3xl mb-1" style={{fontFamily:"'DM Serif Display',serif"}}>{greeting}, {user.name} 👋</h1><p className="text-sm" style={{color:"var(--pz-text-2)"}}><span style={{color:"var(--pz-text)",fontFamily:"'DM Mono',monospace"}}>{user.creditBalance} credits</span>{" · "}<span>🔥 {user.streak}-day streak</span></p></div>
              <span className="text-xs px-2.5 py-1 rounded-none hidden sm:inline-flex badge-gold">{user.plan==="free"?"Free Plan":"Pro"}</span>
            </div>

            <div className="mb-6"><StudyPlannerCard/></div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ChecklistCard/>

                {/* Progress */}
                <div className="p-6 rounded-none overflow-hidden" style={card}>
                  <div className="h-0.5 -mx-6 -mt-6 mb-6" style={{background:`linear-gradient(90deg,var(--pz-gold) ${dailyProgress}%,var(--pz-surface3) ${dailyProgress}%)`}}/>
                  <div className="flex items-center justify-between mb-5"><h2 className="font-medium text-base" style={{color:"var(--pz-text)"}}>Today's Progress</h2><span className="text-xs px-2.5 py-1 rounded-none" style={{background:"var(--pz-surface3)",color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace",border:"1px solid var(--pz-border)"}}>{user.todayMinutes} / {user.dailyGoalMinutes} min</span></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[{emoji:"📝",value:"156",label:"Questions",color:"var(--pz-text)"},{emoji:"🎯",value:"78%",label:"Accuracy",color:"var(--pz-text-2)"},{emoji:"🔥",value:String(user.streak),label:"Streak",color:"var(--pz-text-2)"},{emoji:"⚡",value:user.xp.toLocaleString(),label:"XP",color:"var(--pz-text-muted)"}].map(s=><div key={s.label} className="text-center p-3 rounded-none" style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)"}}><div className="text-xl mb-1">{s.emoji}</div><div className="text-xl font-semibold" style={{color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.value}</div><div className="text-[10px] mt-0.5" style={{color:"var(--pz-text-muted)",textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div></div>)}</div>
                </div>

                {/* Quick Start */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium" style={{color:"var(--pz-text)"}}>Quick Start</h2>
                    <button onClick={()=>setShowAll(s=>!s)} className="text-sm" style={{color:"var(--pz-text)"}}>{showAll?"Show less":`+${quickActions.length-6} more`}</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {displayed.map((action,i)=>{
                      const isGoPro=(action as any).isGoPro
                      return (
                        <Link to={action.href} key={i}>
                          <div className="relative p-3 text-center transition-all cursor-pointer"
                            style={{background:"var(--pz-surface2)",border:"1px solid var(--pz-border)"}}
                            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--pz-surface3)";(e.currentTarget as HTMLElement).style.transform="translateY(-2px)"}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="var(--pz-surface2)";(e.currentTarget as HTMLElement).style.transform=""}}>
                            {(action as any).isNew&&(
                              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-none leading-none shadow-sm" style={{background:"linear-gradient(90deg,#FFD700,#FFA500)",color:"#1a1000"}}>NEW</span>
                            )}
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center mx-auto mb-2 shadow-md">
                              {ICONS[action.label]??<ZapIcon className="h-5 w-5 text-white opacity-30"/>}
                            </div>
                            <p className="font-semibold leading-tight" style={{fontSize:"11px",letterSpacing:"0.01em",color:"var(--pz-text)"}}>{action.label}</p>
                            <p className="text-[10px] mt-0.5 leading-tight hidden sm:block" style={{color:"var(--pz-text-muted)"}}>{action.description}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="p-6 rounded-none" style={card}>
                  <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4" style={{color:"var(--pz-text-2)"}}/><h2 className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Recent Activity</h2></div>
                  <div className="space-y-1">{recentActivity.map((item,i)=><div key={i} className="flex items-center justify-between p-3 rounded-none" style={{background:"var(--pz-surface3)"}}><div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-none" style={{background:item.accent}}/><div><p className="text-sm font-medium" style={{color:"var(--pz-text)"}}>{item.label}</p><p className="text-xs" style={{color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>{item.time}</p></div></div><span className="text-xs px-2 py-0.5 rounded-none" style={{background:"var(--pz-surface)",border:"1px solid var(--pz-border)",color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>{item.score}</span></div>)}</div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                <div className="p-5 rounded-none" style={{background:"var(--pz-surface2)",border:"1px solid var(--pz-border)",borderTop:"2px solid var(--pz-gold)"}}>
                  <div className="flex items-center justify-between mb-3"><div><p className="text-xs mb-0.5" style={{color:"var(--pz-text-muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Level 8 — Gold</p><p className="text-2xl font-semibold" style={{color:"var(--pz-text)",fontFamily:"'DM Mono',monospace"}}>{user.xp.toLocaleString()} XP</p></div><div className="w-12 h-12 rounded-none flex items-center justify-center text-2xl" style={{background:"var(--pz-surface3)",border:"1px solid rgba(212,175,90,0.2)"}}>🥇</div></div>
                  <div className="h-1.5 rounded-none" style={{background:"var(--pz-surface3)"}}><div className="h-full rounded-none" style={{width:"68%",background:"linear-gradient(90deg,var(--pz-gold),var(--pz-teal))",transition:"width 0.6s ease"}}/></div>
                  <p className="text-xs mt-2" style={{color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>550 XP to Level 9</p>
                </div>
                <div className="p-5 rounded-none" style={card}>
                  <div className="flex items-center gap-2 mb-4"><Target className="h-4 w-4" style={{color:"var(--pz-text-muted)"}}/><h3 className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Focus Areas</h3></div>
                  <div className="space-y-3">{weakAreas.map(area=><div key={area.subject}><div className="flex justify-between mb-1.5"><span className="text-xs font-medium" style={{color:"var(--pz-text-2)"}}>{area.subject}</span><span className="text-xs" style={{color:area.color,fontFamily:"'DM Mono',monospace"}}>{area.accuracy}%</span></div><div className="h-1 rounded-none" style={{background:"var(--pz-surface3)"}}><div className="h-full rounded-none" style={{width:`${area.accuracy}%`,background:area.color,transition:"width 0.6s ease"}}/></div></div>)}</div>
                  <Link to="/practice"><button className="w-full mt-4 py-2 rounded-none text-xs flex items-center justify-center gap-1" style={{border:"1px solid var(--pz-border)",color:"var(--pz-text-muted)"}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--pz-gold)";(e.currentTarget as HTMLElement).style.color="var(--pz-gold)"}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--pz-border)";(e.currentTarget as HTMLElement).style.color="var(--pz-text-muted)"}}>Practice weak areas<ChevronRight className="h-3 w-3"/></button></Link>
                </div>
                <div className="p-5 rounded-none" style={card}>
                  <div className="flex items-center gap-2 mb-4"><Award className="h-4 w-4" style={{color:"var(--pz-text)"}}/><h3 className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Achievements</h3></div>
                  <div className="grid grid-cols-3 gap-2">{achievements.map(a=><div key={a.label} className="flex flex-col items-center gap-1 p-2.5 rounded-none text-center" style={{background:a.earned?"var(--pz-gold-dim)":"var(--pz-surface3)",border:`1px solid ${a.earned?"rgba(212,175,90,0.2)":"var(--pz-border)"}`,opacity:a.earned?1:0.4}}><span className="text-xl">{a.emoji}</span><span className="text-[9px] font-semibold leading-tight" style={{color:a.earned?"var(--pz-gold)":"var(--pz-text-muted)"}}>{a.label}</span></div>)}</div>
                </div>
                {user.plan==="free"&&<div className="p-5 rounded-none text-center" style={{background:"var(--pz-violet-dim)",border:"1px solid rgba(139,124,246,0.2)",borderTop:"2px solid var(--pz-violet)"}}><div className="w-11 h-11 rounded-none flex items-center justify-center text-xl mx-auto mb-3" style={{background:"rgba(139,124,246,0.2)"}}>⚡</div><p className="font-semibold text-sm mb-1" style={{color:"var(--pz-text)"}}>Upgrade to Pro</p><p className="text-xs mb-4" style={{color:"var(--pz-text-muted)"}}>Unlimited AI, all features, priority support</p><Link to="/pricing"><button className="w-full py-2.5 rounded-none text-sm font-semibold" style={{background:"var(--pz-violet)",color:"#0A0A0C"}}>View Plans</button></Link></div>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ThemeCtx.Provider>
  )
}
