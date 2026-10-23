import React, { useState, useEffect } from "react";
import { playSuccess, triggerHaptic } from "@/lib/soundFX";

interface BurstItem {
  id: string;
  x: number;
  y: number;
  text: string;
  icon?: string;
}

export function triggerXPBurst(
  x?: number,
  y?: number,
  text: string = "+20 XP",
  icon: string = "⚡"
) {
  if (typeof window === "undefined") return;
  const targetX = typeof x === "number" && x > 0 ? x : window.innerWidth / 2;
  const targetY = typeof y === "number" && y > 0 ? y : window.innerHeight / 2;

  window.dispatchEvent(
    new CustomEvent("studenius:xp-burst", {
      detail: { x: targetX, y: targetY, text, icon },
    })
  );
}

export function FloatingXPOverlay() {
  const [bursts, setBursts] = useState<BurstItem[]>([]);

  useEffect(() => {
    const handleBurst = (e: any) => {
      const { x, y, text, icon } = e.detail || {};
      playSuccess();
      triggerHaptic("success");

      const newItem: BurstItem = {
        id: `burst-${Date.now()}-${Math.random()}`,
        x: x || window.innerWidth / 2,
        y: y || window.innerHeight / 2,
        text: text || "+20 XP",
        icon: icon || "⚡",
      };

      setBursts((prev) => [...prev.slice(-6), newItem]);

      setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== newItem.id));
      }, 1000);
    };

    window.addEventListener("studenius:xp-burst", handleBurst);
    return () => window.removeEventListener("studenius:xp-burst", handleBurst);
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute font-['Quicksand',sans-serif] font-black text-xs sm:text-sm px-3 py-1 rounded-full border-2 border-black bg-[#FFE566] text-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 whitespace-nowrap select-none"
          style={{
            left: `${b.x}px`,
            top: `${b.y}px`,
            animation: "xp-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <span className="text-[13px]">{b.icon}</span>
          <span>{b.text}</span>
        </div>
      ))}
    </div>
  );
}
