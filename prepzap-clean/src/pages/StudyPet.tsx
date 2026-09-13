import React, { useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF, useAnimations } from "@react-three/drei";
import { SharedSidebar } from "@/components/SharedSidebar";

// 3D Model Component - Supports both static pets and animated Mixamo characters
function PetModel({ modelUrl, isAnimation }: { modelUrl: string, isAnimation: boolean }) {
  const { scene, animations } = useGLTF(modelUrl);
  const { actions } = useAnimations(animations, scene);

  useEffect(() => {
    // If we have an animation, play the first one
    if (isAnimation && actions && Object.keys(actions).length > 0) {
      const actionName = Object.keys(actions)[0];
      actions[actionName]?.reset().fadeIn(0.2).play();
    }
  }, [actions, isAnimation, modelUrl]);

  return <primitive object={scene} scale={isAnimation ? 0.02 : 2} position={[0, -1.5, 0]} />;
}

// Random chat phrases
const CHAT_BUBBLES = [
  "Let's study together! 📚",
  "I'm feeling great today! ✨",
  "Don't forget to take breaks! 💤",
  "Wow, you're learning so fast! 🚀",
  "Can we play a game later? 🎮",
  "I love flashcards! 🎴",
  "Keep up the good work! 🌟"
];

const ANIMATIONS = [
  { id: "idle", label: "Idle" },
  { id: "joyful-jump", label: "Jump" },
  { id: "dancing-twerk", label: "Dance" },
  { id: "gangnam-style", label: "Gangnam" },
  { id: "head-hit", label: "Head Hit" },
  { id: "stomach-hit", label: "Belly Hit" },
  { id: "fall-over", label: "Fall" },
  { id: "thinking", label: "Think" },
  { id: "breakdance-1990", label: "Breakdance" }
];

export default function StudyPet() {
  const [activeModel, setActiveModel] = useState({ type: "pet", id: "fox" }); // type: "pet" | "anim"
  const [hunger, setHunger] = useState(85);
  const [energy, setEnergy] = useState(100);
  const [fun, setFun] = useState(60);
  const [coins, setCoins] = useState(420);
  const [chatMessage, setChatMessage] = useState("Let's study together! 📚");

  // Cycle chat bubbles randomly
  useEffect(() => {
    const interval = setInterval(() => {
      setChatMessage(CHAT_BUBBLES[Math.floor(Math.random() * CHAT_BUBBLES.length)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const modelUrl = activeModel.type === "pet" 
    ? `/models/${activeModel.id}.glb`
    : `/models/animations/${activeModel.id}.glb`;

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      <SharedSidebar active="/pet" />
      
      <div className="md:ml-64 flex-1 flex flex-col items-center justify-start relative p-6">
        
        {/* Header UI */}
        <div className="w-full flex justify-between items-start z-10 mb-4">
          <div>
            <h1 className="font-extrabold text-[28px]">My Study Buddy</h1>
            <p className="font-bold text-black/50 text-[14px]">Take care of them by studying!</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-[#FFD700] px-4 py-2 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_#000] font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined">monetization_on</span>
              {coins} Coins
            </div>
          </div>
        </div>

        {/* Needs Bars */}
        <div className="w-full max-w-4xl flex gap-4 mb-6">
          <div className="flex-1 bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-xl">
            <div className="flex justify-between font-extrabold text-[12px] mb-1">
              <span>🍔 Hunger</span>
              <span className="text-[#FF4D2E]">{hunger}%</span>
            </div>
            <div className="w-full h-3 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
              <div className="h-full bg-[#FF4D2E]" style={{ width: `${hunger}%` }} />
            </div>
          </div>
          <div className="flex-1 bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-xl">
            <div className="flex justify-between font-extrabold text-[12px] mb-1">
              <span>⚡ Energy</span>
              <span className="text-[#3b82f6]">{energy}%</span>
            </div>
            <div className="w-full h-3 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
              <div className="h-full bg-[#3b82f6]" style={{ width: `${energy}%` }} />
            </div>
          </div>
          <div className="flex-1 bg-white p-3 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-xl">
            <div className="flex justify-between font-extrabold text-[12px] mb-1">
              <span>🎮 Fun</span>
              <span className="text-[#10b981]">{fun}%</span>
            </div>
            <div className="w-full h-3 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
              <div className="h-full bg-[#10b981]" style={{ width: `${fun}%` }} />
            </div>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="w-full max-w-4xl h-[50vh] bg-white border-[3px] border-black shadow-[8px_8px_0px_#000] rounded-3xl overflow-hidden relative cursor-grab active:cursor-grabbing">
          
          {/* Chat Bubble */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white px-6 py-3 rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_#000] z-20 transition-all duration-300">
            <p className="font-extrabold text-[14px]">{chatMessage}</p>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-t-[12px] border-t-black border-r-[10px] border-r-transparent"></div>
            <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-white border-r-[6px] border-r-transparent"></div>
          </div>

          <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <spotLight position={[0, 10, 0]} intensity={0.8} penumbra={1} />
            
            <Suspense fallback={null}>
              <PetModel modelUrl={modelUrl} isAnimation={activeModel.type === "anim"} />
              <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2} far={4} />
            </Suspense>
            
            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 2}
            />
          </Canvas>
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center text-[12px] font-bold text-black/40 pointer-events-none">
            Drag to rotate your buddy
          </div>
        </div>

        {/* Pet / Animation Selection Menus */}
        <div className="w-full max-w-4xl mt-6 flex flex-col gap-4">
          
          {/* Animals */}
          <div>
            <h3 className="font-extrabold text-[14px] text-black/50 mb-2 uppercase tracking-wider">Choose Buddy</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {["fox", "bear", "bunny", "cat"].map(pet => (
                <button 
                  key={pet}
                  onClick={() => setActiveModel({ type: "pet", id: pet })}
                  className={`px-6 py-3 rounded-xl border-[3px] border-black font-extrabold text-[14px] transition-all whitespace-nowrap capitalize ${
                    activeModel.type === "pet" && activeModel.id === pet 
                      ? "bg-[#3b82f6] text-white shadow-[4px_4px_0px_#000] translate-y-[-4px]" 
                      : "bg-white text-black hover:bg-[#F0EDE0]"
                  }`}
                >
                  {pet}
                </button>
              ))}
            </div>
          </div>

          {/* Animations */}
          <div>
            <h3 className="font-extrabold text-[14px] text-black/50 mb-2 uppercase tracking-wider">Play Animation (Mixamo)</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
              {ANIMATIONS.map(anim => (
                <button 
                  key={anim.id}
                  onClick={() => setActiveModel({ type: "anim", id: anim.id })}
                  className={`px-6 py-3 rounded-xl border-[3px] border-black font-extrabold text-[14px] transition-all whitespace-nowrap ${
                    activeModel.type === "anim" && activeModel.id === anim.id 
                      ? "bg-[#10b981] text-white shadow-[4px_4px_0px_#000] translate-y-[-4px]" 
                      : "bg-white text-black hover:bg-[#F0EDE0]"
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
