import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatedRex, RexState } from "@/components/AnimatedRex";
import { playPop, playSuccess, playTap } from "@/lib/soundFX";
import { triggerXPBurst } from "@/components/FloatingXPBurst";

const REX_WISDOMS = [
  "Testing beats re-reading! 5 minutes of active recall locks knowledge in.",
  "Mistakes aren't failures — they are neurons wiring new synapses!",
  "Keep your daily streak alive! Even 3 minutes counts.",
  "Why did the neuron cross the synapse? To get to the other axon!",
  "Take a deep breath. Focus on one high-yield concept at a time.",
  "Spaced repetition is the cheat code for permanent memory retention.",
];

export function PeekingRexCompanion() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [rexState, setRexState] = useState<RexState>("waving");
  const [wisdomIndex, setWisdomIndex] = useState(0);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);

  // Hide on dashboard (where Rex stands on the study path), practice lesson, onboarding, call, or full-screen focus modes
  const isHiddenRoute =
    location.pathname === "/dashboard" ||
    location.pathname === "/" ||
    location.pathname.startsWith("/onboarding") ||
    location.pathname.startsWith("/call") ||
    location.pathname.startsWith("/timer") ||
    location.pathname.startsWith("/practice");

  // Cycle Rex's idle speeches gently every 20 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setWisdomIndex((prev) => (prev + 1) % REX_WISDOMS.length);
      setShowSpeechBubble(true);
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  if (isHiddenRoute) return null;

  const handleOpenCompanion = (e: React.MouseEvent) => {
    playPop(1.1);
    setRexState("excited");
    triggerXPBurst(e.clientX, e.clientY - 20, "Pip says hi!", "✨");
    setIsOpen(true);
    setTimeout(() => setRexState("idle"), 1600);
  };

  const handleInspireMe = (e: React.MouseEvent) => {
    playSuccess();
    setRexState("dancing");
    triggerXPBurst(e.clientX, e.clientY - 20, "+10 Motivation XP", "💡");
    setWisdomIndex((prev) => (prev + 1) % REX_WISDOMS.length);
    setTimeout(() => setRexState("idle"), 1800);
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 sm:right-6 z-40 select-none font-['Quicksand',sans-serif]">
      {/* ── Collapsed / Peeking Mascot Dock ── */}
      {!isOpen && (
        <div className="relative flex items-end gap-2 group">
          {/* Ambient Speech Bubble */}
          {showSpeechBubble && !isMinimized && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white border-2 border-black rounded-2xl px-3 py-1.5 shadow-[2.5px_2.5px_0px_#000] max-w-[210px] animate-fadeIn text-left">
              <span className="text-[11.5px] font-black text-black leading-tight">
                {REX_WISDOMS[wisdomIndex]}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeechBubble(false);
                }}
                className="text-black/40 hover:text-black text-[10px] font-black pl-1 cursor-pointer"
                title="Dismiss tip"
              >
                ✕
              </button>
            </div>
          )}

          {/* Peeking Rex Button */}
          <button
            type="button"
            onClick={handleOpenCompanion}
            className="relative bg-[#FFE566] hover:bg-[#FFD13B] border-3 border-black rounded-full p-2.5 shadow-[0px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center group-hover:scale-105"
            title="Chat with Pip Companion"
          >
            {/* Pulsing Aura */}
            <span className="absolute -inset-1 rounded-full border-2 border-[#FFE566]/60 animate-ping pointer-events-none" />

            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
              <AnimatedRex
                state={rexState}
                size="sm"
                interactive={false}
                preferAnimatedWebP={true}
              />
            </div>

            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-black flex items-center justify-center text-[9px] font-black text-white">
              !
            </span>
          </button>
        </div>
      )}

      {/* ── Expanded Duolingo Quick Companion Card ── */}
      {isOpen && (
        <div className="bg-[#FFFDF5] border-3 border-black rounded-3xl p-4 sm:p-5 shadow-[4px_4px_0px_#000] w-[310px] sm:w-[330px] animate-fadeIn flex flex-col gap-3.5 relative">
          {/* Header Row */}
          <div className="flex items-center justify-between border-b-2 border-black/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#FFE566] border-2 border-black flex items-center justify-center text-[16px] shadow-[1px_1px_0px_#000]">
                🐾
              </div>
              <div>
                <h4 className="text-[14px] font-black text-black leading-tight">Pip Companion</h4>
                <p className="text-[10.5px] font-bold text-black/55">Your 24/7 Study Mascot</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTap();
                setIsOpen(false);
              }}
              className="w-7 h-7 rounded-full bg-white border-2 border-black flex items-center justify-center text-[12px] font-black hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Center Mascot & Speech */}
          <div className="flex items-center gap-3 bg-white border-2 border-black rounded-2xl p-3 shadow-[2px_2px_0px_#000]">
            <div className="shrink-0 w-14 h-14 flex items-center justify-center">
              <AnimatedRex
                state={rexState}
                size="sm"
                interactive={true}
                preferAnimatedWebP={true}
                onClick={handleInspireMe}
              />
            </div>
            <p className="text-[11.5px] font-extrabold text-black leading-snug">
              "{REX_WISDOMS[wisdomIndex]}"
            </p>
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                playSuccess();
                setIsOpen(false);
                navigate("/call");
              }}
              className="p-2.5 bg-white hover:bg-[#FFE566] border-2 border-black rounded-xl text-left shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#10B981]">call</span>
                <span className="text-[11.5px] font-black text-black">Voice Call</span>
              </div>
              <span className="text-[9.5px] font-bold text-black/50">Speak out loud</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSuccess();
                setIsOpen(false);
                navigate("/ai-tutor");
              }}
              className="p-2.5 bg-white hover:bg-[#FFE566] border-2 border-black rounded-xl text-left shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#0284C7]">chat</span>
                <span className="text-[11.5px] font-black text-black">Ask Tutor</span>
              </div>
              <span className="text-[9.5px] font-bold text-black/50">Syllabus AI chat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSuccess();
                setIsOpen(false);
                navigate("/practice");
              }}
              className="p-2.5 bg-white hover:bg-[#FFE566] border-2 border-black rounded-xl text-left shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#10B981]">bolt</span>
                <span className="text-[11.5px] font-black text-black">Quick Quiz</span>
              </div>
              <span className="text-[9.5px] font-bold text-black/50">5-min active recall</span>
            </button>

            <button
              type="button"
              onClick={handleInspireMe}
              className="p-2.5 bg-white hover:bg-[#FFE566] border-2 border-black rounded-xl text-left shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#FF9600]">lightbulb</span>
                <span className="text-[11.5px] font-black text-black">Inspire Me</span>
              </div>
              <span className="text-[9.5px] font-bold text-black/50">Next wisdom tip</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
