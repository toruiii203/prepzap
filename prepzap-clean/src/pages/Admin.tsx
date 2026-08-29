import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Users, Zap, DollarSign, Activity, ChevronLeft,
  Shield, Bell, Settings2, UserX, RefreshCw
} from "lucide-react"

// In production, if this isn't set, it falls back to an unguessable UUID.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || crypto.randomUUID()

const mockUsers = [
  { email: "migs@example.com",    plan: "Pro",     credits: 342, joined: "2024-11-03" },
  { email: "sarah.k@gmail.com",   plan: "Free",    credits: 28,  joined: "2025-01-15" },
  { email: "danjoe@yahoo.com",    plan: "Premium", credits: 1205,joined: "2024-09-21" },
  { email: "prep.user4@mail.com", plan: "Free",    credits: 12,  joined: "2025-02-08" },
  { email: "ateneo.stud@edu.ph",  plan: "Pro",     credits: 489, joined: "2024-12-01" },
  { email: "reviews99@mail.com",  plan: "Free",    credits: 0,   joined: "2025-03-10" },
  { email: "topnotcher@ph.com",   plan: "Premium", credits: 2100,joined: "2024-08-14" },
]

const PLAN_COLORS: Record<string, string> = {
  Free: "bg-zinc-700 text-zinc-300",
  Pro: "bg-emerald-900 text-emerald-400",
  Premium: "bg-purple-900 text-purple-300",
}

