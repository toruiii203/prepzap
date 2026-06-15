import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ToolPageShell } from "@/pages/ToolPageShell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Settings as SettingsIcon, User, Bell, Lock, Palette,
  Target, Zap, CreditCard, Trash2, Check, ChevronRight,
  Globe, Volume2, LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { usePlan } from "@/hooks/usePlan"

type Theme = "light" | "dark" | "system"
type DailyGoal = 15 | 30 | 45 | 60 | 90 | 120

const TEAL = "#8b1a2a"
const GOLD = "#f0a040"
const SUBJECTS_LIST = ["Biology", "Chemistry", "Math", "Physics", "History", "English", "Economics"]

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid #1E1E1E", marginBottom: 12 }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #1A1A1A", display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555" }}>{title}</span>
      </div>
      <div style={{ padding: "14px" }}>{children}</div>
    </div>
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
  const [userEmail, setUserEmail] = useState("learner@example.com")
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
    // Load real remaining credits from usePlan
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

  const chipStyle = (active: boolean) => ({
    padding: "6px 12px",
    border: `0.5px solid ${active ? TEAL : "#252525"}`,
    background: active ? "rgba(0,196,180,0.08)" : "transparent",
    color: active ? TEAL : "#555",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Nunito',system-ui,sans-serif",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all .15s",
  })

  return (
    <ToolPageShell>
      <main style={{ flex: 1, padding: "24px 16px", paddingBottom: 40 }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          {/* Page header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg,${TEAL},#0097A7)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SettingsIcon style={{ width: 14, height: 14, color: "#0A0A0A" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#F0F0F0", margin: 0 }}>Settings</h1>
              <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em" }}>ACCOUNT & PREFERENCES</p>
            </div>
          </div>

          {/* Profile */}
          <Section title="Profile" icon={<User style={{ width: 12, height: 12, color: TEAL }} />}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, background: `linear-gradient(135deg,${TEAL},#0097A7)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0A0A0A", flexShrink: 0 }}>
                {userInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F0F0F0", margin: "0 0 2px" }}>{userName}</p>
                <p style={{ fontSize: 11, color: "#555", margin: "0 0 6px" }}>{userEmail}</p>
                <span style={{ fontSize: 9, padding: "2px 6px", background: isPro ? "rgba(245,198,66,0.12)" : "rgba(0,196,180,0.08)", color: isPro ? GOLD : TEAL, border: `0.5px solid ${isPro ? "rgba(245,198,66,0.3)" : "rgba(0,196,180,0.25)"}`, fontWeight: 700, letterSpacing: "0.08em" }}>{isPro ? "PRO PLAN" : "FREE PLAN"}</span>
              </div>
              <button style={{ padding: "4px 10px", border: "0.5px solid #252525", background: "transparent", color: "#555", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[{ label: "XP", value: String(profile?.total_xp ?? profile?.xp ?? 0) }, { label: "Streak", value: String(profile?.streak ?? 0) }, { label: "Level", value: String(profile?.level ?? 1) }].map(s => (
                <div key={s.label} style={{ padding: "10px 8px", background: "rgba(255,255,255,0.02)", border: "0.5px solid #1A1A1A", textAlign: "center" }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#F0F0F0", margin: "0 0 3px", fontFamily: "monospace" }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: "#555", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Study preferences */}
          <Section title="Study Preferences" icon={<Target style={{ width: 12, height: 12, color: GOLD }} />}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#999", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Daily goal</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([15, 30, 45, 60, 90, 120] as DailyGoal[]).map(g => (
                  <button key={g} onClick={() => setDailyGoal(g)} style={chipStyle(dailyGoal === g)}>
                    {g < 60 ? `${g}m` : `${g / 60}h`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#999", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>My subjects</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUBJECTS_LIST.map(s => (
                  <button key={s} onClick={() => toggleSubject(s)} style={chipStyle(subjects.has(s))}>
                    {subjects.has(s) && <Check style={{ width: 10, height: 10 }} />} {s}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" icon={<Palette style={{ width: 12, height: 12, color: "#a78bfa" }} />}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#999", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Theme</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {([["light", "light_mode", "Light"], ["dark", "dark_mode", "Dark"], ["system", "settings_suggest", "System"]] as [Theme, string, string][]).map(([t, icon, label]) => (
                <button key={t} onClick={() => setTheme(t)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 12, border: `0.5px solid ${theme === t ? "#a78bfa" : "#252525"}`, background: theme === t ? "rgba(167,139,250,0.06)" : "transparent", cursor: "pointer" }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: theme === t ? "#a78bfa" : "#555", fontFamily: "inherit" }}>{label}</span>
                  {theme === t && <Check style={{ width: 10, height: 10, color: "#a78bfa" }} />}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: "#444", marginTop: 8 }}>Note: The animated canvas background is controlled via the theme strip above all pages.</p>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon={<Bell style={{ width: 12, height: 12, color: "#f59e0b" }} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {([
                ["streak",    "Streak reminders",     "Get reminded to keep your streak alive"],
                ["reminders", "Daily study reminder",  "A gentle nudge at your chosen time"],
                ["community", "Community activity",    "Replies and likes on your posts"],
                ["weekly",    "Weekly summary",        "Your stats every Sunday"],
              ] as [keyof typeof notifs, string, string][]).map(([key, label, sub]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#C0C0C0", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 10, color: "#555", margin: 0 }}>{sub}</p>
                  </div>
                  <button onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))}
                    style={{ width: 36, height: 18, background: notifs[key] ? TEAL : "#252525", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: notifs[key] ? 20 : 2, width: 14, height: 14, background: "#fff", transition: "left .2s" }} />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Plan" icon={<Zap style={{ width: 12, height: 12, color: GOLD }} />}>
            {isPro ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F0F0F0", margin: "0 0 2px" }}>Pro Plan</p>
                    <p style={{ fontSize: 11, color: "#555", margin: 0 }}>Unlimited AI access — you're all set.</p>
                  </div>
                  <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(245,198,66,0.12)", color: GOLD, border: `0.5px solid rgba(245,198,66,0.3)`, fontWeight: 700, letterSpacing: "0.08em" }}>ACTIVE</span>
                </div>
                <p style={{ fontSize: 11, color: "#555" }}>Thank you for supporting Studenius. Enjoy unlimited credits and all Pro features.</p>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#F0F0F0", margin: "0 0 2px" }}>Free Plan</p>
                    <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
                      {creditsLeft !== null ? `${creditsLeft} of ${FREE_CREDITS_TOTAL} credits remaining` : "Loading credits…"}
                    </p>
                  </div>
                  <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(0,196,180,0.08)", color: TEAL, border: `0.5px solid rgba(0,196,180,0.25)`, fontWeight: 700, letterSpacing: "0.08em" }}>ACTIVE</span>
                </div>
                <div style={{ height: 4, background: "#1A1A1A", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: `${creditsLeft !== null ? Math.round((creditsLeft / FREE_CREDITS_TOTAL) * 100) : 0}%`, background: TEAL, transition: "width .4s" }} />
                </div>
                <p style={{ fontSize: 11, color: "#555", marginBottom: 12 }}>Upgrade to Pro for unlimited AI questions, Feynman Mode, and more.</p>
                <Link to="/pricing">
                  <button style={{ width: "100%", padding: "10px", background: `linear-gradient(135deg,${TEAL},#0097A7)`, border: "none", color: "#0A0A0A", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", letterSpacing: "0.06em" }}>
                    <CreditCard style={{ width: 14, height: 14 }} /> UPGRADE TO PRO
                  </button>
                </Link>
              </>
            )}
          </Section>

          {/* Account */}
          <Section title="Account" icon={<Lock style={{ width: 12, height: 12, color: "#555" }} />}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { label: "Change password", icon: Lock },
                { label: "Language & region", icon: Globe },
                { label: "Sound & haptics", icon: Volume2 },
              ].map(({ label, icon: Icon }) => (
                <button key={label}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", background: "none", border: "none", borderBottom: "0.5px solid #141414", cursor: "pointer", color: "#C0C0C0", fontFamily: "inherit", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon style={{ width: 14, height: 14, color: "#555" }} />
                    {label}
                  </div>
                  <ChevronRight style={{ width: 14, height: 14, color: "#333" }} />
                </button>
              ))}
              <button onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", background: "none", border: "none", borderBottom: "0.5px solid #141414", cursor: "pointer", color: "#f59e0b", fontFamily: "inherit", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <LogOut style={{ width: 14, height: 14 }} /> Sign out
                </div>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
              <button
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontFamily: "inherit", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Trash2 style={{ width: 14, height: 14 }} /> Delete account
                </div>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </Section>

          {/* Save */}
          <button onClick={handleSave}
            style={{ width: "100%", padding: "12px", background: saved ? "rgba(0,196,180,0.12)" : "rgba(255,255,255,0.06)", border: `0.5px solid ${saved ? TEAL : "#252525"}`, color: saved ? TEAL : "#F0F0F0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s", marginBottom: 16 }}>
            {saved ? <><Check style={{ width: 14, height: 14 }} /> SAVED!</> : "SAVE CHANGES"}
          </button>

          <p style={{ textAlign: "center", fontSize: 10, color: "#333" }}>
            Studenius v1.0.0 �/ <a href="#" style={{ color: "#444", textDecoration: "none" }}>Privacy Policy</a> �/ <a href="#" style={{ color: "#444", textDecoration: "none" }}>Terms</a>
          </p>
        </div>
      </main>
    </ToolPageShell>
  )
}
