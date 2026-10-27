import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Link, useNavigate } from "react-router-dom"
import { SharedSidebar } from "@/components/SharedSidebar"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { PreferenceSwitch } from "@/components/PreferenceSwitch"
import { usePlan } from "@/hooks/usePlan"

type DailyGoal = 15 | 30 | 45 | 60 | 90 | 120

const RED = "#ae2925"
const SUBJECTS_LIST = ["Biology", "Chemistry", "Math", "Physics", "History", "English", "Economics", "Computer Science", "Filipino", "Social Studies"]

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "2px solid #1c1c19", boxShadow: "3px 3px 0 #1c1c19", marginBottom: 16, borderRadius: 2 }}>
      <div style={{ padding: "10px 16px", borderBottom: "2px solid #1c1c19", display: "flex", alignItems: "center", gap: 8, background: "#FAF7F2" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: RED }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1c1c19", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</span>
      </div>
      <div style={{ padding: 16, background: "#FAF7F2" }}>
        {children}
      </div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { isPro, remaining } = usePlan()

  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(60)
  const [notifs, setNotifs] = useState({ streak: true, reminders: true, community: false, weekly: true })
  const [subjects, setSubjects] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [userName, setUserName] = useState("Learner")
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("")
  const [userInitial, setUserInitial] = useState("L")
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null)

  const FREE_CREDITS_TOTAL = 50

  // Load profile data on mount
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata
    const name = meta?.full_name || meta?.name || user.email?.split("@")[0] || "Learner"
    setUserName(name)
    setUserEmail(user.email || "")
    setUserInitial(name.charAt(0).toUpperCase())

    // Load saved preferences from profiles table
    supabase.from("profiles").select("daily_goal_minutes, subjects, notif_streak, notif_reminders, notif_community, notif_weekly, username, display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data?.username) setProfileUsername(data.username);
        if (data?.display_name) setProfileDisplayName(data.display_name);
      if (!data) return
      if (data.daily_goal_minutes) setDailyGoal(data.daily_goal_minutes as DailyGoal)
      if (data.subjects?.length) setSubjects(new Set(data.subjects))
      setNotifs({
        streak:    data.notif_streak    ?? true,
        reminders: data.notif_reminders ?? true,
        community: data.notif_community ?? false,
        weekly:    data.notif_weekly    ?? true,
      })
    })
  }, [user])

  useEffect(() => {
    remaining("quick_study").then((r) => setCreditsLeft(r))
  }, [remaining])

  const toggleSubject = (s: string) =>
    setSubjects(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n })

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from("profiles").update({
      full_name: profileDisplayName || userName,
      display_name: profileDisplayName,
      username: profileUsername,
      daily_goal_minutes: dailyGoal,
      subjects: Array.from(subjects),
      notif_streak:    notifs.streak,
      notif_reminders: notifs.reminders,
      notif_community: notifs.community,
      notif_weekly:    notifs.weekly,
    }).eq("id", user.id)
    setSaving(false)
    setSaveStatus(error ? "error" : "saved")
    setTimeout(() => setSaveStatus("idle"), 2500)
  }

  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } catch { /* Preserve the existing redirect if remote sign-out fails. */ } window.location.href = "/";
    navigate("/")
    toast.info("Signed out", { description: "You have been successfully signed out." })
  }



  const handleRequestNotifPermission = async () => {
    if (!("Notification" in window)) return toast.error("Not supported", { description: "Push notifications are not supported on this device/browser." })
    try {
      const perm = await Notification.requestPermission()
      if (perm !== "granted") {
        toast.info("Notifications not allowed", { description: "You can review this permission in your browser settings." })
        return
      }
      toast.success("Browser permission granted", { description: "This allows notifications; scheduled reminders also require a connected delivery service." })
      try {
        new Notification("Studenius", { body: "This is a test notification from Studenius.", icon: "/fox_icon_final.png" })
      } catch {
        toast.info("Test notification unavailable", { description: "This browser may require an installed app and a connected notification service." })
      }
    } catch {
      toast.error("Couldn’t request permission", { description: "Try again from your browser settings." })
    }
  }

  const chipBase: React.CSSProperties = {
    padding: "6px 14px", border: "2px solid #1c1c19", fontSize: 12, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "transform var(--motion-instant)", borderRadius: 2,
  }

  return (
    <div className="w-full bg-[#FAF7F2] min-h-full flex flex-col font-body-md text-black flex-1">
      <SharedSidebar active="/settings" />

      <main style={{ flex: 1, padding: "24px 16px", paddingBottom: 40, background: "#FAF7F2", minHeight: "100%" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

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
                <span style={{ fontSize: 10, padding: "2px 8px", fontWeight: 800, letterSpacing: "0.08em", background: isPro ? "#fef3c7" : "#f3f4f6", color: isPro ? "#92400e" : "#374151", border: "1.5px solid #1c1c19", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {isPro ? "PRO ✦" : "FREE"}
                </span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "XP",     value: String(profile?.total_xp ?? 0),        icon: "military_tech" },
                { label: "Streak", value: String(profile?.streak_days ?? 0),      icon: "local_fire_department" },
                
              ].map(s => (
                <div key={s.label} style={{ padding: "12px 8px", background: "#fff", border: "2px solid #1c1c19", textAlign: "center", boxShadow: "2px 2px 0 #1c1c19" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: RED, display: "block", marginBottom: 4 }}>{s.icon}</span>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#1c1c19", margin: "0 0 2px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: "#6b6b6b", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Quicksand', sans-serif" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, borderTop: "2px solid #1c1c19", paddingTop: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#1c1c19", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Display Name</label>
                <input type="text" value={profileDisplayName} onChange={(e) => setProfileDisplayName(e.target.value)} placeholder="How you appear to friends" style={{ width: "100%", padding: "8px 12px", border: "2px solid #1c1c19", borderRadius: 4, fontFamily: "'Quicksand', sans-serif", fontSize: 13, background: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#1c1c19", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>@Username</label>
                <input type="text" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="Unique handle" style={{ width: "100%", padding: "8px 12px", border: "2px solid #1c1c19", borderRadius: 4, fontFamily: "'Quicksand', sans-serif", fontSize: 13, background: "#fff" }} />
              </div>
            </div>
          </Section>

          {/* Study Preferences */}
          <Section title="Study Preferences" icon="target">
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#1c1c19", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Daily Goal</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {([15, 30, 45, 60, 90, 120] as DailyGoal[]).map(g => (
                  <button key={g} onClick={() => setDailyGoal(g)} style={{ ...chipBase, background: dailyGoal === g ? RED : "#fff", color: dailyGoal === g ? "#fff" : "#1c1c19", boxShadow: dailyGoal === g ? "none" : "2px 2px 0 #1c1c19" }}>
                    {g < 60 ? `${g}m` : `${g / 60}h`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#1c1c19", display: "block", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>My Subjects</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUBJECTS_LIST.map(s => (
                  <button key={s} onClick={() => toggleSubject(s)} style={{ ...chipBase, background: subjects.has(s) ? "#1c1c19" : "#fff", color: subjects.has(s) ? "#FAF7F2" : "#1c1c19", boxShadow: subjects.has(s) ? "none" : "2px 2px 0 #1c1c19", display: "flex", alignItems: "center", gap: 4 }}>
                    {subjects.has(s) && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>}
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" icon="notifications">
            <button onClick={handleRequestNotifPermission} style={{ ...chipBase, background: "#1c1c19", color: "#FAF7F2", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, boxShadow: "2px 2px 0 #ae2925" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>notifications_active</span>
              Allow browser notifications
            </button>
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
                  <PreferenceSwitch label={label} on={notifs[key]} onChange={() => {
                    const willBeOn = !notifs[key];
                    setNotifs(prev => ({ ...prev, [key]: willBeOn }));
                    toast.success(`${label}: ${willBeOn ? "on" : "off"} (unsaved)`, {
                      description: "Save changes to apply your preferences. Delivery depends on browser support and a connected notification service.",
                    });
                  }} />
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
                  <span style={{ fontSize: 10, padding: "3px 10px", background: "#fef3c7", color: "#92400e", border: "2px solid #1c1c19", fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ACTIVE ✦</span>
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
                  <div className="settings-credit-fill" style={{ height: "100%", width: "100%", transformOrigin: "left", transform: `scaleX(${creditsLeft !== null ? Math.max(0, Math.min(1, creditsLeft / FREE_CREDITS_TOTAL)) : 0})`, background: RED, transition: "transform var(--motion-progress)" }} />
                </div>
                <p style={{ fontSize: 11, color: "#6b6b6b", marginBottom: 12, fontFamily: "'Quicksand', sans-serif" }}>Upgrade to Pro for unlimited AI questions and all premium features.</p>
                <Link to="/pro">
                  <button style={{ width: "100%", padding: "12px", background: RED, border: "2px solid #1c1c19", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.06em", boxShadow: "3px 3px 0 #1c1c19", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    
                    UPGRADE TO PRO
                  </button>
                </Link>
              </>
            )}
          </Section>

          {/* Account */}
          <Section title="Account" icon="manage_accounts">
            <div style={{ display: "flex", flexDirection: "column" }}>


              {/* Sign out */}
              <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", background: "none", border: "none", borderBottom: "1px solid #e5e1da", cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#d97706" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                  Sign out
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </button>

              <div style={{ padding: "16px 0" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: RED }}>Account deletion unavailable</p>
                <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 6 }}>A deletion service is not connected in this build. Signing out does not delete your account or its data.</p>
              </div>
            </div>
          </Section>

          {/* Save */}
          <button onClick={handleSave} disabled={saving} style={{
            width: "100%", padding: "14px",
            background: saveStatus === "saved" ? "#166534" : saveStatus === "error" ? "#7f1d1d" : RED,
            border: "2px solid #1c1c19", color: "#fff", fontSize: 13, fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.06em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: "3px 3px 0 #1c1c19", transition: "transform var(--motion-quick)", marginBottom: 20,
          }}>
            {saving
              ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>hourglass_empty</span> SAVING…</>
              : saveStatus === "saved"
              ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span> SAVED!</>
              : saveStatus === "error"
              ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span> SAVE FAILED — TRY AGAIN</>
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


