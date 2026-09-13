import React, { useState, Suspense, useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { SharedSidebar } from "@/components/SharedSidebar";
import { PetModel, PetModelRef } from "@/components/PetModel";
import { usePetStats } from "@/hooks/usePetStats";
import { usePetAnimationDirector } from "@/hooks/usePetAnimationDirector";

const CHAT_BUBBLES_HAPPY = [
  "Let's study together! 📚",
  "I'm feeling great today! ✨",
  "Wow, you're learning so fast! 🚀",
  "Keep up the good work! 🌟"
];

const CHAT_BUBBLES_SAD = [
  "I'm so hungry... 🍕",
  "Can we play a game? 🎮",
  "I feel ignored... 🥺"
];

const CHAT_BUBBLES_SLEEPY = [
  "Zzzzz...",
  "So sleepy...",
  "Do not disturb 😴"
];

export default function StudyPet() {
  const [activeModel, setActiveModel] = useState({ type: "pet", id: "idle" }); // We use the animated mixamo mesh as base
  const { stats, updateStat, addCoins } = usePetStats();
  const petRef = useRef<PetModelRef>(null);
  const { triggerAction } = usePetAnimationDirector(petRef, stats);
  const [chatMessage, setChatMessage] = useState("Let's study together! 📚");
  const [showCustomize, setShowCustomize] = useState(false);

  // Update chat message based on stats occasionally
  useEffect(() => {
    const updateChat = () => {
      if (stats.isSleeping) {
        setChatMessage(CHAT_BUBBLES_SLEEPY[Math.floor(Math.random() * CHAT_BUBBLES_SLEEPY.length)]);
      } else if (stats.hunger < 30 || stats.fun < 30) {
        setChatMessage(CHAT_BUBBLES_SAD[Math.floor(Math.random() * CHAT_BUBBLES_SAD.length)]);
      } else {
        setChatMessage(CHAT_BUBBLES_HAPPY[Math.floor(Math.random() * CHAT_BUBBLES_HAPPY.length)]);
      }
    };
    updateChat();
    const interval = setInterval(updateChat, 8000);
    return () => clearInterval(interval);
  }, [stats.hunger, stats.fun, stats.isSleeping]);

  const handleFeed = () => {
    if (stats.isSleeping || stats.coins < 10) return;
    addCoins(-10);
    updateStat("hunger", Math.min(100, stats.hunger + 20));
    triggerAction("feed");
  };

  const handlePlay = () => {
    if (stats.isSleeping || stats.energy < 15) return;
    updateStat("energy", Math.max(0, stats.energy - 15));
    updateStat("fun", Math.min(100, stats.fun + 25));
    triggerAction("play");
  };

  const handleSleepToggle = () => {
    if (stats.isSleeping) {
      updateStat("isSleeping", false);
    } else {
      updateStat("isSleeping", true);
      triggerAction("sleep");
    }
  };

  const handlePointerDown = (e: any, part: "head" | "belly") => {
    if (stats.isSleeping) return;
    updateStat("fun", Math.min(100, stats.fun + 5));
    triggerAction(part === "head" ? "petHead" : "petBelly");
  };

  return (
    <div className="w-full bg-[#FFB6C1] flex flex-col" style={{ minHeight: "100dvh" }}>
      <SharedSidebar active="/pet" />
      
      <div className="md:ml-64 flex-1 flex flex-col items-center justify-start relative p-6">
        
        {/* Header UI */}
        <div className="w-full flex justify-between items-start z-10 mb-4 bg-white/40 p-4 rounded-3xl border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,0.2)] backdrop-blur-sm">
          <div>
            <h1 className="font-extrabold text-[28px] text-black">My Study Buddy</h1>
            <p className="font-bold text-black/70 text-[14px]">Study to earn coins and take care of them!</p>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setShowCustomize(true)}
              className="bg-[#FAF7F2] px-4 py-2 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_#000] font-extrabold hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all"
            >
              Customize
            </button>
            <div className="bg-[#FFD700] px-4 py-2 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_#000] font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined">monetization_on</span>
              {Math.floor(stats.coins)}
            </div>
          </div>
        </div>

        {/* Needs Bars */}
        <div className="w-full max-w-4xl flex gap-4 mb-2 z-10">
          <div className="flex-1 bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-2xl">
            <div className="flex justify-between font-extrabold text-[12px] mb-1">
              <span>🍕 Hunger</span>
              <span className="text-[#FF4D2E]">{Math.floor(stats.hunger)}%</span>
            </div>
            <div className="w-full h-4 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
              <div className="h-full bg-[#FF4D2E]" style={{ width: `${stats.hunger}%` }} />
            </div>
          </div>
          <div className="flex-1 bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-2xl">
            <div className="flex justify-between font-extrabold text-[12px] mb-1">
              <span>⚡ Energy</span>
              <span className="text-[#3b82f6]">{Math.floor(stats.energy)}%</span>
            </div>
            <div className="w-full h-4 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
              <div className="h-full bg-[#3b82f6]" style={{ width: `${stats.energy}%` }} />
            </div>
          </div>
          <div className="flex-1 bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-2xl">
            <div className="flex justify-between font-extrabold text-[12px] mb-1">
              <span>🎮 Fun</span>
              <span className="text-[#10b981]">{Math.floor(stats.fun)}%</span>
            </div>
            <div className="w-full h-4 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
              <div className="h-full bg-[#10b981]" style={{ width: `${stats.fun}%` }} />
            </div>
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 w-full max-w-4xl relative mt-4 rounded-3xl overflow-hidden border-[4px] border-black shadow-[8px_8px_0px_#000] bg-gradient-to-b from-[#87CEEB] to-[#E0F6FF]">
          
          {/* Chat Bubble */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-3xl border-[3px] border-black shadow-[4px_4px_0px_#000] z-20 font-extrabold text-[15px] animate-bounce max-w-[80%] text-center">
            {chatMessage}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-[3px] border-r-[3px] border-black transform rotate-45"></div>
          </div>

          <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000 ${stats.isSleeping ? "bg-black/40" : "bg-transparent"}`}></div>

          <Canvas 
            camera={{ position: [0, 1.5, 6], fov: 45 }}
            className="w-full h-full"
            style={{ cursor: "pointer" }}
          >
            <ambientLight intensity={stats.isSleeping ? 0.2 : 0.6} />
            <directionalLight position={[5, 5, 5]} intensity={stats.isSleeping ? 0.3 : 1} castShadow />
            <Suspense fallback={null}>
              <group rotation={[0, -Math.PI / 2, 0]}>
                <PetModel 
                  ref={petRef}
                  modelUrl={`/models/animations/${activeModel.id}.glb`} 
                  onPointerDown={handlePointerDown} 
                />
              </group>
              <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={10} blur={2} />
            </Suspense>
          </Canvas>

          {/* Action Buttons */}
          <div className="absolute bottom-6 left-0 w-full flex justify-center gap-6 z-20 px-4">
            <button 
              onClick={handleFeed}
              disabled={stats.isSleeping || stats.coins < 10}
              className={`flex flex-col items-center gap-1 bg-[#FF9B71] p-4 rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000] transition-transform ${stats.isSleeping || stats.coins < 10 ? "opacity-50 grayscale cursor-not-allowed" : "hover:-translate-y-2 active:translate-y-0 active:shadow-none"}`}
            >
              <span className="material-symbols-outlined text-[32px] text-white">restaurant</span>
              <span className="bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black mt-[-10px] z-10">-10 💰</span>
            </button>

            <button 
              onClick={handlePlay}
              disabled={stats.isSleeping || stats.energy < 15}
              className={`flex flex-col items-center gap-1 bg-[#10b981] p-4 rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000] transition-transform ${stats.isSleeping || stats.energy < 15 ? "opacity-50 grayscale cursor-not-allowed" : "hover:-translate-y-2 active:translate-y-0 active:shadow-none"}`}
            >
              <span className="material-symbols-outlined text-[32px] text-white">sports_esports</span>
              <span className="bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black mt-[-10px] z-10">-15 ⚡</span>
            </button>

            <button 
              onClick={handleSleepToggle}
              className="flex flex-col items-center gap-1 bg-[#3b82f6] p-4 rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000] transition-transform hover:-translate-y-2 active:translate-y-0 active:shadow-none"
            >
              <span className="material-symbols-outlined text-[32px] text-white">{stats.isSleeping ? "wb_sunny" : "bedtime"}</span>
              <span className="bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-black border-2 border-black mt-[-10px] z-10">{stats.isSleeping ? "Wake" : "Sleep"}</span>
            </button>
          </div>
        </div>

      </div>

      {showCustomize && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-[4px] border-black shadow-[8px_8px_0px_#000] p-8 max-w-md w-full">
            <h2 className="text-2xl font-black mb-4">Customize Pet</h2>
            <p className="text-black/60 font-bold mb-6">Choose a base model to care for. (Currently using idle rig as base placeholder)</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button className="border-[3px] border-black rounded-xl p-4 font-extrabold hover:bg-[#FAF7F2] active:translate-y-1">Fox</button>
              <button className="border-[3px] border-black rounded-xl p-4 font-extrabold hover:bg-[#FAF7F2] active:translate-y-1">Bear</button>
            </div>
            <button 
              onClick={() => setShowCustomize(false)}
              className="w-full bg-[#FF4D2E] text-white font-black py-4 border-[3px] border-black rounded-xl shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

