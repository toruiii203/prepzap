import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { buildAIContext, getActiveSource, onSourceChange } from "@/lib/sourceContext";
import { shareToStudyVault } from "@/lib/shareToVault";
import { fireConfetti } from "@/lib/confetti";
import { playSuccess, playTap, playCelebration, playIncorrect } from "@/lib/soundFX";
import { AnimatedRex } from "@/components/AnimatedRex";
import UpgradePrompt from "@/components/UpgradePrompt";

interface CramTopic {
  topic: string;
  keyPoints: string[];
  timeMinutes: number;
}

type Phase = "setup" | "session" | "done";

export default function CramMode() {
  const navigate = useNavigate();
  const { isPro, canUse, logUsage } = usePlan();
  const { logSession } = useStudySession();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [subject, setSubject] = useState("");
  const [hoursAvailable, setHoursAvailable] = useState("1");
  const [loading, setLoading] = useState(false);
  const [vaultShared, setVaultShared] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [topics, setTopics] = useState<CramTopic[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<any>(null);

  const [ctx, setCtx] = useState(() => buildAIContext());
  const [activeSource, setActiveSourceState] = useState(() => getActiveSource());
  const hasSource = ctx.length > 0;

  useEffect(() => {
    const sync = () => {
      setCtx(buildAIContext());
      setActiveSourceState(getActiveSource());
    };
    sync();
    const unsub = onSourceChange(sync);
    window.addEventListener("focus", sync);
    return () => {
      unsub();
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pz_cram_last");
      if (saved) {
        const { subject: s } = JSON.parse(saved);
        if (s) setSubject(s);
      }
    } catch {}
  }, []);

  const startTopicTimer = (minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(minutes * 60);
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          playSuccess();
          return 0;
        }
        setTotalUsed((u) => u + 1);
        return t - 1;
      });
    }, 1000);
  };

  const togglePauseTimer = () => {
    if (isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            playSuccess();
            return 0;
          }
          setTotalUsed((u) => u + 1);
          return t - 1;
        });
      }, 1000);
      setIsPaused(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    setErrorMsg(null);
    if (!isPro) {
      try {
        const allowed = await canUse("cram");
        if (!allowed) {
          setShowUpgrade(true);
          return;
        }
      } catch (err) {
        console.warn("[CramMode] canUse failed:", err);
      }
    }

    const effectiveSubject = subject.trim() || activeSource?.name?.replace(/\.\w+$/, "") || "";
    if (!effectiveSubject && !hasSource) {
      setErrorMsg("Please enter a subject or attach study notes first.");
      return;
    }

    setLoading(true);
    playTap();

    try {
      const totalMins = Math.round(parseFloat(hoursAvailable) * 60);
      const prompt = `Create a high-yield emergency cram schedule for: "${effectiveSubject}".
Total available cram time: ${totalMins} minutes.
${ctx ? `Source material context to cover:\n${ctx.slice(0, 3000)}\n` : ""}

Return strictly a valid JSON array of objects with keys "topic", "keyPoints" (array of exactly 3 concise bullet strings), and "timeMinutes" (number). Total timeMinutes across all topics must equal approximately ${totalMins}.
Example format:
[
  {"topic": "Core Definitions & Nomenclature", "keyPoints": ["Key point 1", "Key point 2", "Key point 3"], "timeMinutes": 15},
  {"topic": "Primary Mechanism & Reactions", "keyPoints": ["...", "...", "..."], "timeMinutes": 20}
]`;

      const raw = await callGroq(
        [{ role: "user", content: prompt }],
        "You are an expert tutor creating structured emergency cram sessions strictly in raw JSON format.",
        undefined,
        1400,
        "cram"
      );

      const parsed = safeParseJSON<CramTopic[]>(raw);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        setTopics(parsed);
        setCurrentIdx(0);
        setCompleted([]);
        setTotalUsed(0);
        startTopicTimer(parsed[0].timeMinutes);
        setPhase("session");

        logSession({ title: "Cram Session: " + effectiveSubject, durationMinutes: totalMins });
        try {
          await logUsage("cram");
        } catch {}
        localStorage.setItem(
          "pz_cram_last",
          JSON.stringify({ subject: effectiveSubject, date: new Date().toISOString() })
        );
        playSuccess();
      } else {
        throw new Error("Could not parse schedule");
      }
    } catch (err: any) {
      console.warn("[CramMode] generation failed, using structured fallback:", err);
      // Clean fallback so user is never blocked
      const totalMins = Math.round(parseFloat(hoursAvailable) * 60);
      const blockMins = Math.max(10, Math.floor(totalMins / 3));
      const fallbackTopics: CramTopic[] = [
        {
          topic: `${effectiveSubject}: Core Concepts & Terminology`,
          keyPoints: [
            "Review the primary definitions and foundational axioms.",
            "Distinguish between similar terminology and avoid common mix-ups.",
            "Write out the fundamental formulas or laws from memory.",
          ],
          timeMinutes: blockMins,
        },
        {
          topic: `${effectiveSubject}: Key Mechanisms & Processes`,
          keyPoints: [
            "Trace the step-by-step mechanism from trigger to outcome.",
            "Identify rate-limiting factors or critical conditions.",
            "Sketch the visual diagram or sequence of events.",
          ],
          timeMinutes: blockMins,
        },
        {
          topic: `${effectiveSubject}: High-Yield Exam Traps & Rapid Review`,
          keyPoints: [
            "Review tricky boundary conditions and exceptions to the rule.",
            "Practice recalling past exam questions on this exact topic.",
            "Quick self-test: Explain the core mechanism in 60 seconds without notes.",
          ],
          timeMinutes: Math.max(10, totalMins - blockMins * 2),
        },
      ];

      setTopics(fallbackTopics);
      setCurrentIdx(0);
      setCompleted([]);
      setTotalUsed(0);
      startTopicTimer(fallbackTopics[0].timeMinutes);
      setPhase("session");
      playSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleGotIt = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newCompleted = [...completed, currentIdx];
    setCompleted(newCompleted);
    playSuccess();

    if (currentIdx + 1 < topics.length) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      startTopicTimer(topics[next].timeMinutes);
    } else {
      setPhase("done");
      playCelebration();
      fireConfetti();
    }
  };

  const handleMoreTime = () => {
    setTimeLeft((t) => t + 120); // +2 minutes
    playTap();
  };

  const handleShareToVault = () => {
    if (!topics.length) return;
    const docTitle = `Cram Review: ${subject.slice(0, 40) || "Exam Prep"}`;
    const docContent = `# ${docTitle}

> **Rapid Cram Session** • Covered ${topics.length} topics in ~${Math.round(totalUsed / 60)} minutes.

## Covered High-Yield Topics
${topics.map((t) => `### ${t.topic}\n${t.keyPoints.map((kp) => `- ${kp}`).join("\n")}`).join("\n\n")}
`.trim();

    shareToStudyVault({
      title: docTitle,
      topic: subject.slice(0, 40) || "Cram Review",
      subject: "Cram Review",
      summary: `Rapid review covering ${topics.length} key curriculum topics.`,
      content: docContent,
      key_points: topics.map((t) => t.topic),
      tags: ["cram-mode", "rapid-review"],
      author: "Cram Student",
      isAiGenerated: true,
    });

    setVaultShared(true);
    fireConfetti();
    playCelebration();
    setTimeout(() => setVaultShared(false), 3000);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = topics.length > 0 ? (completed.length / topics.length) * 100 : 0;
  const timerPct = topics[currentIdx] ? (timeLeft / (topics[currentIdx].timeMinutes * 60)) * 100 : 100;
  const isTimeUrgent = timeLeft < 60;

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      {showUpgrade && <UpgradePrompt feature="cram" remaining={0} onClose={() => setShowUpgrade(false)} />}
      <SharedSidebar active="/cram" />

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col flex-1 pb-24 md:pb-8">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 md:px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="md:hidden w-9 h-9 border-2 border-black rounded-lg bg-white flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                arrow_back
              </span>
            </button>
            <span className="material-symbols-outlined text-[24px] text-[#ae2925]" style={{ textTransform: "none" }}>
              bolt
            </span>
            <span className="text-[20px] md:text-[22px] font-black tracking-tight uppercase">Cram Mode</span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#FFD13B] border-2 border-black shadow-[1px_1px_0px_#000]">
              Timed Session
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/quick-study")}
              className="px-3 py-1 bg-white hover:bg-[#F0EDE0] text-black border-2 border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              Cheat Sheets
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 px-4 md:px-8 py-6 max-w-4xl w-full mx-auto space-y-6">
          {/* Phase 1: Setup */}
          {phase === "setup" && (
            <div className="border-3 border-black bg-white shadow-[6px_6px_0px_#000] p-6 space-y-6">
              <div className="border-b-2 border-black pb-4">
                <span className="px-2.5 py-0.5 bg-[#ae2925] text-white text-[11px] font-black uppercase tracking-wider border border-black inline-block mb-2">
                  Emergency Cram Runner
                </span>
                <h2 className="text-[22px] md:text-[24px] font-black uppercase tracking-tight text-black">
                  How Much Time Do You Have to Cram?
                </h2>
                <p className="text-[13px] font-bold text-black/60 mt-1">
                  Tell Pip your exam topic and available hours. Pip splits your study into timed, high-yield topic sprints.
                </p>
              </div>

              {/* Subject Input */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-black/50">
                  Exam Topic / Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Organic Chemistry Functional Groups, Macroeconomics Keynesian Model..."
                  className="w-full border-2 border-black bg-[#FAF7F2] px-4 py-3 text-[14px] font-bold focus:outline-none shadow-[2px_2px_0px_#000]"
                />
              </div>

              {/* Time Available Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-black/50">
                  Total Time Available
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {[
                    { label: "30 Min", val: "0.5" },
                    { label: "1 Hour", val: "1" },
                    { label: "1.5 Hrs", val: "1.5" },
                    { label: "2 Hours", val: "2" },
                    { label: "3 Hours", val: "3" },
                    { label: "4 Hours", val: "4" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setHoursAvailable(item.val)}
                      className={`py-3 text-[12px] font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer ${
                        hoursAvailable === item.val
                          ? "bg-black text-white shadow-[2px_2px_0px_#000] scale-95"
                          : "bg-white text-black hover:bg-[#F0EDE0]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && <p className="text-[12px] font-black text-[#ae2925]">{errorMsg}</p>}

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-[#FFD13B] hover:bg-[#FFE566] text-black border-3 border-black font-black text-[14px] uppercase tracking-wider shadow-[4px_4px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none" }}>
                  {loading ? "autorenew" : "bolt"}
                </span>
                <span>{loading ? "Building Cram Schedule..." : "Start Timed Cram Session"}</span>
              </button>
            </div>
          )}

          {/* Phase 2: Active Timed Session */}
          {phase === "session" && topics.length > 0 && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="border-2 border-black bg-white p-3 shadow-[3px_3px_0px_#000] flex items-center justify-between gap-4">
                <span className="text-[12px] font-black uppercase tracking-wider text-black">
                  Topic {currentIdx + 1} of {topics.length}
                </span>
                <div className="flex-1 h-3 border-2 border-black bg-[#FAF7F2] overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[12px] font-black text-black">
                  {completed.length} Completed
                </span>
              </div>

              {/* Main Topic Stage */}
              <div className="border-3 border-black bg-white shadow-[6px_6px_0px_#000] p-6 space-y-6">
                {/* Header & Live Timer */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/50">
                      Current Focus Area
                    </span>
                    <h3 className="text-[20px] md:text-[22px] font-black text-black leading-tight">
                      {topics[currentIdx]?.topic}
                    </h3>
                  </div>

                  {/* Big Timer Display */}
                  <div
                    className={`px-4 py-2 border-2 border-black rounded-lg flex items-center gap-2 shadow-[2px_2px_0px_#000] ${
                      isTimeUrgent ? "bg-[#FCA5A5] text-[#7f1d1d] animate-pulse" : "bg-[#FFD13B] text-black"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none" }}>
                      timer
                    </span>
                    <span className="font-black text-[22px] tracking-tight">{fmt(timeLeft)}</span>
                  </div>
                </div>

                {/* 3 Core High-Yield Key Points */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-black/50">
                    High-Yield Points to Lock In:
                  </h4>
                  <div className="space-y-2.5">
                    {topics[currentIdx]?.keyPoints.map((pt, pIdx) => (
                      <div
                        key={pIdx}
                        className="border-2 border-black bg-[#FAF7F2] p-3.5 flex items-start gap-3 shadow-[2px_2px_0px_#000]"
                      >
                        <span className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {pIdx + 1}
                        </span>
                        <p className="font-bold text-[13.5px] text-black leading-snug">{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={handleGotIt}
                    className="sm:col-span-2 py-3.5 bg-[#4ADE80] hover:bg-[#22c55e] text-black border-2 border-black font-black text-[14px] uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none" }}>
                      check_circle
                    </span>
                    <span>Got It — Next Topic</span>
                  </button>

                  <button
                    onClick={handleMoreTime}
                    className="py-3.5 bg-white hover:bg-[#F0EDE0] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                      add_alarm
                    </span>
                    <span>+2 Min</span>
                  </button>
                </div>
              </div>

              {/* Up Next Preview */}
              {topics.slice(currentIdx + 1).length > 0 && (
                <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_#000] space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-widest text-black/50">
                    Up Next in this Session:
                  </h5>
                  <div className="space-y-1.5">
                    {topics.slice(currentIdx + 1).map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between border border-black/20 bg-[#FAF7F2] px-3 py-2 text-[12px] font-bold text-black/80"
                      >
                        <span>{t.topic}</span>
                        <span className="text-black/50">{t.timeMinutes}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 3: Done */}
          {phase === "done" && (
            <div className="border-3 border-black bg-white shadow-[6px_6px_0px_#000] p-8 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-[#FFD13B] border-3 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_#000]">
                <span className="material-symbols-outlined text-[44px]" style={{ textTransform: "none" }}>
                  military_tech
                </span>
              </div>

              <div>
                <h3 className="text-[24px] font-black uppercase tracking-tight text-black">
                  Cram Session Finished!
                </h3>
                <p className="text-[13px] font-bold text-black/60 mt-1">
                  You locked down {topics.length} key topics in ~{Math.round(totalUsed / 60)} minutes.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleShareToVault}
                  className="w-full sm:w-auto px-6 py-3 bg-[#4ADE80] hover:bg-[#22c55e] text-black border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[3px_3px_0px_#000] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>
                    share
                  </span>
                  <span>{vaultShared ? "Saved in Vault!" : "Share Summary to Vault"}</span>
                </button>

                <button
                  onClick={() => {
                    setPhase("setup");
                    setTopics([]);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-black text-white hover:bg-black/80 border-2 border-black font-black text-[13px] uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer"
                >
                  Start New Cram Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
