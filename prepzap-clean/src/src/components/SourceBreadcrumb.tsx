import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Layers, X, ChevronRight } from "lucide-react"
import { loadLibrary, loadContext, saveContext, onSourceChange, type SourceFile } from "@/lib/sourceContext"

/**
 * Floating pill at the bottom of the screen showing the active source.
 * Gives users confidence the AI is "looking" at the right material.
 */
export function SourceBreadcrumb() {
  const [files, setFiles]   = useState<SourceFile[]>(loadLibrary)
  const [ctx, setCtx]       = useState(loadContext)
  const [visible, setVisible] = useState(true)

  useEffect(() => onSourceChange(() => {
    setFiles(loadLibrary())
    setCtx(loadContext())
    setVisible(true) // re-show on context change
  }), [])

  const activeFiles = ctx.mode === "all"
    ? files
    : ctx.mode === "selected"
    ? files.filter(f => ctx.selectedIds.includes(f.id))
    : []

  if (!visible || activeFiles.length === 0) return null

  const label = activeFiles.length === 1
    ? activeFiles[0].name
    : `${activeFiles.length} sources active`

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    saveContext({ mode: "none", selectedIds: [] })
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 text-xs shadow-2xl"
      style={{
        background: "rgba(10,10,12,0.92)",
        border: "1px solid rgba(212,175,90,0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        maxWidth: "calc(100vw - 32px)",
        borderRadius: "var(--pz-r-xl)",
      }}
    >
      {/* Pulse dot */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ background: "var(--pz-gold)" }} />
        <span className="relative inline-flex rounded-full h-2 w-2"
          style={{ background: "var(--pz-gold)" }} />
      </span>

      <span style={{ color: "var(--pz-text-muted)" }}>Active source:</span>
      <span className="font-medium max-w-[180px] truncate" style={{ color: "var(--pz-gold)" }}>
        {label}
      </span>

      <Link
        to="/sources"
        className="flex items-center gap-0.5 transition-opacity hover:opacity-70 flex-shrink-0"
        style={{ color: "var(--pz-text-muted)" }}
      >
        <span>Change</span>
        <ChevronRight className="h-3 w-3" />
      </Link>

      <button
        onClick={handleClear}
        className="flex-shrink-0 p-0.5 transition-opacity hover:opacity-70"
        style={{ color: "var(--pz-text-muted)" }}
        title="Clear source context"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
