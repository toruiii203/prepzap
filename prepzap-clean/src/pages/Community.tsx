import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Users, ChevronLeft, Trophy, Flame, MessageSquare, ThumbsUp,
  BookOpen, Star, TrendingUp, Hash, Crown, Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

const leaderboard = [
  { rank: 1, name: "Sarah M.",    avatar: "👩‍🎓", xp: 8240, streak: 34, subject: "Biology",   badge: "🥇" },
  { rank: 2, name: "Kai R.",      avatar: "🧑‍💻", xp: 7580, streak: 21, subject: "Physics",   badge: "🥈" },
  { rank: 3, name: "Priya L.",    avatar: "👩‍🔬", xp: 6910, streak: 18, subject: "Chemistry", badge: "🥉" },
  { rank: 4, name: "Marco T.",    avatar: "👨‍📚", xp: 5840, streak: 15, subject: "Math",      badge: "" },
  { rank: 5, name: "Aiko N.",     avatar: "👩‍🎨", xp: 5200, streak: 12, subject: "English",   badge: "" },
  { rank: 6, name: "You",         avatar: "⭐",  xp: 2450, streak: 12, subject: "Biology",   badge: "", isMe: true },
  { rank: 7, name: "James O.",    avatar: "👨‍🏫", xp: 2110, streak: 9,  subject: "History",   badge: "" },
  { rank: 8, name: "Zara P.",     avatar: "👩‍💼", xp: 1890, streak: 7,  subject: "Math",      badge: "" },
]

const posts = [
  {
    author: "Sarah M.", avatar: "👩‍🎓", subject: "Biology", time: "2h ago",
    title: "My trick for remembering the Krebs cycle",
    body: "I make a song out of every intermediate compound. PCISSFM — sounds silly but it works! Pyruvate, Citrate, Isocitrate, Succinate, Succinyl, Fumarate, Malate.",
    likes: 47, replies: 12, tags: ["Biology", "Tip"]
  },
  {
    author: "Kai R.", avatar: "🧑‍💻", subject: "Physics", time: "5h ago",
    title: "Anyone else using PrepZap's Feynman Mode for quantum?",
    body: "Just tried explaining wave-particle duality to the AI like it was a 12-year-old. Got called out on 3 gaps I didn't even know I had. Highly recommend.",
    likes: 31, replies: 8, tags: ["Physics", "Feynman"]
  },
  {
    author: "Priya L.", avatar: "👩‍🔬", subject: "Chemistry", time: "Yesterday",
    title: "Study group for Organic Chemistry — open invite!",
    body: "Meeting every Wednesday at 7 PM (PH time) on Discord. We do mock problems together and quiz each other. DM me for the link.",
    likes: 24, replies: 19, tags: ["Chemistry", "Study Group"]
  },
  {
    author: "Marco T.", avatar: "👨‍📚", subject: "Math", time: "Yesterday",
    title: "Flashcard deck: Integration techniques (50 cards)",
    body: "Built this over the past week using PrepZap flashcards. Covers u-sub, IBP, trig sub, partial fractions. Let me know if you want me to share the topic list.",
    likes: 18, replies: 6, tags: ["Math", "Flashcards"]
  },
]

const studyGroups = [
  { name: "UPCAT Warriors",    emoji: "⚔️",  members: 124, subject: "All Subjects", active: true  },
  { name: "Chem Geeks PH",     emoji: "🧪",  members: 67,  subject: "Chemistry",   active: true  },
  { name: "Math Olympiad Prep",emoji: "∑",   members: 43,  subject: "Mathematics", active: false },
  { name: "Bio Block B",       emoji: "🧬",  members: 38,  subject: "Biology",     active: true  },
]

type Tab = "feed" | "leaderboard" | "groups"

