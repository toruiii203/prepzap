import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Settings as SettingsIcon, ChevronLeft, User, Bell, Lock, Palette,
  Target, Zap, CreditCard, Trash2, Moon, Sun, Check, ChevronRight,
  Globe, Volume2
} from "lucide-react"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"
type DailyGoal = 15 | 30 | 45 | 60 | 90 | 120

const SUBJECTS_LIST = ["Biology", "Chemistry", "Math", "Physics", "History", "English", "Economics"]

export default function Settings() {
  const [theme, setTheme] = useState<Theme>("system")
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(60)
  const [notifs, setNotifs] = useState({ streak: true, reminders: true, community: false, weekly: true })
  const [subjects, setSubjects] = useState<Set<string>>(new Set(["Biology", "Chemistry", "Math"]))
  const [saved, setSaved] = useState(false)

  const toggleSubject = (s: string) =>
    setSubjects(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <SettingsIcon className="h-6 w-6 text-muted-foreground" /> Settings
              </h1>
              <p className="text-sm text-muted-foreground">Manage your account & preferences</p>
            </div>
          </div>

          <div className="space-y-5">

            {/* Profile */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" /> Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-none bg-gradient-to-br from-zinc-400 to-teal-500 flex items-center justify-center text-2xl font-black text-white shadow-md">L</div>
                  <div>
                    <p className="font-bold">Learner</p>
                    <p className="text-sm text-muted-foreground">learner@example.com</p>
                    <Badge className="bg-white/10 text-emerald-600 border-emerald-200 mt-1 text-xs">Free Plan</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">Edit</Button>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-none">
                  {[
                    { label: "XP",     value: "2,450" },
                    { label: "Streak", value: "12 🔥" },
                    { label: "Level",  value: "8 🥇"  },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="font-black text-lg leading-none">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study preferences */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-white/60" /> Study Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Daily goal</label>
                  <div className="flex gap-2 flex-wrap">
                    {([15, 30, 45, 60, 90, 120] as DailyGoal[]).map(g => (
                      <button key={g} onClick={() => setDailyGoal(g)}
                        className={cn("px-3 py-1.5 rounded-none border text-sm font-medium transition-all",
                          dailyGoal === g ? "bg-white text-white border-emerald-500" : "border-border hover:border-emerald-400")}>
                        {g < 60 ? `${g}m` : `${g / 60}h`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">My subjects</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS_LIST.map(s => (
                      <button key={s} onClick={() => toggleSubject(s)}
                        className={cn("px-3 py-1.5 rounded-none border text-sm font-medium transition-all flex items-center gap-1.5",
                          subjects.has(s) ? "bg-white text-white border-emerald-500" : "border-border hover:border-emerald-400 text-muted-foreground")}>
                        {subjects.has(s) && <Check className="h-3 w-3" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4 text-white/500" /> Appearance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="text-sm font-medium mb-2 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ["light",  "☀️",  "Light"],
                    ["dark",   "🌙",  "Dark"],
                    ["system", "💻",  "System"],
                  ] as [Theme, string, string][]).map(([t, icon, label]) => (
                    <button key={t} onClick={() => setTheme(t)}
                      className={cn("flex flex-col items-center gap-2 p-3 rounded-none border transition-all",
                        theme === t ? "border-purple-500 bg-white/500/10" : "border-border hover:border-purple-300")}>
                      <span className="text-2xl">{icon}</span>
                      <span className="text-xs font-medium">{label}</span>
                      {theme === t && <Check className="h-3.5 w-3.5 text-white/500" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" /> Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {([
                  ["streak",     "Streak reminders",    "Get reminded to keep your streak alive"],
                  ["reminders",  "Daily study reminder", "A gentle nudge at your chosen time"],
                  ["community",  "Community activity",   "Replies and likes on your posts"],
                  ["weekly",     "Weekly summary",       "Your stats every Sunday"],
                ] as [keyof typeof notifs, string, string][]).map(([key, label, sub]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                    <button onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={cn("w-11 h-6 rounded-none transition-colors relative",
                        notifs[key] ? "bg-white" : "bg-muted")}>
                      <span className={cn("absolute top-1 w-4 h-4 rounded-none bg-white shadow transition-all",
                        notifs[key] ? "left-6" : "left-1")} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card className="bg-gradient-to-br from-zinc-500/10 to-zinc-500/5 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-white/500" /> Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold">Free Plan</p>
                    <p className="text-sm text-muted-foreground">50 credits remaining</p>
                  </div>
                  <Badge className="bg-white text-white">Active</Badge>
                </div>
                <Progress value={50} className="h-2 mb-3" />
                <p className="text-xs text-muted-foreground mb-4">Upgrade to Pro for unlimited AI questions, Feynman Mode, and more.</p>
                <Link to="/pricing">
                  <Button className="w-full bg-white/500 hover:bg-white/600 text-white gap-2">
                    <CreditCard className="h-4 w-4" /> Upgrade to Pro
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Account actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" /> Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Change password", icon: Lock },
                  { label: "Language & region", icon: Globe },
                  { label: "Sound & haptics", icon: Volume2 },
                ].map(({ label, icon: Icon }) => (
                  <button key={label} className="w-full flex items-center justify-between p-3 rounded-none hover:bg-muted transition-colors text-sm">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                <button className="w-full flex items-center justify-between p-3 rounded-none hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm text-red-500 group">
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="h-4 w-4" />
                    Delete account
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>

            {/* Save button */}
            <Button onClick={handleSave}
              className={cn("w-full gap-2", saved ? "bg-white hover:bg-white" : "bg-foreground hover:bg-foreground/90 text-background")}>
              {saved ? <><Check className="h-4 w-4" /> Saved!</> : "Save changes"}
            </Button>

            <p className="text-center text-xs text-muted-foreground pb-4">
              PrepZap v1.0.0 · <a href="#" className="hover:underline">Privacy Policy</a> · <a href="#" className="hover:underline">Terms of Service</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
