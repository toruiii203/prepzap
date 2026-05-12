import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BottomNav } from "@/components/BottomNav"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { buddies } from "@/data/buddies"
import { levelFromXp } from "@/lib/xp"
import { toast } from "@/hooks/use-toast"

const BG = "#1a0a0a"
const SURF = "#231010"
const SURF2 = "#2d1414"
const BORDER = "rgba(245,166,35,0.22)"
const GOLD = "#F5A623"
const TEAL = "#1ab9b4"
const TEXT = "#f5ede8"
const TEXT2 = "rgba(245,237,232,0.62)"

type Category = "Body" | "Shirt" | "Pants" | "Hat" | "Accessory" | "Background"

type AvatarItem = {
  id: string
  name: string
  category: Category
  imagePath: string
  unlocked: boolean
  requiredLevel: number
}

type AvatarOutfit = {
  buddyId: string
  bodyColor: string
  flipped: boolean
  equipped: Partial<Record<Category, string>>
}

const CATEGORIES: Category[] = ["Body", "Shirt", "Pants", "Hat", "Accessory", "Background"]

const square = (color: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="24" ry="24" fill="${color}"/></svg>`
  )}`

const ITEMS: AvatarItem[] = [
  { id: "shirt_red",    name: "Red Shirt",   category: "Shirt",      imagePath: square("#c73737"), unlocked: true,  requiredLevel: 1 },
  { id: "shirt_teal",   name: "Teal Shirt",  category: "Shirt",      imagePath: square("#1ab9b4"), unlocked: true,  requiredLevel: 1 },
  { id: "pants_navy",   name: "Navy Pants",  category: "Pants",      imagePath: square("#243557"), unlocked: true,  requiredLevel: 1 },
  { id: "pants_gray",   name: "Gray Pants",  category: "Pants",      imagePath: square("#59616d"), unlocked: true,  requiredLevel: 1 },
  { id: "hat_cap",      name: "Cap",         category: "Hat",        imagePath: square("#1f2430"), unlocked: false, requiredLevel: 2 },
  { id: "hat_crown",    name: "Crown",       category: "Hat",        imagePath: square("#f5c242"), unlocked: false, requiredLevel: 4 },
  { id: "acc_glasses",  name: "Glasses",     category: "Accessory",  imagePath: square("#dde3ed"), unlocked: true,  requiredLevel: 1 },
  { id: "acc_bag",      name: "Bag",         category: "Accessory",  imagePath: square("#815e41"), unlocked: false, requiredLevel: 3 },
  { id: "bg_maroon",    name: "Maroon",      category: "Background", imagePath: square("#4b1522"), unlocked: true,  requiredLevel: 1 },
  { id: "bg_teal",      name: "Teal",        category: "Background", imagePath: square("#153b47"), unlocked: false, requiredLevel: 3 },
]

// Safe helper — never throws on undefined/null equipped map
function safeEquipped(raw: unknown): Partial<Record<Category, string>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const result: Partial<Record<Category, string>> = {}
  for (const cat of CATEGORIES) {
    const val = (raw as Record<string, unknown>)[cat]
    if (typeof val === "string") result[cat] = val
  }
  return result
}

function safeOutfit(raw: unknown): AvatarOutfit {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultOutfit
  const obj = raw as Record<string, unknown>
  return {
    buddyId:   typeof obj.buddyId   === "string" ? obj.buddyId   : (buddies[0]?.id ?? "fox_scholar"),
    bodyColor: typeof obj.bodyColor === "string" ? obj.bodyColor : "#f0a040",
    flipped:   typeof obj.flipped   === "boolean" ? obj.flipped  : false,
    equipped:  safeEquipped(obj.equipped),
  }
}

const defaultOutfit: AvatarOutfit = {
  buddyId: buddies[0]?.id ?? "fox_scholar",
  bodyColor: "#f0a040",
  flipped: false,
  equipped: {},
}

