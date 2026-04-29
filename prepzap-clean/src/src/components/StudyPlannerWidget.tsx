import { useState } from "react"
import { Plus, Check, ChevronDown, ChevronUp, Trash2, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

const DAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"]
const PALETTE = ["#10b981","#3b82f6","#a855f7","#f59e0b","#ef4444","#06b6d4","#ec4899"]

interface StudyEvent {
  id: string; title: string; date: string; duration: number; color: string; completed: boolean
}

function todayStr() { return new Date().toISOString().split("T")[0] }

const SAMPLE: StudyEvent[] = [
  { id:"1", title:"Biology Review",    date: todayStr(),                                          duration:60, color:"#10b981", completed:false },
  { id:"2", title:"Flashcard Session", date: todayStr(),                                          duration:30, color:"#3b82f6", completed:true  },
  { id:"3", title:"Mock Exam — Math",  date: new Date(Date.now()+86400000).toISOString().split("T")[0],  duration:90, color:"#a855f7", completed:false },
]

export function StudyPlannerWidget() {
  const [collapsed, setCollapsed] = useState(false)
  const [events, setEvents] = useState<StudyEvent[]>(SAMPLE)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState("")
  const [color, setColor] = useState(PALETTE[0])
  const [duration, setDuration] = useState(30)

  const today = todayStr()
  const todayEvents = events.filter(e => e.date === today)

  // Build 7-day strip starting from today
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return d.toISOString().split("T")[0]
  })

  const addEvent = () => {
    if (!title.trim()) return
    setEvents(prev => [...prev, { id: Date.now().toString(), title:title.trim(), date:today, duration, color, completed:false }])
    setTitle(""); setShowAdd(false)
  }

  const toggle = (id:string) => setEvents(prev => prev.map(e => e.id===id ? {...e,completed:!e.completed} : e))
  const del = (id:string) => setEvents(prev => prev.filter(e => e.id!==id))

  const card = {
    background: "var(--pz-surface2)",
    border: "1px solid var(--pz-border)",
    borderRadius: "var(--pz-r-xl)",
  } as React.CSSProperties

  return (
    <div className="rounded-2xl overflow-hidden" style={card}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(v=>!v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--pz-border)" }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" style={{color:"var(--pz-teal)"}}/>
          <span className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Study Planner</span>
          {todayEvents.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:"var(--pz-teal)",color:"#0A0A0C",fontFamily:"'DM Mono',monospace"}}>
              {todayEvents.filter(e=>!e.completed).length} left
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown className="h-3.5 w-3.5" style={{color:"var(--pz-text-muted)"}}/> : <ChevronUp className="h-3.5 w-3.5" style={{color:"var(--pz-text-muted)"}}/>}
      </button>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {/* 7-day mini calendar strip */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((d,i) => {
              const dayEvents = events.filter(e=>e.date===d)
              const isToday = d === today
              return (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className="text-[9px]" style={{color:"var(--pz-text-muted)"}}>{DAYS_SHORT[(new Date().getDay()+i)%7]}</span>
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium")}
                    style={{
                      background: isToday ? "var(--pz-gold)" : "var(--pz-surface3)",
                      color: isToday ? "#0A0A0C" : "var(--pz-text-2)",
                      fontFamily:"'DM Mono',monospace"
                    }}>
                    {new Date(d+"T12:00:00").getDate()}
                  </div>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {dayEvents.slice(0,3).map(e=>(
                      <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{background:e.color}}/>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Today's sessions */}
          <div>
            <p className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{color:"var(--pz-text-muted)"}}>Today</p>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-center py-2" style={{color:"var(--pz-text-muted)"}}>No sessions planned</p>
            ) : (
              <div className="space-y-1">
                {todayEvents.map(e=>(
                  <div key={e.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl group"
                    style={{background:"var(--pz-surface3)"}}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{background:e.color}}/>
                    <span className={cn("flex-1 text-xs truncate", e.completed && "line-through opacity-50")}
                      style={{color:"var(--pz-text-2)"}}>{e.title}</span>
                    <span className="text-[10px] shrink-0" style={{color:"var(--pz-text-muted)",fontFamily:"'DM Mono',monospace"}}>{e.duration}m</span>
                    <button onClick={()=>toggle(e.id)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="h-3 w-3" style={{color:e.completed?"var(--pz-teal)":"var(--pz-text-muted)"}}/>
                    </button>
                    <button onClick={()=>del(e.id)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" style={{color:"var(--pz-rose)"}}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add session */}
          {showAdd ? (
            <div className="space-y-2 pt-1">
              <input
                className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2"
                style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)",color:"var(--pz-text)"}}
                placeholder="Session title..."
                value={title}
                onChange={e=>setTitle(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addEvent()}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {PALETTE.map(c=>(
                    <button key={c} onClick={()=>setColor(c)}
                      className="w-4 h-4 rounded-full border-2 transition-all"
                      style={{background:c,borderColor:color===c?"white":"transparent"}}/>
                  ))}
                </div>
                <select
                  className="ml-auto text-xs px-2 py-1 rounded-lg focus:outline-none"
                  style={{background:"var(--pz-surface3)",border:"1px solid var(--pz-border)",color:"var(--pz-text-2)"}}
                  value={duration}
                  onChange={e=>setDuration(Number(e.target.value))}>
                  {[15,25,30,45,60,90].map(d=><option key={d} value={d}>{d}m</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addEvent}
                  className="flex-1 py-1.5 rounded-xl text-xs font-semibold"
                  style={{background:"var(--pz-teal)",color:"#0A0A0C"}}>
                  Add
                </button>
                <button onClick={()=>setShowAdd(false)}
                  className="flex-1 py-1.5 rounded-xl text-xs"
                  style={{background:"var(--pz-surface3)",color:"var(--pz-text-muted)"}}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={()=>setShowAdd(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs transition-colors"
              style={{border:"1px dashed var(--pz-border)",color:"var(--pz-text-muted)"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--pz-teal)";(e.currentTarget as HTMLElement).style.color="var(--pz-teal)"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor="var(--pz-border)";(e.currentTarget as HTMLElement).style.color="var(--pz-text-muted)"}}>
              <Plus className="h-3 w-3"/> Add session
            </button>
          )}
        </div>
      )}
    </div>
  )
}
