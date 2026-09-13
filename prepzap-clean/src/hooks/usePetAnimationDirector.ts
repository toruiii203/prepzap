import { useEffect, useRef, useCallback } from "react";
import { PetModelRef } from "@/components/PetModel";
import { PetStats } from "./usePetStats";
import { PetAnimationName } from "@/types/petAnimations";

export function usePetAnimationDirector(
  petRef: React.RefObject<PetModelRef>,
  stats: PetStats
) {
  const isAnimatingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Base mood based on stats
  useEffect(() => {
    if (isAnimatingRef.current || !petRef.current) return;

    if (stats.isSleeping) {
      petRef.current.play("thinking", { loop: true }); // Using thinking for sleep pose
      return;
    }

    if (stats.hunger < 30 || stats.fun < 30) {
      // Play fall-over and hold it partway to represent sadness/exhaustion
      petRef.current.play("fall-over", { loop: false, holdPartway: true });
    } else {
      petRef.current.play("idle", { loop: true });
    }
  }, [stats.hunger, stats.fun, stats.energy, stats.isSleeping, petRef]);

  const triggerAction = useCallback((actionType: "feed" | "play" | "sleep" | "petHead" | "petBelly") => {
    if (!petRef.current) return;
    
    // Global debounce: block overlapping actions for 1.5s
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    let animName: PetAnimationName = "idle";
    
    switch (actionType) {
      case "feed":
        animName = "stomach-hit";
        petRef.current.triggerParticles("hearts");
        break;
      case "play":
        const playAnims: PetAnimationName[] = ["dancing-twerk", "gangnam-style", "breakdance-1990"];
        animName = playAnims[Math.floor(Math.random() * playAnims.length)];
        petRef.current.triggerParticles("stars");
        break;
      case "petHead":
        animName = "head-hit";
        petRef.current.triggerParticles("hearts");
        break;
      case "petBelly":
        animName = "stomach-hit";
        petRef.current.triggerParticles("hearts");
        break;
    }

    petRef.current.play(animName, { loop: false });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      isAnimatingRef.current = false;
      // Force an update to restore idle mood based on stats
      if (petRef.current) {
        if (stats.isSleeping) {
          petRef.current.play("thinking", { loop: true });
        } else if (stats.hunger < 30 || stats.fun < 30) {
          petRef.current.play("fall-over", { loop: false, holdPartway: true });
        } else {
          petRef.current.play("idle", { loop: true });
        }
      }
    }, 1500);

  }, [petRef, stats]);

  return { triggerAction };
}

