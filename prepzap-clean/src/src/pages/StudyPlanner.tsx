import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ChevronLeft, ChevronRight, Plus, Check, Clock,
  BookOpen, X, Trash2, Flame, Bell
} from "lucide-react"
import { cn } from "@/lib/utils"

const DAYS    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const MONTHS  = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"]
const PALETTE = [
  "#10b981","#3b82f6","#a855f7","#f59e0b","#ef4444",
  "#06b6d4","#ec4899","#84cc16","#f97316","#6366f1",
  "#14b8a6","#e11d48","#7c3aed","#0ea5e9","#64748b",
]

interface SubTask { id: string; text: string; done: boolean }
interface StudyEvent {
  id: string; title: string; date: string
  duration: number; color: string; completed: boolean
  subTasks: SubTask[]
}

const sampleEvents: StudyEvent[] = [
  { id:"1", title:"Biology Review",    date: new Date().toISOString().split("T")[0],                        duration:60, color:"#10b981", completed:false, subTasks:[] },
  { id:"2", title:"Flashcard Session", date: new Date().toISOString().split("T")[0],                        duration:30, color:"#3b82f6", completed:true,  subTasks:[{id:"s1",text:"Review deck 1",done:true}] },
  { id:"3", title:"Mock Exam — Math",  date: new Date(Date.now()+86400000).toISOString().split("T")[0],     duration:90, color:"#a855f7", completed:false, subTasks:[] },
  { id:"4", title:"AI Tutor Session",  date: new Date(Date.now()+172800000).toISOString().split("T")[0],    duration:45, color:"#f59e0b", completed:false, subTasks:[] },
]

function todayStr() { return new Date().toISOString().split("T")[0] }

// ── shared style helpers ──────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "var(--pz-surface2)",
  border: "1px solid var(--pz-border)",
  borderRadius: "var(--pz-r-xl)",
}

