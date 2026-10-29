import { useNavigate, useSearchParams } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { shareToStudyVault } from "@/lib/shareToVault";
import { fireConfetti } from "@/lib/confetti";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { buildAIContext, getActiveSource, saveContext, onSourceChange } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";
import { useToolHistory } from "@/pages/ToolHistory";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { AnimatedRex, type RexState } from "@/components/AnimatedRex";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";

interface FeynmanFeedback {
  strengths: string[];
  gaps: Array<{ title: string; detail: string }>;
  hint: string;
  clarityScore: number;
  xpAwarded: number;
}

export default function TeachIt() {
  const tutorial = useTutorialModal("/teach-it");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTopic = searchParams.get("topic");
  const { user, profile, refreshProfile } = useAuth();
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const { logSession } = useStudySession();
  const { save: saveHistory, history: teachHistory } = useToolHistory("teach-it");
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(() => getActiveSource()?.name ?? null);
  const [topic, setTopic] = useState(() => urlTopic || localStorage.getItem("pz_teachit_draft_topic") || "");
  const [explanation, setExplanation] = useState(() => localStorage.getItem("pz_teachit_draft_explanation") || "");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(() => {
    try {
      const saved = localStorage.getItem("pz_teachit_feedback");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [loading, setLoading] = useState(false);
  const [vaultShared, setVaultShared] = useState(false);
  const [showXpToast, setShowXpToast] = useState(false);
  const [xpEarnedToast, setXpEarnedToast] = useState(0);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Knowunity-style Slide-Up Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Voice & Mascot State
  const [callState, setCallState] = useState<RexState>("idle");
  const [pipSpeech, setPipSpeech] = useState<string>(() =>
    topic ? `Hi! I'm Pip. I don't know much about ${topic} yet. Teach me like I'm 10 years old!` : "Hi! I'm Pip. Teach me this concept like I'm 10 years old!"
  );
  const [isMuted, setIsMuted] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const callStateRef = useRef<RexState>(callState);
  const liveVoiceRecognitionRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const voiceProcessingRef = useRef<boolean>(false);
  const speechUtteranceRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    try {
      if (feedback) localStorage.setItem("pz_teachit_feedback", JSON.stringify(feedback));
      else localStorage.removeItem("pz_teachit_feedback");
    } catch {}
  }, [feedback]);

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
    setPipSpeech(`Hi! I'm Pip. I want to learn about "${title}". Explain it in simple terms!`);
  };

  const handleClearSource = () => {
    setActiveSource(null);
    saveContext({ mode: "none", selectedIds: [] });
  };

  const startAmplitudeTracking = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAmplitude = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAmplitude(avg);
        rafRef.current = requestAnimationFrame(updateAmplitude);
      };
      updateAmplitude();
    } catch (err) {
      console.warn("[TeachIt] Mic amplitude tracking unavailable:", err);
    }
  };

  const stopAmplitudeTracking = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAmplitude(0);
  };

  const stopVoiceSession = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopAmplitudeTracking();
    if (liveVoiceRecognitionRef.current) {
      liveVoiceRecognitionRef.current.onend = null;
      liveVoiceRecognitionRef.current.onerror = null;
      liveVoiceRecognitionRef.current.stop();
      liveVoiceRecognitionRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    voiceProcessingRef.current = false;
    setIsVoiceActive(false);
    setCallState("idle");
    setLiveTranscript("");
  };

  const speakPipVoice = (text: string, onDone?: () => void) => {
    if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setCallState("responding");
      const delay = Math.min(5000, Math.max(2500, text.split(" ").length * 200));
      setTimeout(() => {
        setCallState("idle");
        onDone?.();
      }, delay);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.15;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))) || voices.find(v => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      setCallState("responding");
      utterance.onend = () => {
        setCallState("idle");
        onDone?.();
      };
      utterance.onerror = () => {
        setCallState("idle");
        onDone?.();
      };
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      setCallState("idle");
      onDone?.();
    }
  };

  const askPipCuriousQuestion = async (studentWords: string) => {
    if (voiceProcessingRef.current) return;
    voiceProcessingRef.current = true;
    setCallState("thinking");

    try {
      const fullExplanation = `${explanation} ${studentWords}`.trim();
      const wordsCount = fullExplanation ? fullExplanation.split(/\s+/).length : 0;

      let guidance = "";
      if (wordsCount < 25) {
        guidance = `The student has only said ${wordsCount} words (just a bare title or surface summary). DO NOT praise them. DO NOT say "that's so clear" or "you're right". Instead, politely probe: ask them HOW it actually works or what the actual mechanism is, like an inquisitive 10-year-old asking "Wait, but how does that actually happen?"`;
      } else if (wordsCount < 65) {
        guidance = `The student has started explaining the basics (${wordsCount} words). Find ONE confusing word, unexplained step, or abstract concept they mentioned, and ask them to explain it with a concrete everyday analogy. Do not flatter them or say "perfect".`;
      } else {
        guidance = `The student has given a decent explanation (${wordsCount} words). Challenge them on the consequence or edge case: "Wait, so what happens if something goes wrong in this step?" or "What is the final result of this?"`;
      }

      const prompt = `You are Pip, a curious, smart 10-year-old student learning from the user about "${topic || "this topic"}".
Current topic: "${topic || "Study Concept"}"
Student's explanation so far: "${fullExplanation}"

PEDAGOGICAL RULES:
1. NEVER say "You are totally right", "Great job!", "Awesome!", or "That makes complete sense" unless they have thoroughly explained the full mechanism.
2. ${guidance}
3. If they used fancy jargon (e.g. chromosome, mitosis, ATP, loop, recursion), ask what that word actually means in plain simple English.
4. Keep your response short: maximum 1 or 2 clear sentences. Sound like an earnest, curious student.`;

      const reply = await callGroq(
        [{ role: "user", content: prompt }],
        "You are Pip, a curious, encouraging 10-year-old student learning from the user. Be concise and friendly. Never give fake praise.",
        "openai/gpt-oss-20b",
        150,
        "teach_it"
      );

      const cleanedReply = reply.trim().replace(/^"|"$/g, "");
      setPipSpeech(cleanedReply);
      playSuccess();
      speakPipVoice(cleanedReply, () => {
        voiceProcessingRef.current = false;
        if (isVoiceActive) {
          startVoiceRecognitionCycle();
        }
      });
    } catch (err) {
      console.error("[TeachIt] Pip question failed:", err);
      const fallback = "Wait, but how does that actually work step-by-step? Could you give me an everyday analogy?";
      setPipSpeech(fallback);
      speakPipVoice(fallback, () => {
        voiceProcessingRef.current = false;
        if (isVoiceActive) {
          startVoiceRecognitionCycle();
        }
      });
    }
  };

  const handleAskPipNow = () => {
    if (callState === "thinking" || callState === "responding") return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const spoken = liveTranscript.trim();
    if (spoken) {
      setExplanation(prev => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
      setLiveTranscript("");
    }
    const textToEvaluate = spoken || explanation.trim();
    if (!textToEvaluate) return;
    askPipCuriousQuestion(spoken);
  };

  const startVoiceRecognitionCycle = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    if (liveVoiceRecognitionRef.current) {
      liveVoiceRecognitionRef.current.onend = null;
      liveVoiceRecognitionRef.current.onerror = null;
      liveVoiceRecognitionRef.current.stop();
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let turnTranscript = "";

    recognition.onstart = () => {
      setCallState("listening");
    };

    recognition.onresult = (event: any) => {
      let current = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      turnTranscript = current;
      setLiveTranscript(current);
    };

    recognition.onerror = (event: any) => {
      console.warn("[TeachIt] voice error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicError("Microphone permission was denied. Please allow microphone access in your browser settings (click the lock icon in the URL bar).");
        stopVoiceSession();
      } else if (event.error !== "aborted" && isVoiceActive) {
        setTimeout(() => {
          if (isVoiceActive && !voiceProcessingRef.current) startVoiceRecognitionCycle();
        }, 500);
      }
    };

    recognition.onend = () => {
      if (turnTranscript.trim()) {
        const spoken = turnTranscript.trim();
        setExplanation(prev => (prev.trim() ? `${prev.trim()} ${spoken}` : spoken));
        setLiveTranscript("");

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        const currentTotalWords = (explanation.trim() + " " + spoken).trim().split(/\s+/).length;
        if (currentTotalWords >= 12 && isVoiceActive) {
          silenceTimerRef.current = setTimeout(() => {
            if (isVoiceActive && !voiceProcessingRef.current) {
              askPipCuriousQuestion(spoken);
            }
          }, 3500);
        } else if (isVoiceActive && !voiceProcessingRef.current) {
          setTimeout(() => {
            if (isVoiceActive && !voiceProcessingRef.current) {
              startVoiceRecognitionCycle();
            }
          }, 300);
        }
      } else if (isVoiceActive && !voiceProcessingRef.current) {
        setTimeout(() => {
          if (isVoiceActive && !voiceProcessingRef.current) {
            startVoiceRecognitionCycle();
          }
        }, 300);
      }
    };

    liveVoiceRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // already started or unavailable
    }
  };

  const startVoiceTeaching = async () => {
    setMicError(null);
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicError("Speech recognition is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    try {
      await startAmplitudeTracking();
      setIsVoiceActive(true);
      startVoiceRecognitionCycle();
      playPop();
    } catch {
      setMicError("Could not access microphone. Please verify browser permissions.");
    }
  };

  const toggleVoice = () => {
    if (isVoiceActive) {
      stopVoiceSession();
    } else {
      startVoiceTeaching();
    }
  };

  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  const handleAnalyze = async () => {
    if (!explanation.trim()) return;
    setGenError(null);

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
    setIsDrawerOpen(true); // Automatically slide up the drawer
    const targetTopic = topic.trim() || "General Study Concept";

    const newUserMessage = { role: "user" as const, text: explanation };
    const updatedMessages = [...messages, newUserMessage];

    let result: FeynmanFeedback | null = null;

    try {
      const sourceContext = buildAIContext();
      const promptText = `Analyze this student's simple explanation of "${targetTopic}".\nStudent draft: "${explanation}"\n${sourceContext ? `Source context:\n${sourceContext}` : ""}\n\nEvaluate using the Feynman technique. Return ONLY a raw JSON object with NO markdown:\n{\n  "strengths": ["strength 1", "strength 2"],\n  "gaps": [{"title": "Gap Name", "detail": "Why it matters"}],\n  "hint": "A Feynman-style hint to deepen understanding",\n  "clarityScore": 82,\n  "xpAwarded": 45\n}`;

      const systemPrompt = "You are a master Feynman technique evaluator. Return only raw JSON. No markdown.";

      const conversationMessages = [
        ...updatedMessages.map(m => ({
          role: m.role,
          content: m.text,
        })),
      ];
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
          const { error: xpError } = await supabase
            .from("profiles")
            .update({ total_xp: (profile.total_xp || 0) + xp })
            .eq("id", user.id);
          if (xpError) console.error("Error awarding XP:", xpError);
          await refreshProfile();
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
          "Avoiding excessive jargon shows solid comprehension potential.",
        ],
        gaps: [
          { title: "Deeper Mechanism", detail: "Try to explain what physical step happens next." },
          { title: "Real-World Analogy", detail: "Adding an everyday analogy will cement the concept." },
        ],
        hint: "If you can't explain it simply, you don't understand it well enough. Try explaining it without any technical buzzwords.",
        clarityScore: 72,
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

    if (!isPro) {
      try { await logUsage("teach_it"); } catch {}
      remaining("teach_it").then(setRemainingUses).catch((err) => {
        console.error("[TeachIt] failed to refresh remaining uses:", err);
      });
    }

    if (result) {
      setFeedback(result);
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

  const handleShareToVault = () => {
    if (!feedback || !topic.trim()) return;
    const docContent = `# Feynman Technique: ${topic.trim()}

> **Clarity Score**: ${feedback.clarityScore}/100

## Core Explanation
${explanation}

## Strengths
${feedback.strengths.map((s: string) => `- ${s}`).join("\n")}

## Identified Knowledge Gaps
${feedback.gaps.map((g: any) => `- **${g.title}**: ${g.detail}`).join("\n")}

> **Pip's Hint**: ${feedback.hint}
`.trim();

    shareToStudyVault({
      title: `Feynman Explanation: ${topic.trim()}`,
      topic: topic.trim(),
      subject: "Feynman Technique",
      summary: explanation.slice(0, 160) || `Student breakdown of ${topic.trim()}`,
      content: docContent,
      key_points: feedback.strengths,
      tags: ["feynman-technique", "teach-it"],
      author: "Feynman Scholar",
      isAiGenerated: false,
    });

    setVaultShared(true);
    fireConfetti();
    setTimeout(() => setVaultShared(false), 3000);
  };

  const wordCount = explanation.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col h-[100dvh] overflow-hidden select-none">
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/teach-it"] || []} title="Teach It" />

      {showUpgrade && (
        <UpgradePrompt
          feature="teach_it"
          remaining={remainingUses ?? 0}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      <SharedSidebar active="/teach-it" />

      {/* Floating XP Toast */}
      {showXpToast && (
        <div className="fixed top-20 right-8 bg-black text-white px-5 py-3 border-2 border-black rounded-xl shadow-[4px_4px_0px_#10B981] z-50 font-black text-[14px] animate-bounce flex items-center gap-2">
          <span className="material-symbols-outlined text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
          Analysis Complete! +{xpEarnedToast} XP Earned
        </div>
      )}

      {/* Main Studio Area */}
      <div className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden relative">

        {/* ── Top Bar ── */}
        <header className="h-16 px-4 md:px-8 border-b-2 border-black bg-[#FAF7F2] flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div>
              <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-black/40 uppercase tracking-widest leading-none mb-0.5">
                <span>Practice</span>
                <span>/</span>
                <span className="text-black">Feynman Studio</span>
              </div>
              <h1 className="text-[17px] md:text-[20px] font-black tracking-tight leading-none truncate">
                Teach It
              </h1>
            </div>

            <div className="hidden sm:block w-px h-7 bg-black/20" />

            {/* Attached Source Pill */}
            {activeSource ? (
              <div className="hidden sm:flex items-center gap-1.5 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0] text-[12px] font-bold">
                <span className="material-symbols-outlined text-[15px]">description</span>
                <span className="truncate max-w-[140px]">{activeSource}</span>
                <button onClick={handleClearSource} className="material-symbols-outlined text-[13px] hover:text-[#10B981] cursor-pointer">
                  close
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/sources")}
                className="hidden sm:flex items-center gap-1.5 border-2 border-black rounded-full px-3 py-1 bg-white hover:bg-[#F0EDE0] text-[12px] font-bold shadow-[2px_2px_0px_#000] cursor-pointer active:translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">attach_file</span>
                Attach Source
              </button>
            )}

            {/* If feedback exists, show quick score pill that re-opens drawer */}
            {feedback && (
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 border-2 border-black bg-[#FFE566] hover:bg-[#FFD13B] px-3 py-1 rounded-full text-[12px] font-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-all"
                title="Open Feynman evaluation drawer"
              >
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                <span>Clarity: {feedback.clarityScore}/100</span>
                <span className="material-symbols-outlined text-[14px]">expand_less</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Past explanations history */}
            <div className="relative">
              <button
                onClick={() => setShowHistoryDropdown(v => !v)}
                className="px-3 py-1.5 border-2 border-black bg-white hover:bg-[#F0EDE0] font-black text-[12px] rounded-lg shadow-[2px_2px_0px_#000] cursor-pointer active:translate-y-0.5 flex items-center gap-1 transition-all"
                title="Past explanations"
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                <span className="hidden sm:inline">History</span>
              </button>

              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] p-2 z-50 flex flex-col gap-1 max-h-72 overflow-y-auto">
                  <p className="text-[11px] font-black uppercase text-black/50 px-2 py-1">Recent Explanations</p>
                  {(!teachHistory || (teachHistory as any[]).length === 0) ? (
                    <p className="text-[12px] font-bold text-black/40 p-2 text-center">No history yet</p>
                  ) : (
                    (teachHistory as any[]).slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTopic(item.meta || "");
                          setExplanation(item.prompt || "");
                          setShowHistoryDropdown(false);
                        }}
                        className="p-2 text-left hover:bg-[#FAF7F2] border border-transparent hover:border-black rounded-lg transition-colors"
                      >
                        <p className="text-[12px] font-black truncate">{item.meta || "Concept"}</p>
                        <p className="text-[11px] text-black/50 truncate font-semibold">{item.preview || item.prompt}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Help / Tutorial */}
            <button
              onClick={() => tutorial.show()}
              className="w-9 h-9 border-2 border-black bg-white hover:bg-black hover:text-white rounded-lg flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
              title="How Feynman Works"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
            </button>
          </div>
        </header>

        {/* ── Topic Input Sub-Bar ── */}
        <div className="px-4 md:px-8 py-2.5 bg-white border-b-2 border-black flex flex-wrap items-center gap-2 md:gap-3 shrink-0 z-10">
          <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Topic:</span>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. Photosynthesis, Newton's Laws, Inflation, Recursion..."
            className="flex-1 min-w-[180px] bg-[#FAF7F2] border-2 border-black px-3 py-1.5 rounded-lg font-bold text-[13px] focus:outline-none focus:bg-white shadow-[1.5px_1.5px_0px_#000]"
          />
          <div className="hidden sm:flex items-center gap-1.5">
            {["Photosynthesis", "Newton's Laws", "Mitosis", "Inflation"].map(t => (
              <button
                key={t}
                onClick={() => selectTopicTemplate(t)}
                className="px-2.5 py-1 bg-white hover:bg-[#FAF7F2] border border-black rounded-md text-[11px] font-bold cursor-pointer transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Central Stage (Mascot as Hero Centerpiece) ── */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 pb-40 overflow-y-auto relative">

          {/* Ambient Neobrutalist Stage Elements */}
          <div className="w-full max-w-2xl flex flex-col items-center relative z-10">

            {/* Comic Speech Bubble from Pip */}
            <div className="relative mb-4 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white border-3 border-black p-4 md:p-5 rounded-2xl shadow-[5px_5px_0px_#000] relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-black/50">
                      Pip (Your Curious 10-Year-Old Student)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMuted(m => !m)}
                    className="text-black/60 hover:text-black cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                    title={isMuted ? "Unmute Pip's voice" : "Mute Pip's voice"}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isMuted ? "volume_off" : "volume_up"}
                    </span>
                  </button>
                </div>

                <p className="mt-2 text-[15px] md:text-[17px] font-black text-black leading-snug">
                  {pipSpeech}
                </p>
              </div>

              {/* Speech bubble tail pointing down to Pip */}
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[14px] border-t-black mx-auto relative top-[-1px]" />
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-white mx-auto relative -top-[15px]" />
            </div>

            {/* Mascot Centerpiece */}
            <div className="relative flex flex-col items-center group cursor-pointer" onClick={() => playPop()}>
              {/* Dynamic Pedestal with Equalizer pulse */}
              <div className="relative flex items-center justify-center">
                <AnimatedRex
                  state={
                    loading
                      ? "thinking"
                      : callState === "responding"
                      ? "responding"
                      : callState === "listening"
                      ? "listening"
                      : feedback && feedback.clarityScore >= 80
                      ? "excited"
                      : "idle"
                  }
                  size="hero"
                  speaking={callState === "responding"}
                  interactive={true}
                />
              </div>

              {/* Pedestal Surface */}
              <div className="w-48 h-6 bg-black/10 rounded-full border border-black/20 mt-1 flex items-center justify-center">
                {/* Acoustic Equalizer Bars when Voice is Active */}
                {isVoiceActive && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((bar, i) => (
                      <span
                        key={i}
                        className="w-1 bg-[#10B981] rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(4, Math.min(16, (amplitude / 12) * bar))}px`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Live Spoken Transcript Floating Pill */}
              {liveTranscript && (
                <div className="mt-3 px-4 py-1.5 bg-[#ECFDF5] border-2 border-black rounded-full shadow-[2px_2px_0px_#000] flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[12px] font-black text-black italic">"{liveTranscript}"</span>
                </div>
              )}

              {/* Mic Permission Warning Banner if Denied */}
              {micError && (
                <div className="mt-3 p-3 bg-red-50 border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] text-center max-w-md">
                  <p className="text-[12px] font-bold text-red-700">{micError}</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ── Minimalist Floating Bottom Dock ── */}
        <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 z-30 flex justify-center pointer-events-none">
          <div className="w-full max-w-3xl bg-white/95 backdrop-blur-md border-3 border-black rounded-2xl shadow-[6px_6px_0px_#000] p-3 md:p-4 flex flex-col gap-2.5 pointer-events-auto">

            {/* Top Micro-Bar: Word Count + Phase Badge + Actions */}
            <div className="flex items-center justify-between text-[11px] font-black">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-[#FAF7F2] border border-black rounded-md">
                  {wordCount} words
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md border border-black bg-[#FFE566]">
                  {wordCount < 25 ? "Phase 1: Basic Definition" : wordCount < 70 ? "Phase 2: Mechanism Unfolding" : "Phase 3: Deep Mastery"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {explanation.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Clear your draft?")) setExplanation("");
                    }}
                    className="text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                {feedback && (
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="text-[#10B981] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>View Evaluation</span>
                    <span className="material-symbols-outlined text-[14px]">expand_less</span>
                  </button>
                )}
              </div>
            </div>

            {/* Input Row: Mic Toggle + Unified Textarea + Action Buttons */}
            <div className="flex items-center gap-2.5">

              {/* Mic Toggle Button */}
              <button
                type="button"
                onClick={toggleVoice}
                title={isVoiceActive ? "Pause Voice Dictation" : "Start Voice with Pip"}
                className={`w-12 h-12 rounded-xl border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer ${
                  isVoiceActive
                    ? "bg-[#10B981] text-white animate-pulse"
                    : "bg-[#FAF7F2] hover:bg-[#FFE566] text-black"
                }`}
              >
                <span className="material-symbols-outlined text-[24px]" style={{ textTransform: "none" }}>
                  {isVoiceActive ? "mic" : "mic_none"}
                </span>
              </button>

              {/* Expandable Textarea (Accepts typing & voice transcript concurrently) */}
              <div className="flex-1 relative">
                <textarea
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Explain to Pip in simple everyday words (or talk via the mic)..."
                  rows={2}
                  className="w-full bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 md:p-3 font-bold text-[13.5px] md:text-[14px] leading-snug resize-none focus:outline-none focus:bg-white shadow-inner"
                />
              </div>

              {/* Action Buttons Cluster */}
              <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                {/* Ask Pip button (Socratic probe) */}
                <button
                  type="button"
                  onClick={handleAskPipNow}
                  disabled={!explanation.trim() || callState === "thinking" || callState === "responding"}
                  title="Prompt Pip to ask an inquisitive follow-up question"
                  className="px-3 md:px-3.5 py-2.5 bg-white hover:bg-[#F0EDE0] border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">help</span>
                  <span>Ask Pip</span>
                </button>

                {/* Grade / Feynman Score CTA */}
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!explanation.trim() || loading}
                  className={`px-4 md:px-5 py-2.5 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-xl font-black text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !explanation.trim() || loading ? "opacity-40 pointer-events-none" : ""
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    school
                  </span>
                  <span>{loading ? "Grading..." : "Grade"}</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* ── Knowunity-Style Slide-Up Drawer (Bottom Sheet) ── */}
        <div
          className={`fixed inset-x-0 bottom-0 z-50 md:ml-64 transition-transform duration-300 ease-out transform ${
            isDrawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Backdrop overlay when open */}
          {isDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-[-1]"
              onClick={() => setIsDrawerOpen(false)}
            />
          )}

          {/* Drawer Container */}
          <div className="bg-[#FAF7F2] border-t-3 border-x-3 border-black rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.25)] max-h-[85vh] flex flex-col overflow-hidden">

            {/* Drag Handle & Header */}
            <div className="p-4 border-b-2 border-black bg-white flex flex-col items-center shrink-0 relative">
              {/* Drag Handle Bar */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-14 h-1.5 bg-black/30 hover:bg-black rounded-full mb-3 cursor-pointer transition-colors"
                title="Pull down to close"
              />

              <div className="w-full flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#10B981] text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified
                  </span>
                  <div>
                    <h3 className="font-black text-[16px] md:text-[18px] text-black leading-tight">
                      Feynman Clarity Evaluation
                    </h3>
                    <p className="text-[11px] font-bold text-black/50">
                      Target: "{topic || "Study Concept"}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {feedback && (
                    <div className="px-3 py-1 bg-[#10B981] text-white border-2 border-black rounded-full font-black text-[12px] shadow-[2px_2px_0px_#000]">
                      +{feedback.xpAwarded} XP
                    </div>
                  )}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-8 h-8 rounded-lg border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center font-black transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="p-4 md:p-6 overflow-y-auto flex flex-col gap-5">

              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined animate-spin text-[#10B981] text-[48px]">
                    autorenew
                  </span>
                  <p className="font-black text-[16px]">Pip is grading your explanation...</p>
                  <p className="text-[12px] font-bold text-black/50">Checking for clarity, jargon, and simple analogies</p>
                </div>
              ) : feedback ? (
                <>
                  {/* Score Hero Card */}
                  <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Circular Score Badge */}
                      <div
                        className={`w-20 h-20 rounded-full border-3 border-black flex flex-col items-center justify-center font-black shadow-[3px_3px_0px_#000] ${
                          feedback.clarityScore >= 80
                            ? "bg-[#10B981] text-white"
                            : feedback.clarityScore >= 60
                            ? "bg-[#FFE566] text-black"
                            : "bg-[#FF5757] text-white"
                        }`}
                      >
                        <span className="text-[24px] leading-none">{feedback.clarityScore}</span>
                        <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Score</span>
                      </div>

                      <div>
                        <h4 className="text-[18px] font-black">
                          {feedback.clarityScore >= 85
                            ? "Exceptional Teaching! 🌟"
                            : feedback.clarityScore >= 70
                            ? "Solid Explanation! 👍"
                            : "Good Effort, Needs Clarity 🤔"}
                        </h4>
                        <p className="text-[12px] font-bold text-black/60 mt-0.5">
                          {feedback.clarityScore >= 80
                            ? "A 10-year-old can easily understand this concept."
                            : "Simplify the technical terms to achieve full mastery."}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleShareToVault}
                        disabled={vaultShared}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#FFE566] hover:bg-[#FFD13B] border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {vaultShared ? "check" : "share"}
                        </span>
                        <span>{vaultShared ? "Shared to Vault!" : "Share to Study Vault"}</span>
                      </button>

                      <button
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-black hover:bg-black/80 text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Keep Teaching Pip</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  {/* 2-Column Strengths & Gaps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Strengths Card */}
                    <div className="bg-[#ECFDF5] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-[#065F46] font-black text-[13px] uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                        <span>What You Explained Well</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {feedback.strengths.map((str, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[13px] font-bold text-black/80">
                            <span className="text-[#10B981] font-black">✓</span>
                            <span>{str}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conceptual Gaps & Jargon Alert Card */}
                    <div className="bg-[#FFFBEB] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 text-[#92400E] font-black text-[13px] uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          warning
                        </span>
                        <span>Knowledge Gaps & Jargon</span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {feedback.gaps.map((gap, idx) => (
                          <div key={idx} className="bg-white/80 border border-black/20 rounded-lg p-2.5">
                            <p className="text-[12.5px] font-black text-black">{gap.title}</p>
                            <p className="text-[11.5px] font-semibold text-black/60 mt-0.5">{gap.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Pip's Next Challenge Card */}
                  <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex items-start gap-3">
                    <span className="material-symbols-outlined text-[24px] text-[#F59E0B] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                      lightbulb
                    </span>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-wider text-black/40">
                        Pip's Socratic Follow-Up:
                      </p>
                      <p className="text-[14px] font-bold text-black italic mt-1 leading-relaxed">
                        "{feedback.hint}"
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-black/40">
                  <p className="font-bold text-[14px]">No evaluation yet. Explain the concept and tap Grade!</p>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
