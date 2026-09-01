import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource, saveContext, onSourceChange } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";
import { useToolHistory } from "@/pages/ToolHistory";

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
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const { logSession } = useStudySession();
  const { save: saveHistory, history: teachHistory } = useToolHistory("teach-it");
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(() => getActiveSource()?.name ?? null);
  const [topic, setTopic] = useState(() => localStorage.getItem("pz_teachit_draft_topic") || "");
  const [explanation, setExplanation] = useState(() => localStorage.getItem("pz_teachit_draft_explanation") || "");
  // FIX BUG 5: messages array for conversation history
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(() => {
    try {
      const saved = localStorage.getItem("pz_teachit_feedback");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    try {
      if (feedback) localStorage.setItem("pz_teachit_feedback", JSON.stringify(feedback));
      else localStorage.removeItem("pz_teachit_feedback");
    } catch {}
  }, [feedback]);
  const [loading, setLoading] = useState(false);
  const [showXpToast, setShowXpToast] = useState(false);
  const [xpEarnedToast, setXpEarnedToast] = useState(0);

  // FIX BUG 4: initialize remainingUses as null to avoid flicker
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    remaining("teach_it").then(setRemainingUses).catch((err) => {
      console.error("[TeachIt] failed to load remaining uses:", err);
    });
  }, [remaining]);

  useEffect(() => {
    localStorage.setItem("pz_teachit_draft_topic", topic);
  }, [topic]);

  useEffect(() => {
    localStorage.setItem("pz_teachit_draft_explanation", explanation);
  }, [explanation]);

  // FIX: activeSource was only ever read once at mount, so attaching a
  // source on /sources and coming back here never showed it — the chip
  // stayed on "no source" until a full page reload. Now re-syncs whenever
  // the source changes or the tab regains focus, same fix as QuickStudy.tsx.
  useEffect(() => {
    const sync = () => setActiveSource(getActiveSource()?.name ?? null);
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => {
      unsub();
      window.removeEventListener("focus", sync);
    };
  }, []);

  const selectTopicTemplate = (title: string) => {
    setTopic(title);
    setExplanation("");
    setFeedback(null);
    setMessages([]);
  };

  const handleClearSource = () => {
    setActiveSource(null);
    saveContext({ mode: "none", selectedIds: [] });
  };

  // Same pattern as AITutor's mic fix - browser-native SpeechRecognition,
  // no backend needed. Appends to whatever's already in the explanation box
  // rather than replacing it, since students often pause mid-explanation.
  const handleMicClick = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setGenError("Voice input isn't supported in this browser. Try Chrome or Edge, or just type your explanation.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setExplanation((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      }
    };
    recognition.onerror = (event: any) => {
      console.error("[TeachIt] speech recognition error:", event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    return () => { recognitionRef.current?.stop?.(); };
  }, []);

  const handleAnalyze = async () => {
    if (!explanation.trim()) return;
    setGenError(null);

    // Freemium gate
    if (!isPro) {
      try {
        const allowed = await canUse("teach_it");
        if (!allowed) {
          setShowUpgrade(true);
          return;
        }
      } catch (err) {
        console.error("[TeachIt] canUse check failed:", err);
        setGenError("Couldn't verify your plan status just now — please try again in a moment.");
        return;
      }
    }

    setLoading(true);
    setFeedback(null);
    const targetTopic = topic.trim() || "General Study Concept";

    // FIX BUG 5: build full conversation history for chat memory
    const newUserMessage = { role: "user" as const, text: explanation };
    const updatedMessages = [...messages, newUserMessage];

    let result: FeynmanFeedback | null = null;

    try {
      const sourceContext = buildAIContext();
      const promptText = `Analyze this student's simple explanation of "${targetTopic}".\nStudent draft: "${explanation}"\n${sourceContext ? `Source context:\n${sourceContext}` : ""}\n\nEvaluate using the Feynman technique. Return ONLY a raw JSON object with NO markdown:\n{\n  "strengths": ["strength 1", "strength 2"],\n  "gaps": [{"title": "Gap Name", "detail": "Why it matters"}],\n  "hint": "A Feynman-style hint to deepen understanding",\n  "clarityScore": 82,\n  "xpAwarded": 45\n}`;

      const systemPrompt = "You are a master Feynman technique evaluator. Return only raw JSON. No markdown.";

      // FIX BUG 2+5: call callGroq with full conversation history and feature key
      const conversationMessages = [
        ...updatedMessages.map(m => ({
          role: m.role,
          content: m.text,
        })),
      ];
      // Replace last user message with the structured prompt
      conversationMessages[conversationMessages.length - 1] = { role: "user", content: promptText };

      const aiResponse = await callGroq(
        conversationMessages,
        systemPrompt,
        "openai/gpt-oss-20b",
        1024,
        "teach_it"
      );

      const sanitized = aiResponse.trim().replace(/^```(json)?/, "").replace(/```$/, "").trim();
      const generated: FeynmanFeedback = JSON.parse(sanitized);

      if (generated.strengths && generated.gaps) {
        result = generated;
        const xp = generated.xpAwarded || 30;
        setXpEarnedToast(xp);
        setShowXpToast(true);
        setTimeout(() => setShowXpToast(false), 3000);

        if (user && profile) {
          // FIX: `coins` isn't a real column on profiles — bundling it into
          // this update meant Postgres rejected the WHOLE request (invalid
          // column), so total_xp never updated either, silently, since the
          // error was never checked (just an empty catch block).
          const { error: xpError } = await supabase
            .from("profiles")
            .update({ total_xp: (profile.total_xp || 0) + xp })
            .eq("id", user.id);
          if (xpError) console.error("Error awarding XP:", xpError);
          await refreshProfile();

          // FIX: Teach It never logged to study_sessions or updated the
          // streak at all — invisible to Dashboard/Analytics/Streak. Now
          // uses the same shared hook as Math Solver and Quick Study.
          await logSession({ title: targetTopic, durationMinutes: 6 });
        }
      } else {
        throw new Error("Invalid structure");
      }
    } catch (err) {
      console.error("[TeachIt] AI analysis failed, using fallback:", err);
      result = {
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
      setXpEarnedToast(30);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
      if (user && profile) {
        const { error: xpError } = await supabase
          .from("profiles")
          .update({ total_xp: (profile.total_xp || 0) + 30 })
          .eq("id", user.id);
        if (xpError) console.error("Error awarding XP:", xpError);
        await refreshProfile();
        await logSession({ title: targetTopic, durationMinutes: 6 });
      }
    }

    // FIX BUG 3: always log usage after generation (success or fallback)
    if (!isPro) {
      try { await logUsage("teach_it"); } catch {}
      remaining("teach_it").then(setRemainingUses).catch((err) => {
        console.error("[TeachIt] failed to refresh remaining uses:", err);
      });
    }

    if (result) {
      setFeedback(result);
      // Store conversation turn
      setMessages([...updatedMessages, { role: "assistant", text: JSON.stringify(result) }]);
      saveHistory({
        prompt: explanation,
        preview: result.hint || result.strengths[0] || "",
        output: JSON.stringify(result),
        model: "rex-ai",
        meta: targetTopic,
      });
    }

    setLoading(false);
  };

  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {showUpgrade && (
        <UpgradePrompt
          feature="teach_it"
          remaining={remainingUses ?? 0}
          onClose={() => setShowUpgrade(false)}
        />
      )}

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
      <div className="hidden md:flex md:ml-64 flex-col flex-1 overflow-hidden">

        {/* Desktop Header */}
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
                <button
                  onClick={handleClearSource}
                  className="material-symbols-outlined text-[14px] hover:text-[#FF4D2E] transition-colors">
                  close
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/sources")}
                className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] hover:bg-[#E2E2E2] text-[12px] font-bold transition-colors">
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                Attach Source
              </button>
            )}
            {feedback && (
              <div className="flex items-center gap-1.5 border-2 border-black bg-[#F0EDE0] px-3 py-1 text-[12px] font-bold">
                <span className="material-symbols-outlined text-[14px]">avg_pace</span>
                Clarity: {feedback.clarityScore}/100
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            

            <div
              onClick={() => navigate("/profile")}
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
                  <button
                    key={t}
                    onClick={() => selectTopicTemplate(t)}
                    className="px-3 py-1.5 border-2 border-black bg-white font-bold text-[11px] hover:bg-[#E2E2E2] transition-colors cursor-pointer">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Worksheet */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="border-b-2 border-black px-6 py-3 flex items-center justify-between bg-[#FAF7F2] shrink-0 relative">
                <span className="font-bold text-[11px] uppercase tracking-widest">The Feynman Worksheet</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowHistoryDropdown((v) => !v)}
                    title="View past explanations"
                    className={`material-symbols-outlined text-[20px] transition-colors ${showHistoryDropdown ? "text-[#FF4D2E]" : "text-black/50 hover:text-black"}`}>
                    history
                  </button>
                  <button title="Format (coming soon)" className="material-symbols-outlined text-[20px] text-black/30 cursor-not-allowed">format_paint</button>
                </div>
                {showHistoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowHistoryDropdown(false)} />
                    <div className="absolute top-full right-6 mt-1 w-80 max-h-96 overflow-y-auto bg-white border-2 border-black shadow-[4px_4px_0px_#000] z-30">
                    <div className="px-4 py-2 border-b-2 border-black bg-[#F0EDE0]">
                      <h4 className="text-[11px] font-black uppercase tracking-widest">Past Explanations</h4>
                    </div>
                    {!teachHistory || (teachHistory as any[]).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center opacity-40">
                        <span className="material-symbols-outlined text-[28px]">auto_stories</span>
                        <p className="text-[11px] font-bold px-4">Your past explanations will appear here</p>
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-black/10">
                        {(teachHistory as any[]).slice(0, 8).map((entry: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setTopic(entry.meta || "");
                              setExplanation(entry.prompt || "");
                              setFeedback(null);
                              setShowHistoryDropdown(false);
                            }}
                            className="flex items-start gap-2 px-4 py-3 hover:bg-[#FAF7F2] text-left w-full"
                          >
                            <span className="material-symbols-outlined text-[16px] text-black/30 shrink-0 mt-0.5">history_edu</span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-black truncate">{entry.meta || "Study Concept"}</p>
                              <p className="text-[11px] font-bold text-black/40 truncate">{entry.preview || entry.prompt || ""}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  </>
                )}
              </div>

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
                <button onClick={handleMicClick} title={isRecording ? "Stop recording" : "Record voice"} className={`flex items-center gap-2 px-5 py-3 bg-white border-2 border-black font-bold text-[13px] shadow-[3px_3px_0px_#000] transition-colors ${isRecording ? "text-[#ae2925]" : ""}`}>
                  <span className={`material-symbols-outlined text-[18px] ${isRecording ? "animate-pulse" : ""}`}>{isRecording ? "stop_circle" : "mic"}</span>
                  {isRecording ? "Listening..." : "Record Voice"}
                </button>
                <button disabled title="Sketch coming soon" className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-black font-bold text-[13px] shadow-[3px_3px_0px_#000] opacity-40 cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">draw</span>
                  Add Sketch
                </button>
                <span className="text-[12px] font-bold text-black/40 border-l-2 border-black pl-3">
                  {wordCount} words
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
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
                {/* FIX BUG 4: guard remainingUses !== null */}
                {!isPro && remainingUses !== null && remainingUses <= 4 && remainingUses > 0 && (
                  <div className="flex flex-col items-end gap-1 mt-1">
                    <p className="text-[12px] text-black/50 font-bold">
                      {remainingUses} session{remainingUses !== 1 ? "s" : ""} left today
                    </p>
                    {remainingUses <= 2 && <SoftWarning feature="teach_it" remaining={remainingUses} />}
                  </div>
                )}
                {genError && (
                  <p className="text-[12px] font-bold text-[#ae2925] mt-1 text-right">{genError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Analysis panel */}
          <aside className="w-[380px] flex flex-col overflow-hidden bg-[#F0EDE0]">
            <div className="border-b-2 border-black px-5 py-4 bg-black text-white flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              <span className="font-bold text-[13px] uppercase tracking-widest">Real-Time Analysis</span>
            </div>

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

                  <section>
                    <div className="bg-black text-white p-4 border-2 border-black shadow-[3px_3px_0px_#ae2925]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#F5A623] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                        <h4 className="font-bold text-[10px] uppercase tracking-widest">Feynman Hint</h4>
                      </div>
                      <p className="font-bold text-[13px] italic text-white/70 leading-relaxed">"{feedback.hint}"</p>
                    </div>
                  </section>

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
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2] flex-1 overflow-hidden">

        <header className="w-full bg-[#FAF7F2] border-b-2 border-black flex items-center justify-between px-5 h-16 z-10 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] rounded-full cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <span className="font-extrabold text-[18px] flex-1 text-center">Feynman TeachIt</span>
          <button
            onClick={() => navigate("/sources")}
            className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer hover:bg-[#ebe8e3]">
            <span className="material-symbols-outlined">library_books</span>
          </button>
        </header>

        {/* FIX BUG 7: pb-28 ensures content isn't hidden behind fixed bottom bar */}
        <main className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-6 pb-28">

          <div className="flex flex-col gap-1">
            <h2 className="font-extrabold text-[22px] leading-tight">Teach It (Feynman Learning)</h2>
            <p className="font-semibold text-[14px] text-black/50">
              Master difficult concepts by explaining them simply as if teaching a beginner.
            </p>
          </div>

          <div className="flex gap-4 w-full border-b-2 border-black/20 pb-2.5">
            <button className="relative pb-2 flex-1 flex justify-center text-black font-extrabold text-[14px] border-b-2 border-black -mb-[2px]">
              Feynman Technique
            </button>
            <button
              onClick={() => navigate("/practice")}
              className="relative pb-2 flex-1 flex justify-center text-black/40 font-bold text-[14px] cursor-pointer">
              Practice Recall
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeSource ? (
              <div className="flex items-center gap-2 bg-[#F0EDE0] border-2 border-black rounded-full px-3 py-1.5 flex-1 min-w-0">
                <span className="material-symbols-outlined text-[14px]">description</span>
                <span className="text-[11px] font-bold truncate">{activeSource}</span>
                <button onClick={handleClearSource} className="material-symbols-outlined text-[13px] hover:text-[#FF4D2E] shrink-0">close</button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/sources")}
                className="flex items-center gap-2 bg-white border-2 border-dashed border-black/30 rounded-full px-3 py-1.5 text-[11px] font-bold text-black/40 hover:border-black hover:text-black transition-all flex-1">
                <span className="material-symbols-outlined text-[14px]">attach_file</span>
                Attach Source
              </button>
            )}
            <div className="flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 shadow-[2px_2px_0px_#000] shrink-0">
              <span className="material-symbols-outlined text-[14px]">avg_pace</span>
              <span className="text-[11px] font-black">{feedback ? `${feedback.clarityScore}/100` : "—"}</span>
            </div>
          </div>

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
                <button
                  key={t}
                  onClick={() => selectTopicTemplate(t)}
                  className="bg-white border-2 border-black rounded-full px-4 py-1 font-bold text-[12px] hover:bg-[#ebe8e3] cursor-pointer">
                  {t}
                </button>
              ))}
              <button
                onClick={() => navigate("/sources")}
                className="bg-[#ffb4ab] border-2 border-black rounded-full px-4 py-1 text-black flex items-center gap-1 font-bold text-[12.5px] cursor-pointer shadow-[2px_2px_rgba(0,0,0,1)]">
                <span className="material-symbols-outlined text-[14px]">attachment</span>
                Source Library
              </button>
            </div>
          </div>

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

          {feedback && (
            <div className="flex flex-col gap-5 mt-2">
              <div className="flex justify-between items-center border-b-2 border-black pb-1.5">
                <h3 className="font-extrabold text-[17.5px]">Feynman Criticism</h3>
                <span className="bg-green-600 text-white font-bold text-xs border border-black px-2.5 py-1 shadow-sm">
                  +{feedback.xpAwarded} XP Earned
                </span>
              </div>

              <div className="bg-green-50 border-2 border-black rounded-[18px] p-5 flex flex-col gap-3 shadow-[2px_2px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span className="uppercase tracking-wide text-[12px] font-extrabold">Explanatory Strengths</span>
                </div>
                {feedback.strengths.map((s, i) => (
                  <p key={i} className="font-bold text-[14px] text-black/70 leading-relaxed">{s}</p>
                ))}
              </div>

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

              <div className="bg-white border-2 border-black rounded-[18px] p-5 flex flex-col gap-2 shadow-[2px_2px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 text-black/60 font-semibold">
                  <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                  <span className="uppercase tracking-wide text-[12px] font-extrabold">Feynman Hint</span>
                </div>
                <p className="font-bold text-[14px] text-black/70 leading-relaxed italic">"{feedback.hint}"</p>
              </div>

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

          {!feedback && topic.length === 0 && (
            <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000]">
              <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-black bg-[#FAF7F2]">
                <span className="material-symbols-outlined text-[18px]">history_edu</span>
                <h3 className="text-[13px] font-extrabold">Past Explanations</h3>
              </div>
              {!teachHistory || (teachHistory as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center opacity-40">
                  <span className="material-symbols-outlined text-[32px]">auto_stories</span>
                  <p className="text-[12px] font-bold">Your past explanations will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-black/10">
                  {(teachHistory as any[]).slice(0, 6).map((entry: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        setTopic(entry.meta || "");
                        setExplanation(entry.prompt || "");
                        setFeedback(null);
                      }}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAF7F2] text-left w-full"
                    >
                      <span className="material-symbols-outlined text-[18px] text-black/30 shrink-0 mt-0.5">history_edu</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-black truncate">{entry.meta || "Study Concept"}</p>
                        <p className="text-[11px] font-bold text-black/40 truncate">{entry.preview || entry.prompt || ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {genError && (
            <p className="text-[12px] font-bold text-[#ae2925]">{genError}</p>
          )}

        </main>

        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-[#FAF7F2] border-t-2 border-black z-20 md:hidden pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            <button onClick={handleMicClick} title={isRecording ? "Stop recording" : "Record voice"} className={`flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-black font-bold text-[12px] shadow-[2px_2px_0px_#000] transition-colors ${isRecording ? "text-[#ae2925]" : ""}`}>
              <span className={`material-symbols-outlined text-[16px] ${isRecording ? "animate-pulse" : ""}`}>{isRecording ? "stop_circle" : "mic"}</span>
              {isRecording ? "Listening..." : "Record Voice"}
            </button>
            <button disabled title="Sketch coming soon" className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-black font-bold text-[12px] shadow-[2px_2px_0px_#000] opacity-40 cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">draw</span>
              Add Sketch
            </button>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!explanation.trim() || loading}
            className={`flex items-center gap-2 px-5 py-2.5 bg-[#FF4D2E] text-white border-2 border-black font-black text-[13px] shadow-[3px_3px_0px_#000] transition-all ${
              explanation.trim() && !loading
                ? "cursor-pointer active:translate-y-0.5 active:shadow-none"
                : "opacity-50 pointer-events-none"
            }`}>
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            {loading ? "Analyzing..." : "Analyze Explanation"}
          </button>
        </div>

      </div>

    </div>
  );
}