export default function StudyPlanner() {
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [events, setEvents]             = useState<StudyEvent[]>(sampleEvents)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [showModal, setShowModal]       = useState(false)
  const [formTitle,    setFormTitle]    = useState("")
  const [formColor,    setFormColor]    = useState(PALETTE[0])
  const [formDate,     setFormDate]     = useState(todayStr())
  const [formDuration, setFormDuration] = useState(30)
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string,string>>({})

  const year        = currentDate.getFullYear()
  const month       = currentDate.getMonth()
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()

  const getEventsForDate = (d: string) => events.filter(e => e.date === d)
  const toggleComplete   = (id: string) => setEvents(p => p.map(e => e.id===id ? {...e,completed:!e.completed} : e))
  const deleteEvent      = (id: string) => setEvents(p => p.filter(e => e.id!==id))
  const toggleSubTask    = (eid: string, sid: string) => setEvents(p => p.map(e => e.id===eid ? {...e, subTasks:e.subTasks.map(s=>s.id===sid?{...s,done:!s.done}:s)} : e))
  const addSubTask = (eid: string) => {
    const text = subTaskInputs[eid]?.trim(); if (!text) return
    setEvents(p => p.map(e => e.id===eid ? {...e,subTasks:[...e.subTasks,{id:Date.now().toString(),text,done:false}]} : e))
    setSubTaskInputs(p => ({...p,[eid]:""}))
  }

  const selectedEvents  = getEventsForDate(selectedDate)
  const completedToday  = selectedEvents.filter(e => e.completed).length

  const days: (number|null)[] = []
  for (let i=0; i<firstDay; i++) days.push(null)
  for (let i=1; i<=daysInMonth; i++) days.push(i)

  const openModal = (date?: string) => {
    setFormDate(date ?? selectedDate); setFormTitle(""); setFormColor(PALETTE[0]); setFormDuration(30); setShowModal(true)
  }
  const addSession = () => {
    if (!formTitle.trim()) return
    setEvents(p => [...p, {id:Date.now().toString(),title:formTitle.trim(),date:formDate,duration:formDuration,color:formColor,completed:false,subTasks:[]}])
    setSelectedDate(formDate); setShowModal(false)
  }

  // Stats
  const streak = 12
  const hoursThisWeek = 12.5
  const sessionsDone = events.filter(e=>e.completed).length
  const goalPct = Math.round((sessionsDone / Math.max(events.length,1))*100)

  const upcoming = events
    .filter(e => e.date > todayStr() && !e.completed)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0,4)

  return (
    <div className="min-h-screen flex flex-col" style={{ background:"var(--pz-bg)", color:"var(--pz-text)" }}>
      <Navbar isLoggedIn user={{ name:"Learner", xp:2450, streak:12, plan:"free" }} />

      <main className="flex-1 py-5 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <button className="flex items-center gap-1 text-xs transition-opacity hover:opacity-60"
                  style={{ color:"var(--pz-text-muted)" }}>
                  <ChevronLeft className="h-3.5 w-3.5"/> Dashboard
                </button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold" style={{ fontFamily:"'DM Serif Display',serif" }}>Study Planner</h1>
                <p className="text-xs" style={{ color:"var(--pz-text-muted)" }}>Plan your sessions, hit your goals</p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background:"#10b981", color:"#fff", borderRadius:"var(--pz-r-md)" }}>
              <Plus className="h-3.5 w-3.5"/> Add Session
            </button>
          </div>

          {/* ── Stat tiles ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon:<Flame className="h-5 w-5" style={{color:"#f97316"}}/>, value:`${streak}`, emoji:"🔥", label:"Day Streak"       },
              { icon:<Clock className="h-5 w-5" style={{color:"#3b82f6"}}/>, value:`${hoursThisWeek}h`, emoji:"", label:"Hours This Week"  },
              { icon:<Check className="h-5 w-5" style={{color:"#10b981"}}/>, value:`${sessionsDone}`,    emoji:"",  label:"Sessions Done"   },
              { icon:<span className="text-base">🎯</span>,                  value:`${goalPct}%`,         emoji:"",  label:"Goal Completion" },
            ].map((s,i) => (
              <div key={i} className="flex items-center gap-3 p-4" style={card}>
                {s.icon}
                <div>
                  <p className="text-xl font-bold leading-none" style={{ fontFamily:"'DM Mono',monospace", color:"var(--pz-text)" }}>
                    {s.value}{s.emoji}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color:"var(--pz-text-muted)" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Main grid: Calendar left, Detail right ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Calendar — takes 2 cols */}
            <div className="lg:col-span-2" style={card}>
              {/* Calendar header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span className="font-semibold text-base" style={{ color:"var(--pz-text)" }}>
                    {MONTHS[month]} {year}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[
                    { icon:<ChevronLeft className="h-3.5 w-3.5"/>, onClick:()=>setCurrentDate(new Date(year,month-1,1)) },
                    { icon:<ChevronRight className="h-3.5 w-3.5"/>, onClick:()=>setCurrentDate(new Date(year,month+1,1)) },
                  ].map((b,i)=>(
                    <button key={i} onClick={b.onClick}
                      className="w-8 h-8 flex items-center justify-center transition-all hover:opacity-70"
                      style={{ border:"1px solid var(--pz-border)", color:"var(--pz-text-muted)", borderRadius:"var(--pz-r-sm)" }}>
                      {b.icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 pb-5">
                {/* Day name headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-[11px] font-semibold py-1.5 uppercase tracking-wider"
                      style={{ color:"var(--pz-text-muted)" }}>{d}</div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, i) => {
                    if (!day) return <div key={`e-${i}`}/>
                    const dateStr   = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
                    const dayEvts   = getEventsForDate(dateStr)
                    const isToday   = dateStr === todayStr()
                    const isSel     = dateStr === selectedDate
                    return (
                      <button key={day} onClick={() => setSelectedDate(dateStr)}
                        className="aspect-square flex flex-col items-center justify-start pt-1.5 pb-1 text-xs font-medium transition-all"
                        style={{
                          borderRadius:"var(--pz-r-md)",
                          background: isSel ? "#10b981" : isToday ? "rgba(16,185,129,0.12)" : "transparent",
                          color: isSel ? "#fff" : isToday ? "#10b981" : "var(--pz-text-2)",
                          border: isToday && !isSel ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                        }}>
                        <span className="leading-none">{day}</span>
                        {dayEvts.length > 0 && (
                          <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                            {dayEvts.slice(0,3).map((e,ei) => (
                              <div key={ei} className="w-1.5 h-1.5 rounded-full"
                                style={{ background: isSel ? "rgba(255,255,255,0.6)" : e.color }}/>
                            ))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right column — Day detail + Upcoming */}
            <div className="flex flex-col gap-4">

              {/* Day detail card */}
              <div style={card}>
                {/* Header */}
                <div className="px-4 pt-4 pb-3" style={{ borderBottom:"1px solid var(--pz-border)" }}>
                  <p className="text-sm font-semibold" style={{ color:"var(--pz-text)" }}>
                    {new Date(selectedDate+"T00:00:00").toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric"})}
                  </p>
                  {selectedEvents.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] mb-1.5" style={{ color:"var(--pz-text-muted)" }}>
                        {completedToday}/{selectedEvents.length} done
                      </p>
                      <Progress value={(completedToday/selectedEvents.length)*100} className="h-1.5"
                        style={{ borderRadius:"99px" }} />
                    </div>
                  )}
                </div>

                {/* Events */}
                <div className="p-3 space-y-2">
                  {selectedEvents.length === 0 ? (
                    <div className="py-8 text-center" style={{ color:"var(--pz-text-muted)" }}>
                      <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-30"/>
                      <p className="text-xs">No sessions planned</p>
                    </div>
                  ) : (
                    selectedEvents.map(event => (
                      <div key={event.id}
                        className={cn("group transition-all", event.completed && "opacity-60")}
                        style={{ background:"var(--pz-surface3)", borderRadius:"var(--pz-r-md)", border:"1px solid var(--pz-border)" }}>
                        <div className="flex items-start gap-2.5 p-3">
                          {/* Color bar */}
                          <div className="w-1 self-stretch flex-shrink-0" style={{ background:event.color, borderRadius:"99px" }}/>
                          {/* Checkbox */}
                          <button onClick={() => toggleComplete(event.id)}
                            className="mt-0.5 w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 transition-all"
                            style={{ borderRadius:"50%", background:event.completed?event.color:"transparent", borderColor:event.color }}>
                            {event.completed && <Check className="h-2.5 w-2.5 text-white"/>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium", event.completed && "line-through")}
                              style={{ color:"var(--pz-text)" }}>{event.title}</p>
                            <span className="flex items-center gap-1 text-[11px] mt-0.5"
                              style={{ color:"var(--pz-text-muted)", fontFamily:"'DM Mono',monospace" }}>
                              <Clock className="h-2.5 w-2.5"/>{event.duration}min
                            </span>
                          </div>
                          <button onClick={()=>deleteEvent(event.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 flex-shrink-0"
                            style={{ color:"var(--pz-text-muted)" }}>
                            <Trash2 className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                        {/* Sub-tasks */}
                        {event.subTasks.length > 0 && (
                          <div className="px-3 pb-2 space-y-1" style={{ borderTop:"1px solid var(--pz-border)" }}>
                            {event.subTasks.map(sub => (
                              <div key={sub.id} className="flex items-center gap-2 pt-1.5">
                                <button onClick={()=>toggleSubTask(event.id,sub.id)}
                                  className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center border transition-all"
                                  style={{ borderRadius:"3px", background:sub.done?event.color:"transparent", borderColor:sub.done?event.color:"var(--pz-border)" }}>
                                  {sub.done && <Check className="h-2 w-2 text-white"/>}
                                </button>
                                <span className="text-xs" style={{ color:sub.done?"var(--pz-text-muted)":"var(--pz-text-2)", textDecoration:sub.done?"line-through":"none" }}>
                                  {sub.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Add sub-task */}
                        <div className="px-3 pb-2.5 flex gap-1.5">
                          <input
                            value={subTaskInputs[event.id]||""}
                            onChange={e=>setSubTaskInputs(p=>({...p,[event.id]:e.target.value}))}
                            onKeyDown={e=>e.key==="Enter"&&addSubTask(event.id)}
                            placeholder="Add sub-task..."
                            className="flex-1 px-2 py-1 text-[11px] focus:outline-none"
                            style={{ background:"var(--pz-surface2)", border:"1px solid var(--pz-border)", borderRadius:"var(--pz-r-sm)", color:"var(--pz-text)" }}/>
                          <button onClick={()=>addSubTask(event.id)}
                            className="px-2 text-[11px] transition-opacity hover:opacity-70"
                            style={{ border:"1px solid var(--pz-border)", color:"var(--pz-text-muted)", borderRadius:"var(--pz-r-sm)" }}>
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {/* Add another */}
                  <button onClick={()=>openModal(selectedDate)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs transition-all hover:opacity-70"
                    style={{ border:"1px dashed var(--pz-border)", color:"var(--pz-text-muted)", borderRadius:"var(--pz-r-md)" }}>
                    <Plus className="h-3.5 w-3.5"/> Add another
                  </button>
                </div>
              </div>

              {/* Upcoming card */}
              {upcoming.length > 0 && (
                <div style={card}>
                  <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom:"1px solid var(--pz-border)" }}>
                    <Bell className="h-4 w-4" style={{ color:"#f59e0b" }}/>
                    <span className="text-sm font-semibold" style={{ color:"var(--pz-text)" }}>Upcoming</span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {upcoming.map(e => (
                      <button key={e.id} onClick={()=>setSelectedDate(e.date)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-all hover:opacity-80"
                        style={{ background:"var(--pz-surface3)", borderRadius:"var(--pz-r-sm)" }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:e.color }}/>
                        <span className="flex-1 truncate" style={{ color:"var(--pz-text-2)" }}>{e.title}</span>
                        <span className="flex-shrink-0 font-medium" style={{ color:"var(--pz-text-muted)", fontFamily:"'DM Mono',monospace" }}>
                          {new Date(e.date+"T00:00:00").toLocaleDateString("en-PH",{month:"short",day:"numeric"})}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ── Add Session Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowModal(false)}/>
          <div className="relative w-full max-w-md p-6 space-y-4 z-10 shadow-2xl"
            style={{ background:"var(--pz-surface)", border:"1px solid var(--pz-border)", borderRadius:"var(--pz-r-xl)" }}>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base" style={{ fontFamily:"'DM Serif Display',serif" }}>
                Add Study Session
              </h2>
              <button onClick={()=>setShowModal(false)} className="p-1.5 transition-opacity hover:opacity-60" style={{ color:"var(--pz-text-muted)" }}>
                <X className="h-4 w-4"/>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color:"var(--pz-text-muted)" }}>
                What are you studying?
              </label>
              <input autoFocus
                className="w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                style={{ background:"var(--pz-surface3)", border:"1px solid var(--pz-border)", borderRadius:"var(--pz-r-md)", color:"var(--pz-text)" }}
                placeholder="e.g. Chapter 5, Calculus problems..."
                value={formTitle} onChange={e=>setFormTitle(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addSession()}/>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color:"var(--pz-text-muted)" }}>Color</label>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map(c=>(
                  <button key={c} onClick={()=>setFormColor(c)}
                    className="w-6 h-6 transition-all"
                    style={{ background:c, borderRadius:"50%", outline:formColor===c?`3px solid ${c}`:"none", outlineOffset:"2px", transform:formColor===c?"scale(1.2)":"scale(1)" }}/>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color:"var(--pz-text-muted)" }}>Date</label>
                <input type="date"
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{ background:"var(--pz-surface3)", border:"1px solid var(--pz-border)", borderRadius:"var(--pz-r-md)", color:"var(--pz-text)" }}
                  value={formDate} onChange={e=>setFormDate(e.target.value)}/>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color:"var(--pz-text-muted)" }}>Duration</label>
                <div className="flex flex-wrap gap-1">
                  {[15,30,45,60,90,120].map(d=>(
                    <button key={d} onClick={()=>setFormDuration(d)}
                      className="px-2 py-1 text-xs transition-all"
                      style={{
                        borderRadius:"var(--pz-r-sm)",
                        background: formDuration===d ? formColor : "var(--pz-surface3)",
                        color: formDuration===d ? "#fff" : "var(--pz-text-muted)",
                        border: `1px solid ${formDuration===d ? formColor : "var(--pz-border)"}`,
                      }}>
                      {d<60?`${d}m`:`${d/60}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formTitle && (
              <div className="flex items-center gap-3 p-3" style={{ background:`${formColor}15`, border:`1px solid ${formColor}40`, borderRadius:"var(--pz-r-md)" }}>
                <div className="w-1 h-8 flex-shrink-0" style={{ background:formColor, borderRadius:"99px" }}/>
                <div>
                  <p className="text-sm font-medium" style={{ color:"var(--pz-text)" }}>{formTitle}</p>
                  <p className="text-xs" style={{ color:"var(--pz-text-muted)" }}>{formDuration<60?`${formDuration}min`:`${formDuration/60}h`}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={()=>setShowModal(false)}
                className="flex-1 py-2.5 text-sm transition-opacity hover:opacity-70"
                style={{ border:"1px solid var(--pz-border)", color:"var(--pz-text-muted)", borderRadius:"var(--pz-r-md)" }}>
                Cancel
              </button>
              <button disabled={!formTitle.trim()} onClick={addSession}
                className="flex-1 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ background:formColor, color:"#fff", border:"none", borderRadius:"var(--pz-r-md)" }}>
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
