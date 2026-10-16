import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { callGroq } from "@/lib/groq";
import { AnimatedRex, type RexState } from "@/components/AnimatedRex";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";

export default function CallWithRex() {
  const navigate = useNavigate();
  const [callState, setCallState] = useState<RexState>("idle");
  const [transcript, setTranscript] = useState("");
  const [rexReply, setRexReply] = useState("");
  const [amplitude, setAmplitude] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const callStateRef = useRef<RexState>(callState);
  const transcriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const initSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (callStateRef.current === "idle") {
        setCallState("listening");
        setTranscript("");
        transcriptRef.current = "";
      }
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      transcriptRef.current = currentTranscript;
    };

    recognition.onerror = (event: any) => {
      console.error("[CallWithRex] Speech recognition error:", event.error);
      if (event.error !== "aborted") {
        forceIdleCleanup();
      }
    };

    recognition.onend = () => {
      if (callStateRef.current === "listening" && !processingRef.current) {
        processTranscript();
      } else {
        forceIdleCleanup();
      }
    };

    return recognition;
  };

  const startAmplitudeTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
      console.error("Mic access denied or error:", err);
    }
  };

  const stopAmplitudeTracking = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t: any) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAmplitude(0);
  };

  const forceIdleCleanup = () => {
    stopAmplitudeTracking();
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    processingRef.current = false;
    setIsSpeaking(false);
    setCallState("idle");
  };

  const speakReply = (text: string) => {
    if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(true);
      const readingTimeMs = Math.max(3000, text.split(" ").length * 220 + 1500);
      setTimeout(() => {
        setIsSpeaking(false);
        forceIdleCleanup();
      }, readingTimeMs);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.15; // Friendly, youthful mentor voice

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
        ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        forceIdleCleanup();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        forceIdleCleanup();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsSpeaking(true);
      setTimeout(() => {
        setIsSpeaking(false);
        forceIdleCleanup();
      }, 3000);
    }
  };

  const startListening = () => {
    if (callState !== "idle") return;
    playPop();
    setRexReply("");

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
        startAmplitudeTracking();
      } catch (e) {
        forceIdleCleanup();
      }
    }
  };

  const stopListening = () => {
    if (callStateRef.current !== "listening") return;
    playTap();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const processTranscript = async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    stopAmplitudeTracking();

    const finalTranscript = transcriptRef.current;

    if (!finalTranscript.trim()) {
      forceIdleCleanup();
      return;
    }

    setCallState("processing");
    try {
      const msgs = [{ role: "user" as const, content: finalTranscript }];
      const reply = await callGroq(
        msgs,
        "You are Rex, an encouraging and concise AI study tutor. The user is speaking to you via voice. Reply in 1-2 short sentences. Do not use emojis, keep it conversational.",
        undefined,
        150,
        "call_with_rex"
      );
      setRexReply(reply);
      setCallState("responding");
      speakReply(reply);
    } catch (err) {
      const errorMsg = "Sorry, I had trouble processing that. Could you repeat?";
      setRexReply(errorMsg);
      setCallState("responding");
      speakReply(errorMsg);
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      forceIdleCleanup();
    };
  }, []);

  const handleClose = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    forceIdleCleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    playTap();
    if (!isMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsMuted(!isMuted);
  };

  const scale = 1 + (amplitude / 255) * 0.5;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#141210] text-white overflow-hidden">
      {/* Background Ambience */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30 blur-md pointer-events-none"
        style={{ backgroundImage: "url('/fox/call_bg.jpg')" }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between p-6 pt-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#10B981] animate-ping" />
          <h1 className="text-[17px] font-black tracking-wider uppercase">Live Voice with Rex</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Mute/Unmute Audio Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? "Unmute Rex Voice" : "Mute Rex Voice"}
            className="w-10 h-10 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-white">
              {isMuted ? "volume_off" : "volume_up"}
            </span>
          </button>

          {/* Close Call */}
          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-white">close</span>
          </button>
        </div>
      </div>

      {/* Main Stage: Airlearn-Style Animated Moving Rex */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-between p-6 pb-2">
        {/* Dynamic Caption / Dialogue Box */}
        <div className="w-full max-w-md min-h-[100px] flex flex-col justify-end">
          {/* User Transcript */}
          {callState === "listening" && (
            <div className="bg-black/60 backdrop-blur-md border-2 border-white/20 rounded-2xl p-4 shadow-[4px_4px_0px_#000] animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD13B] block mb-1">
                You (Listening...)
              </span>
              <p className="text-[16px] font-extrabold text-white leading-snug">
                {transcript || "Speak freely... Rex is listening"}
              </p>
            </div>
          )}

          {/* Rex Thinking State */}
          {callState === "processing" && (
            <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FF4D2E] flex items-center justify-center animate-pulse">
                  <span className="material-symbols-outlined text-white text-[16px]">psychology</span>
                </div>
                <div>
                  <p className="text-black font-black uppercase tracking-wider text-[12px]">
                    Rex is thinking...
                  </p>
                  <p className="text-black/60 font-bold text-[11px]">Synthesizing your answer</p>
                </div>
              </div>
            </div>
          )}

          {/* Rex Response Bubble */}
          {(callState === "responding" || (callState === "idle" && rexReply)) && rexReply && (
            <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0px_#000] animate-in fade-in zoom-in-95 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#FF4D2E] text-[11px] font-black uppercase tracking-wider">
                  Rex AI Tutor
                </span>
                {isSpeaking && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#10B981]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                    Speaking
                  </span>
                )}
              </div>
              <p className="text-black text-[16px] md:text-[18px] font-black leading-snug">
                {rexReply}
              </p>
            </div>
          )}
        </div>

        {/* Center: Alive Animated Rex with Lip-Sync & Audio Reaction */}
        <div className="my-auto py-4 flex flex-col items-center justify-center">
          <AnimatedRex
            state={callState}
            amplitude={amplitude}
            speaking={isSpeaking}
            size="xl"
            interactive={true}
            onClick={() => {
              if (callState === "idle") startListening();
            }}
          />
          <span className="text-[11px] font-bold text-white/50 mt-3 tracking-wide">
            {callState === "listening"
              ? "Rex is hearing your voice"
              : callState === "processing"
              ? "Rex is processing your concept"
              : callState === "responding"
              ? "Rex is speaking"
              : "Tap Rex or 'Tap to Speak' below"}
          </span>
        </div>

        {/* Bottom Control Bar */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-3xl p-4 flex items-center justify-between shadow-[0px_4px_20px_rgba(0,0,0,0.4)]">
          {/* Live Mic Halo Indicator */}
          <div className="w-14 h-14 flex items-center justify-center relative">
            <div
              className={`absolute w-12 h-12 rounded-full transition-transform duration-75 ${
                callState === "listening" ? "bg-red-500/40" : "bg-white/10"
              }`}
              style={{ transform: `scale(${scale})` }}
            />
            <div
              className={`relative w-11 h-11 rounded-full flex items-center justify-center z-10 transition-colors ${
                callState === "listening" ? "bg-red-500 text-white" : "bg-white/20 text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {callState === "listening" ? "mic" : "mic_none"}
              </span>
            </div>
          </div>

          {/* Central Call Trigger Button */}
          <button
            type="button"
            onClick={callState === "listening" ? stopListening : startListening}
            disabled={callState === "processing" || callState === "responding"}
            className={`px-8 py-3.5 rounded-full font-black text-[14px] uppercase tracking-wider transition-all border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer ${
              callState === "listening"
                ? "bg-red-500 text-white"
                : callState === "processing" || callState === "responding"
                ? "bg-gray-400 text-black opacity-60 cursor-not-allowed"
                : "bg-[#FFD13B] text-black hover:bg-white"
            }`}
          >
            {callState === "listening"
              ? "Done Speaking"
              : callState === "processing"
              ? "Thinking..."
              : callState === "responding"
              ? "Rex Speaking..."
              : "Tap to Speak"}
          </button>
        </div>
      </div>
    </div>
  );
}
