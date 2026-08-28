import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, Paperclip, Camera, FileText, File, Trash2, Check, Image, Eye, AlertTriangle } from "lucide-react";
import { loadLibrary, saveLibrary, loadContext, saveContext } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";

const FREE_FILE_LIMIT = 3;
const PRO_FILE_LIMIT = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── PDF.js text extraction ────────────────────────────────────────────────────
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use the bundled worker from pdfjs-dist for Vite compatibility
  const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  const maxPages = Math.min(pdf.numPages, 20);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
  }
  return fullText.trim();
}

// ── Shared components (module scope, not inside SourceLibrary) ─────────────
// These used to be defined inside SourceLibrary()'s function body. That
// meant React saw a brand-new component type on every single render of
// SourceLibrary, so it fully unmounted and remounted every file row instead
// of updating them — the exact "remount/freeze" pattern from past bugs.
// Typing in the search box, toggling a file, or any other state change up
// top caused the whole file list (and this upload zone) to flicker and
// rebuild from scratch. Defining them here, taking explicit props instead of
// closing over SourceLibrary's state, keeps them as stable component
// identities that React can just update in place.

function FileIcon({ file, isSelected }: { file: any; isSelected: boolean }) {
  if (isSelected) return <Check className="w-6 h-6 text-[#ae2925] stroke-[3]" />;
  if (file.isPhoto && file.content?.startsWith("data:image"))
    return <img src={file.content} alt={file.name} className="w-full h-full object-cover" />;
  if (file.isPdf) return <FileText className="w-6 h-6 text-[#ae2925]" />;
  if (file.type === "image") return <Image className="w-6 h-6 text-[#ae2925]" />;
  return <File className="w-6 h-6 text-[#666]" />;
}

