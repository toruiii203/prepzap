import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { buddies } from "@/data/buddies";

// ////// Theme ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const GOLD   = "#f0a040";
const BG     = "#160810";
const SURF   = "#1f0b13";
const SURF2  = "#2a0e18";
const BORDER = "rgba(139,26,42,0.35)";
const TEXT   = "#f5ede8";
const TEXT2  = "rgba(245,237,232,0.55)";
const TEXT3  = "rgba(245,237,232,0.28)";

// ////// Cosmetic Data ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const SHIRTS = [
  { id: "none",    label: "None",       color: "transparent" },
  { id: "red",     label: "Red Shirt",  color: "#ef4444" },
  { id: "blue",    label: "Blue Shirt", color: "#3b82f6" },
  { id: "green",   label: "Green",      color: "#22c55e" },
  { id: "purple",  label: "Purple",     color: "#9333ea" },
  { id: "black",   label: "Black",      color: "#1f2937" },
  { id: "white",   label: "White",      color: "#f9fafb" },
  { id: "yellow",  label: "Yellow",     color: "#eab308" },
];

const PANTS = [
  { id: "none",    label: "None",         color: "transparent" },
  { id: "navy",    label: "Navy Pants",   color: "#1e3a5f" },
  { id: "black",   label: "Black Pants",  color: "#111827" },
  { id: "gray",    label: "Gray Pants",   color: "#6b7280" },
  { id: "brown",   label: "Brown Pants",  color: "#92400e" },
  { id: "green",   label: "Green Pants",  color: "#166534" },
  { id: "red",     label: "Red Pants",    color: "#991b1b" },
];

const HATS = [
  { id: "none",       label: "None",        emoji: "" },
  { id: "crown",      label: "Crown",       emoji: "" },
  { id: "cap",        label: "Cap",         emoji: "" },
  { id: "graduation", label: "Grad Cap",    emoji: "" },
  { id: "headphones", label: "Headphones",  emoji: "" },
  { id: "halo",       label: "Halo",        emoji: "" },
  { id: "beanie",     label: "Beanie",      emoji: "" },
];

const ACCESSORIES = [
  { id: "none",       label: "None",       emoji: "" },
  { id: "glasses",    label: "Glasses",    emoji: "" },
  { id: "sunglasses", label: "Sunglasses", emoji: "" },
  { id: "scarf",      label: "Scarf",      emoji: "" },
  { id: "medal",      label: "Medal",      emoji: "" },
  { id: "bow",        label: "Bow",        emoji: "" },
];

const BACKGROUNDS = [
  { id: "maroon",  label: "Maroon",  color: "#2a0e18" },
  { id: "teal",    label: "Teal",    color: "#0d2b2a" },
  { id: "navy",    label: "Navy",    color: "#0a1628" },
  { id: "forest",  label: "Forest",  color: "#0d2b1a" },
  { id: "cosmic",  label: "Cosmic",  color: "#1a1200" },
  { id: "galaxy",  label: "Galaxy",  color: "#120a2a" },
  { id: "crimson", label: "Crimson", color: "#2a0505" },
  { id: "slate",   label: "Slate",   color: "#0f172a" },
];

const FRAMES = [
  { id: "none",    label: "None",    color: "transparent" },
  { id: "gold",    label: "Gold",    color: "#f0a040" },
  { id: "silver",  label: "Silver",  color: "#c0c0c0" },
  { id: "teal",    label: "Teal",    color: "#2dd4bf" },
  { id: "crimson", label: "Crimson", color: "#dc2626" },
  { id: "purple",  label: "Purple",  color: "#9333ea" },
];

// ////// SVG Overlays //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function ShirtOverlay({ shirt }: { shirt: string }) {
  const s = SHIRTS.find(x => x.id === shirt);
  if (!s || s.id === "none") return null;
  return (
    <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <path d="M 55,120 L 35,145 L 55,170 L 75,155 L 75,190 L 125,190 L 125,155 L 145,170 L 165,145 L 145,120 C 130,112 70,112 55,120 Z"
        fill={s.color} opacity="0.85" />
    </svg>
  );
}

