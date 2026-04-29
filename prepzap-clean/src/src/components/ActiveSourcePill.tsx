/**
 * ActiveSourcePill — persistent indicator of the active study source.
 * Drop into any tool page to show what file/context is being used.
 */
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { FileText, X } from "lucide-react"
import { getActiveSource, onSourceChange, saveContext, loadContext } from "@/lib/sourceContext"

interface Props {
  className?: string
}

export function ActiveSourcePill({ className }: Props) {
  const [source, setSource] = useState(getActiveSource)

  useEffect(() => onSourceChange(() => setSource(getActiveSource())), [])

  if (!source) return null

  const dismiss = () => {
    const ctx = loadContext()
    saveContext({ ...ctx, mode: "none", selectedIds: [] })
    setSource(null)
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 text-xs ${className ?? ""}`}
      style={{
        background: "rgba(45,212,191,0.07)",
        border: "1px solid rgba(45,212,191,0.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <FileText className="h-3 w-3 flex-shrink-0" style={{ color: "var(--pz-teal)" }} />
      <span style={{ color: "var(--pz-text-muted)" }}>Context:</span>
      <Link to="/sources" className="font-medium truncate max-w-[200px] hover:underline" style={{ color: "var(--pz-teal)" }}>
        {source.name}
      </Link>
      <button
        onClick={dismiss}
        className="ml-1 hover:opacity-70 flex-shrink-0"
        style={{ color: "var(--pz-text-muted)" }}
        title="Clear source"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
