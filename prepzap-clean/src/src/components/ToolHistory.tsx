/**
 * useToolHistory — auto-saves and retrieves generation history per tool.
 * Stored in localStorage under `studenius_history_<toolId>`.
 * Max 50 entries per tool.
 */

import { useState, useCallback } from "react"
import { X, Clock, ChevronRight } from "lucide-react"

const TEAL = "#00C4B4"
const MAX = 50

export interface HistoryEntry {
  id: string
  prompt: string       // what the user typed / topic
  preview: string      // first 120 chars of output
  output: string       // full output
  model: string
  createdAt: string    // ISO
  meta?: string        // e.g. "12 cards" / "4 phases"
}

function storageKey(toolId: string) {
  return `studenius_history_${toolId}`
}

export function useToolHistory(toolId: string) {
  const load = (): HistoryEntry[] => {
    try { return JSON.parse(localStorage.getItem(storageKey(toolId)) || "[]") } catch { return [] }
  }

  const [entries, setEntries] = useState<HistoryEntry[]>(load)

  const save = useCallback((entry: Omit<HistoryEntry, "id" | "createdAt">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setEntries(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX)
      localStorage.setItem(storageKey(toolId), JSON.stringify(updated))
      return updated
    })
    return newEntry
  }, [toolId])

  const remove = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id)
      localStorage.setItem(storageKey(toolId), JSON.stringify(updated))
      return updated
    })
  }, [toolId])

  const clear = useCallback(() => {
    localStorage.removeItem(storageKey(toolId))
    setEntries([])
  }, [toolId])

  return { entries, save, remove, clear }
}

// ─── History Sidebar Panel ────────────────────────────────────────────────────
interface ToolHistoryPanelProps {
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
  open: boolean
  onClose: () => void
}

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "just now"
  if (d < 60) return `${d}m ago`
  if (d < 1440) return `${Math.floor(d / 60)}h ago`
  return `${Math.floor(d / 1440)}d ago`
}

export function ToolHistoryPanel({
  entries, onSelect, onRemove, onClear, open, onClose,
}: ToolHistoryPanelProps) {
  if (!open) return null

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
        background: "#0A0A0A", borderLeft: "0.5px solid #252525",
        zIndex: 81, display: "flex", flexDirection: "column",
        fontFamily: "'Inter',system-ui,sans-serif",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "0.5px solid #1A1A1A", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={11} color="#555" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" }}>History</span>
            {entries.length > 0 && (
              <span style={{ fontSize: 8, padding: "1px 5px", background: "rgba(0,196,180,0.1)", color: TEAL, fontWeight: 700 }}>
                {entries.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {entries.length > 0 && (
              <button onClick={onClear} style={{ fontSize: 9, color: "#444", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em", textTransform: "uppercase" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#E84040")}
                onMouseLeave={e => (e.currentTarget.style.color = "#444")}>
                Clear all
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 2 }}>
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Entries */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {entries.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, padding: 20 }}>
              <Clock size={20} color="#222" />
              <span style={{ fontSize: 11, color: "#333", textAlign: "center", lineHeight: 1.5 }}>
                No history yet.<br />Generate something to see it here.
              </span>
            </div>
          ) : (
            entries.map(entry => (
              <div key={entry.id}
                style={{ borderBottom: "0.5px solid #141414", transition: "background .15s", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,196,180,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}
                  onClick={() => onSelect(entry)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#D0D0D0", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.prompt || "Untitled"}
                    </div>
                    <div style={{ fontSize: 10, color: "#555", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {entry.preview}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 8, color: "#333", fontFamily: "monospace" }}>{relTime(entry.createdAt)}</span>
                      {entry.meta && <span style={{ fontSize: 8, padding: "1px 4px", background: "#141414", color: "#555", border: "0.5px solid #222" }}>{entry.meta}</span>}
                      <span style={{ fontSize: 8, padding: "1px 4px", background: "rgba(0,196,180,0.06)", color: TEAL, border: "0.5px solid rgba(0,196,180,0.15)" }}>{entry.model.split("-")[0]}</span>
                    </div>
                  </div>
                  <ChevronRight size={12} color="#333" style={{ flexShrink: 0, marginTop: 2 }} />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onRemove(entry.id) }}
                  style={{ position: "absolute", display: "none" }}>×</button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── History Trigger Button ───────────────────────────────────────────────────
export function HistoryButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "transparent", border: "0.5px solid #252525", color: "#555", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',system-ui,sans-serif", letterSpacing: "0.06em", transition: "all .2s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEAL }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555" }}>
      <Clock size={10} />
      History
      {count > 0 && (
        <span style={{ fontSize: 8, padding: "1px 4px", background: "rgba(0,196,180,0.1)", color: TEAL, fontWeight: 700, marginLeft: 2 }}>
          {count}
        </span>
      )}
    </button>
  )
}
