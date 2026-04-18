import { useState, useEffect } from "react"
import { MessageSquare, Plus, Trash2, Clock, PanelLeftClose, PanelLeftOpen } from "lucide-react"

export interface ToolSession {
  id: string
  title: string
  timestamp: string
  summary: string   // short text shown in sidebar
}

interface Props {
  toolKey: string   // unique per tool e.g. "flashcards", "practice" — keeps history separate
  onNew: () => void
  onSelect: (s: ToolSession) => void
  activeId: string | null
}

const MAX = 30

export function useToolHistory(toolKey: string) {
  const lsKey = `pz_hist_${toolKey}`

  const [sessions, setSessions] = useState<ToolSession[]>(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) || "[]") } catch { return [] }
  })

  const save = (s: ToolSession[]) => {
    setSessions(s)
    try { localStorage.setItem(lsKey, JSON.stringify(s.slice(0, MAX))) } catch {}
  }

  const addSession = (title: string, summary: string): ToolSession => {
    const s: ToolSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: title.slice(0, 60) || "Session",
      timestamp: new Date().toISOString(),
      summary,
    }
    save([s, ...sessions])
    return s
  }

  const deleteSession = (id: string) => save(sessions.filter(s => s.id !== id))

  const updateSession = (id: string, patch: Partial<ToolSession>) => {
    const updated = sessions.map(s => s.id === id ? { ...s, ...patch } : s)
    save(updated)
  }

  return { sessions, addSession, deleteSession, updateSession }
}

export function ToolHistorySidebar({ toolKey, onNew, onSelect, activeId }: Props) {
  const lsKey = `pz_hist_${toolKey}`
  const [open, setOpen] = useState(true)
  const [sessions, setSessions] = useState<ToolSession[]>(() => {
    try { return JSON.parse(localStorage.getItem(lsKey) || "[]") } catch { return [] }
  })

  // Keep in sync with localStorage changes from parent
  useEffect(() => {
    const sync = () => {
      try { setSessions(JSON.parse(localStorage.getItem(lsKey) || "[]")) } catch {}
    }
    window.addEventListener("storage", sync)
    window.addEventListener(`pz_hist_${toolKey}_changed`, sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(`pz_hist_${toolKey}_changed`, sync)
    }
  }, [lsKey, toolKey])

  const del = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    try { localStorage.setItem(lsKey, JSON.stringify(updated)) } catch {}
    window.dispatchEvent(new Event(`pz_hist_${toolKey}_changed`))
  }

  return (
    <div className="flex h-full">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex-shrink-0 flex items-center justify-center w-7 h-full hover:opacity-70 transition-opacity"
        style={{ background: "var(--pz-surface3)", borderRight: "1px solid var(--pz-border)" }}
        title={open ? "Hide history" : "Show history"}
      >
        {open
          ? <PanelLeftClose className="h-3.5 w-3.5" style={{ color: "var(--pz-text-muted)" }} />
          : <PanelLeftOpen  className="h-3.5 w-3.5" style={{ color: "var(--pz-text-muted)" }} />
        }
      </button>

      {/* Panel */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300"
        style={{
          width: open ? 220 : 0,
          borderRight: open ? "1px solid var(--pz-border)" : "none",
          background: "var(--pz-surface)",
        }}
      >
        <div className="min-w-[220px] flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--pz-border)" }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>History</span>
            <button
              onClick={onNew}
              className="flex items-center gap-1 text-[10px] px-2 py-1 transition-opacity hover:opacity-70"
              style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-2)" }}
            >
              <Plus className="h-2.5 w-2.5" /> New
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <p className="text-[10px] text-center py-8 px-2 leading-relaxed" style={{ color: "var(--pz-text-muted)" }}>
                No sessions yet.<br />Results will appear here.
              </p>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => onSelect(s)}
                className="group flex items-start gap-2 p-2 cursor-pointer transition-all"
                style={{
                  background: activeId === s.id ? "var(--pz-surface3)" : "transparent",
                  border: `1px solid ${activeId === s.id ? "var(--pz-border-hv)" : "transparent"}`,
                }}
              >
                <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: "var(--pz-text-muted)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate" style={{ color: "var(--pz-text)" }}>{s.title}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--pz-text-muted)" }}>{s.summary}</p>
                  <p className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: "var(--pz-text-muted)" }}>
                    <Clock className="h-2 w-2" />
                    {new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={e => del(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 transition-all flex-shrink-0"
                  style={{ color: "var(--pz-text-muted)" }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