function FileRow({
  file,
  selectedIds,
  corruptedIds,
  onToggleSelect,
  onPreview,
  onDelete,
}: {
  file: any;
  selectedIds: string[];
  corruptedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (file: any) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  const isSelected = selectedIds.includes(file.id);
  const isCorrupted = corruptedIds.has(file.id);
  return (
    <div
      onClick={() => !isCorrupted && onToggleSelect(file.id)}
      className={`border-2 p-4 flex items-center gap-4 transition-all cursor-pointer ${
        isCorrupted
          ? "bg-red-50 border-red-400 shadow-[4px_4px_0px_0px_#f87171] opacity-80"
          : isSelected
          ? "bg-[#fff0ef] border-[#ae2925] shadow-[4px_4px_0px_0px_#ae2925]"
          : "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]"
      } hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none`}
    >
      <div className="w-12 h-12 bg-[#ebe8e3] flex items-center justify-center shrink-0 border-2 border-[#1A1A1A] overflow-hidden">
        {isCorrupted
          ? <AlertTriangle className="w-5 h-5 text-red-500" />
          : <FileIcon file={file} isSelected={isSelected} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[15px] text-[#1A1A1A] truncate">{file.name}</h3>
        {isCorrupted ? (
          <p className="text-[12px] font-bold text-red-500 mt-0.5">Corrupted — delete and re-upload</p>
        ) : (
          <p className="text-[12px] font-semibold text-[#888] mt-0.5">
            {file.note || file.size} • {isSelected ? "✓ Active context" : "Idle"}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Preview button for text files */}
        {!isCorrupted && file.type !== "image" && file.preview && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(file); }}
            className="w-9 h-9 flex items-center justify-center hover:bg-neutral-100 text-[#888] hover:text-[#ae2925] transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={(e) => onDelete(file.id, e)}
          className="w-9 h-9 flex items-center justify-center hover:bg-red-50 text-[#888] hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function UploadZone({
  fileInputRef,
  files,
  fileLimit,
  extractingPdf,
  isPro,
  onOpenCamera,
  onUpgrade,
  onPasteManually,
}: {
  fileInputRef: React.RefObject<HTMLInputElement>;
  files: any[];
  fileLimit: number;
  extractingPdf: boolean;
  isPro: boolean;
  onOpenCamera: () => void;
  onUpgrade: () => void;
  onPasteManually: () => void;
}) {
  return (
    <div className="bg-white border-2 border-dashed border-[#1A1A1A] p-8 flex flex-col items-center justify-center gap-4 min-h-[180px]">
      <div className="flex gap-5 mb-1">
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= fileLimit || extractingPdf}
            className="w-16 h-16 rounded-full bg-[#ebe8e3] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:bg-neutral-200 transition-colors active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Paperclip className="w-7 h-7 text-[#ae2925]" />
          </button>
          <span className="text-[11px] font-bold text-[#666]">PDF / TXT / Image</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onOpenCamera}
            disabled={files.length >= fileLimit}
            className="w-16 h-16 rounded-full bg-[#ebe8e3] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:bg-neutral-200 transition-colors active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera className="w-7 h-7 text-[#ae2925]" />
          </button>
          <span className="text-[11px] font-bold text-[#666]">Capture</span>
        </div>
      </div>
      {extractingPdf && (
        <div className="flex items-center gap-2 text-[#ae2925]">
          <div className="w-4 h-4 border-2 border-[#ae2925] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] font-bold">Extracting text from PDF…</span>
        </div>
      )}
      <p className="font-bold text-[#1A1A1A] text-center text-[16px]">
        Upload a file or capture your notes
      </p>
      <p className="font-bold text-[#888] text-center text-[12px]">
        PDF · TXT · Image • Max {MAX_FILE_SIZE_MB} MB
      </p>
      <p className="font-bold text-center text-[11px]">
        <span className={files.length >= fileLimit ? "text-[#ae2925]" : "text-black/40"}>
          {files.length}/{fileLimit} files used {!isPro && "· Free plan"}
        </span>
        {!isPro && files.length >= fileLimit && (
          <button onClick={onUpgrade} className="ml-2 text-[#ae2925] underline font-black">Upgrade</button>
        )}
      </p>
      <button
        onClick={onPasteManually}
        className="mt-1 px-5 py-2 border-2 border-[#1A1A1A] bg-white font-bold text-[13px] hover:bg-neutral-50 shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5"
      >
        Or paste text manually
      </button>
    </div>
  );
}

export default function SourceLibrary() {
  const navigate = useNavigate();
  const { isPro } = usePlan();
  const fileLimit = isPro ? PRO_FILE_LIMIT : FREE_FILE_LIMIT;
  const [activeQuickTool, setActiveTab] = useState("AI Tutor");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraNote, setCameraNote] = useState("");
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [corruptedIds, setCorruptedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lib = loadLibrary();
    setFiles(lib);
    const ctx = loadContext();
    // Handles both the correct shape and any already-corrupted localStorage
    // data written by the old buggy saveContext(array) calls below.
    setSelectedIds(Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || []);

    // Scan for corrupted files on load
    const broken = new Set<string>();
    lib.forEach((f: any) => {
      if (!f.name || (!f.fullText && !f.content && f.type !== "image")) {
        broken.add(f.id);
      }
    });
    setCorruptedIds(broken);
  }, []);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  const quickTools = ["AI Tutor", "Flashcards", "Practice", "Quick Study"];

  const handleToggleSelect = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    saveContext({ mode: "selected", selectedIds: next });
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFiles = files.filter(f => f.id !== id);
    setFiles(nextFiles);
    saveLibrary(nextFiles);
    const nextCtx = selectedIds.filter(x => x !== id);
    setSelectedIds(nextCtx);
    saveContext({ mode: "selected", selectedIds: nextCtx });
    setCorruptedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const addFileToLibrary = (newFile: any) => {
    const nextFiles = [newFile, ...files];
    setFiles(nextFiles);
    saveLibrary(nextFiles);
    const nextCtx = [...selectedIds, newFile.id];
    setSelectedIds(nextCtx);
    saveContext({ mode: "selected", selectedIds: nextCtx });
  };

  // ── File upload with PDF.js extraction ────────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (files.length >= fileLimit) {
      setUploadError(`You've reached the ${isPro ? "Pro" : "Free"} plan limit of ${fileLimit} files. ${!isPro ? "Upgrade to Pro for up to 20 files." : ""}`);
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max size is ${MAX_FILE_SIZE_MB} MB.`);
      e.target.value = "";
      return;
    }

    const isPdfFile = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdfFile) {
      setExtractingPdf(true);
      try {
        const fullText = await extractPdfText(file);
        if (!fullText || fullText.length < 10) {
          setUploadError("Couldn't extract text from this PDF — it may be scanned or image-only. Try copying the text manually instead.");
        } else {
          addFileToLibrary({
            id: "f_" + Date.now(),
            name: file.name,
            type: "text",
            content: fullText.length > 50000 ? fullText.slice(0, 50000) : fullText,
            fullText: fullText.length > 50000 ? fullText.slice(0, 50000) : fullText,
            preview: fullText.slice(0, 300),
            size: `${(file.size / 1024).toFixed(1)} KB`,
            created_at: new Date().toISOString(),
            isPdf: true,
          });
        }
      } catch {
        setUploadError("Failed to read this PDF. It may be corrupted or password-protected.");
      } finally {
        setExtractingPdf(false);
      }
      e.target.value = "";
      return;
    }

    if (!file.type.includes("text") && !file.type.includes("image")) {
      setUploadError("Only PDF, TXT, and image files are supported.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string || "";
      const truncated = content.length > 50000 ? content.slice(0, 50000) : content;
      addFileToLibrary({
        id: "f_" + Date.now(),
        name: file.name,
        type: file.type.includes("image") ? "image" : "text",
        content: truncated,
        fullText: file.type.includes("image") ? undefined : truncated,
        preview: file.type.includes("image") ? undefined : truncated.slice(0, 300),
        size: `${(file.size / 1024).toFixed(1)} KB`,
        created_at: new Date().toISOString(),
        isPdf: false,
      });
    };
    if (file.type.includes("image")) reader.readAsDataURL(file);
    else reader.readAsText(file);
    e.target.value = "";
  };

  // ── Drag-and-drop handler ──────────────────────────────────────────────────
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).classList.remove("bg-black", "!border-solid");
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (files.length >= fileLimit) {
      setUploadError(`You've reached the ${isPro ? "Pro" : "Free"} plan limit of ${fileLimit} files.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    const isPdfFile = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdfFile) {
      setExtractingPdf(true);
      try {
        const fullText = await extractPdfText(file);
        if (!fullText || fullText.length < 10) {
          setUploadError("Couldn't extract text from this PDF — it may be scanned or image-only.");
        } else {
          addFileToLibrary({
            id: "f_" + Date.now(),
            name: file.name,
            type: "text",
            content: fullText.length > 50000 ? fullText.slice(0, 50000) : fullText,
            fullText: fullText.length > 50000 ? fullText.slice(0, 50000) : fullText,
            preview: fullText.slice(0, 300),
            size: `${(file.size / 1024).toFixed(1)} KB`,
            created_at: new Date().toISOString(),
            isPdf: true,
          });
        }
      } catch {
        setUploadError("Failed to read PDF.");
      } finally {
        setExtractingPdf(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string || "";
      const truncated = content.length > 50000 ? content.slice(0, 50000) : content;
      addFileToLibrary({
        id: "f_" + Date.now(),
        name: file.name,
        type: file.type.includes("image") ? "image" : "text",
        content: truncated,
        fullText: file.type.includes("image") ? undefined : truncated,
        preview: file.type.includes("image") ? undefined : truncated.slice(0, 300),
        size: `${(file.size / 1024).toFixed(1)} KB`,
        created_at: new Date().toISOString(),
        isPdf: false,
      });
    };
    if (file.type.includes("image")) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const openCamera = async () => {
    try {
      const constraints = [
        { video: { facingMode: { exact: "environment" } } },
        { video: { facingMode: "environment" } },
        { video: true },
      ];
      let stream: MediaStream | null = null;
      for (const c of constraints) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch {}
      }
      if (!stream) throw new Error("No camera");
      setCameraStream(stream);
      setCameraCapturing(true);
      setCameraPreview(null);
      setCameraNote("");
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setCameraPreview(dataUrl);
          setCameraCapturing(true);
          setCameraNote("");
        };
        reader.readAsDataURL(file);
      };
      input.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCameraPreview(dataUrl);
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  };

  const retakePhoto = () => {
    setCameraPreview(null);
    openCamera();
  };

  const saveCapturedPhoto = () => {
    if (!cameraPreview) return;
    if (files.length >= fileLimit) {
      setUploadError(`You've reached the ${isPro ? "Pro" : "Free"} plan limit of ${fileLimit} files. ${!isPro ? "Upgrade to Pro for up to 20 files." : ""}`);
      setCameraCapturing(false);
      setCameraPreview(null);
      return;
    }
    const timestamp = new Date().toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" });
    addFileToLibrary({
      id: "f_" + Date.now(),
      name: `Photo_${Date.now()}.jpg`,
      type: "image",
      content: cameraPreview,
      size: `${(cameraPreview.length * 0.75 / 1024).toFixed(1)} KB`,
      created_at: new Date().toISOString(),
      isPdf: false,
      note: cameraNote || `Captured ${timestamp}`,
      isPhoto: true,
    });
    setCameraCapturing(false);
    setCameraPreview(null);
    setCameraNote("");
  };

  const handleUploadConfirm = () => {
    if (!uploadFileName.trim()) return;
    if (files.length >= fileLimit) {
      setUploadError(`You've reached the ${isPro ? "Pro" : "Free"} plan limit of ${fileLimit} files. ${!isPro ? "Upgrade to Pro for up to 20 files." : ""}`);
      setShowUploadModal(false);
      return;
    }
    const fileContent = uploadContent.trim() || "No content provided.";
    addFileToLibrary({
      id: "f_" + Date.now(),
      name: uploadFileName.trim(),
      type: "text",
      content: fileContent,
      fullText: fileContent,
      preview: fileContent.slice(0, 300),
      size: `${Math.ceil(fileContent.length / 100) / 10} KB`,
      created_at: new Date().toISOString(),
      isPdf: uploadFileName.toLowerCase().endsWith(".pdf"),
    });
    setShowUploadModal(false);
    setUploadFileName("");
    setUploadContent("");
  };

  const handleQuickToolClick = (tool: string) => {
    setActiveTab(tool);
    if (tool === "AI Tutor") navigate("/ai-tutor");
    else if (tool === "Flashcards") navigate("/flashcards");
    else if (tool === "Practice") navigate("/practice");
    else if (tool === "Quick Study") navigate("/quick-study");
  };

  // ── Camera modal ─────────────────────────────────────────────────────────

  if (cameraCapturing) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
          <button
            onClick={() => {
              cameraStream?.getTracks().forEach(t => t.stop());
              setCameraStream(null);
              setCameraCapturing(false);
              setCameraPreview(null);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          >
            <span className="material-symbols-outlined text-white text-[20px]">close</span>
          </button>
          <span className="text-white font-bold text-[15px]">
            {cameraPreview ? "Review Photo" : "Capture for AI"}
          </span>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative overflow-hidden">
          {cameraPreview ? (
            <img src={cameraPreview} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          {!cameraPreview && (
            <>
              <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md opacity-70" />
              <div className="absolute top-8 right-8 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md opacity-70" />
              <div className="absolute bottom-32 left-8 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md opacity-70" />
              <div className="absolute bottom-32 right-8 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md opacity-70" />
              <div className="absolute bottom-20 left-0 right-0 text-center text-white/60 text-[12px] font-bold tracking-wide">
                Point at your notes, textbook, or whiteboard
              </div>
            </>
          )}
        </div>

        <div className="bg-black/90 px-5 py-4 flex flex-col gap-3">
          {cameraPreview ? (
            <>
              <input
                type="text"
                value={cameraNote}
                onChange={e => setCameraNote(e.target.value)}
                placeholder="Add a note (e.g. 'Chapter 3 diagram')..."
                className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-2.5 text-white text-[13px] placeholder:text-white/40 outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-3.5 border-2 border-white/30 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">replay</span>
                  Retake
                </button>
                <button
                  onClick={saveCapturedPhoto}
                  className="flex-1 py-3.5 bg-[#ae2925] border-2 border-white/30 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  Add to Library
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center">
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-white/50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-black/20" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Filtered files ────────────────────────────────────────────────────────

  const filteredFiles = files.filter(
    f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedFiles = files.filter(f => selectedIds.includes(f.id));

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/sources" />

      {/* ── Error Banner ── */}
      {uploadError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-full mx-4">
          <div className="bg-[#ae2925] text-white border-2 border-black px-4 py-3 shadow-[3px_3px_0px_#000] flex items-start gap-3">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <p className="text-[13px] font-bold flex-1">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="material-symbols-outlined text-[16px] shrink-0 opacity-70 hover:opacity-100">close</button>
          </div>
        </div>
      )}

      {/* ── PDF Extracting Overlay ── */}
      {extractingPdf && (
        <div className="fixed inset-0 z-[55] bg-black/30 flex items-center justify-center">
          <div className="bg-[#FAF7F2] border-2 border-black px-8 py-6 shadow-[4px_4px_0px_#000] flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[#ae2925] border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-[15px] uppercase tracking-wide">Extracting text from PDF…</p>
            <p className="text-[12px] font-semibold text-black/50">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="bg-[#FAF7F2] border-2 border-black w-full max-w-md shadow-[4px_4px_0px_0px_#000]">
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
              <h2 className="font-black text-[15px] truncate flex-1 mr-3">{previewFile.name}</h2>
              <button onClick={() => setPreviewFile(null)} className="material-symbols-outlined text-[20px] shrink-0 hover:text-[#ae2925]">close</button>
            </div>
            <div className="px-5 py-4 max-h-64 overflow-y-auto">
              <p className="text-[13px] font-semibold text-[#444] leading-relaxed whitespace-pre-wrap">
                {previewFile.preview || previewFile.fullText?.slice(0, 300) || "No preview available."}
              </p>
              {(previewFile.fullText?.length || 0) > 300 && (
                <p className="text-[11px] font-bold text-black/40 mt-3 uppercase tracking-widest">…and {((previewFile.fullText?.length || 0) - 300).toLocaleString()} more characters</p>
              )}
            </div>
            <div className="px-5 pb-4">
              <button
                onClick={() => setPreviewFile(null)}
                className="w-full py-3 border-2 border-black bg-white font-bold text-[13px] hover:bg-neutral-50 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shared Modals ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="bg-[#FAF7F2] border-2 border-black p-6 w-full max-w-sm shadow-[4px_4px_0px_0px_#000]">
            <h2 className="font-extrabold text-[17px] mb-4">Paste Study Notes</h2>
            <input
              autoFocus
              type="text"
              value={uploadFileName}
              onChange={e => setUploadFileName(e.target.value)}
              placeholder="File name (e.g. Science_Lab_Ch4.txt)"
              className="w-full border-2 border-black px-4 py-3 text-[14px] font-semibold bg-white mb-3 outline-none"
            />
            <textarea
              value={uploadContent}
              onChange={e => setUploadContent(e.target.value)}
              placeholder="Paste study notes or flashcard material here..."
              rows={4}
              className="w-full border-2 border-black px-4 py-3 text-[13px] font-semibold bg-white mb-4 outline-none resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUploadModal(false); setUploadFileName(""); setUploadContent(""); }}
                className="flex-1 py-3 border-2 border-black font-bold text-[14px]"
              >Cancel</button>
              <button
                onClick={handleUploadConfirm}
                className="flex-1 py-3 bg-[#ae2925] text-white border-2 border-black font-bold text-[14px] shadow-[3px_3px_0px_0px_#000]"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,text/*,image/*"
        style={{ opacity: 0, position: "absolute", zIndex: -1, width: 1, height: 1 }}
        onChange={handleFileSelected}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col min-h-screen">

        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">SOURCE LIBRARY</span>
            <div className="w-px h-6 bg-black/20" />
            <span className="text-[13px] font-bold text-black/50">{files.length} file{files.length !== 1 ? "s" : ""} • {selectedIds.length} active</span>
            {corruptedIds.size > 0 && (
              <span className="text-[12px] font-bold text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {corruptedIds.size} corrupted
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            
            
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90"
            >
              R
            </div>
          </div>
        </header>

        {/* Desktop Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Pane — Library & Upload */}
          <div className="w-[60%] flex flex-col border-r-2 border-black overflow-y-auto">

            {/* Search + action bar */}
            <div className="px-8 py-5 border-b-2 border-black flex items-center gap-4 shrink-0">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-black/40">search</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search your sources..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-black bg-[#F0EDE0] text-[14px] font-semibold outline-none focus:bg-white transition-colors"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={extractingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white border-2 border-black text-[13px] font-extrabold shadow-[2px_2px_0px_#555] hover:opacity-90 shrink-0 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload
              </button>
              <button
                onClick={openCamera}
                className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border-2 border-black text-[13px] font-extrabold shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                Scan
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border-2 border-black text-[13px] font-extrabold shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Paste
              </button>
            </div>

            {/* Upload drop zone */}
            <div className="px-8 py-6 border-b-2 border-black shrink-0">
              <div
                className="w-full h-36 border-2 border-dashed border-black bg-[#F0EDE0] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[#E8E4DC] transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).classList.add("bg-black", "!border-solid"); }}
                onDragLeave={e => { (e.currentTarget as HTMLDivElement).classList.remove("bg-black", "!border-solid"); }}
                onDrop={handleDrop}
              >
                {extractingPdf ? (
                  <>
                    <div className="w-8 h-8 border-4 border-[#ae2925] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] font-extrabold uppercase tracking-widest text-[#ae2925]">Extracting text…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[36px] text-black/30">upload_file</span>
                    <span className="text-[13px] font-extrabold uppercase tracking-widest text-black/50">Drag & Drop PDF, TXT, or Image</span>
                    <span className="text-[11px] font-bold text-black/30">Max {MAX_FILE_SIZE_MB} MB</span>
                  </>
                )}
              </div>
            </div>

            {/* File list */}
            <div className="px-8 py-6 flex flex-col gap-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-black/50">My Files ({filteredFiles.length})</h2>
                {selectedIds.length > 0 && (
                  <button
                    onClick={() => { setSelectedIds([]); saveContext({ mode: "selected", selectedIds: [] }); }}
                    className="text-[11px] font-extrabold text-[#ae2925] uppercase tracking-widest hover:underline"
                  >
                    Clear All Active
                  </button>
                )}
              </div>

              {filteredFiles.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  selectedIds={selectedIds}
                  corruptedIds={corruptedIds}
                  onToggleSelect={handleToggleSelect}
                  onPreview={setPreviewFile}
                  onDelete={handleDeleteFile}
                />
              ))}

              {filteredFiles.length === 0 && (
                <div className="text-center p-10 bg-white border-2 border-dashed border-[#1A1A1A] opacity-60">
                  <p className="font-black text-[16px] uppercase tracking-wide">
                    {files.length === 0 ? "No Files Present" : "No Matches"}
                  </p>
                  <p className="text-[13px] mt-1 font-semibold">
                    {files.length === 0
                      ? "Upload or capture notes to power AI generation."
                      : "Try a different search term."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane — Active Context + Quick Launch */}
          <div className="w-[40%] flex flex-col overflow-y-auto bg-[#FAF7F2]">

            {/* Active context panel */}
            <div className="px-8 py-6 border-b-2 border-black">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-4">Active Context</h2>
              {selectedFiles.length === 0 ? (
                <div className="bg-[#F0EDE0] border-2 border-black p-5 text-center" style={{ boxShadow: "3px 3px 0px #000" }}>
                  <span className="material-symbols-outlined text-[32px] text-black/20 block mb-2">folder_open</span>
                  <p className="text-[13px] font-bold text-black/50">No files selected</p>
                  <p className="text-[12px] font-semibold text-black/30 mt-1">Tap files on the left to add them to AI context</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {selectedFiles.map(file => (
                    <div key={file.id} className="bg-[#fff0ef] border-2 border-[#ae2925] p-3 flex items-center gap-3" style={{ boxShadow: "3px 3px 0px #ae2925" }}>
                      <div className="w-9 h-9 bg-[#ae2925] flex items-center justify-center shrink-0 border-2 border-black overflow-hidden">
                        {file.isPhoto && file.content?.startsWith("data:image") ? (
                          <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                        ) : file.isPdf ? (
                          <span className="material-symbols-outlined text-white text-[16px]">picture_as_pdf</span>
                        ) : file.type === "image" ? (
                          <span className="material-symbols-outlined text-white text-[16px]">image</span>
                        ) : (
                          <span className="material-symbols-outlined text-white text-[16px]">description</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[13px] truncate">{file.name}</p>
                        <p className="text-[11px] font-semibold text-[#ae2925]">{file.size} • Active</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleSelect(file.id); }}
                        className="w-7 h-7 flex items-center justify-center hover:bg-red-100 text-[#888] hover:text-red-500 transition-colors shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Launch */}
            <div className="px-8 py-6 border-b-2 border-black">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-4">Quick Launch Tool</h2>
              <div className="flex flex-col gap-3">
                {[
                  { label: "AI Tutor", icon: "smart_toy", route: "/ai-tutor", desc: "Chat with AI about your sources" },
                  { label: "Flashcards", icon: "style", route: "/flashcards", desc: "Auto-generate flashcards from files" },
                  { label: "Practice", icon: "assignment", route: "/practice", desc: "Build a quiz from your notes" },
                  { label: "Quick Study", icon: "bolt", route: "/quick-study", desc: "Fast-track key concepts" },
                ].map(tool => (
                  <button
                    key={tool.route}
                    onClick={() => handleQuickToolClick(tool.label)}
                    className={`flex items-center gap-4 px-4 py-3 border-2 border-black text-left transition-all w-full ${
                      selectedIds.length > 0
                        ? "bg-white hover:bg-[#F0EDE0] shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5"
                        : "bg-[#F0EDE0] opacity-60 cursor-not-allowed"
                    }`}
                    disabled={selectedIds.length === 0}
                  >
                    <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0 border-2 border-black">
                      <span className="material-symbols-outlined text-white text-[18px]">{tool.icon}</span>
                    </div>
                    <div>
                      <p className="font-black text-[14px]">{tool.label}</p>
                      <p className="text-[11px] font-semibold text-black/50">{tool.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-black/30 ml-auto">arrow_forward</span>
                  </button>
                ))}
              </div>
              {selectedIds.length === 0 && (
                <p className="text-[11px] font-bold text-black/40 mt-3 text-center uppercase tracking-widest">Select files above to enable tools</p>
              )}
            </div>

            {/* Storage Stats */}
            <div className="px-8 py-6">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-4">Library Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Files", value: files.length, icon: "folder" },
                  { label: "Active in AI", value: selectedIds.length, icon: "memory" },
                  { label: "PDFs", value: files.filter(f => f.isPdf).length, icon: "picture_as_pdf" },
                  { label: "Images", value: files.filter(f => f.type === "image").length, icon: "image" },
                ].map(stat => (
                  <div key={stat.label} className="bg-white border-2 border-black p-4" style={{ boxShadow: "3px 3px 0px #000" }}>
                    <span className="material-symbols-outlined text-[20px] text-black/40 block mb-1">{stat.icon}</span>
                    <p className="font-black text-[22px]">{stat.value}</p>
                    <p className="text-[11px] font-bold text-black/50 uppercase tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE LAYOUT — DO NOT TOUCH
      ════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]">

        {/* Header */}
        <header className="w-full top-0 sticky bg-[#FAF7F2] flex items-center justify-between px-5 h-16 z-40 border-b-2 border-black shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="text-primary hover:bg-[#ebe8e3] transition-colors p-2 rounded-full active:translate-y-0.5"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" />
          </button>
          <h1 className="font-headline text-[20px] text-[#1A1A1A] tracking-tight font-extrabold text-center flex-1">
            Source Library
          </h1>
          <button
            onClick={() => setShowSearch(s => !s)}
            className="text-primary hover:bg-[#ebe8e3] transition-colors p-2 rounded-full active:translate-y-0.5"
          >
            <Search className="w-6 h-6 text-[#1A1A1A]" />
          </button>
        </header>

        {/* Main */}
        <main className="flex-1 px-5 py-6 flex flex-col gap-6 pb-24 overflow-y-auto">
          {showSearch && (
            <input
              autoFocus
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="w-full border-2 border-black px-4 py-3 text-[14px] font-semibold bg-white outline-none"
            />
          )}

          {/* Upload Area */}
          <section>
            <UploadZone
              fileInputRef={fileInputRef}
              files={files}
              fileLimit={fileLimit}
              extractingPdf={extractingPdf}
              isPro={isPro}
              onOpenCamera={openCamera}
              onUpgrade={() => navigate("/pro")}
              onPasteManually={() => setShowUploadModal(true)}
            />
          </section>

          {/* Quick Launch */}
          <section>
            <h2 className="font-headline font-extrabold text-[16px] text-[#1A1A1A] mb-3">Quick Launch Tool</h2>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-1 -mx-1">
              {quickTools.map((tool) => (
                <button
                  key={tool}
                  onClick={() => handleQuickToolClick(tool)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full border-2 border-[#1A1A1A] font-bold text-[13px] shrink-0 transition-all ${
                    activeQuickTool === tool
                      ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_0px_#1A1A1A]"
                      : "bg-white text-[#1A1A1A] hover:bg-neutral-100"
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </section>

          {/* File List */}
          <section className="flex-1">
            <div className="flex items-center justify-between mb-4 border-b border-black/10 pb-3">
              <h2 className="font-extrabold text-[16px]">My Attached Files</h2>
              <span className="font-bold text-[#888] text-[13px]">{files.length} items</span>
            </div>

            <div className="flex flex-col gap-4">
              {files
                .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    selectedIds={selectedIds}
                    corruptedIds={corruptedIds}
                    onToggleSelect={handleToggleSelect}
                    onPreview={setPreviewFile}
                    onDelete={handleDeleteFile}
                  />
                ))}

              {files.length === 0 && (
                <div className="text-center p-10 bg-white border-2 border-dashed border-[#1A1A1A] opacity-60">
                  <p className="font-bold text-[16px]">No Files Present</p>
                  <p className="text-[13px] mt-1 font-semibold">Upload or capture notes to power AI generation.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

    </div>
  );
}


