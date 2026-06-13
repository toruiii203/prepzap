import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource, loadContext, loadLibrary, saveContext } from "@/lib/sourceContext";

interface FeynmanFeedback {
  strengths: string[];
  gaps: Array<{ title: string; detail: string }>;
  hint: string;
  clarityScore: number;
  xpAwarded: number;
}

export default function TeachIt() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [activeSource, setActiveSource] = useState<string | null>(() => getActiveSource()?.name ?? null);
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [showXpToast, setShowXpToast] = useState(false);
  const [xpEarnedToast, setXpEarnedToast] = useState(0);

  const selectTopicTemplate = (title: string) => {
    setTopic(title);
    setExplanation("");
    setFeedback(null);
  };

  const handleClearSource = () => {
    setActiveSource(null);
    saveContext([]);
  };

  const handleAnalyze = async () => {
    if (!explanation.trim()) return;
    setLoading(true);
    setFeedback(null);
    const targetTopic = topic.trim() || "General Study Concept";

    try {
      const sourceContext = buildAIContext();
      const promptText = `Analyze this student's simple explanation of "${targetTopic}".
Student draft: "${explanation}"
${sourceContext ? `Source context:\n${sourceContext}` : ""}

Evaluate using the Feynman technique. Return ONLY a raw JSON object with NO markdown:
{
  "strengths": ["strength 1", "strength 2"],
  "gaps": [{"title": "Gap Name", "detail": "Why it matters"}, ...],
  "hint": "A Feynman-style hint to deepen understanding",
  "clarityScore": 82,
  "xpAwarded": 45
}`;

      const systemPrompt = "You are a master Feynman technique evaluator. Return only raw JSON. No markdown.";
      const fn = callGroq as any;
      const fnStr = fn.toString();
      const aiResponse = fnStr.includes("messages") || fnStr.includes("llama")
        ? await fn([{ role: "user", content: promptText }], systemPrompt, "llama-3.3-70b-versatile", 1000)
        : await fn(promptText, systemPrompt, "application/json");

      let sanitized = aiResponse.trim().replace(/^```(json)?/, "").replace(/```$/, "").trim();
      const generated: FeynmanFeedback = JSON.parse(sanitized);

      if (generated.strengths && generated.gaps) {
        setFeedback(generated);
        const xp = generated.xpAwarded || 30;
        setXpEarnedToast(xp);
        setShowXpToast(true);
        setTimeout(() => setShowXpToast(false), 3000);

        if (user && profile) {
          try {
            await supabase.from("profiles").update({
              total_xp: (profile.total_xp || 0) + xp,
              coins: (profile.coins || 0) + 15,
            }).eq("id", user.id);
            await refreshProfile();
          } catch {}
        }
      } else throw new Error("Invalid structure");
    } catch {
      const fallback: FeynmanFeedback = {
        strengths: [
          `Good conversational approach to explaining ${targetTopic || "the topic"}.`,
          "Avoiding jargon shows solid comprehension potential.",
        ],
        gaps: [
          { title: "Deeper Mechanism", detail: "Try to include the underlying process or physical cause." },
          { title: "Real-World Example", detail: "Adding a concrete example would strengthen the explanation." },
        ],
        hint: "If you can't explain it simply, you don't understand it well enough. Try once more without any technical terms.",
        clarityScore: 65,
        xpAwarded: 30,
      };
      setFeedback(fallback);
      setXpEarnedToast(30);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
      if (user && profile) {
        try {
          await supabase.from("profiles").update({ total_xp: (profile.total_xp || 0) + 30 }).eq("id", user.id);
          await refreshProfile();
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <SharedSidebar active="/teach-it" />

      {/* XP Toast */}
      {showXpToast && (
        <div className="fixed bottom-10 right-10 bg-black text-white px-5 py-3 border-2 border-white shadow-[4px_4px_0px_#ae2925] z-50 font-bold text-[14px] animate-bounce">
          Analysis complete! +{xpEarnedToast} XP Earned
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>

        {/* Desktop Header — same style as AITutor */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-black/40 uppercase tracking-widest mb-0.5">
                <span>Practice</span>
                <span>/</span>
                <span className="text-black">Teach It</span>
              </div>
              <span className="text-[22px] font-black tracking-tight leading-none">Feynman TeachIt</span>
            </div>
            <div className="w-px h-8 bg-black/20" />
            {activeSource ? (
              <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0]">
                <span className="material-symbols-outlined text-[16px]">description</span>
                <span className="text-[12px] font-bold truncate max-w-[180px]">{activeSource}</span>
                <button onClick={handleClearSource} className="material-symbols-outlined text-[14px] hover:text-[#FF4D2E] transition-colors">close</button>
              </div>
            ) : (
              <button onClick={() => navigate("/sources")}
                className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] hover:bg-[#E2E2E2] text-[12px] font-bold transition-colors">
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                Attach Source
              </button>
            )}
            {/* Confidence badge inline with header */}
            {feedback && (
              <div className="flex items-center gap-1.5 border-2 border-black bg-[#F0EDE0] px-3 py-1 text-[12px] font-bold">
                <span className="material-symbols-outlined text-[14px]">avg_pace</span>
                Clarity: {feedback.clarityScore}/100
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              {profile?.display_name?.charAt(0)?.toUpperCase() ?? "S"}
            </div>
          </div>
        </header>

        {/* Desktop workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Worksheet panel */}
          <div className="flex-1 flex flex-col overflow-hidden border-r-2 border-black">

            {/* Topic input bar */}
            <div className="px-8 py-4 border-b-2 border-black bg-[#FAF7F2] flex items-center gap-4 shrink-0">
              <span className="font-bold text-[12px] uppercase tracking-widest text-black/40 shrink-0">Topic:</span>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="flex-1 bg-white border-2 border-black px-4 py-2 font-bold text-[14px] focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#000]"
                placeholder="e.g. Quantum Entanglement, Mitosis, Integration by Parts..."
              />
              <div className="flex gap-2">
                {["Cell Division", "Osmosis", "Newton's Laws"].map(t => (
                  <button key={t} onClick={() => selectTopicTemplate(t)}
                    className="px-3 py-1.5 border-2 border-black bg-white font-bold text-[11px] hover:bg-[#E2E2E2] transition-colors">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Worksheet */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Worksheet header bar */}
              <div className="border-b-2 border-black px-6 py-3 flex items-center justify-between bg-[#FAF7F2] shrink-0">
                <span className="font-bold text-[11px] uppercase tracking-widest">The Feynman Worksheet</span>
                <div className="flex gap-3">
                  <button className="material-symbols-outlined text-[20px] hover:text-[#FF4D2E] transition-colors cursor-pointer">history</button>
                  <button className="material-symbols-outlined text-[20px] hover:text-[#FF4D2E] transition-colors cursor-pointer">format_paint</button>
                </div>
              </div>

              {/* Textarea */}
              <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                <h3 className="font-bold text-[18px] italic mb-6" style={{ color: "rgba(0,0,0,0.25)" }}>
                  Explain this in your own words, as if teaching a beginner...
                </h3>
                <textarea
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none font-body-lg text-[16px] leading-relaxed placeholder:text-black/20 outline-none"
                  placeholder="Start explaining the concept here. Avoid jargon. Use analogies..."
                  style={{ minHeight: "200px" }}
                />
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-8 py-4 border-t-2 border-black bg-[#FAF7F2] shrink-0">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-black font-bold text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all hover:bg-[#ebe8e3]">
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                  Record Voice
                </button>
                <button className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-black font-bold text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all hover:bg-[#ebe8e3]">
                  <span className="material-symbols-outlined text-[18px]">draw</span>
                  Add Sketch
                </button>
                <span className="text-[12px] font-bold text-black/40 border-l-2 border-black pl-3">
                  {wordCount} words
                </span>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!explanation.trim() || loading}
                className={`flex items-center gap-3 px-10 py-4 bg-[#FF4D2E] text-white border-2 border-black font-black text-[16px] shadow-[5px_5px_0px_#000] transition-all ${
                  explanation.trim() && !loading
                    ? "hover:bg-black cursor-pointer active:translate-y-1 active:shadow-none"
                    : "opacity-50 pointer-events-none"
                }`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                {loading ? "Analyzing..." : "Analyze Explanation"}
              </button>
            </div>
          </div>

          {/* Right: Analysis panel */}
          <aside className="w-[380px] flex flex-col overflow-hidden bg-[#F0EDE0]">
            {/* Panel header */}
            <div className="border-b-2 border-black px-5 py-4 bg-black text-white flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              <span className="font-bold text-[13px] uppercase tracking-widest">Real-Time Analysis</span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              {!feedback && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-3 py-12">
                  <span className="material-symbols-outlined text-[48px]">psychology</span>
                  <p className="font-bold text-[13px]">Submit an explanation to get AI feedback</p>
                </div>
              )}
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
                  <span className="material-symbols-outlined animate-spin text-[#FF4D2E] text-[40px]">autorenew</span>
                  <p className="font-bold text-[13px]">Rex is analyzing your explanation...</p>
                </div>
              )}
              {feedback && (
                <>
                  {/* Strengths */}
                  <section>
                    <h4 className="font-bold text-[10px] uppercase tracking-widest text-black/40 mb-3">Strengths</h4>
                    <div className="flex flex-col gap-2">
                      {feedback.strengths.map((s, i) => (
                        <div key={i} className="bg-white border-2 border-black p-3 shadow-[3px_3px_0px_#000] flex items-start gap-3">
                          <span className="material-symbols-outlined text-green-600 text-[18px] shrink-0">check_circle</span>
                          <p className="font-bold text-[13px] leading-relaxed">{s}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Gaps */}
                  <section>
                    <h4 className="font-bold text-[10px] uppercase tracking-widest text-black/40 mb-3">Knowledge Gaps</h4>
                    <div className="flex flex-col gap-2">
                      {feedback.gaps.map((g, i) => (
                        <div key={i} className="bg-white border-2 border-black border-l-4 border-l-[#FF4D2E] p-3 shadow-[3px_3px_0px_#000] flex items-start gap-3">
                          <span className="material-symbols-outlined text-[#FF4D2E] text-[18px] shrink-0">warning</span>
                          <div>
                            <p className="font-black text-[13px]">{g.title}</p>
                            <p className="font-bold text-[12px] text-black/60 mt-0.5">{g.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Feynman Hint */}
                  <section>
                    <div className="bg-black text-white p-4 border-2 border-black shadow-[3px_3px_0px_#ae2925]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#F5A623] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                        <h4 className="font-bold text-[10px] uppercase tracking-widest">Feynman Hint</h4>
                      </div>
                      <p className="font-bold text-[13px] italic text-white/70 leading-relaxed">"{feedback.hint}"</p>
                    </div>
                  </section>

                  {/* Clarity score */}
                  <section className="pt-2 border-t-2 border-black">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-[12px]">Clarity Score</span>
                      <span className="font-black text-[14px]">{feedback.clarityScore}/100</span>
                    </div>
                    <div className="w-full h-3 bg-[#E8E4DC] border-2 border-black overflow-hidden">
                      <div className="h-full bg-black transition-all duration-700" style={{ width: `${feedback.clarityScore}%` }} />
                    </div>
                  </section>
                </>
              )}
            </div>

            {/* Panel footer */}
            <div className="p-4 border-t-2 border-black flex items-center justify-between shrink-0 bg-[#FAF7F2]">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(n => (
                  <div key={n} className="w-6 h-6 border-2 border-black bg-white flex items-center justify-center text-[10px] font-black">{n}</div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">AI Tutor: Active</span>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>

        {/* Mobile header */}
        <header className="w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-black flex items-center justify-between px-5 h-16 z-10 shrink-0">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] rounded-full cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <span className="font-extrabold text-[18px] flex-1 text-center">Feynman TeachIt</span>
          <button onClick={() => navigate("/sources")}
            className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer hover:bg-[#ebe8e3]">
            <span className="material-symbols-outlined">library_books</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 pb-24">

          {/* Header */}
          <div className="flex flex-col gap-1">
            <h2 className="font-extrabold text-[22px] leading-tight">Teach It (Feynman Learning)</h2>
            <p className="font-semibold text-[14px] text-black/50">
              Master difficult concepts by explaining them simply as if teaching a beginner.
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-4 w-full border-b-2 border-black/20 pb-2.5">
            <button className="relative pb-2 flex-1 flex justify-center text-black font-extrabold text-[14px] border-b-2 border-black -mb-[2px]">
              Feynman Technique
            </button>
            <button onClick={() => navigate("/practice")}
              className="relative pb-2 flex-1 flex justify-center text-black/40 font-bold text-[14px] cursor-pointer">
              Practice Recall
            </button>
          </div>

          {/* Topic input */}
          <div className="flex flex-col gap-2.5">
            <label className="font-bold text-[13.5px]">Topic to Explain</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 font-bold text-[14.5px] placeholder:text-black/30 focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#000]"
              placeholder="e.g. Action Potentials, Mitosis..."
            />
            <div className="flex flex-wrap gap-2.5 mt-1 items-center">
              {["Cell Division", "Osmosis"].map(t => (
                <button key={t} onClick={() => selectTopicTemplate(t)}
                  className="bg-white border-2 border-black rounded-full px-4 py-1 font-bold text-[12px] hover:bg-[#ebe8e3] cursor-pointer">
                  {t}
                </button>
              ))}
              <button onClick={() => navigate("/sources")}
                className="bg-[#ffb4ab] border-2 border-black rounded-full px-4 py-1 text-black flex items-center gap-1 font-bold text-[12.5px] cursor-pointer shadow-[2px_2px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-[14px]">attachment</span>
                Source Library
              </button>
            </div>
          </div>

          {/* Explanation canvas */}
          <div className="flex flex-col gap-2.5 flex-1 min-h-[220px]">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[13.5px]">Your Explanation</label>
              <span className="bg-white px-3.5 py-0.5 border-2 border-black font-bold text-[11px] shadow-[1px_1px_rgba(0,0,0,1)] text-[#E8534A]">
                {wordCount} words
              </span>
            </div>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              className="w-full flex-grow min-h-[160px] bg-white border-2 border-black rounded-[18px] p-5 font-body-lg text-[14.5px] placeholder:text-black/30 focus:outline-none focus:ring-0 resize-none shadow-[3.5px_3.5px_rgba(0,0,0,1)]"
              placeholder="Explain this concept simply, using analogies or conversational language..."
            />
          </div>

          {/* Submit button */}
          <button
            disabled={!explanation.trim() || loading}
            onClick={handleAnalyze}
            className={`w-full bg-black text-white border-2 border-black rounded-xl py-4 font-extrabold shadow-[4px_4px_rgba(0,0,0,1)] flex justify-center items-center gap-1.5 text-[15.5px] ${
              explanation.trim() && !loading ? "cursor-pointer active:translate-y-0.5 active:shadow-none" : "opacity-50 pointer-events-none"
            }`}>
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            {loading ? "AI Evaluation active..." : "Submit to AI Critic"}
          </button>

          {/* Feedback */}
          {feedback && (
            <div className="flex flex-col gap-5 mt-2">
              <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
                <h3 className="font-extrabold text-[17.5px]">Feynman Criticism</h3>
                <span className="bg-green-600 text-white font-bold text-xs border border-black px-2.5 py-1 shadow-sm">
                  +{feedback.xpAwarded} XP Earned
                </span>
              </div>

              {/* Strengths */}
              <div className="bg-green-50 border-2 border-black rounded-[18px] p-5 flex flex-col gap-3 shadow-[2px_2px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="uppercase tracking-wide text-[12px] font-extrabold">Explanatory Strengths</span>
                </div>
                {feedback.strengths.map((s, i) => (
                  <p key={i} className="font-bold text-[14px] text-black/70 leading-relaxed">{s}</p>
                ))}
              </div>

              {/* Gaps */}
              <div className="bg-red-50 border-2 border-black rounded-[18px] p-5 flex flex-col gap-3 shadow-[2px_2px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                  <span className="uppercase tracking-wide text-[12px] font-extrabold">Conceptual Gaps</span>
                </div>
                {feedback.gaps.map((g, i) => (
                  <div key={i}>
                    <p className="font-black text-[14px]">{g.title}</p>
                    <p className="font-bold text-[13px] text-black/50 mt-0.5">{g.detail}</p>
                  </div>
                ))}
              </div>

              {/* Hint */}
              <div className="bg-white border-2 border-black rounded-[18px] p-5 flex flex-col gap-2 shadow-[2px_2px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black/60 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  <span className="uppercase tracking-wide text-[12px] font-extrabold">Feynman Hint</span>
                </div>
                <p className="font-bold text-[14px] text-black/70 leading-relaxed italic">"{feedback.hint}"</p>
              </div>

              {/* Clarity score — also on mobile now */}
              <div className="flex flex-col gap-2 p-4 bg-white border-2 border-black shadow-[2px_2px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[13px]">Clarity Score</span>
                  <span className="font-black text-[15px]">{feedback.clarityScore}/100</span>
                </div>
                <div className="w-full h-3 bg-[#E8E4DC] border-2 border-black overflow-hidden">
                  <div className="h-full bg-black transition-all duration-700" style={{ width: `${feedback.clarityScore}%` }} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
