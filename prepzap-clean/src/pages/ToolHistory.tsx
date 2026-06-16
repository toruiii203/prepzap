/**
 * useToolHistory — saves and retrieves generation history per tool.
 * Stored in Supabase `tool_history` table — persistent across devices and logins.
 * Falls back to localStorage if user is not logged in.
 * Max 50 entries per tool.
 */

import { useState, useCallback, useEffect } from "react"
import { X, Clock, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"

const TEAL = "#8b1a2a"
const MAX = 50

export interface HistoryEntry {
  id: string
  prompt: string
  preview: string
  output: string
  model: string
  createdAt: string   // ISO
  meta?: string
}

// ── localStorage fallback key (used when logged out) ─────────────────────────
function localKey(toolId: string) {
  return `studenius_history_${toolId}`
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

async function fetchFromSupabase(toolId: string): Promise<HistoryEntry[]> {
  const userId = await getUserId()
  if (!userId) return []
  const { data, error } = await supabase
    .from("tool_history")
    .select("id, prompt, preview, output, model, meta, created_at")
    .eq("user_id", userId)
    .eq("tool_id", toolId)
    .order("created_at", { ascending: false })
    .limit(MAX)
  if (error || !data) return []
  return data.map(r => ({
    id: r.id,
    prompt: r.prompt ?? "",
    preview: r.preview ?? "",
    output: r.output ?? "",
    model: r.model ?? "",
    meta: r.meta ?? undefined,
    createdAt: r.created_at,
  }))
}

async function saveToSupabase(
  toolId: string,
  entry: Omit<HistoryEntry, "id" | "createdAt">
): Promise<HistoryEntry | null> {
  const userId = await getUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from("tool_history")
    .insert({
      user_id: userId,
      tool_id: toolId,
      prompt: entry.prompt,
      preview: entry.preview,
      output: entry.output,
      model: entry.model,
      meta: entry.meta ?? null,
    })
    .select("id, created_at")
    .single()
  if (error || !data) return null
  return { ...entry, id: data.id, createdAt: data.created_at }
}

async function deleteFromSupabase(id: string): Promise<void> {
  await supabase.from("tool_history").delete().eq("id", id)
}

async function clearFromSupabase(toolId: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  await supabase
    .from("tool_history")
    .delete()
    .eq("user_id", userId)
    .eq("tool_id", toolId)
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useToolHistory(toolId: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Load on mount — try Supabase first, fall back to localStorage
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const userId = await getUserId()
      if (userId) {
        const remote = await fetchFromSupabase(toolId)
        if (!cancelled) setEntries(remote)
      } else {
        // Not logged in — use localStorage
        try {
          const local = JSON.parse(localStorage.getItem(localKey(toolId)) || "[]")
          if (!cancelled) setEntries(local)
        } catch { if (!cancelled) setEntries([]) }
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [toolId])

  const save = useCallback(async (entry: Omit<HistoryEntry, "id" | "createdAt">) => {
    const userId = await getUserId()
    if (userId) {
      const saved = await saveToSupabase(toolId, entry)
      if (saved) {
        setEntries(prev => [saved, ...prev].slice(0, MAX))
        return saved
      }
    } else {
      // localStorage fallback
      const newEntry: HistoryEntry = {
        ...entry,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      setEntries(prev => {
        const updated = [newEntry, ...prev].slice(0, MAX)
        localStorage.setItem(localKey(toolId), JSON.stringify(updated))
        return updated
      })
      return newEntry
    }
  }, [toolId])

  const remove = useCallback(async (id: string) => {
    const userId = await getUserId()
    if (userId) {
      await deleteFromSupabase(id)
    } else {
      const updated = entries.filter(e => e.id !== id)
      localStorage.setItem(localKey(toolId), JSON.stringify(updated))
    }
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [toolId, entries])

  const clear = useCallback(async () => {
    const userId = await getUserId()
    if (userId) {
      await clearFromSupabase(toolId)
    } else {
      localStorage.removeItem(localKey(toolId))
    }
    setEntries([])
  }, [toolId])

  // Alias: some tools use `history`, others use `entries`
  return { entries, history: entries, save, remove, clear, loading }
}

// ── Relative time helper ──────────────────────────────────────────────────────
function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (d < 1) return "just now"
  if (d < 60) return `${d}m ago`
  if (d < 1440) return `${Math.floor(d / 60)}h ago`
  return `${Math.floor(d / 1440)}d ago`
}

// ── History Sidebar Panel ─────────────────────────────────────────────────────
interface ToolHistoryPanelProps {
  entries: HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
  open: boolean
  onClose: () => void
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
        fontFamily: "'Nunito',system-ui,sans-serif",
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
                style={{ borderBottom: "0.5px solid #141414", transition: "background .15s", cursor: "pointer", position: "relative" }}
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
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ── History Trigger Button ────────────────────────────────────────────────────
export function HistoryButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "transparent", border: "0.5px solid #252525", color: "#555", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito',system-ui,sans-serif", letterSpacing: "0.06em", transition: "all .2s", position: "relative" }}
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
