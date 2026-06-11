import React, { useState, useEffect } from "react";
import { ArrowLeft, Search, Paperclip, Camera, FileText, File, Trash2, Plus, Check } from "lucide-react";
import { loadLibrary, saveLibrary, loadContext, saveContext } from "@/lib/sourceContext";

interface SourceLibraryProps {
  onNavigate: (screen: string) => void;
}

export default function SourceLibrary({ onNavigate }: SourceLibraryProps) {
  const [activeQuickTool, setActiveTab] = useState("AI Tutor");
  const [files, setFiles] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Synchronize state with persistent sources on mount
  useEffect(() => {
    setFiles(loadLibrary());
    const ctx = loadContext();
    setSelectedIds(Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || []);
  }, []);

  const quickTools = ["AI Tutor", "Flashcards", "Practice", "Quick Study"];

  const handleToggleSelect = (id: string) => {
    let next: string[];
    if (selectedIds.includes(id)) {
      next = selectedIds.filter(x => x !== id);
    } else {
      next = [...selectedIds, id];
    }
    setSelectedIds(next);
    saveContext(next);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling selection when clicking delete
    const nextFiles = files.filter(f => f.id !== id);
    setFiles(nextFiles);
    saveLibrary(nextFiles);

    // Also remove from selected context
    const nextCtx = selectedIds.filter(x => x !== id);
    setSelectedIds(nextCtx);
    saveContext(nextCtx);
  };

  const handleUploadClick = () => {
    const fileName = prompt("Enter file name to upload (e.g. Science_Lab_Ch4.txt):");
    if (!fileName) return;
    
    // Prompt for some basic contents to make it interactive in the mockups
    const fileContent = prompt("Type some study sentences or flashcard material for this notes source:", "Photosynthesis reaction uses water, carbon dioxide, and solar light to assemble sugars inside chloroplast systems.");
    if (!fileContent) return;

    const newFile = {
      id: "f_" + Date.now(),
      name: fileName,
      type: "text",
      content: fileContent,
      size: `${Math.ceil(fileContent.length / 100) / 10} KB`,
      created_at: new Date().toISOString(),
      isPdf: fileName.toLowerCase().endsWith(".pdf")
    };

    const nextFiles = [newFile, ...files];
    setFiles(nextFiles);
    saveLibrary(nextFiles);

    // Auto-select uploaded file as active context
    const nextCtx = [...selectedIds, newFile.id];
    setSelectedIds(nextCtx);
    saveContext(nextCtx);

    alert(`Successfully synced and saved "${fileName}" to local library! Selected as core AI search reference.`);
  };

  const handleQuickToolClick = (tool: string) => {
    setActiveTab(tool);
    if (tool === "AI Tutor") onNavigate("AITutor");
    else if (tool === "Flashcards") onNavigate("Flashcards");
    else if (tool === "Practice") onNavigate("Practice");
    else if (tool === "Quick Study") onNavigate("QuickStudy");
  };

  return (
    <div className="bg-[#FAF7F2] text-[#1A1A1A] antialiased min-h-screen flex flex-col w-full max-w-[390px] mx-auto relative shadow-xl overflow-x-hidden border-x border-[#ebe8e3]">
      
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-[#FAF7F2] flex items-center justify-between px-5 h-16 w-full z-40 border-b-2 border-black">
        <button 
          onClick={() => onNavigate("Dashboard")}
          className="text-primary hover:bg-[#ebe8e3] transition-colors p-2 rounded-full flex items-center justify-center cursor-pointer active:translate-y-0.5"
        >
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" />
        </button>
        <h1 className="font-headline text-headline-lg text-[#1A1A1A] tracking-tight font-extrabold pr-4 flex-1 text-center text-[20px]">
          Source Library
        </h1>
        <button 
          onClick={() => {
            const term = prompt("Enter file search term:");
            if (term) {
              const matched = files.filter(f => f.name.toLowerCase().includes(term.toLowerCase()));
              alert(`Matched ${matched.length} files: \n` + matched.map(f => f.name).join("\n"));
            }
          }}
          className="text-primary hover:bg-[#ebe8e3] transition-colors p-2 rounded-full flex items-center justify-center cursor-pointer active:translate-y-0.5"
        >
          <Search className="w-6 h-6 text-[#1A1A1A]" />
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 px-5 py-6 flex flex-col gap-6 pb-24 overflow-y-auto">
        
        {/* Upload Area */}
        <section>
          <div 
            onClick={handleUploadClick}
            className="bg-white rounded-2xl border-2 border-dashed border-[#1A1A1A] p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-neutral-50 transition-colors min-h-[190px]"
          >
            <div className="flex gap-4 mb-1">
              <div className="w-14 h-14 rounded-full bg-[#ebe8e3] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[3.5px_3px_0px_0px_#1A1A1A]">
                <Paperclip className="w-6 h-6 text-primary" />
              </div>
              <div className="w-14 h-14 rounded-full bg-[#ebe8e3] flex items-center justify-center border-2 border-[#1A1A1A] shadow-[3.5px_3px_0px_0px_#1A1A1A]">
                <Camera className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="font-headline font-bold text-headline-sm text-[#1A1A1A] text-center text-[16px]">
              Tap to upload or take a photo
            </p>
            <p className="font-label-md text-label-md text-secondary text-center font-bold text-[13px]">
              PDF, TXT, images (JPEG, PNG)
            </p>
          </div>
        </section>

        {/* Quick Launch Chips */}
        <section>
          <h2 className="font-headline text-headline-md text-[#1A1A1A] font-extrabold mb-4 text-[16px]">Quick Launch Tool</h2>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-1 -mx-1">
            {quickTools.map((tool) => {
              const isActive = activeQuickTool === tool;
              return (
                <button
                  key={tool}
                  onClick={() => handleQuickToolClick(tool)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-full border-2 border-[#1A1A1A] font-label-md transition-all duration-100 shrink-0 font-bold text-[13.5px] ${
                    isActive
                      ? "bg-primary text-white shadow-[2px_2px_0px_0px_#1A1A1A]"
                      : "bg-white text-[#1A1A1A] hover:bg-neutral-100"
                  }`}
                >
                  {tool}
                </button>
              );
            })}
          </div>
        </section>

        {/* File List */}
        <section className="flex-1">
          <div className="flex items-center justify-between mb-4 border-b border-black/10 pb-3">
            <h2 className="font-headline text-headline-md text-black font-extrabold text-[16px]">My Attached Files</h2>
            <span className="font-label-md text-label-md text-secondary font-bold text-[13px]">
              {files.length} items
            </span>
          </div>
          
          <div className="flex flex-col gap-5">
            {files.map((file) => {
              const isSelected = selectedIds.includes(file.id);
              return (
                <div 
                  key={file.id}
                  onClick={() => handleToggleSelect(file.id)}
                  className={`rounded-2xl border-2 p-5 flex items-center gap-5 transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-[#eaf1ff] border-primary shadow-[4px_4px_0px_0px_#ae2925]" 
                      : "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]"
                  } hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none`}
                >
                  <div className="w-12 h-12 rounded-lg bg-[#ebe8e3] flex items-center justify-center shrink-0 border-2 border-[#1A1A1A]">
                    {isSelected ? (
                      <Check className="w-6 h-6 text-primary stroke-[3]" />
                    ) : file.isPdf ? (
                      <FileText className="w-6 h-6 text-primary" />
                    ) : (
                      <File className="w-6 h-6 text-secondary" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline font-bold text-headline-sm text-[#1A1A1A] truncate pr-1 text-[15.5px]">
                      {file.name}
                    </h3>
                    <p className="font-label-sm text-label-sm text-secondary text-[12.5px] font-semibold mt-0.5">
                      {file.size} • {isSelected ? "Active Search context" : "Idle reference"}
                    </p>
                  </div>
                  
                  <button 
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    aria-label="Delete file"
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:bg-red-50 text-secondary hover:text-error transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}

            {files.length === 0 && (
              <div className="text-center p-10 bg-white border-2 border-dashed border-[#1A1A1A] rounded-2xl opacity-60">
                <p className="font-headline font-bold text-black text-[16px]">No Files Present</p>
                <p className="text-[13px] mt-1 font-semibold">Upload file attachments to empower study generation.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
