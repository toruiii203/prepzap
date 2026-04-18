/**
 * Skeleton loaders for different tool output shapes.
 * Shown while AI is processing to reassure users the app is working.
 */

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(90deg, var(--pz-surface3) 25%, rgba(255,255,255,0.04) 50%, var(--pz-surface3) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
        ...style,
      }}
    />
  )
}

// Inject keyframe once
if (typeof document !== "undefined" && !document.getElementById("pz-shimmer-style")) {
  const s = document.createElement("style")
  s.id = "pz-shimmer-style"
  s.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`
  document.head.appendChild(s)
}

/** Cards with a question title + 4 option rows (Practice / Daily5 / BossRound) */
export function QuestionSkeleton() {
  return (
    <div className="space-y-4 p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
      <Shimmer className="h-4 w-3/4 rounded-none" />
      <Shimmer className="h-3.5 w-1/2 rounded-none" />
      <div className="space-y-2 pt-2">
        {[0,1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-none" style={{ border: "1px solid var(--pz-border)" }}>
            <Shimmer className="h-4 w-4 flex-shrink-0 rounded-full" />
            <Shimmer className="h-3 flex-1 rounded-none" style={{ width: `${60 + i * 8}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Two-column card grid (Flashcards) */
export function FlashcardSkeleton() {
  return (
    <div className="space-y-3">
      {[0,1,2].map(i => (
        <div key={i} className="flex gap-3 p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3 w-2/3 rounded-none" />
            <Shimmer className="h-3 w-1/2 rounded-none" />
          </div>
          <div className="w-px" style={{ background: "var(--pz-border)" }} />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3 w-3/4 rounded-none" />
            <Shimmer className="h-3 w-1/3 rounded-none" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Three text blocks with varying widths (summary / explanation) */
export function TextSkeleton({ rows = 5 }: { rows?: number }) {
  const widths = ["100%", "92%", "85%", "97%", "78%", "90%", "60%"]
  return (
    <div className="space-y-2 p-4 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
      <Shimmer className="h-4 w-1/2 rounded-none mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-3 rounded-none" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  )
}

/** Roadmap stage nodes */
export function RoadmapSkeleton() {
  return (
    <div className="space-y-4">
      {[0,1,2,3].map(stage => (
        <div key={stage}>
          <div className="flex items-center gap-3 mb-3">
            <Shimmer className="w-6 h-6 rounded-none flex-shrink-0" />
            <Shimmer className="h-3 w-32 rounded-none" />
            <Shimmer className="flex-1 h-1 rounded-none" />
          </div>
          <div className="pl-3 border-l-2 space-y-2" style={{ borderColor: "var(--pz-border)" }}>
            {[0,1,2,3].map(node => (
              <div key={node} className="ml-2 p-3 rounded-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)" }}>
                <Shimmer className="h-3 w-2/3 rounded-none" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Chat message bubble */
export function ChatBubbleSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Shimmer className="w-7 h-7 rounded-none flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Shimmer className="h-3 w-full rounded-none" />
        <Shimmer className="h-3 w-5/6 rounded-none" />
        <Shimmer className="h-3 w-4/5 rounded-none" />
        <Shimmer className="h-3 w-2/3 rounded-none" />
      </div>
    </div>
  )
}