function PantsOverlay({ pants }: { pants: string }) {
  const p = PANTS.find(x => x.id === pants);
  if (!p || p.id === "none") return null;
  return (
    <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <rect x="75" y="155" width="50" height="40" rx="4" fill={p.color} opacity="0.9" />
      <rect x="75" y="155" width="24" height="40" rx="4" fill={p.color} opacity="0.9" />
      <rect x="101" y="155" width="24" height="40" rx="4" fill={p.color} opacity="0.9" />
      <line x1="99" y1="155" x2="99" y2="195" stroke={`${p.color}88`} strokeWidth="2" />
    </svg>
  );
}

function HatOverlay({ hat }: { hat: string }) {
  if (hat === "none") return null;
  const G = "#f0a040";
  return (
    <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {hat === "crown" && (
        <g transform="translate(60,8)">
          <polygon points="40,30 10,58 25,18 40,43 55,18 70,58 80,30 55,53 40,30 25,53" fill={G} stroke="#c07820" strokeWidth="1.5"/>
          <circle cx="40" cy="27" r="4" fill="#ef4444"/>
          <circle cx="14" cy="54" r="3.5" fill="#3b82f6"/>
          <circle cx="66" cy="54" r="3.5" fill="#22c55e"/>
        </g>
      )}
      {hat === "cap" && (
        <g transform="translate(38,12)">
          <ellipse cx="62" cy="42" rx="54" ry="20" fill="#ef4444"/>
          <rect x="8" y="42" width="108" height="16" rx="7" fill="#dc2626"/>
          <rect x="8" y="50" width="128" height="7" rx="3" fill="#1f2937"/>
        </g>
      )}
      {hat === "graduation" && (
        <g transform="translate(28,2)">
          <rect x="20" y="34" width="104" height="10" rx="5" fill="#111"/>
          <polygon points="72,4 20,34 124,34" fill="#111"/>
          <path d="M 115,34 Q 130,42 130,62 Q 115,57 115,34" fill={G}/>
          <circle cx="130" cy="64" r="5" fill={G}/>
        </g>
      )}
      {hat === "headphones" && (
        <g transform="translate(28,22)">
          <path d="M 15,52 C 15,4 129,4 129,52" fill="none" stroke="#111" strokeWidth="7"/>
          <rect x="5" y="37" width="17" height="26" rx="7" fill="#ef4444"/>
          <rect x="122" y="37" width="17" height="26" rx="7" fill="#ef4444"/>
        </g>
      )}
      {hat === "halo" && (
        <ellipse cx="100" cy="18" rx="38" ry="10" fill="none" stroke={G} strokeWidth="5" opacity="0.95"/>
      )}
      {hat === "beanie" && (
        <g transform="translate(42,8)">
          <path d="M 8,62 C 8,8 108,8 108,62 Z" fill="#22c55e"/>
          <ellipse cx="58" cy="62" rx="50" ry="9" fill="#16a34a"/>
          <circle cx="58" cy="10" r="7" fill="#4ade80"/>
        </g>
      )}
    </svg>
  );
}

function AccessoryOverlay({ acc }: { acc: string }) {
  if (acc === "none") return null;
  return (
    <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {acc === "glasses" && (
        <g transform="translate(0,82)">
          <circle cx="72" cy="0" r="17" fill="none" stroke="#c0c0c0" strokeWidth="2.5"/>
          <circle cx="128" cy="0" r="17" fill="none" stroke="#c0c0c0" strokeWidth="2.5"/>
          <line x1="55" y1="0" x2="38" y2="-4" stroke="#c0c0c0" strokeWidth="2.5"/>
          <line x1="89" y1="0" x2="111" y2="0" stroke="#c0c0c0" strokeWidth="2.5"/>
          <line x1="145" y1="0" x2="162" y2="-4" stroke="#c0c0c0" strokeWidth="2.5"/>
        </g>
      )}
      {acc === "sunglasses" && (
        <g transform="translate(0,79)">
          <rect x="52" y="-13" width="38" height="20" rx="7" fill="#1f2937"/>
          <rect x="110" y="-13" width="38" height="20" rx="7" fill="#1f2937"/>
          <line x1="52" y1="-3" x2="38" y2="-7" stroke="#374151" strokeWidth="3.5"/>
          <line x1="90" y1="-3" x2="110" y2="-3" stroke="#374151" strokeWidth="3.5"/>
          <line x1="148" y1="-3" x2="162" y2="-7" stroke="#374151" strokeWidth="3.5"/>
        </g>
      )}
      {acc === "scarf" && (
        <g transform="translate(0,122)">
          <path d="M 42,0 Q 100,22 158,0 Q 158,32 132,48 Z" fill="#ef4444"/>
          <path d="M 42,0 Q 100,16 158,0" fill="none" stroke="#dc2626" strokeWidth="5"/>
        </g>
      )}
      {acc === "medal" && (
        <g transform="translate(86,128)">
          <line x1="14" y1="0" x2="14" y2="-24" stroke="#f0a040" strokeWidth="3"/>
          <circle cx="14" cy="14" r="14" fill="#f0a040" stroke="#c07820" strokeWidth="2"/>
          <circle cx="14" cy="14" r="9" fill="#fbbf24"/>
          <text x="14" y="19" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#92400e">LVL</text>
        </g>
      )}
      {acc === "bow" && (
        <g transform="translate(128,52)">
          <path d="M 0,14 C -18,-4 -18,32 0,14 Z" fill="#ec4899"/>
          <path d="M 28,14 C 46,-4 46,32 28,14 Z" fill="#ec4899"/>
          <circle cx="14" cy="14" r="6" fill="#db2777"/>
        </g>
      )}
    </svg>
  );
}

