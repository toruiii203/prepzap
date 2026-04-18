import { useState } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Lightbulb, ThumbsUp, ThumbsDown, Plus, X, Send, Sparkles, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type Status = "planned" | "in-progress" | "done" | "considering"

interface Suggestion {
  id: number; title: string; description: string; votes: number;
  status: Status; tag: string; userVote?: "up" | "down"
}

const STATUS_META: Record<Status, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  "planned":      { label: "Planned",      color: "bg-blue-500/10 text-blue-600 border-blue-200",    icon: Clock         },
  "in-progress":  { label: "In Progress",  color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Sparkles      },
  "done":         { label: "Done ✓",       color: "bg-white/10 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
  "considering":  { label: "Considering",  color: "bg-white/500/10 text-white/600 border-purple-200", icon: Lightbulb   },
}

const INITIAL: Suggestion[] = [
  { id: 1, title: "Dark mode for all pages",              description: "Full dark mode support across every screen.",              votes: 84, status: "done",        tag: "UI/UX"     },
  { id: 2, title: "Download flashcards as PDF",           description: "Export generated flashcard decks as a printable PDF.",    votes: 61, status: "planned",     tag: "Feature"   },
  { id: 3, title: "Pomodoro custom interval settings",    description: "Let users set their own work/break durations.",           votes: 55, status: "in-progress", tag: "Timer"     },
  { id: 4, title: "Mobile app (iOS & Android)",           description: "Native mobile app for studying on the go.",               votes: 148,status: "considering", tag: "Platform"  },
  { id: 5, title: "Progress sync across devices",         description: "Study on laptop, continue on phone — seamlessly.",        votes: 73, status: "planned",     tag: "Feature"   },
  { id: 6, title: "Weekly study report email",            description: "Get a summary of your week every Sunday.",                votes: 38, status: "considering", tag: "Feature"   },
  { id: 7, title: "Voice input for answers",              description: "Speak your answers instead of typing.",                   votes: 29, status: "considering", tag: "AI"        },
  { id: 8, title: "Collaborative flashcard decks",        description: "Share and study flashcard decks with friends.",           votes: 45, status: "planned",     tag: "Social"    },
]

const TAGS = ["All", "Feature", "UI/UX", "AI", "Timer", "Platform", "Social"]

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(INITIAL)
  const [filter, setFilter]           = useState("All")
  const [sort, setSort]               = useState<"votes"|"status">("votes")
  const [showForm, setShowForm]       = useState(false)
  const [newTitle, setNewTitle]       = useState("")
  const [newDesc, setNewDesc]         = useState("")
  const [newTag, setNewTag]           = useState("Feature")
  const [submitted, setSubmitted]     = useState(false)

  const vote = (id: number, dir: "up"|"down") => {
    setSuggestions(prev => prev.map(s => {
      if (s.id !== id) return s
      const sameVote = s.userVote === dir
      return {
        ...s,
        votes: sameVote ? s.votes - 1 : s.userVote ? s.votes + (dir==="up"?2:-2) : s.votes + (dir==="up"?1:-1),
        userVote: sameVote ? undefined : dir
      }
    }))
  }

  const submit = () => {
    if (!newTitle.trim()) return
    setSuggestions(prev => [{
      id: Date.now(), title: newTitle.trim(), description: newDesc.trim() || "No description provided.",
      votes: 1, status: "considering", tag: newTag, userVote: "up"
    }, ...prev])
    setNewTitle(""); setNewDesc(""); setSubmitted(true)
    setTimeout(() => { setShowForm(false); setSubmitted(false) }, 1500)
  }

  const filtered = suggestions
    .filter(s => filter === "All" || s.tag === filter)
    .sort((a, b) => sort === "votes" ? b.votes - a.votes : 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4" /> Dashboard</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-amber-500" /> Suggestions
                </h1>
                <p className="text-sm text-muted-foreground">Shape the future of PrepZap</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
              <Plus className="h-4 w-4" /> Suggest a Feature
            </Button>
          </div>

          {/* Stats banner */}
          <Card className="mb-5 bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4 flex items-center gap-6 flex-wrap">
              {[
                { label: "Total suggestions", value: suggestions.length },
                { label: "Shipped ✓",          value: suggestions.filter(s=>s.status==="done").length },
                { label: "In progress",         value: suggestions.filter(s=>s.status==="in-progress").length },
                { label: "Planned",             value: suggestions.filter(s=>s.status==="planned").length },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-4">
            {TAGS.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={cn("px-3 py-1.5 rounded-none text-xs font-medium border transition-all",
                  filter === t ? "bg-amber-500 text-white border-amber-500" : "border-border hover:border-amber-400 text-muted-foreground")}>
                {t}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="space-y-3">
            {filtered.map(s => {
              const meta = STATUS_META[s.status]
              return (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-start gap-4">
                    {/* Vote */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <button onClick={() => vote(s.id, "up")}
                        className={cn("p-1.5 rounded-none transition-colors", s.userVote==="up" ? "bg-white/20 text-white/60" : "hover:bg-muted text-muted-foreground")}>
                        <ThumbsUp className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-black">{s.votes}</span>
                      <button onClick={() => vote(s.id, "down")}
                        className={cn("p-1.5 rounded-none transition-colors", s.userVote==="down" ? "bg-red-500/20 text-red-500" : "hover:bg-muted text-muted-foreground")}>
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-bold text-sm">{s.title}</h3>
                        <Badge variant="outline" className={cn("text-[10px] py-0 shrink-0", meta.color)}>{meta.label}</Badge>
                        <Badge variant="outline" className="text-[10px] py-0 shrink-0">{s.tag}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Suggestion modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <Card className="relative w-full max-w-md z-10 shadow-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">💡 New Suggestion</CardTitle>
                    <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submitted ? (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-12 w-12 text-white/60 mx-auto mb-2" />
                      <p className="font-bold">Thanks for the suggestion!</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Title *</label>
                        <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="What feature would you like?" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Description</label>
                        <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                          className="w-full min-h-20 px-3 py-2 rounded-none border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                          placeholder="Describe how it would work..." />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Category</label>
                        <div className="flex gap-2 flex-wrap">
                          {TAGS.filter(t=>t!=="All").map(t => (
                            <button key={t} onClick={() => setNewTag(t)}
                              className={cn("px-3 py-1 rounded-none border text-xs font-medium transition-all",
                                newTag===t ? "bg-amber-500 text-white border-amber-500" : "border-border hover:border-amber-400")}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button disabled={!newTitle.trim()} onClick={submit}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
                        <Send className="h-4 w-4" /> Submit Suggestion
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