export default function Community() {
  const [tab, setTab] = useState<Tab>("feed")
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set())

  const toggleLike = (i: number) =>
    setLikedPosts(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-white/60" /> Community
              </h1>
              <p className="text-sm text-muted-foreground">Study together, learn faster</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-none p-1 mb-6">
            {([
              ["feed",        "💬 Feed"],
              ["leaderboard", "🏆 Leaderboard"],
              ["groups",      "👥 Study Groups"],
            ] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("flex-1 py-2 px-3 rounded-none text-sm font-medium transition-all",
                  tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {label}
              </button>
            ))}
          </div>

          {/* Feed */}
          {tab === "feed" && (
            <div className="space-y-4">
              {posts.map((p, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-none bg-muted flex items-center justify-center text-xl shrink-0">{p.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{p.author}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{p.subject}</Badge>
                          <span className="text-[11px] text-muted-foreground ml-auto">{p.time}</span>
                        </div>
                        <h3 className="font-bold mt-1.5 text-sm">{p.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.body}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <button onClick={() => toggleLike(i)}
                            className={cn("flex items-center gap-1.5 text-xs transition-colors",
                              likedPosts.has(i) ? "text-white/60" : "text-muted-foreground hover:text-white/60")}>
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {p.likes + (likedPosts.has(i) ? 1 : 0)}
                          </button>
                          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                            <MessageSquare className="h-3.5 w-3.5" /> {p.replies}
                          </button>
                          <div className="flex gap-1 ml-auto">
                            {p.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-muted px-2 py-0.5 rounded-none text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="text-center py-4">
                <Button variant="outline" size="sm">Load more posts</Button>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <Crown className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-bold">Weekly Leaderboard</p>
                    <p className="text-sm text-muted-foreground">Ranked by XP earned this week · Resets Sunday</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  {leaderboard.map((u, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors",
                      u.isMe ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/40"
                    )}>
                      <div className={cn("w-8 text-center font-black text-sm",
                        u.rank === 1 ? "text-amber-500" : u.rank === 2 ? "text-slate-400" : u.rank === 3 ? "text-amber-700" : "text-muted-foreground")}>
                        {u.badge || `#${u.rank}`}
                      </div>
                      <div className="w-10 h-10 rounded-none bg-muted flex items-center justify-center text-xl">{u.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold text-sm", u.isMe && "text-emerald-600 dark:text-emerald-400")}>
                            {u.name}
                          </span>
                          {u.isMe && <Badge className="bg-white text-white text-[10px] py-0">You</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          <span>📚 {u.subject}</span>
                          <span>🔥 {u.streak}d</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm">{u.xp.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">XP</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-1">Your ranking</p>
                  <p className="text-muted-foreground text-sm">You're in <span className="font-bold text-white/60">Top 15%</span> this week. Keep studying to climb higher!</p>
                  <Progress value={85} className="h-2 mt-2" />
                  <p className="text-[11px] text-muted-foreground mt-1">5,750 XP needed for Top 10%</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Study Groups */}
          {tab === "groups" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {studyGroups.map((g, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-none bg-muted flex items-center justify-center text-2xl">{g.emoji}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm group-hover:text-white/60 transition-colors">{g.name}</h3>
                            {g.active && <span className="w-1.5 h-1.5 rounded-none bg-white" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{g.subject}</p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> {g.members} members
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3 group-hover:border-emerald-500 group-hover:text-white/60 transition-colors">
                        Join Group
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {/* Create group CTA */}
                <Card className="border-dashed hover:border-emerald-400 transition-colors cursor-pointer group">
                  <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-36 gap-3">
                    <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-white/60" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm group-hover:text-white/60 transition-colors">Create a Group</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Start your own study community</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly challenge */}
              <Card className="bg-gradient-to-r from-zinc-500/10 to-zinc-500/5 border-purple-200 dark:border-purple-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-white/500" /> Community Challenge — This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">Biology Blitz: Answer 100 Bio questions</p>
                  <p className="text-sm text-muted-foreground mt-1">341 learners participating · Ends Sunday</p>
                  <Progress value={44} className="h-2 mt-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>44 / 100 questions</span>
                    <span>🏆 Top reward: 500 bonus XP</span>
                  </div>
                  <Link to="/practice">
                    <Button size="sm" className="mt-3 bg-white/500 hover:bg-white/600 text-white">Join Challenge</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