export default function Admin() {
  const { toast } = useToast()
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState("")
  const [pwError, setPwError] = useState(false)

  // User management
  const [users] = useState(mockUsers)

  // Credit adjustment
  const [creditEmail, setCreditEmail] = useState("")
  const [creditAmount, setCreditAmount] = useState("")
  const [creditReason, setCreditReason] = useState("")

  // Plan override
  const [planEmail, setPlanEmail] = useState("")
  const [planValue, setPlanValue] = useState("Pro")

  // Announcements
  const [announcement, setAnnouncement] = useState("")

  const tryLogin = () => {
    if (pwInput === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  const applyCredits = () => {
    if (!creditEmail.trim() || !creditAmount) return
    toast({ title: "Credits Applied", description: `+${creditAmount} credits added to ${creditEmail}. Reason: ${creditReason || "No reason"}` })
    setCreditEmail(""); setCreditAmount(""); setCreditReason("")
  }

  const updatePlan = () => {
    if (!planEmail.trim()) return
    toast({ title: "Plan Updated", description: `${planEmail} is now on the ${planValue} plan.` })
    setPlanEmail("")
  }

  const publishAnnouncement = () => {
    if (!announcement.trim()) return
    toast({ title: "Announcement Published", description: "Site-wide announcement is now live." })
    setAnnouncement("")
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--pz-surface3)",
    border: "1px solid var(--pz-border)",
    color: "var(--pz-text)",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
    fontFamily: "'Geist', sans-serif",
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--pz-surface2)",
    border: "1px solid var(--pz-border)",
    borderRadius: 0,
    padding: "20px",
  }

  // Login screen
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--pz-bg)" }}>
        <div style={{ ...cardStyle, width: "100%", maxWidth: "360px" }}>
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5" style={{ color: "var(--pz-gold)" }} />
            <h1 className="text-base font-semibold" style={{ color: "var(--pz-text)", fontFamily: "'DM Serif Display', serif" }}>
              Admin Access
            </h1>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--pz-text-muted)" }}>
            This area is restricted to PrepZap administrators only.
          </p>
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryLogin()}
            placeholder="Enter admin password"
            style={inputStyle}
            className="mb-2"
          />
          {pwError && (
            <p className="text-xs mb-3" style={{ color: "#ef4444" }}>Incorrect password.</p>
          )}
          <button
            onClick={tryLogin}
            className="w-full py-2 mt-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "var(--pz-gold)", color: "#0A0A0C" }}
          >
            Authenticate
          </button>
          <div className="mt-4">
            <Link to="/dashboard" className="text-xs" style={{ color: "var(--pz-text-muted)" }}>
              /// Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <Navbar isLoggedIn user={{ name: "Admin", plan: "pro" }} />
      <main className="flex-1 py-6 lg:py-10">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <button className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
                  style={{ color: "var(--pz-text-muted)" }}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
                </button>
              </Link>
              <span style={{ color: "var(--pz-border)" }}>|</span>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                <h1 className="text-lg font-semibold" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Admin Panel
                </h1>
                <span className="text-xs px-2 py-0.5" style={{ background: "rgba(212,175,90,0.12)", border: "1px solid rgba(212,175,90,0.25)", color: "var(--pz-gold)" }}>
                  INTERNAL
                </span>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users,      label: "Total Users",        value: "1,240",  sub: "registered accounts",   color: "var(--pz-teal)"   },
              { icon: Activity,   label: "Active Today",        value: "87",     sub: "unique sessions",        color: "var(--pz-gold)"   },
              { icon: Zap,        label: "Credits Used",        value: "34,500", sub: "all-time AI calls",      color: "var(--pz-violet)" },
              { icon: DollarSign, label: "MRR",                 value: "$1,820", sub: "monthly recurring rev.", color: "#10b981"           },
            ].map(card => (
              <div key={card.label} style={cardStyle}>
                <div className="flex items-start justify-between mb-3">
                  <card.icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-semibold mb-0.5" style={{ color: "var(--pz-text)", fontFamily: "'DM Mono', monospace" }}>
                  {card.value}
                </p>
                <p className="text-xs" style={{ color: "var(--pz-text-muted)" }}>{card.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--pz-text-muted)", opacity: 0.6 }}>{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left /// User Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* User Management */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4" style={{ color: "var(--pz-text-muted)" }} />
                  <h2 className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>User Management</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--pz-border)" }}>
                        {["Email", "Plan", "Credits", "Joined", "Actions"].map(h => (
                          <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontSize: "10px" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.email} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--pz-border)" : "none" }}>
                          <td className="py-2.5 px-2" style={{ color: "var(--pz-text-2)", fontFamily: "'DM Mono', monospace" }}>{u.email}</td>
                          <td className="py-2.5 px-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-none font-medium ${PLAN_COLORS[u.plan]}`}>
                              {u.plan}
                            </span>
                          </td>
                          <td className="py-2.5 px-2" style={{ color: "var(--pz-text-muted)", fontFamily: "'DM Mono', monospace" }}>{u.credits}</td>
                          <td className="py-2.5 px-2" style={{ color: "var(--pz-text-muted)" }}>{u.joined}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex gap-1.5">
                              <button className="flex items-center gap-1 text-[10px] px-2 py-1 transition-opacity hover:opacity-70"
                                style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                                <UserX className="h-2.5 w-2.5" /> Suspend
                              </button>
                              <button className="flex items-center gap-1 text-[10px] px-2 py-1 transition-opacity hover:opacity-70"
                                style={{ border: "1px solid var(--pz-border)", color: "var(--pz-text-muted)" }}>
                                <RefreshCw className="h-2.5 w-2.5" /> Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Announcements */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4" style={{ color: "var(--pz-text-muted)" }} />
                  <h2 className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>Site-Wide Announcement</h2>
                </div>
                <textarea
                  value={announcement}
                  onChange={e => setAnnouncement(e.target.value)}
                  placeholder="Write a message to all users (e.g. downtime notice, new feature launch, etc.)"
                  rows={4}
                  style={{ ...inputStyle, resize: "none", display: "block" }}
                  className="mb-3"
                />
                <button
                  onClick={publishAnnouncement}
                  disabled={!announcement.trim()}
                  className="px-4 py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--pz-gold)", color: "#0A0A0C" }}
                >
                  Publish Announcement
                </button>
              </div>
            </div>

            {/* Right /// Controls */}
            <div className="space-y-5">
              {/* Credit Adjustment */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4" style={{ color: "var(--pz-gold)" }} />
                  <h2 className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>Credit Adjustment</h2>
                </div>
                <div className="space-y-2 mb-3">
                  <input
                    value={creditEmail}
                    onChange={e => setCreditEmail(e.target.value)}
                    placeholder="User email"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                    placeholder="Credit amount (e.g. +100 or -50)"
                    style={inputStyle}
                  />
                  <input
                    value={creditReason}
                    onChange={e => setCreditReason(e.target.value)}
                    placeholder="Reason (optional)"
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={applyCredits}
                  disabled={!creditEmail.trim() || !creditAmount}
                  className="w-full py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                >
                  Apply Credits
                </button>
              </div>

              {/* Plan Override */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <Settings2 className="h-4 w-4" style={{ color: "var(--pz-text-muted)" }} />
                  <h2 className="text-sm font-medium" style={{ color: "var(--pz-text)" }}>Plan Override</h2>
                </div>
                <div className="space-y-2 mb-3">
                  <input
                    value={planEmail}
                    onChange={e => setPlanEmail(e.target.value)}
                    placeholder="User email"
                    style={inputStyle}
                  />
                  <select
                    value={planValue}
                    onChange={e => setPlanValue(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
                <button
                  onClick={updatePlan}
                  disabled={!planEmail.trim()}
                  className="w-full py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--pz-surface3)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
                >
                  Update Plan
                </button>
              </div>

              {/* Stats note */}
              <div className="text-xs p-3" style={{ background: "rgba(212,175,90,0.06)", border: "1px solid rgba(212,175,90,0.15)", color: "var(--pz-text-muted)" }}>
                ////// All actions here are logged. Use responsibly.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
