import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, Paperclip, Camera, FileText, File, Trash2, Check, Image } from "lucide-react";
import { loadLibrary, saveLibrary, loadContext, saveContext } from "@/lib/sourceContext";

export default function SourceLibrary() {
  const navigate = useNavigate();
  const [activeQuickTool, setActiveTab] = useState("AI Tutor");
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setFiles(loadLibrary());
    const ctx = loadContext();
    setSelectedIds(Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || []);
  }, []);

  // Cleanup camera stream on unmount
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
    saveContext(next);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFiles = files.filter(f => f.id !== id);
    setFiles(nextFiles);
    saveLibrary(nextFiles);
    const nextCtx = selectedIds.filter(x => x !== id);
    setSelectedIds(nextCtx);
    saveContext(nextCtx);
  };

  const addFileToLibrary = (newFile: any) => {
    const nextFiles = [newFile, ...files];
    setFiles(nextFiles);
    saveLibrary(nextFiles);
    const nextCtx = [...selectedIds, newFile.id];
    setSelectedIds(nextCtx);
    saveContext(nextCtx);
  };

  // Regular file upload (PDF / TXT)
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string || "";
      addFileToLibrary({
        id: "f_" + Date.now(),
        name: file.name,
        type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "text",
        content: content.length > 50000 ? content.slice(0, 50000) : content,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        created_at: new Date().toISOString(),
        isPdf: file.name.toLowerCase().endsWith(".pdf"),
      });
    };
    if (file.type.includes("image")) reader.readAsDataURL(file);
    else reader.readAsText(file);
    e.target.value = "";
  };

  // Open live camera view
  const openCamera = async () => {
    try {
      // Try rear camera first (environment), fallback to any
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
      // Attach stream to video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      // Fallback: use file input with capture on mobile
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

  // Snap a photo from the live stream
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
    // Stop stream after capture
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
  };

  // Retake — reopen camera
  const retakePhoto = () => {
    setCameraPreview(null);
    openCamera();
  };

  // Save captured image as a source
  const saveCapturedPhoto = () => {
    if (!cameraPreview) return;
    const timestamp = new Date().toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" });
    const name = `Photo_${Date.now()}.jpg`;
    addFileToLibrary({
      id: "f_" + Date.now(),
      name,
      type: "image",
      content: cameraPreview,  // base64 data URL — AI can read this
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
    const fileContent = uploadContent.trim() || "No content provided.";
    addFileToLibrary({
      id: "f_" + Date.now(),
      name: uploadFileName.trim(),
      type: "text",
      content: fileContent,
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

  // Camera Modal
  if (cameraCapturing) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Camera header */}
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

        {/* Live view or preview */}
        <div className="flex-1 relative overflow-hidden">
          {cameraPreview ? (
            <img src={cameraPreview} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder corners when live */}
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

        {/* Controls */}
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

  return (
    <div className="bg-[#FAF7F2] text-[#1A1A1A] antialiased min-h-full flex flex-col w-full flex-1">

      {/* Header */}
      <header className="w-full top-0 sticky bg-[#FAF7F2] flex items-center justify-between px-5 h-16 z-40 border-b-2 border-black shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
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

      {/* Upload Modal (paste text) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="bg-[#FAF7F2] border-2 border-black rounded-2xl p-6 w-full max-w-sm shadow-[4px_4px_0px_0px_#000]">
            <h2 className="font-extrabold text-[17px] mb-4">Paste Study Notes</h2>
            <input
              autoFocus
              type="text"
              value={uploadFileName}
              onChange={e => setUploadFileName(e.target.value)}
              placeholder="File name (e.g. Science_Lab_Ch4.txt)"
              className="w-full border-2 border-black rounded-xl px-4 py-3 text-[14px] font-semibold bg-white mb-3 outline-none"
            />
            <textarea
              value={uploadContent}
              onChange={e => setUploadContent(e.target.value)}
              placeholder="Paste study notes or flashcard material here..."
              rows={4}
              className="w-full border-2 border-black rounded-xl px-4 py-3 text-[13px] font-semibold bg-white mb-4 outline-none resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUploadModal(false); setUploadFileName(""); setUploadContent(""); }}
                className="flex-1 py-3 border-2 border-black rounded-xl font-bold text-[14px]"
              >Cancel</button>
              <button
                onClick={handleUploadConfirm}
                className="flex-1 py-3 bg-[#ae2925] text-white border-2 border-black rounded-xl font-bold text-[14px] shadow-[3px_3px_0px_0px_#000]"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 px-5 py-6 flex flex-col gap-6 pb-24 overflow-y-auto">
        {showSearch && (
          <input
            autoFocus
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full border-2 border-black rounded-xl px-4 py-3 text-[14px] font-semibold bg-white outline-none"
          />
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleFileSelected}
        />

        {/* Upload Area */}
        <section>
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#1A1A1A] p-8 flex flex-col items-center justify-center gap-4 min-h-[200px]">
            <div className="flex gap-5 mb-1">
              {/* File Upload */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-full bg-[#ebe8e3] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:bg-neutral-200 transition-colors active:translate-y-0.5"
                >
                  <Paperclip className="w-7 h-7 text-[#ae2925]" />
                </button>
                <span className="text-[11px] font-bold text-[#666]">PDF / TXT</span>
              </div>

              {/* Camera Capture */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={openCamera}
                  className="w-16 h-16 rounded-full bg-[#ebe8e3] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:bg-neutral-200 transition-colors active:translate-y-0.5"
                >
                  <Camera className="w-7 h-7 text-[#ae2925]" />
                </button>
                <span className="text-[11px] font-bold text-[#666]">Capture</span>
              </div>
            </div>

            <p className="font-headline font-bold text-[#1A1A1A] text-center text-[16px]">
              Upload a file or capture your notes
            </p>
            <p className="font-bold text-[#888] text-center text-[12px]">
              PDF, TXT • or point camera at textbook / whiteboard
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-1 px-5 py-2 border-2 border-[#1A1A1A] rounded-xl bg-white font-bold text-[13px] hover:bg-neutral-50 shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5"
            >
              Or paste text manually
            </button>
          </div>
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
              .map((file) => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleToggleSelect(file.id)}
                    className={`rounded-2xl border-2 p-4 flex items-center gap-4 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#fff0ef] border-[#ae2925] shadow-[4px_4px_0px_0px_#ae2925]"
                        : "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]"
                    } hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none`}
                  >
                    {/* Thumbnail / icon */}
                    <div className="w-12 h-12 rounded-lg bg-[#ebe8e3] flex items-center justify-center shrink-0 border-2 border-[#1A1A1A] overflow-hidden">
                      {isSelected ? (
                        <Check className="w-6 h-6 text-[#ae2925] stroke-[3]" />
                      ) : file.isPhoto && file.content?.startsWith("data:image") ? (
                        <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                      ) : file.isPdf ? (
                        <FileText className="w-6 h-6 text-[#ae2925]" />
                      ) : file.type === "image" ? (
                        <Image className="w-6 h-6 text-[#ae2925]" />
                      ) : (
                        <File className="w-6 h-6 text-[#666]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[15px] text-[#1A1A1A] truncate">{file.name}</h3>
                      <p className="text-[12px] font-semibold text-[#888] mt-0.5">
                        {file.note || file.size} • {isSelected ? "✓ Active context" : "Idle"}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-red-50 text-[#888] hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

            {files.length === 0 && (
              <div className="text-center p-10 bg-white border-2 border-dashed border-[#1A1A1A] rounded-2xl opacity-60">
                <p className="font-bold text-[16px]">No Files Present</p>
                <p className="text-[13px] mt-1 font-semibold">Upload or capture notes to power AI generation.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
