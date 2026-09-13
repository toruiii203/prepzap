import React, { useEffect, useImperativeHandle, forwardRef, useState, useMemo } from "react";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { PetAnimationName } from "@/types/petAnimations";

export interface PetModelRef {
  play: (name: PetAnimationName, options?: { loop?: boolean; holdPartway?: boolean }) => void;
  triggerParticles: (type: "hearts" | "stars" | "zzz") => void;
}

interface PetModelProps {
  onPointerDown?: (e: any, part: "head" | "belly") => void;
}

// Preload all assets
const ANIMATION_FILES: Record<PetAnimationName, string> = {
  "idle": "/models/animations/idle.glb",
  "joyful-jump": "/models/animations/joyful-jump.glb",
  "dancing-twerk": "/models/animations/dancing-twerk.glb",
  "gangnam-style": "/models/animations/gangnam-style.glb",
  "head-hit": "/models/animations/head-hit.glb",
  "stomach-hit": "/models/animations/stomach-hit.glb",
  "fall-over": "/models/animations/fall-over.glb",
  "thinking": "/models/animations/thinking.glb",
  "breakdance-1990": "/models/animations/breakdance-1990.glb"
};

Object.values(ANIMATION_FILES).forEach(url => useGLTF.preload(url));

export const PetModel = forwardRef<PetModelRef, PetModelProps>(({ onPointerDown }, ref) => {
  // Use idle as the base mesh
  const { scene } = useGLTF(ANIMATION_FILES["idle"]);
  
  // Load all animations
  const idleData = useGLTF(ANIMATION_FILES["idle"]);
  const jumpData = useGLTF(ANIMATION_FILES["joyful-jump"]);
  const danceData = useGLTF(ANIMATION_FILES["dancing-twerk"]);
  const gangnamData = useGLTF(ANIMATION_FILES["gangnam-style"]);
  const headHitData = useGLTF(ANIMATION_FILES["head-hit"]);
  const stomachHitData = useGLTF(ANIMATION_FILES["stomach-hit"]);
  const fallData = useGLTF(ANIMATION_FILES["fall-over"]);
  const thinkData = useGLTF(ANIMATION_FILES["thinking"]);
  const breakdanceData = useGLTF(ANIMATION_FILES["breakdance-1990"]);

  // Extract clips and rename them
  const clips = useMemo(() => {
    const rawClips = [
      { name: "idle", data: idleData },
      { name: "joyful-jump", data: jumpData },
      { name: "dancing-twerk", data: danceData },
      { name: "gangnam-style", data: gangnamData },
      { name: "head-hit", data: headHitData },
      { name: "stomach-hit", data: stomachHitData },
      { name: "fall-over", data: fallData },
      { name: "thinking", data: thinkData },
      { name: "breakdance-1990", data: breakdanceData }
    ];

    return rawClips.map(({ name, data }) => {
      const originalClip = data.animations[0];
      if (!originalClip) return null;
      const clonedClip = originalClip.clone();
      clonedClip.name = name;
      return clonedClip;
    }).filter(Boolean) as THREE.AnimationClip[];
  }, [
    idleData, jumpData, danceData, gangnamData, 
    headHitData, stomachHitData, fallData, thinkData, breakdanceData
  ]);

  const { actions, mixer } = useAnimations(clips, scene);
  const [activeAction, setActiveAction] = useState<PetAnimationName | null>(null);
  const [particles, setParticles] = useState<{ id: number, type: string, x: number, y: number }[]>([]);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      console.log("[PetModel] Successfully loaded and renamed clips:", Object.keys(actions));
      // Force idle to play on initial mount if nothing else is playing
      if (!activeAction && actions["idle"]) {
        actions["idle"].reset().fadeIn(0.2).play();
        setActiveAction("idle");
      }
    }
  }, [actions]);

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
      
      action.setEffectiveTimeScale(1);
      action.play();
      
      if (options.holdPartway) {
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

  return (
    <group>
      {/* Decoupled mesh rendering: it ALWAYS renders the scene even if animations fail */}
      {scene && (
        <primitive 
          object={scene} 
          scale={0.02} // Since we use the animated mixamo rig as base, 0.02 is correct
          position={[0, -1.5, 0]} 
          onPointerDown={(e: any) => {
            e.stopPropagation();
            const localY = e.point.y; 
            const part = localY > 1.0 ? "head" : "belly";
            onPointerDown?.(e, part);
          }}
        />
      )}
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

