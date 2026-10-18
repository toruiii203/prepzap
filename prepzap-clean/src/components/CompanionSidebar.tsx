import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const BORDER = "rgba(139,26,42,0.35)";
const GOLD = "#f0a040";
const SURF = "#1f0b13";
const BG = "#160810";
const TEXT2 = "rgba(245,237,232,0.55)";

const SPECIES = ["Fox", "Cat", "Wolf", "Deer", "Bear", "Rabbit", "Dragon"];
const BODY_COLORS = [
  { id: "orange", val: "#f0a040" },
  { id: "red", val: "#8b1a2a" },
  { id: "gray", val: "#a0a0a0" },
  { id: "brown", val: "#8b5a2b" },
  { id: "white", val: "#ffffff" },
  { id: "purple", val: "#6a5acd" },
  { id: "teal", val: "#008080" }
];

export function CompanionAvatar({ config, pose = "idle" }: { config: any, pose?: "idle"|"thinking"|"hype"|"celebrate" }) {
  const bodyColor = BODY_COLORS.find(c => c.id === config.bodyColor)?.val || "#f0a040";
  const eyeColor = config.eyeColor === "blue" ? "#3b82f6" : config.eyeColor === "green" ? "#22c55e" : "#000";

  let animClass = "";
  if (pose === "idle") animClass = "animate-float";
  if (pose === "thinking") animClass = "animate-pulse";
  if (pose === "hype") animClass = "animate-bounce";
  if (pose === "celebrate") animClass = "animate-spin";

  return (
    <div className={`w-full h-full ${animClass}`} style={{ transition: "all 0.3s ease-out" }}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
      <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ overflow: "visible" }}>
        {/* Base Body */}
        {config.species === "Rabbit" && <ellipse cx="100" cy="50" rx="15" ry="40" fill={bodyColor} stroke={BORDER} strokeWidth="3" />}
        {config.species === "Bear" && <circle cx="100" cy="90" r="60" fill={bodyColor} stroke={BORDER} strokeWidth="3" />}
        {config.species !== "Bear" && config.species !== "Rabbit" && (
          <path d="M 60,180 C 60,100 140,100 140,180 Z" fill={bodyColor} stroke={BORDER} strokeWidth="3" />
        )}
        
        {/* Head */}
        <circle cx="100" cy="80" r="50" fill={bodyColor} stroke={BORDER} strokeWidth="3" />
        {config.species === "Fox" && (
          <>
            <polygon points="60,40 80,80 100,60" fill={bodyColor} stroke={BORDER} strokeWidth="2" />
            <polygon points="140,40 120,80 100,60" fill={bodyColor} stroke={BORDER} strokeWidth="2" />
          </>
        )}
        {config.species === "Cat" && (
          <>
            <polygon points="60,30 80,60 100,50" fill={bodyColor} stroke={BORDER} strokeWidth="2" />
            <polygon points="140,30 120,60 100,50" fill={bodyColor} stroke={BORDER} strokeWidth="2" />
          </>
        )}

        {/* Eyes */}
        {config.eyes === "normal" && (
          <><circle cx="85" cy="75" r="5" fill={eyeColor} /><circle cx="115" cy="75" r="5" fill={eyeColor} /></>
        )}
        {config.eyes === "happy" && (
          <><path d="M 75,75 Q 85,65 95,75" stroke={eyeColor} strokeWidth="3" fill="none" /><path d="M 105,75 Q 115,65 125,75" stroke={eyeColor} strokeWidth="3" fill="none" /></>
        )}
        {config.eyes === "cool" && (
          <><rect x="75" y="70" width="20" height="5" fill={eyeColor} /><rect x="105" y="70" width="20" height="5" fill={eyeColor} /></>
        )}
        {config.eyes === "star" && (
          <><polygon points="85,65 90,75 100,75 92,82 95,92 85,85 75,92 78,82 70,75 80,75" fill={GOLD} /><polygon points="115,65 120,75 130,75 122,82 125,92 115,85 105,92 108,82 100,75 110,75" fill={GOLD} /></>
        )}

        {/* Mouth */}
        <path d="M 90,95 Q 100,105 110,95" stroke="#000" strokeWidth="2" fill="none" />

        {/* Outfit */}
        {config.outfit === "casual" && <rect x="70" y="130" width="60" height="50" rx="10" fill="#3b82f6" />}
        {config.outfit === "school" && <><rect x="70" y="130" width="60" height="50" rx="5" fill="#1e293b" /><polygon points="100,130 90,160 110,160" fill="#ef4444" /></>}
        {config.outfit === "hoodie" && <><path d="M 60,130 C 60,100 140,100 140,130 Z" fill="#ec4899" /><rect x="65" y="130" width="70" height="50" rx="15" fill="#ec4899" /></>}
        {config.outfit === "wizard" && <path d="M 50,180 L 80,120 L 120,120 L 150,180 Z" fill="#6366f1" />}
        {config.outfit === "athletic" && <><rect x="75" y="130" width="50" height="50" rx="5" fill="#eab308" /><rect x="75" y="130" width="10" height="50" fill="#fff" /><rect x="115" y="130" width="10" height="50" fill="#fff" /></>}

        {/* Accessory */}
        {config.accessory === "glasses" && <><circle cx="85" cy="75" r="12" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="115" cy="75" r="12" fill="none" stroke="#fff" strokeWidth="2" /><line x1="97" y1="75" x2="103" y2="75" stroke="#fff" strokeWidth="2" /></>}
        {config.accessory === "scarf" && <path d="M 70,120 Q 100,140 130,120 Q 130,140 110,160 Z" fill="#ef4444" />}
        {config.accessory === "bag" && <rect x="130" y="140" width="30" height="40" rx="5" fill="#8b5a2b" />}

        {/* Hat */}
        {config.hat === "cap" && <path d="M 60,50 Q 100,30 140,50 L 160,50 Z" fill="#ef4444" />}
        {config.hat === "beanie" && <path d="M 60,60 C 60,10 140,10 140,60 Z" fill="#22c55e" />}
        {config.hat === "headphones" && <><path d="M 50,80 C 50,20 150,20 150,80" fill="none" stroke="#333" strokeWidth="5" /><rect x="40" y="60" width="15" height="30" rx="5" fill="#ef4444" /><rect x="145" y="60" width="15" height="30" rx="5" fill="#ef4444" /></>}
        {config.hat === "crown" && <polygon points="60,40 70,10 100,30 130,10 140,40" fill={GOLD} />}
        {config.hat === "flower" && <circle cx="130" cy="50" r="10" fill="#ec4899" />}
      </svg>
    </div>
  );
}

