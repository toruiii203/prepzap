import React, { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useGLTF } from "@react-three/drei";
import { SharedSidebar } from "@/components/SharedSidebar";

// The 3D Model Component
function PetModel({ petType }: { petType: string }) {
  // We use the Draco-compressed models we just created
  const { scene } = useGLTF(`/models/${petType}.glb`);
  return <primitive object={scene} scale={2} position={[0, -1.5, 0]} />;
}

export default function StudyPet() {
  const [activePet, setActivePet] = useState("fox"); // "fox" or "bear"
  const [health, setHealth] = useState(85);
  const [xp, setXp] = useState(420);

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      <SharedSidebar active="/pet" />
      
      <div className="md:ml-64 flex-1 flex flex-col items-center justify-center relative p-6">
        
        {/* Header UI */}
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start z-10">
          <div>
            <h1 className="font-extrabold text-[28px]">My Study Buddy</h1>
            <p className="font-bold text-black/50 text-[14px]">Keep studying to level them up!</p>
          </div>
          
          <div className="flex flex-col gap-3 bg-white p-4 border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-xl w-64">
            {/* Health Bar */}
            <div>
              <div className="flex justify-between font-extrabold text-[12px] mb-1">
                <span>Health</span>
                <span className="text-[#FF4D2E]">{health}%</span>
              </div>
              <div className="w-full h-3 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
                <div className="h-full bg-[#FF4D2E]" style={{ width: `${health}%` }} />
              </div>
            </div>
            
            {/* XP Bar */}
            <div>
              <div className="flex justify-between font-extrabold text-[12px] mb-1">
                <span>Study XP</span>
                <span className="text-[#3b82f6]">{xp} XP</span>
              </div>
              <div className="w-full h-3 bg-[#E2E2E2] rounded-full overflow-hidden border-2 border-black">
                <div className="h-full bg-[#3b82f6]" style={{ width: `${(xp / 1000) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3D Canvas Area */}
        <div className="w-full max-w-4xl h-[60vh] bg-white border-[3px] border-black shadow-[8px_8px_0px_#000] rounded-3xl overflow-hidden relative mt-16 cursor-grab active:cursor-grabbing">
          <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <spotLight position={[0, 10, 0]} intensity={0.8} penumbra={1} />
            
            <Suspense fallback={null}>
              <PetModel petType={activePet} />
              {/* Nice drop shadow under the pet */}
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

        {/* Pet Picker / Interaction Bar */}
        <div className="flex gap-4 mt-8">
          <button 
            onClick={() => setActivePet("fox")}
            className={`px-8 py-4 rounded-xl border-[3px] border-black font-extrabold text-[16px] transition-all ${
              activePet === "fox" 
                ? "bg-[#FF4D2E] text-white shadow-[4px_4px_0px_#000] translate-y-[-4px]" 
                : "bg-white text-black hover:bg-[#F0EDE0]"
            }`}
          >
            Study Fox
          </button>
          <button 
            onClick={() => setActivePet("bear")}
            className={`px-8 py-4 rounded-xl border-[3px] border-black font-extrabold text-[16px] transition-all ${
              activePet === "bear" 
                ? "bg-[#3b82f6] text-white shadow-[4px_4px_0px_#000] translate-y-[-4px]" 
                : "bg-white text-black hover:bg-[#F0EDE0]"
            }`}
          >
            Study Bear
          </button>
        </div>

      </div>
    </div>
  );
}
