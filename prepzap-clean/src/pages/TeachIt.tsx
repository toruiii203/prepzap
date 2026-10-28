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
  const urlMode = searchParams.get("mode");
  const { user, profile, refreshProfile } = useAuth();
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const { logSession } = useStudySession();
  const { save: saveHistory, history: teachHistory } = useToolHistory("teach-it");
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [activeSource, setActiveSource] = useState<string | null>(() => getActiveSource()?.name ?? null);
  const [topic, setTopic] = useState(() => urlTopic || localStorage.getItem("pz_teachit_draft_topic") || "");
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
  const [vaultShared, setVaultShared] = useState(false);

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

  // Interactive Voice Mode with Pip
  const [inputMode, setInputMode] = useState<"text" | "voice">(() => (urlMode === "voice" ? "voice" : "text"));
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
    if (urlMode === "voice") setInputMode("voice");
    if (urlTopic) setTopic(urlTopic);
  }, [urlMode, urlTopic]);

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
Student's spoken explanation so far: "${fullExplanation}"

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
        if (inputMode === "voice" && isVoiceActive) {
          startVoiceRecognitionCycle();
        }
      });
    } catch (err) {
      console.error("[TeachIt] Pip question failed:", err);
      const fallback = "Wait, but how does that actually work step-by-step? Could you give me an everyday analogy?";
      setPipSpeech(fallback);
      speakPipVoice(fallback, () => {
        voiceProcessingRef.current = false;
        if (inputMode === "voice" && isVoiceActive) {
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

        // Debounce before asking Pip: give the user 3.5s of silence to keep talking!
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
    } catch (e) {
      console.warn("[TeachIt] Failed to start speech recognition:", e);
    }
  };

  const startVoiceTeaching = async () => {
    setMicError(null);
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari, or switch to Type Draft.");
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err: any) {
      console.warn("[TeachIt] Mic access denied:", err);
      setMicError("Microphone access is blocked. Click the lock/site settings icon in your browser URL bar to allow microphone access, or use the Type Draft tab.");
      return;
    }

    playPop();
    setIsVoiceActive(true);
    startAmplitudeTracking();
    startVoiceRecognitionCycle();
  };

  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
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
        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/teach-it"] || []} title="Teach It" />

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
                  className="material-symbols-outlined text-[14px] hover:text-[#10B981] transition-colors">
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
        
          <button onClick={() => tutorial.show()} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-9 h-9 md:w-10 md:h-10 shrink-0 z-50 ml-2" title="Tutorial"><span className="material-symbols-outlined text-[18px] md:text-[20px]">help</span></button>
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
                    className={`material-symbols-outlined text-[20px] transition-colors ${showHistoryDropdown ? "text-[#10B981]" : "text-black/50 hover:text-black"}`}>
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

              {/* Studio Mode Selector */}
              <div className="flex items-center justify-between border-b-2 border-black bg-[#F0EDE0] px-6 py-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setInputMode("text");
                      if (isVoiceActive) stopVoiceSession();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 font-black text-[13px] border-2 border-black rounded-lg transition-all cursor-pointer ${
                      inputMode === "text"
                        ? "bg-white text-black shadow-[2px_2px_0px_#000]"
                        : "bg-transparent text-black/50 hover:text-black border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>edit_note</span>
                    Type Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTap();
                      setInputMode("voice");
                      if (!isVoiceActive) startVoiceTeaching();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 font-black text-[13px] border-2 border-black rounded-lg transition-all cursor-pointer ${
                      inputMode === "voice"
                        ? "bg-[#10B981] text-white shadow-[2px_2px_0px_#000]"
                        : "bg-transparent text-black/50 hover:text-black border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>record_voice_over</span>
                    Teach Pip by Voice
                    <span className="bg-[#FFD13B] text-black text-[9px] px-1.5 py-0.5 rounded font-black border border-black uppercase tracking-wider">
                      Live
                    </span>
                  </button>
                </div>

                {inputMode === "voice" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setIsMuted(m => !m);
                      }}
                      title={isMuted ? "Unmute Pip's voice response" : "Mute Pip's voice response"}
                      className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 border-2 border-black bg-white rounded-lg shadow-[1.5px_1.5px_0px_#000] cursor-pointer hover:bg-[#FAF7F2]"
                    >
                      <span className="material-symbols-outlined text-[15px]" style={{ textTransform: "none" }}>
                        {isMuted ? "volume_off" : "volume_up"}
                      </span>
                      {isMuted ? "Muted" : "Pip Voice"}
                    </button>
                  </div>
                )}
              </div>

              {inputMode === "text" ? (
                <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                  <h3 className="font-bold text-[18px] italic mb-6" style={{ color: "rgba(0,0,0,0.25)" }}>
                    Explain this in your own words, as if teaching a beginner...
                  </h3>
                  <textarea
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none font-body-lg text-[16px] leading-relaxed placeholder:text-black/20 outline-none"
                    placeholder="Start explaining the concept here. Avoid jargon. Use analogies..."
                    style={{ minHeight: "220px" }}
                  />
                </div>
              ) : (
                /* Spacious 2-Column Voice Studio with Pip */
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#FAF7F2]">
                  {/* Left Column: Pip's Interactive Classroom Stage */}
                  <div className="flex-1 lg:w-[54%] flex flex-col items-center justify-between p-6 sm:p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-black overflow-y-auto bg-gradient-to-b from-[#FAF7F2] to-white">
                    {/* Mic Error Diagnostic Banner */}
                    {micError && (
                      <div className="w-full max-w-md bg-[#FFF1F2] border-2 border-[#BE123C] p-3.5 rounded-xl flex items-start gap-2.5 shadow-[2px_2px_0px_#000] mb-4">
                        <span className="material-symbols-outlined text-[#BE123C] text-[20px] shrink-0 mt-0.5" style={{ textTransform: "none" }}>mic_off</span>
                        <div className="text-left">
                          <p className="text-[12px] font-black text-[#BE123C] uppercase tracking-wide">Microphone Permission Needed</p>
                          <p className="text-[11.5px] font-bold text-black/75 leading-snug mt-0.5">{micError}</p>
                        </div>
                      </div>
                    )}

                    {/* Pip Avatar Stage */}
                    <div className="flex flex-col items-center gap-3 w-full max-w-md my-auto">
                      <div className="relative">
                        <AnimatedRex
                          state={callState}
                          size="lg"
                          speaking={callState === "responding"}
                        />
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#FFD13B] text-black text-[10.5px] font-black border-2 border-black rounded-full uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000] whitespace-nowrap">
                          {callState === "listening" ? "Listening to you" : callState === "thinking" ? "Pip is thinking..." : callState === "responding" ? "Pip is speaking" : "Ready to listen"}
                        </span>
                      </div>

                      {/* Pip Speech Bubble with Tail */}
                      <div className="relative bg-white border-2 border-black p-4 rounded-2xl shadow-[4px_4px_0px_#000] w-full text-center mt-3">
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t-2 border-l-2 border-black rotate-45" />
                        <div className="flex items-center justify-between mb-1.5 text-[10px] font-black uppercase text-black/40 tracking-wider">
                          <span>Pip (Age 10)</span>
                          {callState === "responding" && (
                            <span className="text-[#10B981] font-black flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                              Speaking
                            </span>
                          )}
                        </div>
                        <p className="font-extrabold text-[15px] sm:text-[16px] text-black leading-snug">
                          "{pipSpeech}"
                        </p>
                      </div>

                      {/* Audio Equalizer Waveform */}
                      {isVoiceActive && (
                        <div className="flex items-center gap-1.5 h-10 px-5 py-2 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_#000]">
                          {[0.4, 0.8, 1.2, 0.6, 1.0, 1.4, 0.7, 1.1, 0.5, 0.9, 1.3, 0.8, 1.2, 0.6].map((mult, idx) => {
                            const heightPx = Math.min(32, Math.max(6, (amplitude * mult * 0.45)));
                            return (
                              <div
                                key={idx}
                                className="w-1.5 bg-[#10B981] border border-black rounded-full transition-all duration-75"
                                style={{ height: `${heightPx}px` }}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Live Transcript Whisper */}
                      {liveTranscript && (
                        <div className="w-full bg-[#ECFDF5] border-2 border-[#10B981] p-3 rounded-xl text-center">
                          <p className="text-[12.5px] font-bold text-[#065F46] italic">
                            "{liveTranscript}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Voice Control Buttons Stage */}
                    <div className="w-full max-w-md flex flex-col gap-2.5 pt-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (isVoiceActive) {
                              playTap();
                              stopVoiceSession();
                            } else {
                              startVoiceTeaching();
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 border-2 border-black font-black text-[14px] rounded-xl shadow-[3px_3px_0px_#000] cursor-pointer active:translate-y-0.5 transition-all ${
                            isVoiceActive
                              ? "bg-[#FFE566] text-black hover:bg-[#FFD13B]"
                              : "bg-[#10B981] text-white hover:bg-black"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[20px] ${isVoiceActive ? "animate-pulse" : ""}`} style={{ textTransform: "none" }}>
                            {isVoiceActive ? "pause" : "mic"}
                          </span>
                          {isVoiceActive ? "Pause Voice" : "Start Speaking to Pip"}
                        </button>

                        <button
                          type="button"
                          onClick={handleAskPipNow}
                          disabled={!explanation.trim() || callState === "thinking" || callState === "responding"}
                          title="Ask Pip what he thinks of what you've explained so far"
                          className="px-4 py-3.5 bg-white hover:bg-[#F0EDE0] disabled:opacity-40 disabled:pointer-events-none text-black border-2 border-black font-black text-[13px] rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>help</span>
                          Ask Pip
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold text-black/50 px-1">
                        <span>Speaks at your own pace without interruption</span>
                        <button
                          type="button"
                          onClick={() => setIsMuted(m => !m)}
                          className="text-black hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]" style={{ textTransform: "none" }}>
                            {isMuted ? "volume_off" : "volume_up"}
                          </span>
                          {isMuted ? "Unmute Pip Voice" : "Mute Pip Voice"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: The Live Feynman Blackboard */}
                  <div className="flex-1 lg:w-[46%] flex flex-col p-6 bg-white overflow-y-auto justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-black" style={{ textTransform: "none" }}>edit_note</span>
                          <h4 className="text-[12px] font-black uppercase tracking-wider text-black">Live Feynman Blackboard</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#F0EDE0] border border-black font-black text-[11px] rounded">
                            {wordCount} words
                          </span>
                          {explanation.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Clear your explanation draft?")) setExplanation("");
                              }}
                              className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Feynman Milestone Badge */}
                      <div className="bg-[#FAF7F2] border-2 border-black p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-[11px] font-bold text-black/70">Explanation Stage:</span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded border border-black bg-[#FFE566]">
                          {wordCount < 25 ? "Phase 1: Basic Definition" : wordCount < 75 ? "Phase 2: Mechanism Unfolding" : "Phase 3: Deep Feynman Mastery"}
                        </span>
                      </div>

                      {/* Synchronized Editable Explanation Textarea */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-black/50">
                          Spoken thoughts are auto-captured here (you can also edit directly):
                        </label>
                        <textarea
                          value={explanation}
                          onChange={e => setExplanation(e.target.value)}
                          placeholder="As you speak to Pip, your transcript will appear here. You can also edit, format, or add key terms with your keyboard..."
                          className="w-full min-h-[220px] max-h-[360px] p-4 bg-[#FAF7F2] border-2 border-black rounded-xl font-body-lg text-[14.5px] leading-relaxed resize-y focus:outline-none focus:bg-white shadow-[2px_2px_0px_#000]"
                        />
                      </div>
                    </div>

                    {/* Primary Blackboard Action */}
                    <div className="pt-3 border-t-2 border-black flex flex-col gap-2">
                      <button
                        onClick={handleAnalyze}
                        disabled={!explanation.trim() || loading}
                        className={`w-full py-4 bg-[#10B981] hover:bg-black text-white font-black text-[15px] border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] active:translate-y-0.5 cursor-pointer transition-all flex items-center justify-center gap-2 ${
                          !explanation.trim() || loading ? "opacity-40 pointer-events-none" : ""
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]" style={{ textTransform: "none", fontVariationSettings: "'FILL' 1" }}>school</span>
                        {loading ? "Analyzing Clarity Score..." : "Grade My Teaching (Feynman Score)"}
                      </button>
                      <p className="text-[11px] font-bold text-black/40 text-center">
                        Scores your clarity out of 100, detects knowledge gaps, and awards XP
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-8 py-4 border-t-2 border-black bg-[#FAF7F2] shrink-0">
              <div className="flex items-center gap-3">
                {inputMode === "text" ? (
                  <>
                    <button onClick={handleMicClick} title={isRecording ? "Stop recording" : "Record voice"} className={`flex items-center gap-2 px-5 py-3 bg-white border-2 border-black font-bold text-[13px] shadow-[3px_3px_0px_#000] transition-colors cursor-pointer ${isRecording ? "text-[#10B981] bg-[#ECFDF5]" : ""}`}>
                      <span className={`material-symbols-outlined text-[18px] ${isRecording ? "animate-pulse" : ""}`} style={{ textTransform: "none" }}>{isRecording ? "stop_circle" : "mic"}</span>
                      {isRecording ? "Listening..." : "Dictate Voice"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playTap();
                        setInputMode("voice");
                        if (!isVoiceActive) startVoiceTeaching();
                      }}
                      title="Switch to interactive voice conversation with Pip"
                      className="flex items-center gap-2 px-5 py-3 bg-[#10B981] hover:bg-black text-white border-2 border-black font-bold text-[13px] shadow-[3px_3px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ textTransform: "none" }}>record_voice_over</span>
                      Teach Pip by Voice
                    </button>
                    <span className="text-[12px] font-bold text-black/40 border-l-2 border-black pl-3">
                      {wordCount} words
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="text-[13px] font-black text-black">
                      Voice Studio Mode Active
                    </span>
                    <span className="text-[12px] font-bold text-black/40 border-l-2 border-black pl-3">
                      {wordCount} words captured
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handleAnalyze}
                  disabled={!explanation.trim() || loading}
                  className={`flex items-center gap-3 px-10 py-4 bg-[#10B981] text-white border-2 border-black font-black text-[16px] shadow-[5px_5px_0px_#000] transition-all ${
                    explanation.trim() && !loading
                      ? "hover:bg-black cursor-pointer active:translate-y-1 active:shadow-none"
                      : "opacity-50 pointer-events-none"
                  }`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
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
                  <span className="material-symbols-outlined animate-spin text-[#10B981] text-[40px]">autorenew</span>
                  <p className="font-bold text-[13px]">Pip is analyzing your explanation...</p>
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
                        <div key={i} className="bg-white border-2 border-black border-l-4 border-l-[#10B981] p-3 shadow-[3px_3px_0px_#000] flex items-start gap-3">
                          <span className="material-symbols-outlined text-[#10B981] text-[18px] shrink-0">warning</span>
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
              <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Pip: Active</span>
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
        
          <button onClick={() => tutorial.show()} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-9 h-9 md:w-10 md:h-10 shrink-0 z-50 ml-2" title="Tutorial"><span className="material-symbols-outlined text-[18px] md:text-[20px]">help</span></button>
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
                <button onClick={handleClearSource} className="material-symbols-outlined text-[13px] hover:text-[#10B981] shrink-0">close</button>
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setInputMode("text");
                    if (isVoiceActive) stopVoiceSession();
                  }}
                  className={`px-3 py-1 font-bold text-[12px] border-2 border-black rounded-full cursor-pointer ${
                    inputMode === "text" ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  Type Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setInputMode("voice");
                    if (!isVoiceActive) startVoiceTeaching();
                  }}
                  className={`px-3 py-1 font-bold text-[12px] border-2 border-black rounded-full flex items-center gap-1 cursor-pointer ${
                    inputMode === "voice" ? "bg-[#10B981] text-white" : "bg-white text-black"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">record_voice_over</span>
                  Voice with Pip
                </button>
              </div>
              <span className="bg-white px-3.5 py-0.5 border-2 border-black font-bold text-[11px] shadow-[1px_1px_rgba(0,0,0,1)] text-[#E8534A]">
                {wordCount} words
              </span>
            </div>

            {inputMode === "text" ? (
              <textarea
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
                className="w-full flex-grow min-h-[160px] bg-white border-2 border-black rounded-[18px] p-5 font-body-lg text-[14.5px] placeholder:text-black/30 focus:outline-none focus:ring-0 resize-none shadow-[3.5px_3.5px_rgba(0,0,0,1)]"
                placeholder="Explain this concept simply, using analogies or conversational language..."
              />
            ) : (
              <div className="w-full bg-white border-2 border-black rounded-[18px] p-4 flex flex-col items-center gap-3 shadow-[3px_3px_0px_#000]">
                <AnimatedRex state={callState} size="sm" speaking={callState === "responding"} />
                <div className="bg-[#FAF7F2] border border-black p-2.5 rounded-xl text-center text-[13px] font-bold">
                  {pipSpeech}
                </div>
                {liveTranscript && (
                  <p className="text-[12px] font-bold text-[#10B981] italic">"{liveTranscript}"</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isVoiceActive ? stopVoiceSession() : startVoiceTeaching()}
                    className={`px-4 py-2 border-2 border-black rounded-full font-black text-[12px] shadow-[2px_2px_0px_#000] flex items-center gap-1.5 cursor-pointer ${
                      isVoiceActive ? "bg-[#FFE566] text-black" : "bg-[#10B981] text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{isVoiceActive ? "pause" : "mic"}</span>
                    {isVoiceActive ? "Pause Voice" : "Start Speaking"}
                  </button>
                </div>
              </div>
            )}
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
            {inputMode === "text" ? (
              <>
                <button onClick={handleMicClick} title={isRecording ? "Stop recording" : "Record voice"} className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-black font-bold text-[11px] sm:text-[12px] shadow-[2px_2px_0px_#000] transition-colors cursor-pointer ${isRecording ? "text-[#10B981] bg-[#ECFDF5]" : ""}`}>
                  <span className={`material-symbols-outlined text-[16px] ${isRecording ? "animate-pulse" : ""}`} style={{ textTransform: "none" }}>{isRecording ? "stop_circle" : "mic"}</span>
                  {isRecording ? "Listening..." : "Dictate"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTap();
                    setInputMode("voice");
                    if (!isVoiceActive) startVoiceTeaching();
                  }}
                  title="Start live interactive voice discussion with Pip"
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#10B981] hover:bg-black text-white border-2 border-black font-bold text-[11px] sm:text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none" }}>record_voice_over</span>
                  Voice with Pip
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[11px] font-black text-black">Voice Mode Active</span>
                <span className="text-[10.5px] font-bold text-black/50 ml-1">({wordCount} words)</span>
              </div>
            )}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!explanation.trim() || loading}
            className={`flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white border-2 border-black font-black text-[13px] shadow-[3px_3px_0px_#000] transition-all ${
              explanation.trim() && !loading
                ? "cursor-pointer active:translate-y-0.5 active:shadow-none"
                : "opacity-50 pointer-events-none"
            }`}>
            <span className="material-symbols-outlined text-[16px]" style={{ textTransform: "none", fontVariationSettings: "'FILL' 1" }}>school</span>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

      </div>

    </div>
  );
}
