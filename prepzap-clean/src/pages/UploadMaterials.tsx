import { useState, useRef, useCallback, useEffect } from "react"
import { Link } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload, FileText, Trash2, ChevronLeft, CheckCircle2,
  Play, Brain, Sparkles, Layers, HelpCircle, Calculator, ChevronRight, Lock
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadedFile {
  id: string; name: string; size: number; type: string
  preview?: string; uploadedAt: Date; status: "uploading" | "ready"
  progress: number
}

const TOOLS = [
  { href: "/practice",   label: "Practice",     icon: Play,       color: "bg-white", desc: "Generate questions from this file"      },
  { href: "/flashcards", label: "Flashcards",   icon: Brain,      color: "bg-blue-500",    desc: "Create flashcards from key concepts"    },
  { href: "/ai-tutor",   label: "AI Tutor",     icon: Sparkles,   color: "bg-white/500",  desc: "Ask questions about this material"      },
  { href: "/synthesis",  label: "Synthesis Lab",icon: Layers,     color: "bg-teal-500",    desc: "Connect concepts across your files"     },
  { href: "/why-engine", label: "Why Engine",   icon: HelpCircle, color: "bg-amber-500",   desc: "Explore first principles from the file" },
  { href: "/math",       label: "Math Solver",  icon: Calculator, color: "bg-pink-500",    desc: "Extract and solve math problems"        },
]

const DAILY_LIMIT = 3
const LS_UPLOAD_KEY = "prepzap_upload_quota"

interface UploadQuota {
  count: number
  date: string // YYYY-MM-DD
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

function loadQuota(): UploadQuota {
  try {
    const raw = localStorage.getItem(LS_UPLOAD_KEY)
    if (!raw) return { count: 0, date: getTodayStr() }
    const q = JSON.parse(raw) as UploadQuota
    // Reset if it's a new day
    if (q.date !== getTodayStr()) return { count: 0, date: getTodayStr() }
    return q
  } catch {
    return { count: 0, date: getTodayStr() }
  }
}

function saveQuota(q: UploadQuota) {
  localStorage.setItem(LS_UPLOAD_KEY, JSON.stringify(q))
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadMaterials() {
  const [files, setFiles]       = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [quota, setQuota]       = useState<UploadQuota>(loadQuota)
  const [limitError, setLimitError] = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  const remaining = DAILY_LIMIT - quota.count
  const limitReached = remaining <= 0

  const addFiles = useCallback((incoming: File[]) => {
    const currentQuota = loadQuota()
    const canAdd = DAILY_LIMIT - currentQuota.count

    if (canAdd <= 0) {
      setLimitError(true)
      setTimeout(() => setLimitError(false), 3000)
      return
    }

    const valid = incoming
      .filter(f =>
        f.type.startsWith("image/") || f.type === "application/pdf" ||
        f.type.includes("text") || f.name.endsWith(".docx") || f.name.endsWith(".txt")
      )
      .slice(0, canAdd)

    if (!valid.length) return

    const newFiles: UploadedFile[] = valid.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      name: f.name, size: f.size, type: f.type,
      uploadedAt: new Date(), status: "uploading" as const, progress: 0,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }))

    const newQuota = { count: currentQuota.count + valid.length, date: getTodayStr() }
    saveQuota(newQuota)
    setQuota(newQuota)
    setFiles(prev => [...prev, ...newFiles])

    newFiles.forEach(nf => {
      let prog = 0
      const interval = setInterval(() => {
        prog += Math.random() * 25
        if (prog >= 100) {
          prog = 100; clearInterval(interval)
          setFiles(prev => prev.map(f => f.id === nf.id ? { ...f, progress: 100, status: "ready" } : f))
          // Sync to Source Library
          try {
            const existing = JSON.parse(localStorage.getItem("pz_source_library") || "[]")
            const entry = { id: nf.id, name: nf.name, size: nf.size, type: nf.type, uploadedAt: new Date().toISOString(), preview: nf.preview }
            if (!existing.find((e: {id: string}) => e.id === nf.id)) {
              localStorage.setItem("pz_source_library", JSON.stringify([...existing, entry]))
            }
          } catch {}
        } else {
          setFiles(prev => prev.map(f => f.id === nf.id ? { ...f, progress: prog } : f))
        }
      }, 180)
    })
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
    // Reset input so same file can be uploaded again
    e.target.value = ""
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
    if (selected === id) setSelected(null)
  }

