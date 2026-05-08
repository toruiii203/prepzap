// -- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config JSONB;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const GOLD = "#f0a040";
const BORDER = "rgba(139,26,42,0.35)";
const BG = "#160810";
const SURF = "#1f0b13";
const SURF2 = "#2a0e18";
const TEXT = "#f5ede8";
const TEXT2 = "rgba(245,237,232,0.55)";

// Configuration Data
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
const EYES = ["normal", "happy", "cool", "star"];
const EYE_COLORS = ["black", "blue", "green"];
const OUTFITS = ["casual", "school", "hoodie", "wizard", "athletic"];
const HATS = ["none", "cap", "beanie", "headphones", "crown", "flower"];
const ACCESSORIES = ["none", "glasses", "scarf", "bag"];

function RenderAvatarSVG({ config }: { config: any }) {
  const bodyColor = BODY_COLORS.find(c => c.id === config.bodyColor)?.val || "#f0a040";
  const eyeColor = config.eyeColor === "blue" ? "#3b82f6" : config.eyeColor === "green" ? "#22c55e" : "#000";

  return (
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
  );
}

export default function Avatar() {
  const { user, profile, refreshProfile } = useAuth();
  const [config, setConfig] = useState({
    species: "Fox", bodyColor: "orange", eyes: "normal", eyeColor: "black", outfit: "casual", hat: "none", accessory: "none"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.avatar_config && Object.keys(profile.avatar_config).length > 0) {
      setConfig({ ...config, ...profile.avatar_config });
    }
  }, [profile]);

  const updateConfig = (key: string, val: string) => {
    setConfig(c => ({ ...c, [key]: val }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ avatar_config: config }).eq("id", user.id);
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const Selector = ({ label, options, currentKey, field }: { label: string, options: any[], currentKey: string, field: string }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: TEXT2, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(opt => {
          const val = typeof opt === "string" ? opt : opt.id;
          const display = typeof opt === "string" ? opt : opt.val;
          const isColor = field === "bodyColor";
          return (
            <button key={val} onClick={() => updateConfig(field, val)} style={{
              padding: isColor ? 0 : "8px 12px", width: isColor ? 36 : "auto", height: isColor ? 36 : "auto",
              background: isColor ? display : (config[field as keyof typeof config] === val ? "rgba(240,160,64,0.15)" : SURF2),
              border: `2px solid ${config[field as keyof typeof config] === val ? GOLD : BORDER}`,
              borderRadius: isColor ? "50%" : 8, color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize", transition: "all .15s"
            }}>
              {!isColor && display}
            </button>
          )
        })}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 16px 120px" }}>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontFamily: "'Fredoka One', cursive", fontSize: 30, color: GOLD }}>Avatar Studio</h1>
          <Link to="/dashboard" style={{ color: GOLD, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>Back to Dashboard</Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
          
          {/* Controls */}
          <div style={{ background: SURF, border: `2px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
            <Selector label="Species" options={SPECIES} currentKey={config.species} field="species" />
            <Selector label="Body Color" options={BODY_COLORS} currentKey={config.bodyColor} field="bodyColor" />
            <Selector label="Eyes" options={EYES} currentKey={config.eyes} field="eyes" />
            <Selector label="Eye Color" options={EYE_COLORS} currentKey={config.eyeColor} field="eyeColor" />
            <Selector label="Outfit" options={OUTFITS} currentKey={config.outfit} field="outfit" />
            <Selector label="Hat" options={HATS} currentKey={config.hat} field="hat" />
            <Selector label="Accessory" options={ACCESSORIES} currentKey={config.accessory} field="accessory" />
          </div>

          {/* Preview */}
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ background: SURF, border: `2px solid ${BORDER}`, borderRadius: 16, padding: 40, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
              <div style={{ width: "100%", maxWidth: 300, aspectRatio: "1/1" }}>
                <RenderAvatarSVG config={config} />
              </div>
            </div>
            
            <button onClick={handleSave} disabled={saving} style={{
              width: "100%", padding: 16, marginTop: 16,
              background: GOLD, border: "none", borderRadius: 12,
              color: "#000", fontSize: 15, fontWeight: 800, cursor: saving ? "default" : "pointer",
              fontFamily: "inherit", transition: "opacity .2s", opacity: saving ? 0.7 : 1
            }}>
              {saving ? "Saving..." : "Save Avatar"}
            </button>
          </div>

        </div>
      </main>
      <BottomNav />
    </div>
  );
}
