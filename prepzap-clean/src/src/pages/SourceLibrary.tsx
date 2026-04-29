import { useState, useRef, useCallback, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Navbar } from "@/components/Navbar"
import { GlobalContextBar } from "@/components/GlobalContextBar"
import {
  Upload, FileText, Trash2, ChevronLeft, Play, Brain,
  Sparkles, Layers, HelpCircle, Calculator, ArrowRight,
  File, Target, Zap, BookOpen, PenLine, FlaskConical, Camera, X
} from "lucide-react"
import {
  loadLibrary, saveLibrary, loadContext, saveContext,
  onSourceChange, type SourceFile
} from "@/lib/sourceContext"

const TOOLS = [
  { href: "/practice",   label: "Practice",      icon: Play,        desc: "Generate questions" },
  { href: "/flashcards", label: "Flashcards",    icon: Brain,       desc: "Key concept cards"  },
  { href: "/ai-tutor",   label: "AI Tutor",      icon: Sparkles,    desc: "Ask about material" },
  { href: "/synthesis",  label: "Synthesis Lab", icon: FlaskConical,desc: "Connect concepts"   },
  { href: "/why-engine", label: "Why Engine",    icon: HelpCircle,  desc: "First principles"   },
  { href: "/math",       label: "Math Solver",   icon: Calculator,  desc: "Extract & solve"    },
  { href: "/spot-error", label: "Spot the Error",icon: Target,      desc: "Debug mode"         },
  { href: "/daily5",     label: "Daily 5",       icon: Zap,         desc: "5 quick Qs"         },
  { href: "/boss-round", label: "Boss Round",    icon: BookOpen,    desc: "Hard challenge"     },
  { href: "/feynman",    label: "Feynman Mode",  icon: PenLine,     desc: "Teach to learn"     },
]

const ACCEPTED = [
  "application/pdf","text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png","image/jpeg",
]
const MAX_FILES   = 10
const MAX_SIZE_MB = 15

function formatSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}
function typeBadge(t: string) {
  if (t.includes("pdf"))  return "PDF"
  if (t.includes("word")) return "DOCX"
  if (t.includes("text")) return "TXT"
  if (t.includes("png"))  return "PNG"
  if (t.includes("jpeg")) return "JPG"
  return "FILE"
}

const MASTERY = {
  red:    { label: "Needs Work", color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  yellow: { label: "Learning",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  green:  { label: "Mastered",   color: "#10b981", bg: "rgba(16,185,129,0.1)" },
}

async function extractPdfText(file: File): Promise<string> {
  return new Promise(resolve => {
    const r = new FileReader()
    r.onload = async ev => {
      try {
        const buf = ev.target?.result as ArrayBuffer
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement("script")
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
            s.onload = () => res(); s.onerror = rej; document.head.appendChild(s)
          });
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        }
        const lib = (window as any).pdfjsLib
        const pdf = await lib.getDocument({ data: buf }).promise
        let text = ""
        for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
          const pg = await pdf.getPage(i)
          const c  = await pg.getTextContent()
          text += c.items.map((x: any) => x.str).join(" ") + "\n"
        }
        resolve(text.trim().slice(0, 12000))
      } catch { resolve("") }
    }
    r.readAsArrayBuffer(file)
  })
}

