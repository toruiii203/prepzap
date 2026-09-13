import React, { useEffect, useImperativeHandle, forwardRef, useState } from "react";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { PetAnimationName } from "@/types/petAnimations";

export interface PetModelRef {
  play: (name: PetAnimationName, options?: { loop?: boolean; holdPartway?: boolean }) => void;
  triggerParticles: (type: "hearts" | "stars" | "zzz") => void;
}

interface PetModelProps {
  modelUrl: string;
  onPointerDown?: (e: any, part: "head" | "belly") => void;
}

export const PetModel = forwardRef<PetModelRef, PetModelProps>(({ modelUrl, onPointerDown }, ref) => {
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, mixer } = useAnimations(animations, scene);
  const [activeAction, setActiveAction] = useState<PetAnimationName | null>(null);
  const [particles, setParticles] = useState<{ id: number, type: string, x: number, y: number }[]>([]);

  useImperativeHandle(ref, () => ({
    play: (name: PetAnimationName, options = { loop: true, holdPartway: false }) => {
      if (!actions) return;
      const action = actions[name];
      if (!action) {
        console.warn(`[PetModel] Animation clip "${name}" not found!`);
        return;
      }
      
      if (activeAction && activeAction !== name && actions[activeAction]) {
        actions[activeAction]?.fadeOut(0.3);
      }
      
      action.reset().fadeIn(0.3);
      
      if (!options.loop) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      
      // If requested to hold partway (e.g. for Fall), we can stop it early using a mixer event or time
      action.setEffectiveTimeScale(1);
      action.play();
      
      if (options.holdPartway) {
        // Halt animation at 50% progress
        setTimeout(() => {
          if (action && action.isRunning()) {
             action.paused = true;
          }
        }, (action.getClip().duration * 1000) / 2);
      } else {
        action.paused = false;
      }

      setActiveAction(name);
    },
    triggerParticles: (type) => {
      const id = Date.now();
      setParticles((p) => [...p, { id, type, x: (Math.random() - 0.5) * 100, y: Math.random() * 50 }]);
      setTimeout(() => {
        setParticles((p) => p.filter(part => part.id !== id));
      }, 2000);
    }
  }));

  useEffect(() => {
    return () => {
      if (activeAction && actions && actions[activeAction]) {
        actions[activeAction]?.stop();
      }
    };
  }, []);

  return (
    <group>
      <primitive 
        object={scene} 
        scale={modelUrl.includes("animations") ? 0.02 : 2} 
        position={[0, -1.5, 0]} 
        onPointerDown={(e: any) => {
          e.stopPropagation();
          // Raycast local Y determination for head vs belly
          const localY = e.point.y; 
          const part = localY > 1.0 ? "head" : "belly";
          onPointerDown?.(e, part);
        }}
      />
      {particles.map((p) => (
        <Html key={p.id} position={[0, 1, 0]} center zIndexRange={[100, 0]}>
          <div 
            className="pointer-events-none select-none text-2xl animate-bounce" 
            style={{ 
              transform: `translate(${p.x}px, ${p.y}px)`, 
              transition: "transform 2s ease-out, opacity 2s ease-out",
              opacity: 0
            }}
            ref={el => {
              if (el) {
                requestAnimationFrame(() => {
                  el.style.transform = `translate(${p.x}px, ${p.y - 100}px)`;
                  el.style.opacity = "1";
                  setTimeout(() => { el.style.opacity = "0"; }, 1500);
                });
              }
            }}
          >
            {p.type === "hearts" ? "❤️" : p.type === "stars" ? "⭐" : "💤"}
          </div>
        </Html>
      ))}
    </group>
  );
});

useGLTF.preload("/models/fox.glb");

