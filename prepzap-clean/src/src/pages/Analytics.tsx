import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3, TrendingUp, Target, Clock, Flame, BookOpen,
  ChevronLeft, Trophy, Brain, Zap, Calendar, ArrowUp, ArrowDown,
  CheckCircle2, XCircle, Star
} from "lucide-react"
import { cn } from "@/lib/utils"

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const weeklyMinutes = [45, 70, 30, 90, 55, 120, 40]
const weeklyAccuracy = [72, 80, 65, 84, 78, 88, 71]

const subjectStats = [
  { name: "Biology",   emoji: "🧬", accuracy: 82, trend: +5,  color: "bg-white" },
  { name: "Chemistry", emoji: "🧪", accuracy: 68, trend: +2,  color: "bg-blue-500" },
  { name: "Math",      emoji: "∑",  accuracy: 74, trend: -3,  color: "bg-white/500" },
  { name: "Physics",   emoji: "⚡", accuracy: 61, trend: +8,  color: "bg-amber-500" },
  { name: "History",   emoji: "📜", accuracy: 88, trend: +1,  color: "bg-rose-500" },
  { name: "English",   emoji: "📝", accuracy: 79, trend: 0,   color: "bg-cyan-500" },
]

const recentSessions = [
  { subject: "Biology",   questions: 25, correct: 21, duration: 40, date: "Today, 2:30 PM",     icon: "🧬" },
  { subject: "Chemistry", questions: 20, correct: 13, duration: 35, date: "Today, 10:00 AM",    icon: "🧪" },
  { subject: "Math",      questions: 30, correct: 22, duration: 50, date: "Yesterday, 6:00 PM", icon: "∑"  },
  { subject: "Physics",   questions: 15, correct: 9,  duration: 25, date: "Yesterday, 3:00 PM", icon: "⚡" },
  { subject: "Biology",   questions: 20, correct: 17, duration: 30, date: "2 days ago",         icon: "🧬" },
]

const milestones = [
  { label: "First Session",  icon: "🎉", earned: true  },
  { label: "100 Questions",  icon: "📚", earned: true  },
  { label: "7-Day Streak",   icon: "🔥", earned: true  },
  { label: "80% Accuracy",   icon: "🎯", earned: true  },
  { label: "500 Questions",  icon: "⚡", earned: false },
  { label: "30-Day Streak",  icon: "💎", earned: false },
  { label: "Perfect Score",  icon: "⭐", earned: false },
  { label: "All Subjects",   icon: "🏆", earned: false },
  { label: "Top 10%",        icon: "👑", earned: false },
]

type Period = "week" | "month" | "all"