export default function Avatar() {
  const { user, profile, refreshProfile } = useAuth()
  const [activeCategory, setActiveCategory] = useState<Category>("Body")
  const [saving, setSaving] = useState(false)

  const level = levelFromXp(profile?.total_xp ?? 0)

  const [outfit, setOutfit] = useState<AvatarOutfit>(() =>
    safeOutfit(profile?.avatar_outfit)
  )

  // Sync when profile loads / changes
  useEffect(() => {
    if (profile?.avatar_outfit) {
      setOutfit(safeOutfit(profile.avatar_outfit))
    }
  }, [profile?.avatar_outfit])

  const selectedBuddy = useMemo(
    () => buddies.find((b) => b.id === outfit.buddyId) ?? buddies[0],
    [outfit.buddyId]
  )

  const categoryItems = useMemo(
    () => ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory]
  )

  const itemById = useMemo(() => {
    const map = new Map<string, AvatarItem>()
    ITEMS.forEach((i) => map.set(i.id, i))
    return map
  }, [])

  // Safe accessor — never crashes if equipped is somehow malformed
  const getEquipped = (cat: Category): string | undefined =>
    outfit.equipped?.[cat]

  const equipOrToggle = (item: AvatarItem) => {
    const isUnlocked = item.unlocked || level >= item.requiredLevel
    if (!isUnlocked) return
    setOutfit((prev) => {
      const already = prev.equipped?.[item.category] === item.id
      return {
        ...prev,
        equipped: {
          ...(prev.equipped ?? {}),
          [item.category]: already ? undefined : item.id,
        },
      }
    })
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const payload: AvatarOutfit = {
        buddyId:   outfit.buddyId,
        bodyColor: outfit.bodyColor,
        flipped:   outfit.flipped,
        equipped:  outfit.equipped ?? {},
      }
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_outfit: payload, avatar_config: payload })
        .eq("id", user.id)
      if (error) throw error
      await refreshProfile()
      toast({ title: "Avatar saved", description: "Your outfit has been updated." })
    } catch (err) {
      console.error(err)
      toast({ title: "Save failed", description: "Could not save outfit. Using your current local preview." })
    } finally {
      setSaving(false)
    }
  }

  // Background gradient based on equipped bg item
  const bgGradient = (() => {
    const bgId = getEquipped("Background")
    if (bgId === "bg_teal") return "linear-gradient(135deg,#10343f,#1a5460)"
    return "linear-gradient(135deg,#4b1522,#6a1d30)"
  })()

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <style>{`
        @keyframes buddyIdleFloat {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h1 style={{ margin: 0, color: GOLD, fontFamily: "'Fredoka One', cursive", fontSize: 30 }}>Avatar Studio</h1>
          <Link to="/dashboard" style={{ color: GOLD, textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
            Back to Dashboard
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0,1fr) 320px", gap: 16 }}>

          {/* LEFT — Categories + Items */}
          <section style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Categories
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    border: `1px solid ${activeCategory === cat ? GOLD : BORDER}`,
                    background: activeCategory === cat ? "rgba(245,166,35,0.14)" : SURF2,
                    color: activeCategory === cat ? GOLD : TEXT2,
                    padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                    fontWeight: 700, fontSize: 11,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: 560, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
              {activeCategory === "Body" &&
                buddies.map((buddy) => (
                  <button
                    key={buddy.id}
                    onClick={() => setOutfit((p) => ({ ...p, buddyId: buddy.id }))}
                    style={{
                      border: `2px solid ${outfit.buddyId === buddy.id ? GOLD : BORDER}`,
                      background: SURF2, borderRadius: 10, padding: 8, cursor: "pointer",
                    }}
                  >
                    <img src={buddy.imagePath} alt={buddy.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 8 }} />
                    <div style={{ marginTop: 6, fontSize: 10, color: TEXT2, fontWeight: 700 }}>{buddy.name}</div>
                  </button>
                ))}

              {activeCategory !== "Body" &&
                categoryItems.map((item) => {
                  const isUnlocked = item.unlocked || level >= item.requiredLevel
                  const equipped = getEquipped(item.category) === item.id
                  return (
                    <button
                      key={item.id}
                      title={isUnlocked ? item.name : `Unlock at Level ${item.requiredLevel}`}
                      onClick={() => equipOrToggle(item)}
                      style={{
                        position: "relative",
                        border: `2px solid ${equipped ? GOLD : BORDER}`,
                        background: SURF2, borderRadius: 10, padding: 8,
                        opacity: isUnlocked ? 1 : 0.65,
                        cursor: isUnlocked ? "pointer" : "not-allowed",
                      }}
                    >
                      <img src={item.imagePath} alt={item.name} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 8 }} />
                      {!isUnlocked && (
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: GOLD, fontSize: 18 }}>
                          🔒
                        </div>
                      )}
                      <div style={{ marginTop: 6, fontSize: 10, color: TEXT2, fontWeight: 700 }}>{item.name}</div>
                    </button>
                  )
                })}
            </div>
          </section>

          {/* CENTER — Character Preview */}
          <section style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: TEXT2 }}>Character Preview</div>
              <button
                onClick={() => setOutfit((p) => ({ ...p, flipped: !p.flipped }))}
                style={{ border: `1px solid ${BORDER}`, background: SURF2, color: TEAL, padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}
              >
                Flip
              </button>
            </div>

            <div style={{ background: SURF2, borderRadius: 12, border: `1px solid ${BORDER}`, minHeight: 540, display: "grid", placeItems: "center" }}>
              <div style={{ width: 420, maxWidth: "95%", aspectRatio: "1 / 1", position: "relative", overflow: "hidden", borderRadius: 12 }}>
                {/* Background layer */}
                <div style={{ position: "absolute", inset: 0, background: bgGradient, zIndex: 1 }} />

                {/* Character + items layer */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    display: "grid", placeItems: "center",
                    transform: outfit.flipped ? "scaleX(-1)" : "none",
                    animation: "buddyIdleFloat 2s ease-in-out infinite",
                    zIndex: 10,
                  }}
                >
                  <div style={{ position: "relative", width: "72%", aspectRatio: "1 / 1" }}>
                    <img
                      src={selectedBuddy?.imagePath}
                      alt={selectedBuddy?.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 12px 18px rgba(0,0,0,0.5))" }}
                    />
                    {/* Body color overlay */}
                    <div style={{ position: "absolute", top: "28%", left: "29%", width: "42%", height: "42%", background: `${outfit.bodyColor}33`, borderRadius: "50%", pointerEvents: "none", zIndex: 20 }} />
                    {/* Shirt */}
                    {getEquipped("Shirt") && (
                      <div style={{ position: "absolute", bottom: "24%", left: "29%", width: "42%", height: "20%", borderRadius: 10, background: getEquipped("Shirt") === "shirt_teal" ? "#1ab9b4AA" : "#c73737AA", zIndex: 25 }} />
                    )}
                    {/* Pants */}
                    {getEquipped("Pants") && (
                      <div style={{ position: "absolute", bottom: "10%", left: "32%", width: "36%", height: "14%", borderRadius: 8, background: getEquipped("Pants") === "pants_gray" ? "#59616dAA" : "#243557AA", zIndex: 24 }} />
                    )}
                    {/* Hat */}
                    {getEquipped("Hat") && (
                      <div style={{ position: "absolute", top: "7%", left: "32%", width: "36%", height: "12%", borderRadius: 999, background: getEquipped("Hat") === "hat_crown" ? "#f5c242CC" : "#1f2430CC", zIndex: 30 }} />
                    )}
                    {/* Accessory */}
                    {getEquipped("Accessory") && (
                      <div style={{ position: "absolute", top: "35%", left: "34%", width: "32%", height: "10%", borderRadius: 999, border: "3px solid #dfe7f5", zIndex: 29, opacity: getEquipped("Accessory") === "acc_glasses" ? 0.95 : 0.75 }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT — Equipped Summary */}
          <section style={{ background: SURF, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 11, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Equipped Summary
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, color: TEXT2 }}><b style={{ color: GOLD }}>Buddy:</b> {selectedBuddy?.name}</div>
              {CATEGORIES.filter((c) => c !== "Body").map((cat) => (
                <div key={cat} style={{ fontSize: 12, color: TEXT2 }}>
                  <b style={{ color: GOLD }}>{cat}:</b>{" "}
                  {getEquipped(cat) ? itemById.get(getEquipped(cat) ?? "")?.name : "None"}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: TEXT2, marginBottom: 6 }}>Body Color</div>
              <input
                type="color"
                value={outfit.bodyColor}
                onChange={(e) => setOutfit((p) => ({ ...p, bodyColor: e.target.value }))}
                style={{ width: "100%", height: 42, borderRadius: 8, border: `1px solid ${BORDER}`, background: SURF2, cursor: "pointer" }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                marginTop: 16, width: "100%", padding: "12px 0",
                border: "none", background: GOLD, color: "#000",
                fontWeight: 800, borderRadius: 10,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Outfit"}
            </button>
          </section>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
