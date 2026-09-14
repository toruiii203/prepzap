import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const GOLD   = "#f0a040"
const BG     = "#160810"
const SURF   = "#1f0b13"
const SURF2  = "#2a0e18"
const BORDER = "rgba(139,26,42,0.35)"
const TEXT   = "#f5ede8"
const TEXT2  = "rgba(245,237,232,0.55)"
const TEXT3  = "rgba(245,237,232,0.28)"

interface Tool {
  href: string
  label: string
  emoji: string
  prompts: string[]
  color: string
}

const TOOLS: Tool[] = [
  {
    href: "/practice",
    label: "Practice",
    emoji: "📝",
    color: "#3b82f6",
    prompts: [
      "Give me 5 hard MCQs on cellular respiration",
      "Quiz me on the causes of World War I",
      "Test my knowledge of Newton's Laws",
      "Generate tricky questions on organic chemistry",
    ],
  },
  {
    href: "/flashcards",
    label: "Flashcards",
    emoji: "🃏",
    color: "#8b5cf6",
    prompts: [
      "Make flashcards for the periodic table trends",
      "Flashcards on key Supreme Court cases",
      "Create cards for Spanish irregular verbs",
      "Flashcard deck on Python syntax",
    ],
  },
  {
    href: "/feynman",
    label: "Feynman",
    emoji: "🧠",
    color: "#10b981",
    prompts: [
      "Explain quantum entanglement like I'm 10",
      "Break down how DNA replication works",
      "Teach me compound interest in simple terms",
      "Explain recursion using a real-world analogy",
    ],
  },
  {
    href: "/ai-tutor",
    label: "Rex Tutor",
    emoji: "🤖",
    color: GOLD,
    prompts: [
      "Why do I keep getting integration wrong?",
      "Help me understand Bayesian probability",
      "What's the difference between mitosis and meiosis?",
      "Explain the water cycle step by step",
    ],
  },
  {
    href: "/math",
    label: "Math Solver",
    emoji: "🔢",
    color: "#f59e0b",
    prompts: [
      "Solve x² + 5x + 6 = 0 step by step",
      "Walk me through integrating sin²(x)",
      "How do I find the derivative of ln(x²)?",
      "Explain matrix multiplication with an example",
    ],
  },
  {
    href: "/recall",
    label: "Recall",
    emoji: "💭",
    color: "#06b6d4",
    prompts: [
      "Test my recall on the French Revolution",
      "Brain dump everything I know about enzymes",
      "Recall practice for the Bill of Rights",
      "Memory test on WWII key dates",
    ],
  },
  {
    href: "/cram",
    label: "Cram Mode",
    emoji: "⚡",
    color: "#ef4444",
    prompts: [
      "I have an exam tomorrow, help me cram Organic Chem",
      "30-minute cram session on the Civil War",
      "Emergency review of macroeconomics concepts",
      "Last-minute prep for statistics exam",
    ],
  },
  {
    href: "/visual-learner",
    label: "Visual Learner",
    emoji: "👁️",
    color: "#ec4899",
    prompts: [
      "Show me how photosynthesis works visually",
      "Visualize the solar system and planet orbits",
      "Diagram the human digestive system",
      "Illustrate how neural networks learn",
    ],
  },
]

// Rotate prompts every few seconds
function useRotatingPrompts(tool: Tool) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % tool.prompts.length), 3000)
    return () => clearInterval(t)
  }, [tool])
  return tool.prompts[idx]
}

