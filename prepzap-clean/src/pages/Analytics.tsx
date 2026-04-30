import { useState, useEffect } from "react"
import { ToolPageShell } from "@/components/ToolPageShell"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { BarChart3, Clock, Target, Flame, Trophy, TrendingUp, Calendar } from "lucide-react"

const TEAL  = "#00C4B4"
const GOLD  = "#E8B923"
const ROSE  = "#E84040"
const FONT  = "'Inter', system-ui, sans-serif"
const MONO  = "'Geist Mono', 'Courier New', monospace"

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
type Period = "week" | "month" | "all"

interface ActivityItem { id: string; label: string; score: string; created_at: string }

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  return `${d}d ago`
}

function parseScore(score: string): { correct: number; total: number } | null {
  const m = score?.match(/(\d+)\s*\/\s*(\d+)/)
  if (m) return { correct: parseInt(m[1]), total: parseInt(m[2]) }
  return null
}

export default function Analytics() {
  const { user } = useAuth()
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>("week")

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from("activity_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setActivity(data)
        setLoading(false)
      })
  }, [user?.id])

  // Filter by period
  const now = Date.now()
  const cutoff = period === "week" ? now - 7 * 86400000 : period === "month" ? now - 30 * 86400000 : 0
  const filtered = activity.filter(a => new Date(a.created_at).getTime() >= cutoff)

  // Stats from real data
  const totalSessions = filtered.length
  const scoredItems = filtered.map(a => parseScore(a.score)).filter(Boolean) as { correct: number; total: number }[]
  const totalCorrect = scoredItems.reduce((s, x) => s + x.correct, 0)
  const totalQs = scoredItems.reduce((s, x) => s + x.total, 0)
  const avgAccuracy = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : 0

  // Streak — consecutive days with activity
  const activityDays = new Set(activity.map(a => a.created_at.slice(0, 10)))
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10)
    if (activityDays.has(d)) streak++
    else break
  }

  // Last 7 days bar data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now - (6 - i) * 86400000)
    const key = date.toISOString().slice(0, 10)
    const dayActivity = activity.filter(a => a.created_at.slice(0, 10) === key)
    const dayScored = dayActivity.map(a => parseScore(a.score)).filter(Boolean) as { correct: number; total: number }[]
    const dayQs = dayScored.reduce((s, x) => s + x.total, 0)
    const dayCorrect = dayScored.reduce((s, x) => s + x.correct, 0)
    return {
      day: DAYS[date.getDay()],
      sessions: dayActivity.length,
      questions: dayQs,
      accuracy: dayQs > 0 ? Math.round((dayCorrect / dayQs) * 100) : 0,
    }
  })

  const maxQs = Math.max(...last7.map(d => d.questions), 1)

  // Tool usage breakdown
  const toolCounts: Record<string, number> = {}
  filtered.forEach(a => {
    const tool = a.label?.split("·")[0]?.trim() || "Unknown"
    toolCounts[tool] = (toolCounts[tool] || 0) + 1
  })
  const topTools = Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxTool = topTools[0]?.[1] || 1

  const stat = (label: string, value: string | number, sub: string, color = TEAL) => (
    <div style={{ flex: 1, padding: "16px", background: "#0E0E0E", border: "0.5px solid #1E1E1E" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: MONO, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#F0F0F0", fontWeight: 600, marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <ToolPageShell>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px", fontFamily: FONT }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart3 style={{ color: GOLD, width: 18, height: 18 }} />
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Progress</h1>
              <p style={{ fontSize: 10, color: "#555", margin: 0 }}>Real data from your study sessions</p>
            </div>
          </div>
          <div style={{ display: "flex", border: "0.5px solid #252525", overflow: "hidden" }}>
            {(["week", "month", "all"] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: "5px 14px", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", background: period === p ? GOLD : "transparent", color: period === p ? "#000" : "#555", border: "none", cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" }}>
                {p === "all" ? "All time" : `This ${p}`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#555", fontSize: 13 }}>Loading your data...</div>
        ) : activity.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>
            <BarChart3 style={{ width: 40, height: 40, opacity: 0.2, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>No activity yet</p>
            <p style={{ fontSize: 12, color: "#333", marginTop: 4 }}>Start studying to see your progress here</p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 1, marginBottom: 1 }}>
              {stat("Sessions", totalSessions, `In this ${period}`)}
              {stat("Questions", totalQs || "—", totalQs > 0 ? `${totalCorrect} correct` : "Score data unavailable")}
              {stat("Accuracy", totalQs > 0 ? `${avgAccuracy}%` : "—", totalQs > 0 ? (avgAccuracy >= 80 ? "Great work!" : avgAccuracy >= 60 ? "Keep going" : "Needs work") : "Complete scored sessions", avgAccuracy >= 80 ? TEAL : avgAccuracy >= 60 ? GOLD : ROSE)}
              {stat("Streak", `${streak}🔥`, streak > 0 ? "Consecutive days" : "Study today to start!")}
            </div>

            {/* 7-day bar chart */}
            <div style={{ background: "#0E0E0E", border: "0.5px solid #1E1E1E", padding: "16px 20px", marginTop: 1, marginBottom: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Clock style={{ color: TEAL, width: 14, height: 14 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Questions per day (last 7 days)</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                {last7.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {d.questions > 0 && <span style={{ fontSize: 9, color: "#555", fontFamily: MONO }}>{d.questions}</span>}
                    <div style={{ width: "100%", background: "#1A1A1A", flex: 1, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", height: `${Math.max(4, (d.questions / maxQs) * 100)}%`, background: d.questions > 0 ? TEAL : "#1A1A1A", transition: "height 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 9, color: "#555" }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tool breakdown + recent activity side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 1 }}>
              {/* Tool usage */}
              <div style={{ background: "#0E0E0E", border: "0.5px solid #1E1E1E", padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <TrendingUp style={{ color: GOLD, width: 14, height: 14 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Top Tools Used</span>
                </div>
                {topTools.length === 0 ? (
                  <p style={{ fontSize: 11, color: "#333" }}>No tool data yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {topTools.map(([tool, count]) => (
                      <div key={tool}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{tool}</span>
                          <span style={{ fontSize: 10, color: "#555", fontFamily: MONO }}>{count}</span>
                        </div>
                        <div style={{ height: 3, background: "#1A1A1A" }}>
                          <div style={{ height: "100%", width: `${(count / maxTool) * 100}%`, background: GOLD, transition: "width 0.6s" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div style={{ background: "#0E0E0E", border: "0.5px solid #1E1E1E", padding: "16px 20px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Calendar style={{ color: TEAL, width: 14, height: 14 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent Sessions</span>
                </div>
                {filtered.length === 0 ? (
                  <p style={{ fontSize: 11, color: "#333" }}>No sessions in this period</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {filtered.slice(0, 10).map(item => {
                      const scored = parseScore(item.score)
                      const pct = scored ? Math.round((scored.correct / scored.total) * 100) : null
                      return (
                        <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0", borderBottom: "0.5px solid #141414" }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 11, color: "#C0C0C0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{item.label}</p>
                            <p style={{ fontSize: 9, color: "#444", margin: "2px 0 0", fontFamily: MONO }}>{relTime(item.created_at)}</p>
                          </div>
                          {pct !== null && (
                            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: MONO, color: pct >= 80 ? TEAL : pct >= 60 ? GOLD : ROSE, flexShrink: 0 }}>
                              {item.score}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Milestones based on real data */}
            <div style={{ background: "#0E0E0E", border: "0.5px solid #1E1E1E", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Trophy style={{ color: GOLD, width: 14, height: 14 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#F0F0F0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Milestones</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                {[
                  { label: "First Session",  icon: "🎉", earned: activity.length >= 1 },
                  { label: "10 Sessions",    icon: "📚", earned: activity.length >= 10 },
                  { label: "50 Sessions",    icon: "⚡", earned: activity.length >= 50 },
                  { label: "100 Questions",  icon: "🎯", earned: totalQs >= 100 },
                  { label: "500 Questions",  icon: "🏆", earned: totalQs >= 500 },
                  { label: "3-Day Streak",   icon: "🔥", earned: streak >= 3 },
                  { label: "7-Day Streak",   icon: "💎", earned: streak >= 7 },
                  { label: "80% Accuracy",   icon: "⭐", earned: avgAccuracy >= 80 },
                ].map(m => (
                  <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 8px", background: m.earned ? "rgba(232,185,35,0.06)" : "#0A0A0A", border: `0.5px solid ${m.earned ? "rgba(232,185,35,0.25)" : "#1A1A1A"}`, opacity: m.earned ? 1 : 0.4 }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <span style={{ fontSize: 9, color: m.earned ? GOLD : "#555", textAlign: "center", fontWeight: m.earned ? 600 : 400, lineHeight: 1.3 }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </ToolPageShell>
  )
}