// ////// Toast ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: 90, right: 20, zIndex: 1000,
      background: type === "success" ? "#166534" : "#7f1d1d",
      border: `1px solid ${type === "success" ? "#22c55e" : "#ef4444"}`,
      color: "#fff", padding: "12px 18px", borderRadius: 10,
      fontSize: 13, fontWeight: 600, maxWidth: 280,
      boxShadow: "0 8px 24px #00000066",
      animation: "slideIn 0.2s ease"
    }}>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>
      {type === "success" ? "✓ " : "✗ "}{msg}
    </div>
  );
}

// ////// Main Component ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
interface AvatarConfig {
  buddyId: string;
  shirt: string;
  pants: string;
  hat: string;
  accessory: string;
  background: string;
  frame: string;
}

const DEFAULT_CONFIG: AvatarConfig = {
  buddyId: "fox",
  shirt: "none",
  pants: "none",
  hat: "none",
  accessory: "none",
  background: "maroon",
  frame: "gold",
};

const LS_KEY = "studenius_avatar_config";

export default function Avatar() {
  const { user, profile, refreshProfile } = useAuth();
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<"buddy" | "shirt" | "pants" | "hat" | "accessory" | "style">("buddy");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Load saved config /// Supabase first, then localStorage fallback
  useEffect(() => {
    const lsConfig = localStorage.getItem(LS_KEY);
    if (lsConfig) {
      try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(lsConfig) }); } catch {}
    }
    if (profile?.avatar_config && Object.keys(profile.avatar_config).length > 0) {
      setConfig({ ...DEFAULT_CONFIG, ...profile.avatar_config as AvatarConfig });
    }
    // Also check onboarding buddy pick
    const onboardBuddy = localStorage.getItem(`buddy_${user?.id || "guest"}`);
    if (onboardBuddy && !profile?.avatar_config) {
      setConfig(c => ({ ...c, buddyId: onboardBuddy }));
    }
  }, [profile, user]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key: keyof AvatarConfig, val: string) =>
    setConfig(c => ({ ...c, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    // Always save to localStorage first /// instant fallback
    localStorage.setItem(LS_KEY, JSON.stringify(config));
    if (user?.id) {
      localStorage.setItem(`buddy_${user.id}`, config.buddyId);
    }

    if (!user) {
      setSaving(false);
      showToast("Saved locally (not logged in)", "success");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_config: config })
        .eq("id", user.id);

      if (error) {
        // Column might not exist yet /// still saved to localStorage
        console.warn("Supabase save failed:", error.message);
        showToast("Saved locally. Run the SQL migration to sync to cloud.", "success");
      } else {
        await refreshProfile();
        showToast("Avatar saved!", "success");
      }
    } catch (err: any) {
      showToast("Saved locally only.", "success");
    } finally {
      setSaving(false);
    }
  };

  const buddy = buddies.find(b => b.id === config.buddyId);
  const bgColor = BACKGROUNDS.find(b => b.id === config.background)?.color || BG;
  const frameColor = FRAMES.find(f => f.id === config.frame)?.color || "transparent";

  const TABS = [
    { id: "buddy",     label: "Buddy",     emoji: "" },
    { id: "shirt",     label: "Shirt",     emoji: "" },
    { id: "pants",     label: "Pants",     emoji: "" },
    { id: "hat",       label: "Hat",       emoji: "" },
    { id: "accessory", label: "Accessory", emoji: "" },
    { id: "style",     label: "Style",     emoji: "" },
  ] as const;

  // Color swatch button
  const ColorSwatch = ({ color, active, onClick, label }: { color: string; active: boolean; onClick: () => void; label: string }) => (
    <button onClick={onClick} title={label} style={{
      width: 36, height: 36, borderRadius: "50%",
      background: color === "transparent" ? SURF2 : color,
      border: `3px solid ${active ? GOLD : BORDER}`,
      cursor: "pointer", transition: "all 0.15s",
      boxShadow: active ? `0 0 10px ${GOLD}66` : "none",
      fontSize: color === "transparent" ? 14 : undefined,
      color: TEXT3, flexShrink: 0,
    }}>{color === "transparent" ? "×" : ""}</button>
  );

  // Option chip button
  const Chip = ({ label, emoji, active, onClick }: { label: string; emoji: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{
      padding: "10px 8px", borderRadius: 10, cursor: "pointer",
      background: active ? `${GOLD}22` : SURF2,
      border: `2px solid ${active ? GOLD : BORDER}`,
      color: active ? GOLD : TEXT2, fontSize: 12, fontWeight: 700,
      fontFamily: "inherit", transition: "all 0.15s",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      boxShadow: active ? `0 0 10px ${GOLD}33` : "none",
    }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 10 }}>{label}</span>
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 120px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontFamily: "'Fredoka One', cursive", fontSize: 28, color: GOLD }}>Avatar Studio</h1>
          <Link to="/dashboard" style={{ color: GOLD, fontWeight: 700, textDecoration: "none", fontSize: 13, border: `1px solid ${BORDER}`, padding: "8px 14px", borderRadius: 8 }}>
            /// Dashboard
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" }}>

          {/* ////// Left Panel ////// */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "8px 14px", borderRadius: 20, cursor: "pointer",
                  background: activeTab === t.id ? `${GOLD}22` : SURF2,
                  border: `2px solid ${activeTab === t.id ? GOLD : BORDER}`,
                  color: activeTab === t.id ? GOLD : TEXT2,
                  fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>

            <div style={{ background: SURF, border: `2px solid ${BORDER}`, borderRadius: 16, padding: 20, minHeight: 260 }}>

              {/* Buddy Tab */}
              {activeTab === "buddy" && (
                <>
                  <h3 style={{ margin: "0 0 14px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Choose Your Buddy</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {buddies.map(b => (
                      <button key={b.id} onClick={() => set("buddyId", b.id)} style={{
                        background: config.buddyId === b.id ? `${GOLD}22` : SURF2,
                        border: `2px solid ${config.buddyId === b.id ? GOLD : BORDER}`,
                        borderRadius: 12, padding: "10px 6px", cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        transition: "all 0.15s",
                        boxShadow: config.buddyId === b.id ? `0 0 14px ${GOLD}44` : "none",
                      }}>
                        <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", background: SURF }}>
                          <img src={b.image} alt={b.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                        <span style={{ color: config.buddyId === b.id ? GOLD : TEXT, fontSize: 11, fontWeight: 700 }}>{b.name}</span>
                        <span style={{ color: TEXT3, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>{b.role}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Shirt Tab */}
              {activeTab === "shirt" && (
                <>
                  <h3 style={{ margin: "0 0 14px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Shirt Color</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {SHIRTS.map(s => (
                      <button key={s.id} onClick={() => set("shirt", s.id)} style={{
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        background: config.shirt === s.id ? `${GOLD}22` : SURF2,
                        border: `2px solid ${config.shirt === s.id ? GOLD : BORDER}`,
                        color: config.shirt === s.id ? GOLD : TEXT2,
                        fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 8,
                        transition: "all 0.15s",
                      }}>
                        {s.id !== "none" && (
                          <span style={{ width: 14, height: 14, borderRadius: "50%", background: s.color, display: "inline-block", border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                        )}
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Pants Tab */}
              {activeTab === "pants" && (
                <>
                  <h3 style={{ margin: "0 0 14px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Pants Color</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {PANTS.map(p => (
                      <button key={p.id} onClick={() => set("pants", p.id)} style={{
                        padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                        background: config.pants === p.id ? `${GOLD}22` : SURF2,
                        border: `2px solid ${config.pants === p.id ? GOLD : BORDER}`,
                        color: config.pants === p.id ? GOLD : TEXT2,
                        fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 8,
                        transition: "all 0.15s",
                      }}>
                        {p.id !== "none" && (
                          <span style={{ width: 14, height: 14, borderRadius: "50%", background: p.color, display: "inline-block", border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                        )}
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Hat Tab */}
              {activeTab === "hat" && (
                <>
                  <h3 style={{ margin: "0 0 14px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Hats</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {HATS.map(h => <Chip key={h.id} label={h.label} emoji={h.emoji} active={config.hat === h.id} onClick={() => set("hat", h.id)} />)}
                  </div>
                </>
              )}

              {/* Accessory Tab */}
              {activeTab === "accessory" && (
                <>
                  <h3 style={{ margin: "0 0 14px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Accessories</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {ACCESSORIES.map(a => <Chip key={a.id} label={a.label} emoji={a.emoji} active={config.accessory === a.id} onClick={() => set("accessory", a.id)} />)}
                  </div>
                </>
              )}

              {/* Style Tab */}
              {activeTab === "style" && (
                <>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Background</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                    {BACKGROUNDS.map(bg => (
                      <ColorSwatch key={bg.id} color={bg.color} active={config.background === bg.id} onClick={() => set("background", bg.id)} label={bg.label} />
                    ))}
                  </div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 14, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>Frame</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {FRAMES.map(fr => (
                      <ColorSwatch key={fr.id} color={fr.color} active={config.frame === fr.id} onClick={() => set("frame", fr.id)} label={fr.label} />
                    ))}
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ////// Right Panel: Preview ////// */}
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ background: SURF, border: `2px solid ${BORDER}`, borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Preview</span>

              {/* Avatar canvas */}
              <div style={{
                width: 200, height: 200, borderRadius: "50%",
                background: bgColor,
                border: `5px solid ${frameColor === "transparent" ? BORDER : frameColor}`,
                boxShadow: frameColor !== "transparent" ? `0 0 20px ${frameColor}55` : `0 4px 24px #00000088`,
                position: "relative", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s ease",
              }}>
                {buddy ? (
                  <>
                    <img src={buddy.image} alt={buddy.name}
                      style={{ width: "82%", height: "82%", objectFit: "contain", objectPosition: "center", zIndex: 1 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
                      <ShirtOverlay shirt={config.shirt} />
                    </div>
                    <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
                      <PantsOverlay pants={config.pants} />
                    </div>
                    <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}>
                      <HatOverlay hat={config.hat} />
                    </div>
                    <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
                      <AccessoryOverlay acc={config.accessory} />
                    </div>
                  </>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 48 }}>checkroom</span>
                )}
              </div>

              {buddy && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Fredoka One', cursive", color: GOLD }}>{buddy.name}</div>
                  <div style={{ fontSize: 10, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{buddy.role}</div>
                </div>
              )}

              {/* Equipped summary */}
              <div style={{ width: "100%", background: SURF2, borderRadius: 10, padding: "10px 14px", fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: TEXT2, marginBottom: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Equipped</div>
                {[
                  ["Buddy",     buddy?.name || "None"],
                  ["Shirt",     SHIRTS.find(x => x.id === config.shirt)?.label || "None"],
                  ["Pants",     PANTS.find(x => x.id === config.pants)?.label || "None"],
                  ["Hat",       HATS.find(x => x.id === config.hat)?.label || "None"],
                  ["Accessory", ACCESSORIES.find(x => x.id === config.accessory)?.label || "None"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: TEXT3 }}>{k}</span>
                    <span style={{ color: v === "None" ? TEXT3 : TEXT2, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              <button onClick={handleSave} disabled={saving} style={{
                width: "100%", padding: "13px 0",
                background: GOLD, border: "none", borderRadius: 12,
                color: "#000", fontSize: 14, fontWeight: 800,
                cursor: saving ? "default" : "pointer",
                fontFamily: "inherit", transition: "opacity 0.2s",
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving..." : "Save Outfit"}
              </button>

              {/* SQL migration hint for devs */}
              {!user && (
                <p style={{ fontSize: 10, color: TEXT3, textAlign: "center", margin: 0 }}>
                  Log in to sync to cloud
                </p>
              )}
            </div>
          </div>

        </div>
      </main>
      <BottomNav />
    </div>
  );
}
