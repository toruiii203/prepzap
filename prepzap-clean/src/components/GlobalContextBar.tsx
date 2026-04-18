import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import {
  BookOpen, ChevronDown, Check, Circle,
  Layers, Zap, X, AlertCircle
} from "lucide-react"
import {
  loadLibrary, loadContext, saveContext,
  onSourceChange, type SourceFile, type SourceContextState
} from "@/lib/sourceContext"

interface GlobalContextBarProps {
  compact?: boolean   // for tool pages — single row
}

export function GlobalContextBar({ compact = false }: GlobalContextBarProps) {
  const [files, setFiles]   = useState<SourceFile[]>(loadLibrary)
  const [ctx, setCtx]       = useState<SourceContextState>(loadContext)
  const [open, setOpen]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Sync across tabs / components
  useEffect(() => onSourceChange(() => {
    setFiles(loadLibrary())
    setCtx(loadContext())
  }), [])

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const setMode = (mode: SourceContextState["mode"]) => {
    const next: SourceContextState = { mode, selectedIds: ctx.selectedIds }
    saveContext(next); setCtx(next)
  }

  const toggleSelected = (id: string) => {
    const ids = ctx.selectedIds.includes(id)
      ? ctx.selectedIds.filter(x => x !== id)
      : [...ctx.selectedIds, id]
    const next: SourceContextState = { mode: "selected", selectedIds: ids }
    saveContext(next); setCtx(next)
  }

  const clearAll = () => {
    const next: SourceContextState = { mode: "none", selectedIds: [] }
    saveContext(next); setCtx(next)
  }

  // Derived state
  const activeCount = ctx.mode === "all"
    ? files.length
    : ctx.mode === "selected"
    ? ctx.selectedIds.length
    : 0

  const isActive = activeCount > 0

  const pillColor = isActive
    ? "rgba(212,175,90,0.12)"
    : "var(--pz-surface3)"
  const pillBorder = isActive
    ? "rgba(212,175,90,0.35)"
    : "var(--pz-border)"
  const pillText = isActive ? "var(--pz-gold)" : "var(--pz-text-muted)"

  const modeLabel = ctx.mode === "none"
    ? "General AI"
    : ctx.mode === "all"
    ? `All Sources (${files.length})`
    : ctx.selectedIds.length === 0
    ? "Select source…"
    : ctx.selectedIds.length === 1
    ? (files.find(f => f.id === ctx.selectedIds[0])?.name ?? "1 source")
    : `${ctx.selectedIds.length} sources active`

  if (files.length === 0) {
    // No sources — show a subtle nudge
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs"
        style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        <span>No sources in library.</span>
        <Link to="/sources" className="underline transition-opacity hover:opacity-70" style={{ color: "var(--pz-text-2)" }}>
          Upload files →
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      {/* Pill trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs transition-all"
        style={{
          background: pillColor,
          border: `1px solid ${pillBorder}`,
          color: pillText,
          borderRadius: "var(--pz-r-sm)",
        }}
      >
        {/* Glowing pulse when active */}
        {isActive && (
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: "var(--pz-gold)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "var(--pz-gold)" }} />
          </span>
        )}
        {!isActive && <Layers className="h-3 w-3 flex-shrink-0" />}
        <span className="max-w-[180px] truncate font-medium">{modeLabel}</span>
        <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-72"
          style={{ background: "var(--pz-surface)", border: "1px solid var(--pz-border)", borderRadius: "var(--pz-r-lg)", overflow: "hidden" }}
        >
          {/* Mode selector */}
          <div className="p-3" style={{ borderBottom: "1px solid var(--pz-border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--pz-text-muted)" }}>
              Context Mode
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { mode: "none",     label: "General AI", icon: Zap     },
                { mode: "all",      label: "All Sources", icon: Layers  },
                { mode: "selected", label: "Pick Sources", icon: BookOpen },
              ] as const).map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => setMode(opt.mode)}
                  className="flex flex-col items-center gap-1 py-2 px-1 text-center transition-all"
                  style={{
                    background: ctx.mode === opt.mode ? "rgba(212,175,90,0.12)" : "var(--pz-surface3)",
                    border: `1px solid ${ctx.mode === opt.mode ? "rgba(212,175,90,0.4)" : "var(--pz-border)"}`,
                    color: ctx.mode === opt.mode ? "var(--pz-gold)" : "var(--pz-text-muted)",
                  }}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Source list (only shown in "selected" mode) */}
          {ctx.mode === "selected" && (
            <div>
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--pz-text-muted)" }}>
                Choose Sources
              </p>
              <div className="max-h-48 overflow-y-auto">
                {files.map(f => {
                  const checked = ctx.selectedIds.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleSelected(f.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/5"
                    >
                      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-none border transition-all"
                        style={{
                          background: checked ? "var(--pz-gold)" : "transparent",
                          borderColor: checked ? "var(--pz-gold)" : "var(--pz-border)",
                        }}>
                        {checked && <Check className="h-2.5 w-2.5" style={{ color: "#0A0A0C" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: "var(--pz-text)" }}>{f.name}</p>
                        <p className="text-[10px]" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono', monospace" }}>
                          {f.type.includes("pdf") ? "PDF" : f.type.includes("text") ? "TXT" : "FILE"} ·{" "}
                          {f.fullText ? "✓ Text extracted" : f.preview ? "✓ Preview" : "No text"}
                        </p>
                      </div>
                      {/* Mastery dot */}
                      {f.mastery && (
                        <Circle className="h-2 w-2 flex-shrink-0 fill-current" style={{
                          color: f.mastery === "green" ? "#10b981" : f.mastery === "yellow" ? "#f59e0b" : "#ef4444"
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* All sources info */}
          {ctx.mode === "all" && (
            <div className="px-3 py-2.5" style={{ borderTop: "1px solid var(--pz-border)" }}>
              <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>
                All {files.length} source{files.length !== 1 ? "s" : ""} will be injected into every AI prompt.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2"
            style={{ borderTop: "1px solid var(--pz-border)" }}>
            <Link
              to="/sources"
              onClick={() => setOpen(false)}
              className="text-[10px] transition-opacity hover:opacity-70"
              style={{ color: "var(--pz-text-muted)" }}
            >
              Manage library →
            </Link>
            {isActive && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
                style={{ color: "var(--pz-text-muted)" }}
              >
                <X className="h-2.5 w-2.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
