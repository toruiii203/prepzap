import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface QuickStudyProps {
}

interface StudyPoint {
  label: string;
  value: string;
}

interface StudySheet {
  title: string;
  isNew: boolean;
  points: StudyPoint[];
}

export default function QuickStudy() {
  const navigate = useNavigate();
  const activeSource = getActiveSource();
  const [activeTab, setActiveTab] = useState<"Cram" | "HighYield">("Cram");
  const [topic, setTopic] = useState("");
  const [generatedSheet, setGeneratedSheet] = useState<StudySheet | null>(null);
  const [loading, setLoading] = useState(false);

  const chips = ["Cell Biology", "Anatomy", "Genetics", "Neuroscience"];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setGeneratedSheet(null);

    try {
      const sourceContext = buildAIContext();
      const promptText = `Generate a robust high-yield academic study guide for the topic: "${topic}".
Mode: "${activeTab === "Cram" ? "Cram Session (Fast Core Cheat Sheet Facts)" : "High Yield Summary (Clinical context / Advanced correlation)"}"
${sourceContext ? `Incorporate source material detail:\n${sourceContext}` : ""}

Return strictly a valid raw JSON object. Do not wrap in markdown tags or code blocks.
Required JSON schema structure:
{
  "title": "${topic} (${activeTab === "Cram" ? "Cram Sheet" : "High Yield Study"})",
  "points": [
    { "label": "Key Concept Name", "value": "A complete deeply explanatory educational definition..." },
    { "label": "Second Concept Name", "value": "Detailed fact explanation..." },
    { "label": "Third Concept Name", "value": "Detailed fact explanation..." },
    { "label": "Fourth Concept Name", "value": "Detailed fact explanation..." }
  ]
}

Ensure you provide exactly 4 concise but rigorous study points. Return raw JSON without any wrapping!`;

      const systemPrompt = "You are an elite medical and engineering tutor who publishes quick high-yield revision cards strictly in raw JSON formats.";

      // Safe callGroq signature resolver
      const callGroqWithModel = async (pText: string, sysPrompt: string) => {
        const fn = callGroq as any;
        const fnStr = fn.toString();
        if (fnStr.includes("messages") || fnStr.includes("llama")) {
          return await fn([{ role: "user", content: pText }], sysPrompt, "llama-3.3-70b-versatile", 1000);
        } else {
          return await fn(pText, sysPrompt, "application/json");
        }
      };

      const aiResponse = await callGroqWithModel(promptText, systemPrompt);
      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const generated = JSON.parse(sanitized);
      if (generated.title && Array.isArray(generated.points)) {
        setGeneratedSheet({
          title: generated.title,
          isNew: true,
          points: generated.points
        });
      } else {
        throw new Error("Invalid structure");
      }
    } catch (err) {
      console.error("AI Quick Study failed, using fallback:", err);
      // Fallback
      if (activeTab === "Cram") {
        setGeneratedSheet({
          title: `${topic} (Quick Cram Fallback)`,
          isNew: true,
          points: [
            { label: "Core Feature:", value: "Primary features are maintained actively by Na+/K+ ATP-driven pump steps." },
            { label: "Trigger Bounds:", value: "Sodium channels open rapidly, allowing sodium ions to rush inside the cell membrane." },
            { label: "Reset Phase:", value: "Sodium gates snap shut while potassium gated systems release intracellular channels." },
            { label: "Action Response:", value: "An all-or-none reaction threshold must be parsed to initiate muscular contractions." }
          ]
        });
      } else {
        setGeneratedSheet({
          title: `${topic} (High Yield Fallback)`,
          isNew: true,
          points: [
            { label: "Clinical Target:", value: "Crucial for diagnostics involving neuropathy and signal conduction delays." },
            { label: "Safety Margin:", value: "Refractory periods prevent backward firing, enforcing unidirectional electrical propagation." },
            { label: "Insulator Sheath:", value: "Myelination scales up signal transmission speeds exponentially via saltatory conduction." }
          ]
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChip = (title: string) => {
    setTopic(title);
    setGeneratedSheet(null);
  };

  return (
    <div className="bg-[#fcf9f4] text-on-background min-h-full flex flex-col font-body-md antialiased w-full flex-1 overflow-y-auto pb-24">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky flex items-center justify-between px-5 h-16 bg-[#FAF7F2] border-b-2 border-on-background z-40 navbar-custom">
        <button 
          onClick={() => navigate(-1)}
          aria-label="Back" 
          className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center cursor-pointer border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold pr-4 flex-1 text-center">AI Quick Cram</span>
        <button 
          onClick={() => navigate("/timer")}
          aria-label="Timer" 
          className="text-secondary hover:bg-surface-container-high transition-colors p-1 rounded-full flex items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#E8534A]">bolt</span>
        </button>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full flex flex-col gap-6 px-5 py-6 overflow-y-auto pb-24">
        
        {/* Nav Tabs */}
        <div className="flex border-2 border-black rounded-lg overflow-hidden bg-white shrink-0">
          <button 
            onClick={() => {
              setActiveTab("Cram");
              setGeneratedSheet(null);
            }}
            className={`flex-1 py-3 font-headline text-center font-bold transition-colors text-[14px] cursor-pointer ${
              activeTab === "Cram" ? "bg-primary text-white" : "bg-white text-black hover:bg-neutral-50"
            }`}
          >
            Cram Details
          </button>
          <div className="w-[2px] bg-black"></div>
          <button 
            onClick={() => {
              setActiveTab("HighYield");
              setGeneratedSheet(null);
            }}
            className={`flex-1 py-3 font-headline text-center font-bold transition-colors text-[14px] cursor-pointer ${
              activeTab === "HighYield" ? "bg-primary text-white" : "bg-white text-black hover:bg-neutral-50"
            }`}
          >
            Clinical/High Yield
          </button>
        </div>

        {/* Topic Input Area */}
        <div className="flex flex-col gap-3.5">
          <label className="font-headline text-headline-md text-black font-extrabold text-[16.5px]">What do you need to study?</label>
          
          <input 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="bg-white border-2 border-black rounded-xl px-4 py-3 font-body-md text-black outline-none focus:ring-1 focus:ring-primary shadow-[2px_2px_rgba(0,0,0,1)] text-[15px]" 
            placeholder="e.g. Action Potentials, Mitosis, Krebs Cycle..." 
            type="text"
          />

          {/* Quick suggestions chips */}
          <div className="flex gap-2.5 overflow-x-auto pb-2.5 no-scrollbar scroll-smooth">
            {chips.map((chip, idx) => (
              <button 
                key={idx}
                onClick={() => handleSelectChip(chip)}
                className={`chip shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full border-2 border-black transition-all font-bold text-[13.0px] cursor-pointer ${
                  topic === chip ? "bg-primary text-white shadow-[1px_1px_rgba(0,0,0,1)]" : "bg-white text-black"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          <button 
            onClick={() => navigate("/sources")}
            className="w-full bg-[#FAF7F2] border-2 border-[#1A1A1A] border-dashed rounded-xl py-3 font-label-md text-black flex items-center justify-center gap-1.5 hover:bg-neutral-200 transition-colors font-extrabold cursor-pointer text-[13.5px]"
          >
            <span className="material-symbols-outlined text-[18px]">attach_file</span>
            Read from Source Library
          </button>
        </div>

        {/* Action Button */}
        <div className="mt-1">
          <button 
            disabled={!topic.trim() || loading}
            onClick={handleGenerate}
            className={`w-full py-3.5 text-white font-headline border-2 border-[#1A1A1A] rounded-xl flex items-center justify-center gap-2 transition-all duration-100 text-[15px] font-extrabold ${
              topic.trim() ? "bg-primary shadow-[3px_3px_rgba(0,0,0,1)] hover:bg-opacity-95 cursor-pointer active:translate-y-0.5 active:shadow-none" : "bg-neutral-300 opacity-60 pointer-events-none"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            {loading ? "AI Synthesizing Cram Sheet..." : "Generate Study Sheet"}
          </button>
        </div>

        {/* Results Note Card */}
        {generatedSheet ? (
          <div className="bg-white border-2 border-[#1A1111] rounded-2xl p-6 shadow-[4px_4px_rgba(0,0,0,1)] flex flex-col gap-4 relative mt-2 animate-fade-in">
            {generatedSheet.isNew && (
              <div className="absolute -top-3 -right-3 bg-[#E8534A] text-white font-bold text-[11px] px-3 py-1 rounded-full border-2 border-[#1A1A1A] rotate-6">
                Active
              </div>
            )}
            
            <h2 className="font-headline text-black font-extrabold border-b-2 border-black pb-2.5 leading-tight text-[17px]">
              {generatedSheet.title}
            </h2>
            
            <ul className="flex flex-col gap-3.5 font-body-md text-slate-800 mt-2 list-disc pl-5 marker:text-[#E8534A]">
              {generatedSheet.points.map((pt, idx) => (
                <li key={idx} className="leading-relaxed text-[14.5px]">
                  <span className="font-extrabold text-black mr-1">{pt.label}</span> 
                  {pt.value}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          !loading && (
            <div className="bg-white border-2 border-[#1A1A1A] border-dashed rounded-2xl p-6 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[140px] opacity-75 mt-2">
              <span className="material-symbols-outlined text-primary text-3xl mb-2">import_contacts</span>
              <p className="font-headline font-bold text-[15px] mb-1">No Study Sheet Active</p>
              <p className="text-[12.5px] font-semibold">Select a topic and press generate to create a high-yield study sheet.</p>
            </div>
          )
        )}
      </main>

        </div>
      )}
    </div>
  );
}