  const readyFiles = files.filter(f => f.status === "ready")
  const selectedFile = files.find(f => f.id === selected)

  // Midnight reset timer
  useEffect(() => {
    const msUntilMidnight = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      return midnight.getTime() - now.getTime()
    }
    const t = setTimeout(() => {
      const fresh = { count: 0, date: getTodayStr() }
      saveQuota(fresh)
      setQuota(fresh)
    }, msUntilMidnight())
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar isLoggedIn user={{ name: "Learner", xp: 2450, streak: 12, plan: "free" }} />
      <div className="container mx-auto px-4 lg:px-8 max-w-5xl pt-3">
        <div className="flex items-center gap-2 text-xs px-3 py-2" style={{background:"rgba(212,175,90,0.07)", border:"1px solid rgba(212,175,90,0.2)", color:"var(--pz-text-muted)"}}>
          <span>📎</span>
          <span>Files uploaded here are also saved to your <a href="/sources" className="underline" style={{color:"var(--pz-gold)"}}>Source Library →</a></span>
        </div>
      </div>
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">

          <div className="flex items-center gap-3 mb-6">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1"><ChevronLeft className="h-4 w-4" /> Dashboard</Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Upload className="h-6 w-6 text-pink-500" /> Upload Materials
              </h1>
              <p className="text-sm text-muted-foreground">Upload notes, PDFs, or images — then use them across all tools</p>
            </div>
          </div>

          {/* Daily quota banner */}
          <div className={cn(
            "mb-5 p-3.5 rounded-none border flex items-center gap-3 transition-all",
            limitReached
              ? "bg-red-500/10 border-red-500/30"
              : remaining === 1
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-muted/50 border-border"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-none flex items-center justify-center shrink-0",
              limitReached ? "bg-red-500/20" : "bg-white/20"
            )}>
              {limitReached ? <Lock className="h-4 w-4 text-red-500" /> : <Upload className="h-4 w-4 text-white/60" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {limitReached
                  ? "Daily upload limit reached"
                  : `${remaining} upload${remaining !== 1 ? "s" : ""} remaining today`}
              </p>
              <p className="text-xs text-muted-foreground">
                {limitReached
                  ? "Resets at midnight · Upgrade to Pro for unlimited uploads"
                  : `Free plan: ${DAILY_LIMIT} files per day · Resets at midnight`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex gap-1">
                {Array.from({ length: DAILY_LIMIT }).map((_, i) => (
                  <div key={i} className={cn(
                    "w-5 h-5 rounded-none",
                    i < quota.count ? "bg-pink-500" : "bg-muted border border-border"
                  )} />
                ))}
              </div>
              {limitReached && (
                <Link to="/pricing">
                  <Button size="sm" className="bg-gradient-to-r from-zinc-500 to-indigo-500 text-white text-xs h-7">
                    Go Pro
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Limit error flash */}
          {limitError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-none text-sm text-red-600 font-medium animate-pulse">
              ⚠️ You've reached today's upload limit ({DAILY_LIMIT} files). Resets at midnight.
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); if (!limitReached) setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !limitReached && inputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-none p-12 text-center transition-all",
                  limitReached
                    ? "opacity-50 cursor-not-allowed border-border"
                    : dragging
                    ? "border-pink-500 bg-pink-500/10 scale-[1.01] cursor-copy"
                    : "border-border hover:border-pink-400 hover:bg-muted/30 cursor-pointer"
                )}>
                <input ref={inputRef} type="file" multiple className="hidden"
                  accept=".pdf,.txt,.docx,image/*"
                  onChange={onInputChange}
                  disabled={limitReached} />
                <div className="flex flex-col items-center gap-3">
                  <div className={cn("w-16 h-16 rounded-none flex items-center justify-center transition-all",
                    dragging ? "bg-pink-500/20" : "bg-muted")}>
                    {limitReached
                      ? <Lock className="h-8 w-8 text-muted-foreground" />
                      : <Upload className={cn("h-8 w-8 transition-colors", dragging ? "text-pink-500" : "text-muted-foreground")} />}
                  </div>
                  <div>
                    <p className="font-bold text-lg">
                      {limitReached ? "Upload limit reached" : dragging ? "Drop files here!" : "Drag & drop your files"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {limitReached
                        ? "Resets at midnight — or upgrade to Pro for unlimited"
                        : `or click to browse · PDF, images, TXT, DOCX · ${remaining} slot${remaining !== 1 ? "s" : ""} left today`}
                    </p>
                  </div>
                  {!limitReached && (
                    <Button variant="outline" size="sm" className="mt-2 pointer-events-none">Browse Files</Button>
                  )}
                </div>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>Uploaded Files ({files.length})</span>
                      {readyFiles.length > 0 && (
                        <Badge className="bg-white text-white">{readyFiles.length} ready</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {files.map(f => (
                      <div key={f.id}
                        onClick={() => f.status === "ready" && setSelected(f.id === selected ? null : f.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-none border transition-all",
                          f.status === "ready" && "cursor-pointer hover:border-pink-300",
                          selected === f.id ? "border-pink-500 bg-pink-500/5" : "border-border"
                        )}>
                        <div className="w-10 h-10 rounded-none bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {f.preview
                            ? <img src={f.preview} className="w-full h-full object-cover" alt="" />
                            : <FileText className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
                            {f.status === "ready"
                              ? <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 border-emerald-300">✓ Ready</Badge>
                              : <span className="text-xs text-muted-foreground">Uploading...</span>}
                          </div>
                          {f.status === "uploading" && <Progress value={f.progress} className="h-1 mt-1.5" />}
                        </div>
                        <button onClick={e => { e.stopPropagation(); removeFile(f.id) }}
                          className="p-1.5 rounded-none hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right panel */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Use with Tools</CardTitle>
                  {selectedFile
                    ? <p className="text-xs text-muted-foreground">Using: <span className="font-medium text-pink-500 truncate">{selectedFile.name}</span></p>
                    : <p className="text-xs text-muted-foreground">Select a file above to sync it to a tool</p>}
                </CardHeader>
                <CardContent className="space-y-2">
                  {TOOLS.map(({ href, label, icon: Icon, color, desc }) => (
                    <Link key={href} to={selectedFile ? href : "#"}
                      onClick={e => !selectedFile && e.preventDefault()}
                      className={cn("flex items-center gap-3 p-3 rounded-none border transition-all group",
                        selectedFile
                          ? "hover:border-pink-300 hover:bg-muted/40 cursor-pointer"
                          : "opacity-40 cursor-not-allowed")}>
                      <div className={cn("w-8 h-8 rounded-none flex items-center justify-center shrink-0", color)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold group-hover:text-pink-500 transition-colors">{label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
                      </div>
                      {selectedFile && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-semibold mb-1">📌 Tips</p>
                  {[
                    "Upload your class notes as PDF for best results",
                    "Images of handwritten notes work too",
                    "Select a file then click a tool to use it",
                    `Free plan: ${DAILY_LIMIT} uploads per day, resets at midnight`,
                    "Upgrade to Pro for unlimited daily uploads",
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-pink-500 shrink-0 mt-0.5" />
                      {t}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
