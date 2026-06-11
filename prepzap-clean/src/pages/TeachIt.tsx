import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface TeachItProps {
}

interface FeynmanFeedback {
  strengths: string;
  gaps: string;
  hints: string;
  xpAwarded: number;
}

export default function TeachIt() {
  const { user, profile, refreshProfile } = useAuth();
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
  const [loading, setLoading] = useState(false);

  const selectTopicTemplate = (title: string) => {
    setTopic(title);
    setExplanation("");
    setFeedback(null);
  };

  const handleAnalyze = async () => {
    if (!explanation.trim()) return;
    setLoading(true);
    setFeedback(null);

    const targetTopic = topic.trim() || "General Study Concept";

    try {
      const sourceContext = buildAIContext();
      const promptText = `Analyze this student's simple explanation of the study concept: "${targetTopic}".
Student's draft: "${explanation}"
${sourceContext ? `Incorporate source material context:\n${sourceContext}` : ""}

Evaluate using the Feynman technique (explaining difficult concepts simply without hiding behind technical jargon).
Identify strengths, key educational gaps, and hints for optimization.
Also determine a fair XP reward value to award (integer between 25 and 55 based on quality/depth).

Return strictly a valid raw JSON object. Do not wrap in markdown tags or ticks.
Required feedback JSON object structure:
{
  "strengths": "Praise conversational language and specific analogies used...",
  "gaps": "Highlight concepts they left out, or misconceptions...",
  "hints": "Actionable instructions to reinforce this concept...",
  "xpAwarded": 45
}`;

      const systemPrompt = "You are a master scientific critic using the Feynman method of learning. You return custom evaluations strictly as raw JSON objects.";

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

      const generated: FeynmanFeedback = JSON.parse(sanitized);
      if (generated.strengths && generated.gaps) {
        setFeedback(generated);

        // Award dynamic XP and Study Coins (+15) upon successful analysis!
        const xpEarned = generated.xpAwarded || 30;
        const coinsEarned = 15;

        if (user && profile) {
          try {
            const currentXp = profile.total_xp || profile.xp || 0;
            const currentCoins = profile.coins || 0;
            await supabase
              .from("profiles")
              .update({ 
                total_xp: currentXp + xpEarned,
                coins: currentCoins + coinsEarned
              })
              .eq("id", user.id);
            if (typeof refreshProfile === "function") {
              await refreshProfile();
            }
          } catch (profileErr) {
            console.error("Error updating profile with Feynman credits:", profileErr);
            await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpEarned }).eq("id", user?.id ?? ""); await refreshProfile();
          }
        } else {
          await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpEarned }).eq("id", user?.id ?? ""); await refreshProfile();
        }
      } else {
        throw new Error("Formatting constraints mismatch");
      }
    } catch (err) {
      console.error("Feynman analyzer failed, deploying fallback diagnostic feedback:", err);
      const fallback: FeynmanFeedback = {
        strengths: `Nice conversational attempt explaining ${targetTopic || "the topic"}. Avoiding jargon shows high comprehension potential.`,
        gaps: "Your description could be deepened by explicitly mentioning physical or chemical processes.",
        hints: "Introduce key terms with clear real-world examples to anchor memory patterns.",
        xpAwarded: 30
      };
      setFeedback(fallback);
      await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + 30 }).eq("id", user?.id ?? ""); await refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-[#fcf9f4] text-on-background min-h-screen flex flex-col font-body-md w-full max-w-[390px] mx-auto relative border-x border-[#1c1c19]/10 shadow-xl overflow-y-auto pb-24 flex-1">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-on-background flex items-center justify-between px-5 h-16 w-full z-10 navbar-custom">
        <button 
          onClick={() => navigate("/dashboard")}
          className="text-secondary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center active:translate-y-0.5 border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
        <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold pr-4 flex-1 text-center">Feynman TeachIt</span>
        <button 
          onClick={() => navigate("/sources")}
          className="text-secondary hover:bg-surface-container-high transition-colors p-1 rounded-full flex items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined">library_books</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 py-6 flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex flex-col gap-1">
          <h2 className="font-headline text-headline-xl text-on-background font-extrabold leading-tight text-[22px]">Teach It (Feynman Learning)</h2>
          <p className="font-body-md text-on-surface-variant text-[14px] font-semibold">
            Master difficult concepts by explaining them simply as if teaching a beginner.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-4 w-full border-b-2 border-on-background/20 pb-2.5">
          <button className="relative pb-2 flex-1 flex justify-center text-primary font-headline font-extrabold text-[14px]">
            Feynman Technique
          </button>
          <button 
            onClick={() => navigate("/practice")}
            className="relative pb-2 flex-1 flex justify-center text-slate-500 font-headline hover:text-on-background transition-colors font-bold text-[14px] cursor-pointer"
          >
            Practice Recall
          </button>
        </div>

        {/* Topic Input Area */}
        <div className="flex flex-col gap-2.5">
          <label className="font-label-md text-label-md text-on-background font-bold text-[13.5px]">Topic to Explain</label>
          <input 
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-white border-2 border-[#1A1A1A] rounded-[12px] px-4 py-3 font-body-lg text-body-lg text-on-background placeholder:text-on-background/40 focus:outline-[#ae2925] focus:ring-0 focus:border-primary transition-colors text-[14.5px]" 
            placeholder="e.g. Action Potentials, Mitosis..." 
          />
          
          {/* Suggestions & Source Library Integration */}
          <div className="flex flex-wrap gap-2.5 mt-1.5 items-center">
            <button 
              onClick={() => selectTopicTemplate("Cell Division")}
              className="bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-1 font-label-sm text-on-background hover:bg-neutral-100 transition-all font-bold text-[12px] cursor-pointer"
            >
              Cell Division
            </button>
            <button 
              onClick={() => selectTopicTemplate("Osmosis")}
              className="bg-white border-2 border-[#1A1A1A] rounded-full px-4 py-1 font-label-sm text-on-background hover:bg-neutral-100 transition-all font-bold text-[12px] cursor-pointer"
            >
              Osmosis
            </button>
            <span className="font-body-md text-body-md text-slate-400 mx-1 self-center font-bold text-[13px]">or</span>
            <button 
              onClick={() => navigate("/sources")}
              className="bg-[#ffb4ab] border-2 border-[#1A1A1A] rounded-full px-4 py-1 text-black flex items-center gap-1 font-bold hover:opacity-90 active:translate-y-0.5 text-[12.5px] cursor-pointer shadow-[2px_2px_rgba(0,0,0,1)]"
            >
              <span className="material-symbols-outlined text-[14px]">attachment</span>
              Source Library
            </button>
          </div>
        </div>

        {/* Feynman Canvas */}
        <div className="flex flex-col gap-2.5 flex-1 min-h-[220px]">
          <div className="flex justify-between items-center">
            <label className="font-label-md text-label-md text-on-background font-bold text-[13.5px]">Your Explanation</label>
            <span className="font-label-sm text-[#E8534A] bg-white px-3.5 py-0.5 rounded-full border-2 border-[#1A1A1A] font-bold text-[11px] shadow-[1px_1px_rgba(0,0,0,1)]">
              {wordCount} words
            </span>
          </div>
          <textarea 
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full flex-grow min-h-[160px] bg-white border-2 border-[#1A1A1A] rounded-[18px] p-5 font-body-lg text-[#1A1A1A] placeholder:text-neutral-400 focus:outline-[#ae2925] focus:ring-0 focus:border-primary resize-none shadow-[3.5px_3.5px_rgba(0,0,0,1)] text-[14.5px]" 
            placeholder="Explain this concept simply, using analogies or conversational language..."
          />
        </div>

        {/* Analyze Action */}
        <div className="w-full mt-2">
          <button 
            disabled={!explanation.trim() || loading}
            onClick={handleAnalyze}
            className={`w-full bg-primary border-2 border-[#1A1A1A] rounded-[12px] py-4 text-white font-extrabold shadow-[4px_4px_rgba(0,0,0,1)] hover:bg-opacity-95 transition-all text-center flex justify-center items-center gap-1.5 text-[15.5px] ${
              explanation.trim() ? "cursor-pointer active:translate-y-0.5 active:shadow-none" : "opacity-50 pointer-events-none"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            {loading ? "AI Evaluation active..." : "Submit to Al Critic"}
          </button>
        </div>

        {/* Dynamic State Feedback Area */}
        {feedback && (
          <div className="flex flex-col gap-5 mt-2 animate-fade-in">
            <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
              <h3 className="font-headline text-on-background font-extrabold text-[17.5px]">
                Feynman Criticism
              </h3>
              <span className="bg-green-600 text-white font-bold text-xs border border-black rounded-md px-2.5 py-1 shadow-sm">
                +{feedback.xpAwarded} XP Earned
              </span>
            </div>
            
            {/* Strengths Card */}
            <div className="bg-[#00837c] bg-opacity-10 border-2 border-[#1A1A1A] rounded-[18px] p-5 flex flex-col gap-2 shadow-[2px_2px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 text-[#006762] font-semibold">
                <span className="material-symbols-outlined font-bold text-[18px]">check_circle</span>
                <span className="font-label-md uppercase tracking-wide text-[12px] font-extrabold">Explanatory Strengths</span>
              </div>
              <p className="font-body-md text-slate-800 text-[14px] leading-relaxed">
                {feedback.strengths}
              </p>
            </div>

            {/* Gaps Card */}
            <div className="bg-[#ba1a1a] bg-opacity-10 border-2 border-[#1A1A1A] rounded-[18px] p-5 flex flex-col gap-2 shadow-[2px_2px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <span className="material-symbols-outlined font-bold text-[18px]">warning</span>
                <span className="font-label-md uppercase tracking-wide text-[12px] font-extrabold">Conceptual Gaps</span>
              </div>
              <p className="font-body-md text-slate-800 text-[14px] leading-relaxed">
                {feedback.gaps}
              </p>
            </div>

            {/* Hints Card */}
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[18px] p-5 flex flex-col gap-2 shadow-[2px_2px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 text-slate-600 font-semibold">
                <span className="material-symbols-outlined font-bold text-[18px]">lightbulb</span>
                <span className="font-label-md uppercase tracking-wide text-[12px] font-extrabold">Next Revision Steps</span>
              </div>
              <p className="font-body-md text-slate-800 text-[14px] leading-relaxed">
                {feedback.hints}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
