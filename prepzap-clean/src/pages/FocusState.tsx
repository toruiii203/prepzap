import { loadHistory, addHistoryEntry, deleteHistoryEntry } from "@/lib/historyStore";
/**
 * FocusState.tsx — Studenius
 * 3-stage emotional intelligence coach:
 *   Stage 1 — Talk (journaling surface)
 *   Stage 2 — Pulse Check (AI-generated micro-survey, tap-to-select)
 *   Stage 3 — Focus Report (3 cards: state, data, actions)
 *
 * Dashboard: label "Focus State", description "Process stress, get clarity"
 * Route: /focus-state
 */

import { useState, useEffect } from "react"
import { callGroq } from "@/lib/groq"
import { buildAIContext } from "@/lib/sourceContext"
import { ToolPageShell, useModel } from "@/components/ToolPageShell"
import { supabase } from "@/lib/supabase"

// ── Constants ────────────────────────────────────────────────────────────────
const TEAL   = "#00C4B4"
const GOLD   = "#E8B923"
const BG     = "#03050F"
const CARD   = "#0E0E0E"
const BORDER = "#252525"
const MUTED  = "#555"
const TEXT   = "#F0F0F0"
const FONT   = "'Inter', system-ui, sans-serif"
const JOURNAL_KEY = "studenius_focus_journal"

// ── Types ─────────────────────────────────────────────────────────────────────
interface PulseQuestion {
  id: string
  question: string
  options: string[]
}

interface FocusReport {
  whatIsHappening: string
  whatDataSays: string
  nextActions: Array<{ action: string; timeBox: string; link?: string }>
}

interface UserStudyData {
  sessionsThisWeek: number
  streak: number
  xpThisWeek: number
  studyDna?: string
}

// ── Word count ────────────────────────────────────────────────────────────────
function wordCount(s: string) {
  return s.trim() === "" ? 0 : s.trim().split(/\s+/).length
}

// ── Supabase data fetch ───────────────────────────────────────────────────────
async function fetchStudyData(): Promise<UserStudyData> {
  const defaults: UserStudyData = { sessionsThisWeek: 0, streak: 0, xpThisWeek: 0 }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return defaults

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [sessRes, xpRes, metaRes] = await Promise.all([
      supabase.from("study_sessions").select("id", { count: "exact" }).gte("created_at", weekAgo),
      supabase.from("xp_log").select("amount").gte("created_at", weekAgo),
      supabase.from("user_metadata").select("streak, study_dna").eq("user_id", user.id).single(),
    ])

    const xpThisWeek = (xpRes.data ?? []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)
    const streak = metaRes.data?.streak ?? 0
    const studyDna = metaRes.data?.study_dna ?? undefined
    const sessionsThisWeek = sessRes.count ?? 0

    return { sessionsThisWeek, streak, xpThisWeek, studyDna }
  } catch {
    return defaults
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function FocusState() {
  const { model, setModel } = useModel()
  const { entries, save: saveHistory, remove: removeHistory, clear: clearHistory } =("focus-state")

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolHistory, setToolHistory] = useState(() => loadHistory("focus-state"));
  const [stage, setStage]           = useState<1|2|3>(1)
  const [freeText, setFreeText]     = useState("")
  const [questions, setQuestions]   = useState<PulseQuestion[]>([])
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [report, setReport]         = useState<FocusReport|null>(null)
  const [studyData, setStudyData]   = useState<UserStudyData | null>(null)
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string|null>(null)

  const wc = wordCount(freeText)
  const canProceed = wc >= 10
  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id])

  // Fetch study data at mount
  useEffect(() => {
    fetchStudyData().then(setStudyData)
  }, [])

  // ── History restore ────────────────────────────────────────────────────────
  const handleHistorySelect = (entry: HistoryEntry) => {    try {
      const parsed: FocusReport = JSON.parse(entry.output)
      setReport(parsed)
      setStage(3)
    } catch { /* ignore */ }
  }

  // ── Stage 1 → 2: Generate pulse questions ─────────────────────────────────
  const handleGenerateQuestions = async () => {
    if (!canProceed) return
    setIsLoading(true)
    setError(null)

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Student wrote:\n"${freeText}"\n\nGenerate 4 targeted follow-up questions.` }],
        `You are an empathetic emotional intelligence coach for students.
Read their message and generate 4-5 specific questions to understand their situation better.
Questions should be SPECIFIC to what they wrote — not generic.
If they mention exam panic → ask about sleep quality, prep confidence, time until exam.
If they mention burnout → ask about last break, session frequency, enjoyment.

Return ONLY valid JSON (no markdown):
[
  {
    "id": "q1",
    "question": "<specific question>",
    "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"]
  }
]
Give 3-4 options per question. Options should be concrete, not vague.`,
        model,
        800
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: PulseQuestion[] = JSON.parse(clean)
      setQuestions(parsed)
      setAnswers({})
      setStage(2)
    } catch (e: any) {
      setError("Could not generate questions. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Stage 2 → 3: Generate focus report ────────────────────────────────────
  const handleGenerateReport = async () => {
    if (!allAnswered) return
    setIsLoading(true)
    setError(null)

    const answerSummary = questions.map(q => `Q: ${q.question}\nA: ${answers[q.id]}`).join("\n\n")
    const dataStr = studyData
      ? `Sessions this week: ${studyData.sessionsThisWeek}, Streak: ${studyData.streak} days, XP this week: ${studyData.xpThisWeek}${studyData.studyDna ? `, Study DNA: ${studyData.studyDna}` : ""}`
      : "Study data unavailable"

    const systemPrompt = `You are an empathetic emotional intelligence coach for students.