export function QuickLaunchBar() {
  const navigate = useNavigate()
  const [activeTool, setActiveTool] = useState<Tool>(TOOLS[3]) // Rex Tutor default
  const [inputVal, setInputVal] = useState("")
  const [focused, setFocused] = useState(false)
  const [animate, setAnimate] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentPrompt = useRotatingPrompts(activeTool)

  // Animate prompt chip change
  useEffect(() => {
    setAnimate(true)
    const t = setTimeout(() => setAnimate(false), 300)
    return () => clearTimeout(t)
  }, [currentPrompt])

  const handleLaunch = (promptOverride?: string) => {
    const text = promptOverride ?? inputVal.trim()
    if (!text) {
      navigate(activeTool.href)
      return
    }
    // Store as prefill so the tool can read it
    sessionStorage.setItem("quicklaunch_prompt", text)
    sessionStorage.setItem("quicklaunch_tool", activeTool.href)
    navigate(activeTool.href)
  }

  const handleChipClick = (prompt: string) => {
    setInputVal(prompt)
    inputRef.current?.focus()
  }

  return (
    <div style={{
      background: SURF,
      border: `2px solid ${focused ? `rgba(240,160,64,0.5)` : BORDER}`,
      borderRadius: 18,
      padding: "18px 20px",
      marginBottom: 24,
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: focused ? `0 0 0 3px rgba(240,160,64,0.08)` : "none",
    }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Quick Launch
          </span>
          <span style={{
            background: `${activeTool.color}22`,
            border: `1px solid ${activeTool.color}55`,
            color: activeTool.color,
            fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 20,
            transition: "all 0.2s"
          }}>
            {activeTool.emoji} {activeTool.label}
          </span>
        </div>
        <span style={{ fontSize: 10, color: TEXT3 }}>Pick a tool →</span>
      </div>

      {/* Tool selector pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {TOOLS.map(tool => (
          <button
            key={tool.href}
            onClick={() => { setActiveTool(tool); setInputVal("") }}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              background: activeTool.href === tool.href ? `${tool.color}22` : SURF2,
              border: `1.5px solid ${activeTool.href === tool.href ? tool.color : BORDER}`,
              color: activeTool.href === tool.href ? tool.color : TEXT2,
              fontSize: 11, fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 5,
              transform: activeTool.href === tool.href ? "scale(1.04)" : "scale(1)",
            }}
          >
            <span style={{ fontSize: 13 }}>{tool.emoji}</span>
            {tool.label}
          </button>
        ))}
      </div>

      {/* Rotating suggestion chip */}
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.12em", marginRight: 8 }}>
          Try something like
        </span>
        <button
          onClick={() => handleChipClick(currentPrompt)}
          style={{
            background: `${activeTool.color}11`,
            border: `1px solid ${activeTool.color}33`,
            borderRadius: 8,
            padding: "6px 12px",
            color: TEXT2,
            fontSize: 12,
            fontStyle: "italic",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s",
            opacity: animate ? 0.5 : 1,
            transform: animate ? "translateY(2px)" : "translateY(0)",
            display: "inline-flex", alignItems: "center", gap: 6,
            maxWidth: "100%", textAlign: "left",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${activeTool.color}22`; (e.currentTarget as HTMLElement).style.color = TEXT }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${activeTool.color}11`; (e.currentTarget as HTMLElement).style.color = TEXT2 }}
        >
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke={activeTool.color} strokeWidth={2} strokeLinecap="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          "{currentPrompt}"
        </button>
      </div>

      {/* Input + launch */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: SURF2,
          border: `1.5px solid ${focused ? `rgba(240,160,64,0.4)` : BORDER}`,
          borderRadius: 12, padding: "10px 14px",
          transition: "border-color 0.2s"
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{activeTool.emoji}</span>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === "Enter" && handleLaunch()}
            placeholder={`Ask ${activeTool.label} anything...`}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: TEXT, fontSize: 13, fontFamily: "inherit",
              caretColor: GOLD,
            }}
          />
          {inputVal && (
            <button
              onClick={() => setInputVal("")}
              style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 2, fontSize: 14, lineHeight: 1 }}
            >×</button>
          )}
        </div>
        <button
          onClick={() => handleLaunch()}
          style={{
            background: inputVal.trim() ? activeTool.color : SURF2,
            border: `2px solid ${inputVal.trim() ? activeTool.color : BORDER}`,
            borderRadius: 12, padding: "10px 18px",
            color: inputVal.trim() ? (activeTool.color === GOLD ? BG : "#fff") : TEXT3,
            fontSize: 12, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!inputVal.trim()) { (e.currentTarget as HTMLElement).style.borderColor = activeTool.color; (e.currentTarget as HTMLElement).style.color = activeTool.color } }}
          onMouseLeave={e => { if (!inputVal.trim()) { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = TEXT3 } }}
        >
          Launch
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      {/* Quick direct links for other prompts */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {activeTool.prompts.filter(p => p !== currentPrompt).slice(0, 3).map((p, i) => (
          <button
            key={i}
            onClick={() => handleChipClick(p)}
            style={{
              background: "transparent",
              border: `1px solid ${BORDER}`,
              borderRadius: 20, padding: "4px 10px",
              color: TEXT3, fontSize: 10,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
              whiteSpace: "nowrap", overflow: "hidden",
              textOverflow: "ellipsis", maxWidth: 180,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = activeTool.color; (e.currentTarget as HTMLElement).style.color = activeTool.color }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.color = TEXT3 }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