export default function Analytics() {
  const [period, setPeriod] = useState<Period>("week")

  const totalMinutes = weeklyMinutes.reduce((a, b) => a + b, 0)
  const totalQuestions = weeklyMinutes.map((m) => Math.round(m * 0.6)).reduce((a, b) => a + b, 0)
  const avgAccuracy = Math.round(weeklyAccuracy.reduce((a, b) => a + b, 0) / weeklyAccuracy.length)
  const maxMinutes = Math.max(...weeklyMinutes)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-6xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-indigo-500" /> Analytics
                </h1>
                <p className="text-sm text-muted-foreground">Your study patterns & performance</p>
              </div>
            </div>
            <div className="flex rounded-none border overflow-hidden text-xs">
              {(["week", "month", "all"] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn("px-3 py-1.5 font-medium transition-colors capitalize",
                    period === p ? "bg-indigo-500 text-white" : "hover:bg-muted text-muted-foreground")}>
                  {p === "all" ? "All time" : `This ${p}`}
                </button>
              ))}
            </div>
          </div>

          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: Clock,    label: "Study Time",   value: `${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`, sub: "+12% vs last week", up: true,  color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950" },
              { icon: BookOpen, label: "Questions",    value: totalQuestions,                                              sub: "+8% vs last week",  up: true,  color: "text-white/60", bg: "bg-emerald-50 dark:bg-emerald-950" },
              { icon: Target,   label: "Avg Accuracy", value: `${avgAccuracy}%`,                                          sub: "+3% vs last week",  up: true,  color: "text-white/500",  bg: "bg-white/50 dark:bg-white/950" },
              { icon: Flame,    label: "Day Streak",   value: "12 🔥",                                                    sub: "Personal best: 14", up: false, color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950" },
            ].map(({ icon: Icon, label, value, sub, up, color, bg }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className={cn("w-9 h-9 rounded-none flex items-center justify-center mb-2", bg)}>
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                  <p className="text-2xl font-black leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  <div className={cn("flex items-center gap-1 mt-1 text-[10px]", up ? "text-white/60" : "text-muted-foreground")}>
                    {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {sub}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Study time bar chart */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" /> Daily Study Time (minutes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-36">
                    {weeklyMinutes.map((min, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">{min}</span>
                        <div className="w-full rounded-t-md" style={{ height: `${Math.max(8, (min / maxMinutes) * 96)}px`, background: "rgb(59 130 246 / 0.15)" }}>
                          <div className="w-full rounded-t-md bg-blue-500 h-full" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{WEEK_DAYS[i]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Accuracy trend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-white/60" /> Accuracy Trend (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative h-28 pl-6">
                    <svg viewBox="0 0 280 80" className="w-full h-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <path d={`M ${weeklyAccuracy.map((v, i) => `${i * (280 / 6)},${80 - ((v - 50) / 50) * 80}`).join(" L ")} L 280,80 L 0,80 Z`} fill="url(#accGrad)" />
                      <polyline points={weeklyAccuracy.map((v, i) => `${i * (280 / 6)},${80 - ((v - 50) / 50) * 80}`).join(" ")} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
                      {weeklyAccuracy.map((v, i) => (
                        <circle key={i} cx={i * (280 / 6)} cy={80 - ((v - 50) / 50) * 80} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
                      ))}
                    </svg>
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] text-muted-foreground">
                      <span>100%</span><span>75%</span><span>50%</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 pl-6">
                    {WEEK_DAYS.map(d => <span key={d} className="text-[10px] text-muted-foreground flex-1 text-center">{d}</span>)}
                  </div>
                </CardContent>
              </Card>

              {/* Recent sessions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white/500" /> Recent Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentSessions.map((s, i) => {
                    const pct = Math.round((s.correct / s.questions) * 100)
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-none hover:bg-muted/70 transition-colors">
                        <span className="text-xl w-8 text-center">{s.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{s.subject}</span>
                            <Badge variant="outline" className={cn("text-[10px] py-0",
                              pct >= 80 ? "border-emerald-500 text-emerald-600" : pct >= 65 ? "border-amber-500 text-amber-600" : "border-red-500 text-red-600")}>
                              {pct}%
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{s.date} · {s.duration}min · {s.questions} Qs</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white/60" /><span className="font-medium">{s.correct}</span>
                          <XCircle className="h-3.5 w-3.5 text-red-400 ml-1" /><span className="font-medium">{s.questions - s.correct}</span>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-indigo-500" /> By Subject
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subjectStats.sort((a, b) => b.accuracy - a.accuracy).map(s => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{s.emoji} {s.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-[10px] flex items-center",
                            s.trend > 0 ? "text-white/60" : s.trend < 0 ? "text-red-400" : "text-muted-foreground")}>
                            {s.trend > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : s.trend < 0 ? <ArrowDown className="h-2.5 w-2.5" /> : null}
                            {Math.abs(s.trend)}%
                          </span>
                          <span className="text-xs font-bold">{s.accuracy}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-none overflow-hidden">
                        <div className={cn("h-full rounded-none", s.color)} style={{ width: `${s.accuracy}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500/10 to-zinc-500/5 border-indigo-200 dark:border-indigo-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">XP This Week</p>
                    <Zap className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-3xl font-black text-indigo-500">+840 XP</p>
                  <Progress value={68} className="h-1.5 mt-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">550 XP to Level 9</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" /> Milestones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {milestones.map(m => (
                      <div key={m.label} className={cn("flex flex-col items-center gap-1 p-2 rounded-none text-center",
                        m.earned ? "bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-200 dark:ring-amber-800" : "bg-muted opacity-40")}>
                        <span className="text-lg">{m.icon}</span>
                        <span className="text-[9px] font-medium leading-tight">{m.label}</span>
                        {m.earned && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-2">Today's Goal</p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-3xl font-black">35</span>
                    <span className="text-muted-foreground text-sm mb-1">/ 60 min</span>
                  </div>
                  <Progress value={58} className="h-2" />
                  <p className="text-[11px] text-muted-foreground mt-1.5">25 min left to hit your goal</p>
                  <Link to="/practice">
                    <Button size="sm" className="w-full mt-3 bg-white hover:bg-white/80 text-white">Practice Now →</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