Generate a personalized focus report based on the student's journal entry, survey answers, and study data.

Return ONLY valid JSON (no markdown):
{
  "whatIsHappening": "<2-3 sentences: honest read of their emotional state based on their writing and answers>",
  "whatDataSays": "<2-3 sentences incorporating the study data numbers, personalized interpretation>",
  "nextActions": [
    {"action": "<specific action>", "timeBox": "<e.g. '2 minutes' or '25 minutes'>", "link": "<optional route like /timer or /flashcards>"},
    {"action": "<specific action>", "timeBox": "<time>"},
    {"action": "<specific action>", "timeBox": "<time>"}
  ]
}

Rules:
- whatIsHappening: honest, not sycophantic. Name what's really happening.
- whatDataSays: use the exact numbers provided. Add interpretation.
- nextActions: first action is ALWAYS a breathing reset (link: /timer). Second action is study-related. Third is a positive reframe.
- Be specific. No generic advice.
Study data: ${dataStr}`

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Journal:\n"${freeText}"\n\nSurvey answers:\n${answerSummary}` }],
        systemPrompt,
        model,
        1024
      )
      const clean = raw.replace(/```json|```/gi, "").trim()
      const parsed: FocusReport = JSON.parse(clean)
      setReport(parsed)
      setStage(3)

      saveHistory({
        prompt: freeText.slice(0, 60) + (freeText.length > 60 ? "…" : ""),
        preview: parsed.whatIsHappening.slice(0, 120),
        output: JSON.stringify(parsed),
        model,
        meta: "Focus report",
      })
    } catch (e: any) {
      setError("Could not generate report. Try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Save to journal ────────────────────────────────────────────────────────
  const handleSaveJournal = () => {
    if (!report) return
    const entry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      freeText,
      report,
    }
    try {
      const existing = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]")
      existing.unshift(entry)
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(existing.slice(0, 50)))
    } catch { /* ignore */ }
    alert("Saved to your Focus Journal.")
  }

  const handleRestart = () => {
    setStage(1); setFreeText(""); setQuestions([]); setAnswers({}); setReport(null); setError(null)
  }

  // ── Shared header ──────────────────────────────────────────────────────────
  const HeaderRow = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {/* Heart pulse icon */}
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth={1.7}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL }}>
            Focus State
          </span>
          {/* Stage indicator */}
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ width: 16, height: 3, background: stage >= s ? TEAL : "#1E1E1E", transition: "background .3s" }} />
            ))}
          </div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>
          {stage === 1 ? "What's going on?" : stage === 2 ? "Quick check-in" : "Your Focus Report"}
        </h1>
      </div>
      < count={entries.length} onClick={() =>} />
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 1 — Free expression / journaling
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === 1) return (
    <ToolPageShell key="shell">
      {/* ── HISTORY SIDEBAR ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }} />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 100,
        width: 300, background: "#0A0D12", borderLeft: "0.5px solid #1E2A2A",
        display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: sidebarOpen ? "-8px 0 32px rgba(0,0,0,0.6)" : "none",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid #1A2626", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#00C4B4", marginBottom: 2 }}>Focus State History</div>
            <div style={{ fontSize: 10, color: "#444" }}>{toolHistory.length} session{toolHistory.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {toolHistory.length > 0 && (
              <button onClick={() => { deleteHistoryEntry("focus-state", "all"); setToolHistory([]); }}
                style={{ fontSize: 10, color: "#444", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: "2px 6px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#444"; }}>Clear all</button>
            )}
            <button onClick={() => setSidebarOpen(false)}
              style={{ width: 26, height: 26, border: "0.5px solid #1E2A2A", background: "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E2A2A"; e.currentTarget.style.color = "#555"; }}>
              <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {toolHistory.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{ width: 36, height: 36, border: "0.5px solid #1E2A2A", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Brain size={16} style={{ color: "#333" }} />
              </div>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>No focus state history yet</div>
              <div style={{ fontSize: 11, color: "#333" }}>Sessions will appear here</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...toolHistory].reverse().map((entry) => (
                <div key={entry.id}
                  style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A2626", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.background = "rgba(0,196,180,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1A2626"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#D0D0D0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 3, display: "flex", gap: 6 }}>
                    <span style={{ color: "#2A6A64" }}>{entry.subtitle}</span><span>·</span>
                    <span>{new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "0.5px solid #1A2626" }}>
          <div style={{ fontSize: 10, color: "#333", textAlign: "center" }}>Click any session to replay →</div>
        </div>
      </div>
      <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
        <HeaderRow />

        <div style={{ position: "relative", background: "#111", border: `0.5px solid ${BORDER}` }}>
          <textarea
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder={"What's going on right now? Exam stress, burnout, can't focus — just say it."}
            style={{
              width: "100%",
              minHeight: 280,
              padding: "28px 32px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: TEXT,
              fontSize: 15,
              fontFamily: FONT,
              fontWeight: 300,
              lineHeight: 1.8,
              resize: "none",
              boxSizing: "border-box",
              caretColor: TEAL,
            }}
          />
          <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: 10, color: wc >= 10 ? "#444" : "#2A2A2A", fontFamily: FONT, userSelect: "none" }}>
            {wc} {wc === 1 ? "word" : "words"}{!canProceed && wc > 0 ? " — keep going" : ""}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(232,60,60,0.08)", border: "0.5px solid rgba(232,60,60,0.2)", color: "#E84040", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerateQuestions}
          disabled={!canProceed || isLoading}
          style={{
            marginTop: 16, width: "100%", padding: "14px 0",
            background: canProceed && !isLoading ? TEAL : "#141414",
            color: canProceed && !isLoading ? BG : "#333",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: canProceed && !isLoading ? "pointer" : "not-allowed",
            fontFamily: FONT, letterSpacing: "0.06em",
            transition: "background .2s, color .2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {isLoading ? (
            <>
              <span style={{ width: 14, height: 14, border: `2px solid rgba(10,10,10,0.3)`, borderTopColor: BG, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              Reading your situation…
            </>
          ) : "I'm done, help me"}
        </button>

        {!canProceed && (
          <p style={{ fontSize: 10, color: "#333", textAlign: "center", marginTop: 10 }}>
            Write at least 10 words to continue
          </p>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>

      < entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() =>} />
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 2 — Pulse check micro-survey
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === 2) return (
    <ToolPageShell key="shell">
      
      <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
        <HeaderRow />

        <p style={{ fontSize: 13, color: "#777", marginBottom: 28, lineHeight: 1.6 }}>
          A few quick questions based on what you wrote. Tap to answer — this helps me personalize your report.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 32 }}>
          {questions.map(q => (
            <div key={q.id}>
              <p style={{ fontSize: 14, color: TEXT, marginBottom: 12, lineHeight: 1.55, fontWeight: 500 }}>{q.question}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      style={{
                        padding: "8px 16px",
                        background: selected ? "rgba(0,196,180,0.12)" : "#141414",
                        border: `0.5px solid ${selected ? TEAL : BORDER}`,
                        color: selected ? TEAL : "#888",
                        fontSize: 12,
                        fontWeight: selected ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: FONT,
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#C0C0C0" } }}
                      onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = "#888" } }}>
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(232,60,60,0.08)", border: "0.5px solid rgba(232,60,60,0.2)", color: "#E84040", fontSize: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGenerateReport}
          disabled={!allAnswered || isLoading}
          style={{
            width: "100%", padding: "14px 0",
            background: allAnswered && !isLoading ? TEAL : "#141414",
            color: allAnswered && !isLoading ? BG : "#333",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: allAnswered && !isLoading ? "pointer" : "not-allowed",
            fontFamily: FONT, letterSpacing: "0.06em",
            transition: "background .2s, color .2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          {isLoading ? (
            <>
              <span style={{ width: 14, height: 14, border: `2px solid rgba(10,10,10,0.3)`, borderTopColor: BG, borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              Building your report…
            </>
          ) : "Generate My Focus Report"}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>

      < entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() =>} />
    </ToolPageShell>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 3 — Focus report (3 cards)
  // ════════════════════════════════════════════════════════════════════════════
  if (stage === 3 && report) return (
    <ToolPageShell key="shell">
      
      <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={() => setSidebarOpen(v => !v)}
            style={{ width: 32, height: 32, border: "0.5px solid #252525", background: sidebarOpen ? "rgba(0,196,180,0.08)" : "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: sidebarOpen ? "#00C4B4" : "#555", transition: "all .15s", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#00C4B4"; e.currentTarget.style.color = "#00C4B4"; }}
            onMouseLeave={e => { if (!sidebarOpen) { e.currentTarget.style.borderColor = "#252525"; e.currentTarget.style.color = "#555"; } }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.8}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            {toolHistory.length > 0 && <div style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#00C4B4" }} />}
          </button>
        </div>
        <HeaderRow />

        {/* Card 1 — What's Actually Happening (teal left border) */}
        <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderLeft: `3px solid ${TEAL}`, padding: "22px 24px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL, marginBottom: 12 }}>
            What's Actually Happening
          </div>
          <p style={{ fontSize: 14, color: "#C8C8C8", margin: 0, lineHeight: 1.75 }}>{report.whatIsHappening}</p>
        </div>

        {/* Card 2 — What Your Data Says (gold left border) */}
        <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderLeft: `3px solid ${GOLD}`, padding: "22px 24px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>
            What Your Data Says
          </div>
          {studyData && (
            <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
              {[
                { label: "Sessions", value: studyData.sessionsThisWeek, unit: "this week" },
                { label: "Streak",   value: studyData.streak, unit: "days" },
                { label: "XP",      value: studyData.xpThisWeek, unit: "this week" },
              ].map(({ label, value, unit }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: GOLD, lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{unit}</div>
                  <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 13, color: "#B0B0B0", margin: 0, lineHeight: 1.7 }}>{report.whatDataSays}</p>
        </div>

        {/* Card 3 — Your Next 3 Actions (white left border) */}
        <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderLeft: `3px solid #F0F0F0`, padding: "22px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT, marginBottom: 16 }}>
            Your Next 3 Actions
          </div>
          {report.nextActions.map((action, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: i < report.nextActions.length - 1 ? 16 : 0, paddingBottom: i < report.nextActions.length - 1 ? 16 : 0, borderBottom: i < report.nextActions.length - 1 ? `0.5px solid #1A1A1A` : "none" }}>
              {/* Number */}
              <div style={{ flexShrink: 0, width: 24, height: 24, background: "rgba(240,240,240,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: TEXT }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: TEXT, margin: "0 0 4px", lineHeight: 1.5 }}>{action.action}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10, color: MUTED, padding: "2px 6px", background: "#141414", border: `0.5px solid ${BORDER}` }}>
                    {action.timeBox}
                  </span>
                  {action.link && (
                    <a href={action.link}
                      style={{ fontSize: 10, color: TEAL, textDecoration: "none", letterSpacing: "0.06em" }}>
                      Open →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleRestart}
            style={{ flex: 1, padding: "12px 0", background: "transparent", border: `0.5px solid ${BORDER}`, color: "#888", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
            Restart
          </button>
          <button onClick={handleSaveJournal}
            style={{ flex: 1, padding: "12px 0", background: TEAL, color: BG, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, letterSpacing: "0.06em" }}>
            Save to Journal
          </button>
        </div>
      </main>

      < entries={entries} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} open={historyOpen} onClose={() =>} />
    </ToolPageShell>
  )

  return null
}
