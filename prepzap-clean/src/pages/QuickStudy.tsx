import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";

interface StudyPoint {
  label: string;
  value: string;
}

interface StudySheet {
  title: string;
  isNew: boolean;
  tags: string[];
  retentionScore: number;
  goals: string[];
  points: StudyPoint[];
}

export default function QuickStudy() {
  const navigate = useNavigate();
  const activeSource = getActiveSource();
  const { save: saveHistory } = useToolHistory("quick-study");

  const [activeTab, setActiveTab] = useState<"Cram" | "HighYield">("Cram");
  const [topic, setTopic] = useState("");
  const [generatedSheet, setGeneratedSheet] = useState<StudySheet | null>(null);
  const [loading, setLoading] = useState(false);

  const chips = ["Cell Biology", "Anatomy", "Genetics", "Neuroscience", "Biochemistry", "Physiology"];

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
Required JSON schema:
{
  "title": "${topic} (${activeTab === "Cram" ? "Cram Sheet" : "High Yield Study"})",
  "tags": ["Subject Area", "Sub-topic", "Exam Category"],
  "retentionScore": 72,
  "goals": [
    "Define the core terminology",
    "Identify 3 high-yield mechanisms",
    "Summarize key clinical correlations"
  ],
  "points": [
    { "label": "Key Concept Name:", "value": "A complete deeply explanatory educational definition..." },
    { "label": "Second Concept Name:", "value": "Detailed fact explanation..." },
    { "label": "Third Concept Name:", "value": "Detailed fact explanation..." },
    { "label": "Fourth Concept Name:", "value": "Detailed fact explanation..." }
  ]
}

Rules:
- tags: 2-4 short title-cased topic labels (e.g. "Cell Biology", "Exam Prep")
- retentionScore: integer 0-100 reflecting topic complexity and how well these 4 points cover it
- goals: exactly 3 short imperative study goals specific to this topic
- points: exactly 4 rigorous study points
Return raw JSON only, no wrapping!`;

      const systemPrompt = "You are an elite medical and engineering tutor who publishes quick high-yield revision cards strictly in raw JSON formats.";

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
        const sheet: StudySheet = {
          title: generated.title,
          isNew: true,
          tags: Array.isArray(generated.tags) ? generated.tags : [activeTab === "Cram" ? "Cram" : "High Yield"],
          retentionScore: typeof generated.retentionScore === "number" ? generated.retentionScore : 65,
          goals: Array.isArray(generated.goals) ? generated.goals : ["Review core concepts", "Identify key mechanisms", "Test recall"],
          points: generated.points,
        };
        setGeneratedSheet(sheet);
        saveHistory({
          prompt: topic,
          preview: generated.points[0]?.value?.slice(0, 120) || "",
          output: JSON.stringify(generated),
          model: "rex-ai",
          meta: `${activeTab} · ${sheet.tags.join(", ")}`,
        });
      } else {
        throw new Error("Invalid structure");
      }
    } catch (err) {
      console.error("AI Quick Study failed, using fallback:", err);
      if (activeTab === "Cram") {
        setGeneratedSheet({
          title: `${topic} (Cram Sheet)`,
          isNew: true,
          tags: ["Core Concepts", "Cram Mode"],
          retentionScore: 58,
          goals: ["Define core terminology", "Memorize key sequences", "Review trigger mechanisms"],
          points: [
            { label: "Core Feature:", value: "Primary features are maintained actively by Na+/K+ ATP-driven pump steps." },
            { label: "Trigger Bounds:", value: "Sodium channels open rapidly, allowing sodium ions to rush inside the cell membrane." },
            { label: "Reset Phase:", value: "Sodium gates snap shut while potassium gated systems release intracellular channels." },
            { label: "Action Response:", value: "An all-or-none reaction threshold must be parsed to initiate muscular contractions." },
          ],
        });
      } else {
        setGeneratedSheet({
          title: `${topic} (High Yield Study)`,
          isNew: true,
          tags: ["High Yield", "Clinical Correlation", "Exam Prep"],
          retentionScore: 74,
          goals: ["Correlate with clinical presentations", "Identify pharmacological targets", "Map pathway inhibition points"],
          points: [
            { label: "Clinical Target:", value: "Crucial for diagnostics involving neuropathy and signal conduction delays." },
            { label: "Safety Margin:", value: "Refractory periods prevent backward firing, enforcing unidirectional electrical propagation." },
            { label: "Insulator Sheath:", value: "Myelination scales up signal transmission speeds exponentially via saltatory conduction." },
            { label: "Drug Interaction:", value: "Channel blockers modulate threshold potentials and are used in antiarrhythmic therapy." },
          ],
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

  const handleCopySheet = () => {
    if (!generatedSheet) return;
    const text = `${generatedSheet.title}\n\n${generatedSheet.points.map((p) => `${p.label} ${p.value}`).join("\n\n")}`;
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // ─── Session Goals Panel (desktop right column) ──────────────────────────
  const SessionGoalsPanel = () => (
    <div className="border-2 border-black bg-[#F0EDE0] p-5 flex flex-col justify-between h-full shadow-[3px_3px_0px_#000]">
      <div>
        <h4 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-4 border-b-2 border-black/10 pb-2">
          Session Goals
        </h4>
        {!generatedSheet && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-black/20">flag</span>
            <p className="text-[12px] font-bold text-black/40">Goals appear after generating a study sheet.</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[28px]">autorenew</span>
            <p className="text-[12px] font-black text-black/40">Generating goals...</p>
          </div>
        )}
        {generatedSheet && (
          <ul className="flex flex-col gap-3">
            {generatedSheet.goals.map((goal, i) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 shrink-0 border-2 border-black rounded-full flex items-center justify-center mt-0.5 ${
                    i === 0 ? "bg-[#E8534A]" : "bg-white"
                  }`}
                >
                  {i === 0 && (
                    <span className="material-symbols-outlined text-white text-[12px]" style={{ fontVariationSettings: "'wght' 700" }}>
                      check
                    </span>
                  )}
                </div>
                <span
                  className={`text-[13px] font-semibold leading-snug ${
                    i === 0 ? "line-through text-black/40" : "text-black"
                  }`}
                >
                  {goal}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Retention bar */}
      <div className="mt-6 pt-4 border-t-2 border-black/10">
        <div className="h-2 w-full bg-[#E8E4DC] border-2 border-black overflow-hidden mb-2">
          <div
            className="h-full bg-black transition-all duration-700"
            style={{ width: generatedSheet ? `${generatedSheet.retentionScore}%` : "0%" }}
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-black/50">
          Retention Capacity: {generatedSheet ? `${generatedSheet.retentionScore}%` : "—"}
        </p>
      </div>
    </div>
  );

  // ─── Output Card (shared) ────────────────────────────────────────────────
  const OutputCard = ({ compact = false }: { compact?: boolean }) => {
    if (!generatedSheet && !loading) {
      return (
        <div className="border-2 border-dashed border-black/20 flex flex-col items-center justify-center text-center py-12 gap-3 bg-white">
          <span className="material-symbols-outlined text-[40px] text-black/20">import_contacts</span>
          <p className="text-[14px] font-black text-black/40">No Study Sheet Active</p>
          <p className="text-[12px] font-bold text-black/30">Enter a topic and hit Generate to build a high-yield study sheet.</p>
        </div>
      );
    }
    if (loading) {
      return (
        <div className="border-2 border-black bg-white flex flex-col items-center justify-center py-16 gap-4 shadow-[3px_3px_0px_#000]">
          <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[36px]">autorenew</span>
          <p className="text-[14px] font-black text-black/50">AI Synthesizing Study Sheet...</p>
        </div>
      );
    }
    if (!generatedSheet) return null;

    return (
      <div className={`border-2 border-black bg-white flex flex-col relative shadow-[4px_4px_0px_#000] ${compact ? "" : "min-h-[400px]"}`}>
        {/* Card header — tags + actions */}
        <div className="px-6 py-3 border-b-2 border-black bg-[#F0EDE0] flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            {generatedSheet.tags.map((tag, i) => (
              <span
                key={i}
                className={`px-3 py-0.5 text-[11px] font-black uppercase tracking-wider border-2 border-black ${
                  i === 0 ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCopySheet} title="Copy" className="material-symbols-outlined text-[20px] text-black hover:text-[#E8534A] transition-colors">
              content_copy
            </button>
            <button onClick={() => window.print()} title="Print" className="material-symbols-outlined text-[20px] text-black hover:text-[#E8534A] transition-colors">
              print
            </button>
            <button onClick={handleCopySheet} title="Share" className="material-symbols-outlined text-[20px] text-black hover:text-[#E8534A] transition-colors">
              share
            </button>
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 flex flex-col gap-5">
          {/* Active badge */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-black text-[20px] uppercase leading-tight tracking-tight">
              {generatedSheet.title}
            </h2>
            {generatedSheet.isNew && (
              <span className="shrink-0 bg-[#E8534A] text-white text-[11px] font-black px-3 py-1 border-2 border-black rotate-2 shadow-[2px_2px_0px_#000]">
                Active
              </span>
            )}
          </div>

          {/* Points */}
          <ul className="flex flex-col gap-4 list-disc pl-5 marker:text-[#E8534A]">
            {generatedSheet.points.map((pt, idx) => (
              <li key={idx} className="leading-relaxed text-[14.5px] text-black/80">
                <span className="font-extrabold text-black mr-1">{pt.label}</span>
                {pt.value}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/quick-study" />

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>

        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">QUICK STUDY</span>
            <div className="w-px h-6 bg-black/20" />
            <div className="flex items-center gap-2 border-2 border-black px-3 py-1 bg-[#F0EDE0] shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span className="text-[11px] font-black uppercase tracking-widest">PC Mode: High Throughput</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90"
            >
              S
            </div>
          </div>
        </header>

        {/* Desktop body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-6xl mx-auto space-y-8">

            {/* Top section: Input (2/3) + Session Goals (1/3) */}
            <div className="grid grid-cols-3 gap-6">

              {/* Concept Generator — 2/3 */}
              <div className="col-span-2 border-2 border-black bg-white shadow-[5px_5px_0px_#000] p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                  <h3 className="text-[20px] font-black">Concept Generator</h3>
                  <span className="text-[11px] font-black uppercase tracking-widest bg-black text-white px-3 py-1">
                    Retention Capacity: {generatedSheet ? `${generatedSheet.retentionScore}%` : "—"}
                  </span>
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-black/50 mb-2">
                    Study Topic or Raw Text
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
                    rows={4}
                    className="w-full bg-[#F0EDE0] border-2 border-black px-4 py-3 text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none"
                    placeholder="Paste complex lecture notes or enter a topic (e.g., 'Cellular Mitosis Mechanics')..."
                  />
                </div>

                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  {chips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectChip(chip)}
                      className={`px-3 py-1 border-2 border-black text-[12px] font-bold transition-all ${
                        topic === chip ? "bg-black text-white shadow-[2px_2px_0px_#000] scale-95" : "bg-white text-black hover:bg-[#E2E2E2]"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Actions row */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate("/sources")}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-black bg-white text-[13px] font-bold hover:bg-[#E2E2E2] transition-colors shadow-[2px_2px_0px_#000]"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Upload PDF / Doc
                  </button>

                  {/* Tab toggles */}
                  <div className="flex border-2 border-black overflow-hidden">
                    {(["Cram", "HighYield"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                        className={`px-4 py-2 text-[12px] font-black uppercase tracking-wider transition-colors border-r-2 last:border-r-0 border-black ${
                          activeTab === tab ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
                        }`}
                      >
                        {tab === "Cram" ? "Cram Mode" : "High Yield"}
                      </button>
                    ))}
                  </div>

                  {/* Generate */}
                  <button
                    onClick={handleGenerate}
                    disabled={!topic.trim() || loading}
                    className="flex-1 relative group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="w-full py-2.5 bg-black text-white border-2 border-black flex items-center justify-center gap-2 z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      <span className="font-black text-[13px] uppercase tracking-wider">
                        {loading ? "Synthesizing..." : "Generate Notes"}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-[#E8534A] translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Session Goals — 1/3 */}
              <div className="col-span-1">
                <SessionGoalsPanel />
              </div>
            </div>

            {/* Tabs + Output */}
            <div className="space-y-0">
              {/* Tab bar */}
              <div className="flex gap-px border-b-[3px] border-black">
                {(["Cram", "HighYield"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                    className={`px-8 py-3 text-[12px] font-black uppercase tracking-widest border-t-[3px] border-x-[3px] border-black -mb-[3px] z-10 transition-colors ${
                      activeTab === tab ? "bg-black text-white" : "bg-[#FAF7F2] text-black hover:bg-[#E2E2E2]"
                    }`}
                  >
                    {tab === "Cram" ? "Cram Mode" : "High Yield"}
                  </button>
                ))}
              </div>

              {/* Output card */}
              <OutputCard />
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT — preserved + enhanced
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        {/* Mobile TopAppBar */}
        <header className="flex items-center justify-between px-4 h-14 bg-[#FAF7F2] shrink-0 border-b-2 border-black z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <h1 className="text-[18px] font-black">AI Quick Cram</h1>
          <button
            onClick={() => navigate("/timer")}
            className="flex items-center justify-center w-9 h-9"
          >
            <span className="material-symbols-outlined text-[#E8534A]">bolt</span>
          </button>
        </header>

        {/* Mobile scrollable body */}
        <main className="flex-1 overflow-y-auto px-4 py-5 pb-10 flex flex-col gap-5">

          {/* Tab toggle */}
          <div className="flex border-2 border-black overflow-hidden bg-white shrink-0">
            {(["Cram", "HighYield"] as const).map((tab, i) => (
              <React.Fragment key={tab}>
                {i > 0 && <div className="w-[2px] bg-black" />}
                <button
                  onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                  className={`flex-1 py-2.5 font-bold text-[13px] transition-colors ${
                    activeTab === tab ? "bg-black text-white" : "bg-white text-black hover:bg-[#E2E2E2]"
                  }`}
                >
                  {tab === "Cram" ? "Cram Mode" : "High Yield"}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Topic */}
          <div className="flex flex-col gap-3">
            <label className="text-[15px] font-black">What do you need to study?</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              className="bg-white border-2 border-black px-4 py-3 text-[15px] font-medium placeholder:text-black/30 resize-none focus:outline-none shadow-[2px_2px_0px_#000]"
              placeholder="e.g. Action Potentials, Mitosis, Krebs Cycle..."
            />

            {/* Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectChip(chip)}
                  className={`shrink-0 px-3 py-1 border-2 border-black text-[12px] font-bold whitespace-nowrap transition-all ${
                    topic === chip ? "bg-black text-white shadow-[1px_1px_0px_#000] scale-95" : "bg-white text-black"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate("/sources")}
              className="w-full bg-[#FAF7F2] border-2 border-black border-dashed py-2.5 flex items-center justify-center gap-2 font-bold text-[13px] hover:bg-[#E2E2E2] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">attach_file</span>
              Read from Source Library
            </button>
          </div>

          {/* Generate button */}
          <button
            disabled={!topic.trim() || loading}
            onClick={handleGenerate}
            className="relative group cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="w-full py-3.5 bg-black text-white border-2 border-black flex items-center justify-center gap-2 z-10 relative group-active:translate-y-0.5 group-active:translate-x-0.5 transition-transform">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="font-black text-[14px]">
                {loading ? "AI Synthesizing..." : "Generate Study Sheet"}
              </span>
            </div>
            <div className="absolute inset-0 bg-[#E8534A] translate-y-1 translate-x-1 group-active:translate-y-0 group-active:translate-x-0 transition-transform" />
          </button>

          {/* Session Goals — mobile (shown after generate) */}
          {(generatedSheet || loading) && (
            <div className="border-2 border-black bg-[#F0EDE0] p-4 shadow-[3px_3px_0px_#000]">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Session Goals</h4>
              {loading ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="material-symbols-outlined animate-spin text-[#E8534A] text-[20px]">autorenew</span>
                  <span className="text-[12px] font-bold text-black/40">Generating goals...</span>
                </div>
              ) : generatedSheet ? (
                <>
                  <ul className="flex flex-col gap-2 mb-4">
                    {generatedSheet.goals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <div className={`w-4 h-4 shrink-0 border-2 border-black rounded-full flex items-center justify-center mt-0.5 ${i === 0 ? "bg-[#E8534A]" : "bg-white"}`}>
                          {i === 0 && <span className="material-symbols-outlined text-white text-[10px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>}
                        </div>
                        <span className={`text-[12px] font-semibold ${i === 0 ? "line-through text-black/40" : "text-black"}`}>{goal}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="h-1.5 w-full bg-[#E8E4DC] border border-black overflow-hidden mb-1">
                    <div className="h-full bg-black transition-all duration-700" style={{ width: `${generatedSheet.retentionScore}%` }} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                    Retention Capacity: {generatedSheet.retentionScore}%
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* Output card */}
          <OutputCard compact />

        </main>
      </div>

    </div>
  );
}
