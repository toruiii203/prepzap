import { useState, useRef, useCallback } from "react";
import {
  PanelLeftClose, PanelLeftOpen, Plus, Clock, Trash2,
  FileType, ImageIcon, Hash, X, ChevronDown, Zap, Globe, Sparkles,
  MessageSquare, Camera, FlipHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AttachedFile {
  name: string;
  type: "pdf" | "image" | "txt";
  size: string;
  content?: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: Date;
  data: unknown; // each tool stores its own shape
}

// ─── Model Selector ───────────────────────────────────────────────────────────
export type Provider = "groq" | "openrouter" | "gemini";
export interface AIModel { id: string; label: string; provider: Provider; contextK: number; }

export const AI_MODELS: AIModel[] = [
  { id: "openai/gpt-oss-20b",                    label: "Llama 3.3 70B",    provider: "groq",        contextK: 128  },
  { id: "llama-3.1-8b-instant",                       label: "Llama 3.1 8B",     provider: "groq",        contextK: 128  },
  { id: "gemma2-9b-it",                               label: "Gemma 2 9B",       provider: "groq",        contextK: 8    },
  { id: "mixtral-8x7b-32768",                         label: "Mixtral 8×7B",     provider: "groq",        contextK: 32   },
  { id: "meta-llama/llama-3.3-70b-instruct:free",     label: "Llama 3.3 70B",   provider: "openrouter",  contextK: 128  },
  { id: "mistralai/mistral-7b-instruct:free",         label: "Mistral 7B",       provider: "openrouter",  contextK: 32   },
  { id: "google/gemma-3-27b-it:free",                 label: "Gemma 3 27B",      provider: "openrouter",  contextK: 131  },
  { id: "deepseek/deepseek-r1:free",                  label: "DeepSeek R1",      provider: "openrouter",  contextK: 163  },
  { id: "gemini-2.0-flash",                           label: "Gemini 2.0 Flash", provider: "gemini",      contextK: 1048 },
  { id: "gemini-1.5-flash",                           label: "Gemini 1.5 Flash", provider: "gemini",      contextK: 1048 },
];

const PROVIDER_META: Record<Provider, { label: string; color: string; Icon: React.ElementType }> = {
  groq:        { label: "Groq",        color: "text-orange-400", Icon: Zap       },
  openrouter:  { label: "OpenRouter",  color: "text-purple-400", Icon: Globe     },
  gemini:      { label: "Gemini",      color: "text-blue-400",   Icon: Sparkles  },
};

const LS_MODEL_KEY = "pz_selected_model";
export function getSavedModel(): AIModel {
  try {
    const id = localStorage.getItem(LS_MODEL_KEY);
    return AI_MODELS.find(m => m.id === id) ?? AI_MODELS[0];
  } catch { return AI_MODELS[0]; }
}
export function saveModel(m: AIModel) {
  try { localStorage.setItem(LS_MODEL_KEY, m.id); } catch {}
}

export function ModelSelector({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AIModel>(getSavedModel);

  const grouped = (["groq", "openrouter", "gemini"] as Provider[]).map(p => ({
    provider: p, models: AI_MODELS.filter(m => m.provider === p)
  }));

  const pick = (m: AIModel) => { saveModel(m); setSelected(m); setOpen(false); };
  const pm = PROVIDER_META[selected.provider];
  const ProvIcon = pm.Icon;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card text-xs font-medium hover:border-primary/50 transition-colors"
      >
        <ProvIcon className={cn("h-3 w-3", pm.color)} />
        <span className="max-w-[110px] truncate text-foreground">{selected.label}</span>
        <span className={cn("text-[10px]", pm.color)}>{pm.label}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-68 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden min-w-[260px]">
            {grouped.map(({ provider, models }) => {
              const meta = PROVIDER_META[provider];
              const PIcon = meta.Icon;
              return (
                <div key={provider}>
                  <div className={cn("flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-b border-border bg-muted/30", meta.color)}>
                    <PIcon className="h-3 w-3" /> {meta.label}
                  </div>
                  {models.map(m => (
                    <button key={m.id} onClick={() => pick(m)}
                      className={cn("w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors",
                        selected.id === m.id && "bg-primary/10 font-semibold text-primary")}>
                      <span className="truncate">{m.label}</span>
                      <span className="text-muted-foreground shrink-0">{m.contextK}K</span>
                    </button>
                  ))}
                </div>
              );
            })}
            <div className="px-3 py-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
              All models are free tier · Add API keys in .env
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── File Attach Button + Badge ───────────────────────────────────────────────
export function FileBadge({ file, onRemove }: { file: AttachedFile; onRemove?: () => void }) {
  const icons = { pdf: FileType, image: ImageIcon, txt: Hash };
  const colors = { pdf: "text-rose-500", image: "text-violet-500", txt: "text-blue-500" };
  const Icon = icons[file.type];
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium">
      <Icon className={cn("h-3.5 w-3.5", colors[file.type])} />
      <span className="max-w-[120px] truncate">{file.name}</span>
      <span className="text-muted-foreground">{file.size}</span>
      {onRemove && (
        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────
function CameraModal({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setReady(true);
    } catch { setReady(false); }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [facingMode, startCamera]);

  const snap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setCaptured(c.toDataURL("image/jpeg", 0.92));
  };

  const confirm = () => { if (captured) { onCapture(captured); onClose(); } };
  const retake = () => { setCaptured(null); startCamera(facingMode); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Capture Notes</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          {!captured ? (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          ) : (
            <img src={captured} className="w-full h-full object-cover" alt="captured" />
          )}
          {/* Corner guides overlay */}
          {!captured && (
            <div className="absolute inset-4 pointer-events-none">
              {[["top-0 left-0","border-t-2 border-l-2"],["top-0 right-0","border-t-2 border-r-2"],
                ["bottom-0 left-0","border-b-2 border-l-2"],["bottom-0 right-0","border-b-2 border-r-2"]
              ].map(([pos, border], i) => (
                <div key={i} className={cn("absolute w-6 h-6 border-violet-400 rounded-sm", pos, border)} />
              ))}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 flex items-center gap-3">
          {!captured ? (
            <>
              <button onClick={() => setFacingMode(f => f === "environment" ? "user" : "environment")}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                title="Flip camera">
                <FlipHorizontal className="h-4 w-4" />
              </button>
              <button onClick={snap} disabled={!ready}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-40">
                <Camera className="h-5 w-5" /> Snap Photo
              </button>
            </>
          ) : (
            <>
              <button onClick={retake}
                className="flex-1 h-12 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-muted transition-colors">
                Retake
              </button>
              <button onClick={confirm}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-all">
                Use Photo
              </button>
            </>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground pb-3">Point camera at your handwritten notes</p>
      </div>
    </div>
  );
}

export function useFileAttach() {
  const [pendingFile, setPendingFile] = useState<AttachedFile | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type: AttachedFile["type"] = ext === "pdf" ? "pdf" : ["png","jpg","jpeg","gif","webp"].includes(ext) ? "image" : "txt";
    const size = file.size < 1024*1024 ? `${(file.size/1024).toFixed(0)}KB` : `${(file.size/1024/1024).toFixed(1)}MB`;

    if (type === "txt") {
      const r = new FileReader();
      r.onload = ev => {
        const content = ev.target?.result as string;
        setPendingFile({ name: file.name, type, size, content: content.slice(0, 8000) });
      };
      r.readAsText(file);
    } else if (type === "pdf") {
      // Extract text from PDF using pdf.js loaded from CDN
      const r = new FileReader();
      r.onload = async ev => {
        try {
          const arrayBuffer = ev.target?.result as ArrayBuffer;
          // Dynamically load pdf.js from CDN if not already loaded
          if (!(window as any).pdfjsLib) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script");
              script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("Failed to load pdf.js"));
              document.head.appendChild(script);
            });
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          const pdfjsLib = (window as any).pdfjsLib;
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const maxPages = Math.min(pdf.numPages, 10); // cap at 10 pages
          let fullText = "";
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
          }
          const extracted = fullText.trim().slice(0, 8000);
          setPendingFile({
            name: file.name,
            type,
            size,
            content: extracted || "[PDF loaded — no extractable text found. Try copy-pasting the content instead.]"
          });
        } catch (err) {
          console.error("PDF extraction failed:", err);
          setPendingFile({
            name: file.name,
            type,
            size,
            content: "[PDF could not be read. Try copy-pasting the text content instead.]"
          });
        }
      };
      r.readAsArrayBuffer(file);
    } else {
      setPendingFile({ name: file.name, type, size });
    }
    e.target.value = "";
  }, []);

  const handleCameraCapture = useCallback((dataUrl: string) => {
    // Convert base64 dataUrl to a friendly attached file
    const byteLen = Math.round((dataUrl.length * 3) / 4 / 1024);
    const size = byteLen < 1024 ? `${byteLen}KB` : `${(byteLen / 1024).toFixed(1)}MB`;
    setPendingFile({
      name: `photo-${Date.now()}.jpg`,
      type: "image",
      size,
      content: dataUrl, // store the dataUrl so AI tools can use it as image context
    });
  }, []);

  const FileAttachButton = useCallback(({ className }: { className?: string }) => (
    <>
      <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleFileSelect} />
      {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
      <div className="flex items-center gap-1">
        <button onClick={() => fileInputRef.current?.click()}
          className={cn("flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary", className)}
          title="Attach file (PDF, image, txt)">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => setShowCamera(true)}
          className={cn("flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors text-muted-foreground hover:text-violet-500", className)}
          title="Take a photo of your notes">
          <Camera className="h-4 w-4" />
        </button>
      </div>
    </>
  ), [handleFileSelect, handleCameraCapture, showCamera]);

  return { pendingFile, setPendingFile, FileAttachButton };
}

// ─── History Sidebar ──────────────────────────────────────────────────────────
export function HistorySidebar<T>({
  entries, activeId, onSelect, onNew, onDelete, open, onToggle, newLabel = "New"
}: {
  entries: HistoryEntry[];
  activeId: string | null;
  onSelect: (e: HistoryEntry & { data: T }) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onToggle: () => void;
  newLabel?: string;
}) {
  return (
    <>
      {/* Toggle button */}
      <button onClick={onToggle}
        className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary"
        title={open ? "Close history" : "Open history"}>
        {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </button>

      {/* Drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={onToggle} />
          <aside className="fixed left-0 top-0 h-full w-72 z-40 border-r border-border bg-card/95 backdrop-blur-md flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-sm font-semibold text-foreground">History</span>
              <div className="flex items-center gap-2">
                <button onClick={onNew}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors font-medium">
                  <Plus className="h-3 w-3" />{newLabel}
                </button>
                <button onClick={onToggle} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {entries.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-10 leading-relaxed">
                  No history yet.<br />Start using the tool!
                </p>
              )}
              {entries.map(e => (
                <div key={e.id}
                  className={cn("group flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border",
                    activeId === e.id ? "bg-primary/10 border-primary/20 text-primary" : "border-transparent hover:bg-muted/60")}
                  onClick={() => onSelect(e as HistoryEntry & { data: T })}>
                  <MessageSquare className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0",
                    activeId === e.id ? "text-primary" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{e.title}</p>
                    {e.subtitle && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{e.subtitle}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {e.timestamp.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button onClick={ev => { ev.stopPropagation(); onDelete(e.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all flex-shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// ─── Tool Header Bar ──────────────────────────────────────────────────────────
export function ToolHeader({
  icon, title, subtitle, accentColor = "text-primary",
  historyCount = 0, onHistoryToggle, onNew, newLabel, showFileAttach, onFileAttach, showModelSelector = true
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentColor?: string;
  historyCount?: number;
  onHistoryToggle?: () => void;
  onNew?: () => void;
  newLabel?: string;
  showFileAttach?: boolean;
  onFileAttach?: () => void;
  showModelSelector?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap py-4 px-1">
      <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg", accentColor)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showFileAttach && onFileAttach && (
          <button onClick={onFileAttach}
            className="flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
            title="Attach file">
            <Plus className="h-4 w-4" />
          </button>
        )}
        {onHistoryToggle && (
          <button onClick={onHistoryToggle}
            className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary"
            title="History">
            <Clock className="h-4 w-4" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {historyCount > 9 ? "9+" : historyCount}
              </span>
            )}
          </button>
        )}
        {onNew && (
          <button onClick={onNew}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary font-medium">
            <Plus className="h-3.5 w-3.5" />{newLabel ?? "New"}
          </button>
        )}
        {showModelSelector && <ModelSelector />}
      </div>
    </div>
  );
}