export default function SourceLibrary() {
  const [sources, setSources]       = useState<SourceFile[]>(loadLibrary)
  const [dragging, setDragging]     = useState(false)
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [error, setError]           = useState<string|null>(null)
  const [extracting, setExtracting] = useState<string|null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string|null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream|null>(null)
  const navigate  = useNavigate()

  // ref callback — fires the moment <video> mounts in DOM
  const videoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el && streamRef.current) {
      el.srcObject = streamRef.current
      el.play().then(() => setCameraReady(true)).catch(console.error)
    }
  }, [])

  useEffect(() => onSourceChange(() => setSources(loadLibrary())), [])

  const processFiles = useCallback(async (files: File[]) => {
    setError(null)
    const current = loadLibrary()
    if (current.length >= MAX_FILES) { setError(`Max ${MAX_FILES} files.`); return }
    for (const file of files.slice(0, MAX_FILES - current.length)) {
      if (!ACCEPTED.includes(file.type)) { setError(`"${file.name}" not supported.`); continue }
      if (file.size > MAX_SIZE_MB*1048576) { setError(`"${file.name}" too large.`); continue }
      const entry: SourceFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name, size: file.size, type: file.type,
        uploadedAt: new Date().toISOString(),
      }
      setExtracting(file.name)
      if (file.type === "text/plain") {
        const t = await file.text()
        entry.preview = t.slice(0, 500); entry.fullText = t.slice(0, 12000)
      } else if (file.type === "application/pdf") {
        const t = await extractPdfText(file)
        entry.preview = t.slice(0, 500); if (t) entry.fullText = t
      }
      setExtracting(null)
      const lib = loadLibrary()
      saveLibrary([...lib, entry]); setSources([...lib, entry])
    }
    setExtracting(null)
  }, [])

  const toggleSel = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false); setCameraReady(false); setCameraError(null)
  }, [])

  const capturePhoto = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const w = v.videoWidth || 1280
    const h = v.videoHeight || 720
    const canvas = document.createElement("canvas")
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(v, 0, 0, w, h)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
    const base64 = dataUrl.split(",")[1]
    const name = `capture-${Date.now()}.jpg`
    const sizeBytes = Math.round(base64.length * 0.75)
    // Store base64 as fullText so AI tools can read the image content
    const entry: import("@/lib/sourceContext").SourceFile = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      size: sizeBytes,
      type: "image/jpeg",
      uploadedAt: new Date().toISOString(),
      preview: "📷 Camera capture — image data stored for AI analysis",
      fullText: `[IMAGE CAPTURE: ${name}]
This source is a camera photo. The image data (base64 JPEG) is attached below for AI vision analysis.
DATA:${dataUrl}`,
    }
    const lib = loadLibrary()
    saveLibrary([...lib, entry])
    setSources([...lib, entry])
    closeCamera()
  }, [closeCamera])

  const openCamera = useCallback(async () => {
    setCameraError(null); setCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCameraOpen(true)
      // If video element already mounted (re-open case), wire immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().then(() => setCameraReady(true)).catch(console.error)
      }
    } catch (e) {
      console.error("Camera error:", e)
      setCameraError("Camera access denied or unavailable.")
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }, [processFiles])

  const remove = (id: string) => {
    const updated = sources.filter(s => s.id !== id)
    saveLibrary(updated); setSources(updated)
    setSelected(p => { const n = new Set(p); n.delete(id); return n })
    const ctx = loadContext()
    if (ctx.selectedIds.includes(id))
      saveContext({ ...ctx, selectedIds: ctx.selectedIds.filter(x => x !== id) })
  }

  const setMastery = (id: string, m: SourceFile["mastery"]) => {
    const updated = sources.map(s => s.id===id ? {...s, mastery: s.mastery===m ? undefined : m} : s)
    saveLibrary(updated); setSources(updated)
  }

  const sendToTool = (href: string) => {
    if (selected.size > 0) saveContext({ mode:"selected", selectedIds: Array.from(selected) })
    else saveContext({ mode:"all", selectedIds:[] })
    navigate(href)
  }

  const cs: React.CSSProperties = { background:"var(--pz-surface2)", border:"1px solid var(--pz-border)", borderRadius:0 }

  return (
    <div className="min-h-screen flex flex-col" style={{ background:"var(--pz-bg)", color:"var(--pz-text)" }}>
      <Navbar isLoggedIn user={{ name:"Learner", xp:2450, streak:12, plan:"free" }} />
      <main className="flex-1 py-6 lg:py-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-5xl">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <button className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70" style={{color:"var(--pz-text-muted)"}}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
                </button>
              </Link>
              <span style={{color:"var(--pz-border)"}}>|</span>
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2" style={{fontFamily:"'DM Serif Display', serif"}}>
                  <Layers className="h-4 w-4" style={{color:"var(--pz-gold)"}} /> Source Library
                </h1>
                <p className="text-xs mt-0.5" style={{color:"var(--pz-text-muted)"}}>The brain — every tool reads from here</p>
              </div>
            </div>
            <GlobalContextBar />
          </div>

          {/* Stats */}
          {sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-5 px-3 py-2 text-xs" style={{background:"var(--pz-surface3)", border:"1px solid var(--pz-border)"}}>
              <span style={{color:"var(--pz-text-muted)"}}><span style={{color:"var(--pz-text)", fontFamily:"'DM Mono',monospace"}}>{sources.length}</span> files</span>
              <span style={{color:"var(--pz-border)"}}>·</span>
              <span style={{color:"var(--pz-text-muted)"}}><span style={{color:"var(--pz-text)", fontFamily:"'DM Mono',monospace"}}>{sources.filter(s=>s.fullText||s.preview).length}</span> with text</span>
              {[["green","#10b981","mastered"],["yellow","#f59e0b","learning"],["red","#ef4444","needs work"]].map(([m,c,l])=>(
                <span key={m} style={{color:"var(--pz-text-muted)"}}>
                  <span style={{color:c, fontFamily:"'DM Mono',monospace"}}>{sources.filter(s=>s.mastery===m).length}</span> {l}
                </span>
              ))}
              <span className="ml-auto flex gap-3">
                {selected.size > 0 && <button onClick={()=>setSelected(new Set())} className="transition-opacity hover:opacity-70" style={{color:"var(--pz-text-muted)"}}>Clear selection</button>}
                {sources.length > 1 && selected.size === 0 && <button onClick={()=>setSelected(new Set(sources.map(s=>s.id)))} className="transition-opacity hover:opacity-70" style={{color:"var(--pz-text-muted)"}}>Select all</button>}
              </span>
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">

            {/* Upload (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div
                onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
                onClick={()=>sources.length<MAX_FILES&&inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center transition-all"
                style={{
                  border:`2px dashed ${dragging?"var(--pz-gold)":"var(--pz-border)"}`,
                  background: dragging?"rgba(212,175,90,0.05)":"var(--pz-surface2)",
                  cursor: sources.length>=MAX_FILES?"not-allowed":"pointer",
                  opacity: sources.length>=MAX_FILES ? 0.5 : 1,
                }}
              >
                <Upload className="h-7 w-7" style={{color:"var(--pz-text-muted)"}} />
                <div>
                  <p className="text-sm font-medium" style={{color:"var(--pz-text)"}}>
                    {extracting ? `Extracting "${extracting}"…` : dragging ? "Drop here" : "Drag & drop or click"}
                  </p>
                  <p className="text-xs mt-1" style={{color:"var(--pz-text-muted)"}}>PDF, TXT, DOCX, PNG, JPG · Max {MAX_SIZE_MB} MB</p>
                </div>
                <span className="text-xs px-2 py-0.5" style={{background:"var(--pz-surface3)", border:"1px solid var(--pz-border)", color:"var(--pz-text-muted)", fontFamily:"'DM Mono',monospace"}}>{sources.length}/{MAX_FILES}</span>
              </div>
              {/* Camera button */}
              <button
                onClick={openCamera}
                disabled={sources.length >= MAX_FILES}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{background:"var(--pz-surface3)", border:"1px solid var(--pz-border)", color:"var(--pz-text-2)"}}
              >
                <Camera className="h-3.5 w-3.5" style={{color:"var(--pz-teal)"}} />
                Capture with Camera
              </button>
              {cameraError && <p className="text-xs px-3 py-2" style={{background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171"}}>{cameraError}</p>}

              <input ref={inputRef} type="file" multiple accept=".pdf,.txt,.docx,.png,.jpg,.jpeg" className="hidden"
                onChange={e=>{if(e.target.files) processFiles(Array.from(e.target.files))}} />
              {error && <p className="text-xs px-3 py-2" style={{background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171"}}>{error}</p>}

              {/* How it works */}
              <div className="p-3 space-y-2 text-xs" style={{background:"var(--pz-surface3)", border:"1px solid var(--pz-border)"}}>
                <p className="font-medium" style={{color:"var(--pz-text)"}}>Source-First architecture</p>
                <p style={{color:"var(--pz-text-muted)"}}>Use the context bar (top-right) to choose which sources every AI tool uses.</p>
                {[["General AI","Built-in AI only"],["All Sources","All files injected"],["Pick Sources","Specific files"]].map(([m,d])=>(
                  <div key={m} className="flex gap-2"><span style={{color:"var(--pz-gold)"}}>›</span><span><span style={{color:"var(--pz-text-2)"}}>{m}</span> — {d}</span></div>
                ))}
              </div>

              {/* Mastery heatmap legend */}
              <div className="p-3 space-y-2 text-xs" style={{background:"var(--pz-surface3)", border:"1px solid var(--pz-border)"}}>
                <p className="font-medium" style={{color:"var(--pz-text)"}}>Confidence Heatmap</p>
                <p style={{color:"var(--pz-text-muted)"}}>Click the dots on each source to mark your mastery level.</p>
                {(Object.entries(MASTERY) as [string, {label:string;color:string}][]).map(([k,v])=>(
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:v.color}} />
                    <span style={{color:"var(--pz-text-2)"}}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source cards (3 cols) */}
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color:"var(--pz-text-muted)"}}>Uploaded Sources</p>
              {sources.length === 0 ? (
                <div className="py-16 text-center" style={{border:"1px solid var(--pz-border)", background:"var(--pz-surface2)"}}>
                  <File className="h-7 w-7 mx-auto mb-3" style={{color:"var(--pz-text-muted)"}} />
                  <p className="text-sm font-medium mb-1" style={{color:"var(--pz-text-2)"}}>No sources yet</p>
                  <p className="text-xs" style={{color:"var(--pz-text-muted)"}}>Upload PDFs or notes — every AI tool will use them</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map(s => {
                    const isSel = selected.has(s.id)
                    const m = s.mastery ? MASTERY[s.mastery] : null
                    return (
                      <div key={s.id} style={{...cs, borderColor:isSel?"var(--pz-gold)":"var(--pz-border)", background:isSel?"rgba(212,175,90,0.05)":"var(--pz-surface2)"}}>
                        <div className="flex items-start gap-3 px-3 py-2.5">
                          <button onClick={()=>toggleSel(s.id)}
                            className="mt-0.5 w-4 h-4 flex-shrink-0 flex items-center justify-center border transition-all"
                            style={{background:isSel?"var(--pz-gold)":"transparent", borderColor:isSel?"var(--pz-gold)":"var(--pz-border)"}}>
                            {isSel && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#0A0A0C" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                          </button>
                          <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" style={{color:"var(--pz-text-muted)"}} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{color:"var(--pz-text)"}}>{s.name}</p>
                            <p className="text-[10px] mt-0.5" style={{color:"var(--pz-text-muted)", fontFamily:"'DM Mono',monospace"}}>
                              {typeBadge(s.type)} · {formatSize(s.size)} · {new Date(s.uploadedAt).toLocaleDateString()}
                              {(s.fullText||s.preview) ? " · ✓ text" : ""}
                            </p>
                            {s.preview && <p className="text-[10px] mt-0.5 opacity-60 truncate" style={{color:"var(--pz-text-muted)"}}>{s.preview.slice(0,80)}…</p>}
                          </div>
                          {/* Mastery dots */}
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            {(["red","yellow","green"] as const).map(mc=>(
                              <button key={mc} onClick={()=>setMastery(s.id,mc)}
                                className="w-3 h-3 rounded-full transition-all hover:scale-125"
                                style={{background:MASTERY[mc].color, opacity:s.mastery===mc?1:0.2}}
                                title={MASTERY[mc].label} />
                            ))}
                          </div>
                          <button onClick={()=>remove(s.id)} className="flex-shrink-0 p-1 transition-opacity hover:opacity-70" style={{color:"var(--pz-text-muted)"}}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {m && (
                          <div className="px-3 pb-2">
                            <span className="text-[10px] px-2 py-0.5" style={{background:m.bg, color:m.color, border:`1px solid ${m.color}30`}}>{m.label}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Send to Tool */}
          {sources.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="h-4 w-4" style={{color:"var(--pz-text-muted)"}} />
                <h2 className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Open a Tool</h2>
                <span className="text-xs ml-1" style={{color:"var(--pz-text-muted)"}}>
                  {selected.size>0 ? `— ${selected.size} source${selected.size!==1?"s":""} will be activated` : "— all sources will be used"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {TOOLS.map(tool=>(
                  <button key={tool.href} onClick={()=>sendToTool(tool.href)}
                    className="flex items-center gap-2 px-3 py-2.5 text-left transition-all hover:opacity-80"
                    style={{background:"var(--pz-surface2)", border:"1px solid var(--pz-border)"}}>
                    <tool.icon className="h-3.5 w-3.5 flex-shrink-0" style={{color:"var(--pz-text-muted)"}} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{color:"var(--pz-text)"}}>{tool.label}</p>
                      <p className="text-[10px] truncate" style={{color:"var(--pz-text-muted)"}}>{tool.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.85)"}}>
          <div className="relative w-full max-w-lg mx-4" style={{background:"var(--pz-surface2)", border:"1px solid var(--pz-border)"}}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:"1px solid var(--pz-border)"}}>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4" style={{color:"var(--pz-teal)"}} />
                <span className="text-sm font-medium" style={{color:"var(--pz-text)"}}>Capture Photo</span>
              </div>
              <button onClick={closeCamera} className="p-1 transition-opacity hover:opacity-70" style={{color:"var(--pz-text-muted)"}}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video preview */}
            <div className="relative bg-black" style={{aspectRatio:"4/3"}}>
              <video
                ref={videoRefCallback}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs" style={{color:"var(--pz-text-muted)"}}>Starting camera…</div>
                </div>
              )}
              {/* Viewfinder corners */}
              {cameraReady && (
                <>
                  <div className="absolute top-3 left-3 w-5 h-5" style={{borderTop:"2px solid var(--pz-teal)",borderLeft:"2px solid var(--pz-teal)"}} />
                  <div className="absolute top-3 right-3 w-5 h-5" style={{borderTop:"2px solid var(--pz-teal)",borderRight:"2px solid var(--pz-teal)"}} />
                  <div className="absolute bottom-3 left-3 w-5 h-5" style={{borderBottom:"2px solid var(--pz-teal)",borderLeft:"2px solid var(--pz-teal)"}} />
                  <div className="absolute bottom-3 right-3 w-5 h-5" style={{borderBottom:"2px solid var(--pz-teal)",borderRight:"2px solid var(--pz-teal)"}} />
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <p className="text-xs" style={{color:"var(--pz-text-muted)"}}>Point at your notes, handwritten work, or any study material</p>
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{background:"var(--pz-teal)", color:"#0A0A0C"}}
              >
                <Camera className="h-3.5 w-3.5" />
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