const MESSAGES = [
  "Nice answer!", "You're on fire!", "Keep going!", "Big brain energy!", 
  "Almost there!", "Nailed it!", "Focus mode: on", "You got this!"
];

export function CompanionSidebar() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(true);
  const [pose, setPose] = useState<"idle"|"thinking"|"hype"|"celebrate">("idle");
  const [msgIdx, setMsgIdx] = useState(0);

  const config = profile?.avatar_config || {
    species: "Fox", bodyColor: "orange", eyes: "normal", eyeColor: "black", outfit: "casual", hat: "none", accessory: "none"
  };

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
    <>
      <div style={{
        position: "fixed", top: 80, right: open ? 0 : -220, width: 220, bottom: 20,
        background: SURF, borderLeft: `2px solid ${BORDER}`, borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 40,
        transition: "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)", zIndex: 100, boxShadow: open ? "-5px 0 30px rgba(0,0,0,0.5)" : "none"
      }}>
        <button onClick={() => setOpen(!open)} style={{
          position: "absolute", left: -32, top: 40, width: 32, height: 48,
          background: SURF, border: `2px solid ${BORDER}`, borderRight: "none",
          borderTopLeftRadius: 8, borderBottomLeftRadius: 8, color: GOLD, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {open ? "▶" : "◀"}
        </button>

        {open && (
          <div style={{ position: "relative", width: 140, height: 140 }}>
            {/* Speech Bubble */}
            <div style={{
              position: "absolute", top: -50, left: -20, background: BG, border: `1px solid ${BORDER}`,
              padding: "8px 12px", borderRadius: 12, color: "#fff", fontSize: 11, fontWeight: 700,
              whiteSpace: "nowrap", opacity: pose === "hype" || pose === "celebrate" ? 1 : 0,
              transform: pose === "hype" || pose === "celebrate" ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.2s ease-out"
            }}>
              {MESSAGES[msgIdx]}
              <div style={{ position: "absolute", bottom: -5, left: 20, width: 10, height: 10, background: BG, borderBottom: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, transform: "rotate(45deg)" }} />
            </div>

            <CompanionAvatar config={config} pose={pose} />
          </div>
        )}
      </div>
    </>
  );
}
