import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarDisplay } from "@/components/AvatarDisplay";

const MESSAGES = [
  "Nice answer!", "You're on fire!", "Keep going!", "Big brain energy!", 
  "Almost there!", "Nailed it!", "Focus mode: on 🎯", "You got this!"
];

export function BuddyCompanion() {
  const { profile } = useAuth();
  const [pose, setPose] = useState<"idle"|"thinking"|"hype"|"celebrate">("idle");
  const [msgIdx, setMsgIdx] = useState(0);
  
  // Actually we should use AvatarDisplay here so it loads the custom config
  const config = profile?.avatar_config || { buddyId: "fox_scholar" };

  useEffect(() => {
    const handleStart = () => setPose("thinking");
    const handleEnd = () => {
      setPose("hype");
      setMsgIdx((prev) => (prev + 1) % MESSAGES.length);
      setTimeout(() => setPose("idle"), 2000);
    };
    const handleError = () => setPose("idle");

    window.addEventListener("ai_start", handleStart);
    window.addEventListener("ai_end", handleEnd);
    window.addEventListener("ai_error", handleError);

    return () => {
      window.removeEventListener("ai_start", handleStart);
      window.removeEventListener("ai_end", handleEnd);
      window.removeEventListener("ai_error", handleError);
    };
  }, []);

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none"
    }}>
      {/* Speech Bubble */}
      <div style={{
        background: "var(--pz-surface)", border: "1px solid var(--pz-border)",
        padding: "8px 12px", borderRadius: 12, color: "var(--pz-text)", fontSize: 11, fontWeight: 700,
        whiteSpace: "nowrap", opacity: (pose === "hype" || pose === "celebrate") ? 1 : 0,
        transform: (pose === "hype" || pose === "celebrate") ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.2s ease-out", marginBottom: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
      }}>
        {MESSAGES[msgIdx]}
        <div style={{ position: "absolute", bottom: -5, right: 20, width: 10, height: 10, background: "var(--pz-surface)", borderBottom: "1px solid var(--pz-border)", borderRight: "1px solid var(--pz-border)", transform: "rotate(45deg)" }} />
      </div>

      <div style={{ width: 100, height: 100, pointerEvents: "auto", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>
        <AvatarDisplay config={config} pose={pose} />
      </div>
    </div>
  );
}
