// -- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config JSONB;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AvatarDisplay } from "@/components/AvatarDisplay";
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
                <AvatarDisplay config={config} />
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
