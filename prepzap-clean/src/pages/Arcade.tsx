import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { SourcePicker } from "@/components/SourcePicker";
import { AttachSourcePill } from "@/components/AttachSourcePill";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { useAuth } from "@/contexts/AuthContext";

export default function Arcade() {
  const navigate = useNavigate();
  const tutorial = useTutorialModal("/arcade");
  const { user } = useAuth();

  const GAMES = [
    { id: "memory-match", title: "Memory Match", icon: "content_copy", desc: "Flip & match terms to definitions", color: "bg-[#F5A623]" },
    { id: "true-false", title: "True/False Blitz", icon: "bolt", desc: "Rapid-fire fact checking", color: "bg-[#0EA5E9]" },
    { id: "termle", title: "Termle", icon: "spellcheck", desc: "Wordle-style vocabulary game", color: "bg-[#EC4899]" },
    { id: "anagram-sprint", title: "Anagram Sprint", icon: "sprint", desc: "Unscramble the letters against the clock", color: "bg-[#10B981]" },
    { id: "whack-a-mole", title: "Whack-a-Mole", icon: "pest_control", desc: "Whack the correct answer", color: "bg-[#10B981]" },
    { id: "odd-one-out", title: "Odd One Out", icon: "pageview", desc: "Find the item that doesn't belong", color: "bg-[#EAB308]" }
  ];

  return (
    <>
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/arcade"] || []} title="Arcade Mode" />
      <div className="w-full min-h-[100dvh] bg-[#FAF7F2] flex">
        <SharedSidebar active="/arcade" />
        <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
          
          <header className="h-16 w-full px-5 flex items-center justify-between bg-[#FAF7F2] border-b-[1.5px] border-black md:hidden">
            <div className="text-[18px] font-black tracking-wider uppercase">Arcade</div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] cursor-pointer" onClick={() => tutorial.show()}>help</span>
            </div>
          </header>

          <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
            <div>
              <h1 className="font-black text-[36px] text-black tracking-tight leading-none">Arcade</h1>
              <p className="text-[13px] text-black/50 font-medium mt-1">Play games based on your study materials.</p>
            </div>
            <div className="flex items-center gap-4">
              <AttachSourcePill />
              <button onClick={() => tutorial.show()} className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"><span className="material-symbols-outlined text-[20px]">help</span></button>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="md:hidden mb-6">
              <AttachSourcePill />
            </div>

            <h2 className="text-[18px] font-black mb-6">Select a Game</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {GAMES.map(game => (
                <div key={game.id} 
                  onClick={() => navigate(`/arcade/${game.id}`)}
                  className="group cursor-pointer border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl border-2 border-black ${game.color} flex items-center justify-center mb-4 shadow-[2px_2px_0px_#000]`}>
                    <span className="material-symbols-outlined text-[32px] text-white">{game.icon}</span>
                  </div>
                  <h3 className="font-black text-[20px] tracking-tight">{game.title}</h3>
                  <p className="text-[13px] font-bold text-black/50 mt-2">{game.desc}</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
