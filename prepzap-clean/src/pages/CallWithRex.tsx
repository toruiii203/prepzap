import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { callGroq } from "@/lib/groq";

const FOX_STATES = {
  idle: "/fox/fox-neutral.png",
  listening: "/fox/fox-peeking.png",
  processing: "/fox/fox-thinking.png",
  responding: "/fox/fox-happy.png",
};

type CallState = "idle" | "listening" | "processing" | "responding";

export default function CallWithRex() {
  const navigate = useNavigate();
  const [callState, setCallState] = useState<CallState>("idle");
  const [transcript, setTranscript] = useState("");
  const [rexReply, setRexReply] = useState("");
  const [amplitude, setAmplitude] = useState(0);
  
  const callStateRef = useRef<CallState>(callState);
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // Explicitly only transition to listening if we are idle (prevent duplicate starts)
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
      // If we ended naturally or via STOP, and were listening, process it.
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
      recognitionRef.current.onend = null; // Prevent loops
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    processingRef.current = false;
    setCallState("idle");
  };

  const startListening = () => {
    if (callState !== "idle") return; // Prevent duplicate sessions
    setRexReply("");
    
    // Cleanup any lingering instances
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
        // Handle case where recognition is already started
        forceIdleCleanup();
      }
    }
  };

  const stopListening = () => {
    if (callStateRef.current !== "listening") return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    // Note: stopping recognition triggers onend, which handles processTranscript.
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
      
      // Auto-return to idle after reading time (rough estimate: 100ms per word + 2s buffer)
      const readingTimeMs = Math.max(3000, (reply.split(" ").length * 200) + 2000);
      setTimeout(() => {
         if (callStateRef.current === "responding") {
            forceIdleCleanup();
         }
      }, readingTimeMs);
      
    } catch (err) {
      setRexReply("Sorry, I had trouble processing that. Could you repeat?");
      setCallState("responding");
      setTimeout(() => forceIdleCleanup(), 4000);
    } finally {
      processingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      forceIdleCleanup();
    };
  }, []);

  const handleClose = () => {
    forceIdleCleanup();
    navigate(-1);
  };

  const scale = 1 + (amplitude / 255) * 0.5;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden">
      {/* Background Asset */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 blur-sm"
        style={{ backgroundImage: "url('/fox/call_bg.jpg')" }}
      />
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.01); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* Rex Character Avatar */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none mt-20">
        <img 
          src={
            callState === "processing" ? FOX_STATES.processing :
            callState === "listening" ? FOX_STATES.listening :
            callState === "responding" ? FOX_STATES.responding :
            FOX_STATES.idle
          } 
          alt="Rex" 
          className={`w-full max-w-[400px] object-contain transition-transform duration-75 ${(callState === "idle" || callState === "responding") ? "animate-float" : ""}`}
          style={{ 
            transform: callState === "listening" 
              ? `scale(${1 + (amplitude / 255) * 0.15})` 
              : callState === "processing"
              ? "scale(1.02) rotate(2deg) translateY(-10px)"
              : (callState === "idle" || callState === "responding")
              ? "scale(1)" 
              : "scale(1.05)",
            filter: "drop-shadow(0px 20px 30px rgba(0,0,0,0.5))"
          }}
        />
      </div>
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/60 to-transparent">
        <h1 className="text-xl font-black tracking-widest uppercase">Call with Rex</h1>
        <button 
          onClick={handleClose}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-white">close</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start p-6 pt-10">
        
        {/* User Speech Caption (Listening) */}
        {callState === "listening" && (
          <div className="w-full max-w-md bg-black/50 backdrop-blur-md border border-white/20 rounded-2xl p-5 mb-4 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-white/70 text-sm font-bold uppercase tracking-wider mb-2">You</p>
            <p className="text-lg font-semibold">{transcript || "Listening..."}</p>
          </div>
        )}

        {/* Rex Thinking State */}
        {callState === "processing" && (
          <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl p-5 mb-4 shadow-[4px_4px_0px_#000] animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#ae2925] flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-white text-[16px]">psychology</span>
              </div>
              <p className="text-black font-black uppercase tracking-widest text-sm">Rex is thinking...</p>
            </div>
          </div>
        )}

        {/* Rex Text Response (Responding) */}
        {(callState === "responding" || (callState === "idle" && rexReply)) && rexReply && (
          <div className="w-full max-w-md bg-white border-2 border-black rounded-2xl p-6 mb-4 shadow-[6px_6px_0px_#000] animate-in fade-in zoom-in-95 relative">
            <div className="absolute -bottom-3 left-8 w-6 h-6 bg-white border-b-2 border-l-2 border-black transform -rotate-45" />
            <p className="text-[#ae2925] text-sm font-black uppercase tracking-wider mb-2">Rex</p>
            <p className="text-black text-xl font-bold leading-snug">{rexReply}</p>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="relative z-10 bg-gradient-to-t from-black via-black/80 to-transparent p-8 pb-12 flex items-center justify-between">
        
        {/* Mic Visualizer */}
        <div className="w-16 h-16 flex items-center justify-center">
          <div 
            className={`absolute w-12 h-12 rounded-full transition-transform duration-75 ${callState === "listening" ? "bg-red-500/40" : "bg-white/10"}`}
            style={{ transform: `scale(${scale})` }}
          />
          <div className={`relative w-12 h-12 rounded-full flex items-center justify-center z-10 ${callState === "listening" ? "bg-red-500 text-white" : "bg-white/20 text-white"}`}>
            <span className="material-symbols-outlined">{callState === "listening" ? "mic" : "mic_off"}</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={callState === "listening" ? stopListening : startListening}
          disabled={callState === "processing" || callState === "responding"}
          className={`px-8 py-4 rounded-full font-black text-lg uppercase tracking-widest transition-all ${
            callState === "listening" 
              ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]" 
              : (callState === "processing" || callState === "responding")
              ? "bg-gray-500 text-white opacity-50"
              : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          {callState === "listening" ? "Stop" : callState === "processing" ? "Thinking..." : callState === "responding" ? "Speaking..." : "Tap to Speak"}
        </button>
      </div>
    </div>
  );
}
