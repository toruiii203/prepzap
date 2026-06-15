import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { SharedSidebar } from "@/components/SharedSidebar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { usePlan } from "@/hooks/usePlan"

type Theme = "light" | "dark" | "system"
type DailyGoal = 15 | 30 | 45 | 60 | 90 | 120

const RED = "#ae2925"
const SUBJECTS_LIST = ["Biology", "Chemistry", "Math", "Physics", "History", "English", "Economics"]

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "2px solid #1c1c19", boxShadow: "3px 3px 0 #1c1c19", marginBottom: 16, borderRadius: 2 }}>
      <div style={{ padding: "10px 16px", borderBottom: "2px solid #1c1c19", display: "flex", alignItems: "center", gap: 8, background: "#FAF7F2" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: RED }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1c1c19", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</span>
      </div>
      <div style={{ padding: 16, background: "#FAF7F2" }}>{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      style={{ width: 40, height: 22, background: on ? RED : "#d1cdc7", border: "2px solid #1c1c19", cursor: "pointer", position: "relative", transition: "background .15s", flexShrink: 0, borderRadius: 2 }}>
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 14, height: 14, background: "#fff", border: "1.5px solid #1c1c19", transition: "left .15s" }} />
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile } = useAuth() as any
  const { isPro, remaining } = usePlan()
  const [theme, setTheme] = useState<Theme>("system")
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(60)
  const [notifs, setNotifs] = useState({ streak: true, reminders: true, community: false, weekly: true })
  const [subjects, setSubjects] = useState<Set<string>>(new Set(["Biology", "Chemistry", "Math"]))
  const [saved, setSaved] = useState(false)
  const [userName, setUserName] = useState("Learner")
  const [userEmail, setUserEmail] = useState("")
  const [userInitial, setUserInitial] = useState("L")
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null)
  const FREE_CREDITS_TOTAL = 50

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        const name = meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Learner"
        setUserName(name)
        setUserEmail(session.user.email || "")
        setUserInitial(name.charAt(0).toUpperCase())
      }
    })
  }, [])

  useEffect(() => {
    remaining("quick_study").then((r) => setCreditsLeft(r))
  }, [remaining])

  const toggleSubject = (s: string) =>
    setSubjects(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/onboarding")
  }

  const chipBase: React.CSSProperties = {
    padding: "6px 14px",
    border: "2px solid #1c1c19",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: "all .12s",
    borderRadius: 2,
  }

  return (
    <div className="w-full bg-[#FAF7F2] min-h-full flex flex-col font-body-md text-black flex-1">
      <SharedSidebar active="/settings" />
      <main style={{ flex: 1, padding: "24px 16px", paddingBottom: 40, background: "#FAF7F2", minHeight: "100%" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Settings</h1>
            <p style={{ fontSize: 12, color: "#6b6b6b", margin: 0, fontFamily: "'Quicksand', sans-serif" }}>Manage your account & preferences</p>
          </div>

          {/* Profile */}
          <Section title="Profile" icon="person">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, background: RED, border: "2px solid #1c1c19", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {userInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{userName}</p>
                <p style={{ fontSize: 11, color: "#6b6b6b", margin: "0 0 6px", fontFamily: "'Quicksand', sans-serif" }}>{userEmail}</p>
                <span style={{
                  fontSize: 10, padding: "2px 8px", fontWeight: 800, letterSpacing: "0.08em",
                  background: isPro ? "#fef3c7" : "#f3f4f6",
                  color: isPro ? "#92400e" : "#374151",
                  border: "1.5px solid #1c1c19",
                  fontFamily: "'Plus Jakarta Sans', sans-serif"
                }}>{isPro ? "PRO ✦" : "FREE"}</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "XP", value: String(profile?.total_xp ?? profile?.xp ?? 0), icon: "bolt" },
                { label: "Streak", value: String(profile?.streak ?? 0), icon: "local_fire_department" },
                { label: "Level", value: String(profile?.level ?? 1), icon: "military_tech" },
              ].map(s => (
                <div key={s.label} style={{ padding: "12px 8px", background: "#fff", border: "2px solid #1c1c19", textAlign: "center", boxShadow: "2px 2px 0 #1c1c19" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: RED, display: "block", marginBottom: 4 }}>{s.icon}</span>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: "#6b6b6b", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Quicksand', sans-serif" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Study Preferences */}
          <Section title="Study Preferences" icon="target">
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#1c1c19", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Daily Goal</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([15, 30, 45, 60, 90, 120] as DailyGoal[]).map(g => (
                  <button key={g} onClick={() => setDailyGoal(g)} style={{
                    ...chipBase,
                    background: dailyGoal === g ? RED : "#fff",
                    color: dailyGoal === g ? "#fff" : "#1c1c19",
                    boxShadow: dailyGoal === g ? "none" : "2px 2px 0 #1c1c19",
                  }}>
                    {g < 60 ? `${g}m` : `${g / 60}h`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#1c1c19", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Subjects</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUBJECTS_LIST.map(s => (
                  <button key={s} onClick={() => toggleSubject(s)} style={{
                    ...chipBase,
                    background: subjects.has(s) ? "#1c1c19" : "#fff",
                    color: subjects.has(s) ? "#FAF7F2" : "#1c1c19",
                    boxShadow: subjects.has(s) ? "none" : "2px 2px 0 #1c1c19",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {subjects.has(s) && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" icon="palette">
            <label style={{ fontSize: 11, fontWeight: 700, color: "#1c1c19", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Theme</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {([
                ["light", "light_mode", "Light"],
                ["dark", "dark_mode", "Dark"],
                ["system", "settings_suggest", "System"],
              ] as [Theme, string, string][]).map(([t, icon, label]) => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12,
                  border: "2px solid #1c1c19",
                  background: theme === t ? "#1c1c19" : "#fff",
                  cursor: "pointer",
                  boxShadow: theme === t ? "none" : "2px 2px 0 #1c1c19",
                  transition: "all .12s",
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme === t ? "#FAF7F2" : "#1c1c19" }}>{icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme === t ? "#FAF7F2" : "#1c1c19", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</span>
                  {theme === t && <span className="material-symbols-outlined" style={{ fontSize: 12, color: RED }}>check_circle</span>}
                </button>
              ))}
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon="notifications">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {([
                ["streak",    "Streak reminders",    "Get reminded to keep your streak alive"],
                ["reminders", "Daily study reminder", "A gentle nudge at your chosen time"],
                ["community", "Community activity",   "Replies and likes on your posts"],
                ["weekly",    "Weekly summary",       "Your stats every Sunday"],
              ] as [keyof typeof notifs, string, string][]).map(([key, label, sub]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 14, borderBottom: "1px solid #e5e1da" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</p>
                    <p style={{ fontSize: 11, color: "#6b6b6b", margin: 0, fontFamily: "'Quicksand', sans-serif" }}>{sub}</p>
                  </div>
                  <Toggle on={notifs[key]} onChange={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))} />
                </div>
              ))}
            </div>
          </Section>

          {/* Plan */}
          <Section title="Plan" icon="workspace_premium">
            {isPro ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pro Plan</p>
                    <p style={{ fontSize: 11, color: "#6b6b6b", margin: 0, fontFamily: "'Quicksand', sans-serif" }}>Unlimited AI access — you're all set.</p>
                  </div>
                  <span style={{ fontSize: 10, padding: "3px 10px", background: "#fef3c7", color: "#92400e", border: "2px solid #1c1c19", fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ACTIVE</span>
                </div>
                <p style={{ fontSize: 11, color: "#6b6b6b", fontFamily: "'Quicksand', sans-serif" }}>Thank you for supporting Studenius. Enjoy unlimited credits and all Pro features.</p>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Free Plan</p>
                    <p style={{ fontSize: 11, color: "#6b6b6b", margin: 0, fontFamily: "'Quicksand', sans-serif" }}>
                      {creditsLeft !== null ? `${creditsLeft} of ${FREE_CREDITS_TOTAL} credits remaining` : "Loading credits…"}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, padding: "3px 10px", background: "#f3f4f6", color: "#374151", border: "2px solid #1c1c19", fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>FREE</span>
                </div>
                <div style={{ height: 8, background: "#e5e1da", border: "1.5px solid #1c1c19", marginBottom: 12 }}>
                  <div style={{ height: "100%", width: `${creditsLeft !== null ? Math.round((creditsLeft / FREE_CREDITS_TOTAL) * 100) : 0}%`, background: RED, transition: "width .4s" }} />
                </div>
                <p style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 12, fontFamily: "'Quicksand', sans-serif" }}>Upgrade to Pro for unlimited AI questions and all premium features.</p>
                <Link to="/pricing">
                  <button style={{ width: "100%", padding: "12px", background: RED, border: "2px solid #1c1c19", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.06em", boxShadow: "3px 3px 0 #1c1c19", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .12s" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>workspace_premium</span>
                    UPGRADE TO PRO
                  </button>
                </Link>
              </>
            )}
          </Section>

          {/* Account */}
          <Section title="Account" icon="manage_accounts">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { label: "Change password", icon: "lock" },
                { label: "Language & region", icon: "language" },
                { label: "Sound & haptics", icon: "volume_up" },
              ].map(({ label, icon }) => (
                <button key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", background: "none", border: "none", borderBottom: "1px solid #e5e1da", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#1c1c19" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#6b6b6b" }}>{icon}</span>
                    {label}
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#6b6b6b" }}>chevron_right</span>
                </button>
              ))}
              <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", background: "none", border: "none", borderBottom: "1px solid #e5e1da", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#d97706" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                  Sign out
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", background: "none", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: RED }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  Delete account
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
            </div>
          </Section>

          {/* Save */}
          <button onClick={handleSave} style={{
            width: "100%", padding: "14px",
            background: saved ? "#1c1c19" : RED,
            border: "2px solid #1c1c19",
            color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.06em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: saved ? "none" : "3px 3px 0 #1c1c19",
            transition: "all .15s", marginBottom: 20,
          }}>
            {saved
              ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span> SAVED!</>
              : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span> SAVE CHANGES</>
            }
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", fontFamily: "'Quicksand', sans-serif" }}>
            Studenius v1.0.0 · <Link to="/privacy" style={{ color: "#9ca3af" }}>Privacy</Link> · <Link to="/terms" style={{ color: "#9ca3af" }}>Terms</Link>
          </p>

        </div>
      </main>
    </div>
  )
}
