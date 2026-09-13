import { useState, useEffect, useCallback } from "react";

export interface PetStats {
  hunger: number;
  energy: number;
  fun: number;
  coins: number;
  isSleeping: boolean;
  lastSeenTimestamp: number;
}

const DEFAULT_STATS: PetStats = {
  hunger: 80,
  energy: 100,
  fun: 80,
  coins: 420,
  isSleeping: false,
  lastSeenTimestamp: Date.now()
};

// Rates (points per second)
const PASSIVE_DECAY_RATE = 100 / (12 * 3600); // Decays fully in 12 hours
const SLEEP_RECOVERY_RATE = 100 / (2 * 3600); // Fully recovers in 2 hours

export function usePetStats() {
  const [stats, setStats] = useState<PetStats>(() => {
    const saved = localStorage.getItem("pz_pet_stats");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATS, ...parsed };
      } catch (e) {
        return DEFAULT_STATS;
      }
    }
    return DEFAULT_STATS;
  });

  // Calculate offline decay/recovery on mount and every minute
  useEffect(() => {
    const calculateTimeDiff = () => {
      setStats(prev => {
        const now = Date.now();
        const elapsedSeconds = (now - prev.lastSeenTimestamp) / 1000;
        
        if (elapsedSeconds < 1) return prev; // Avoid spamming updates for <1s

        let newEnergy = prev.energy;
        let newHunger = prev.hunger;
        let newFun = prev.fun;
        let stillSleeping = prev.isSleeping;

        if (prev.isSleeping) {
          newEnergy = Math.min(100, prev.energy + (elapsedSeconds * SLEEP_RECOVERY_RATE));
          // Auto wake up if full
          if (newEnergy >= 100) stillSleeping = false;
        } else {
          newEnergy = Math.max(0, prev.energy - (elapsedSeconds * PASSIVE_DECAY_RATE));
        }

        newHunger = Math.max(0, prev.hunger - (elapsedSeconds * PASSIVE_DECAY_RATE));
        newFun = Math.max(0, prev.fun - (elapsedSeconds * PASSIVE_DECAY_RATE));

        return {
          ...prev,
          energy: newEnergy,
          hunger: newHunger,
          fun: newFun,
          isSleeping: stillSleeping,
          lastSeenTimestamp: now
        };
      });
    };

    calculateTimeDiff(); // Run once immediately
    
    // Then run every 10 seconds to keep stats moving slowly in real time
    const interval = setInterval(calculateTimeDiff, 10000);
    return () => clearInterval(interval);
  }, []);

  // Save to localStorage whenever stats change
  useEffect(() => {
    localStorage.setItem("pz_pet_stats", JSON.stringify(stats));
  }, [stats]);

  const updateStat = useCallback((key: keyof PetStats, value: number | boolean) => {
    setStats(prev => ({ ...prev, [key]: value, lastSeenTimestamp: Date.now() }));
  }, []);

  const addCoins = useCallback((amount: number) => {
    setStats(prev => ({ ...prev, coins: Math.max(0, prev.coins + amount), lastSeenTimestamp: Date.now() }));
  }, []);

  return { stats, updateStat, addCoins };
}

