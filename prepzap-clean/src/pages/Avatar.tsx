import React, { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BottomNav } from "@/components/BottomNav"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { buddies } from "@/data/buddies"

const GOLD = "#f0a040"
const BORDER = "rgba(139,26,42,0.35)"
const BG = "#160810"
const SURF = "#1f0b13"
const SURF2 = "#2a0e18"
const TEXT = "#f5ede8"
const TEXT2 = "rgba(245,237,232,0.55)"

export default function Avatar() {
  const { user, profile, refreshProfile } = useAuth()
  const [buddyId, setBuddyId] = useState(buddies[0]?.id ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const savedId =
      profile?.avatar_config?.buddyId ||
      localStorage.getItem(`buddy_${user?.id || "guest"}`)

    if (savedId && buddies.some((b) => b.id === savedId)) {
      setBuddyId(savedId)
    }
  }, [profile, user?.id])

  const selectedBuddy = useMemo(
    () => buddies.find((b) => b.id === buddyId) ?? buddies[0],
    [buddyId]
  )

  const handleSave = async () => {
    if (!user || !selectedBuddy) return
    setSaving(true)
    try {
      await supabase
        .from("profiles")
        .update({
          avatar_config: {
            buddyId: selectedBuddy.id,
            buddyName: selectedBuddy.name,
            buddyRole: selectedBuddy.role,
            imagePath: selectedBuddy.imagePath,
          },
        })
        .eq("id", user.id)

      localStorage.setItem(`buddy_${user.id}`, selectedBuddy.id)
      await refreshProfile()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        color: TEXT,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 120px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 22,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Fredoka One', cursive",
                fontSize: 30,
                color: GOLD,
              }}
            >
              Avatar Studio
            </h1>
            <p style={{ margin: "6px 0 0", color: TEXT2, fontSize: 13 }}>
              Pick your 3D study buddy (Roblox-style character lineup).
            </p>
          </div>
          <Link
            to="/dashboard"
            style={{
              color: GOLD,
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Back to Dashboard
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: SURF,
              border: `2px solid ${BORDER}`,
              borderRadius: 18,
              padding: 18,
            }}
          >
            <div style={{ color: TEXT2, fontSize: 12, marginBottom: 12, fontWeight: 700 }}>
              Buddy Lineup ({buddies.length})
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                maxHeight: "72vh",
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {buddies.map((buddy) => {
                const active = buddy.id === buddyId
                return (
                  <button
                    key={buddy.id}
                    onClick={() => setBuddyId(buddy.id)}
                    style={{
                      borderRadius: 14,
                      border: `2px solid ${active ? GOLD : BORDER}`,
                      background: active ? "rgba(240,160,64,0.12)" : SURF2,
                      padding: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "transform .15s ease, border-color .15s ease",
                    }}
                  >
                    <img
                      src={buddy.imagePath}
                      alt={buddy.name}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        borderRadius: 10,
                        border: `1px solid ${BORDER}`,
                        display: "block",
                      }}
                    />
                    <div style={{ marginTop: 8, color: active ? GOLD : TEXT, fontWeight: 800, fontSize: 12 }}>
                      {buddy.emoji} {buddy.name}
                    </div>
                    <div style={{ marginTop: 2, color: TEXT2, fontSize: 10 }}>{buddy.role}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ position: "sticky", top: 18 }}>
            <div
              style={{
                background: SURF,
                border: `2px solid ${BORDER}`,
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div style={{ color: TEXT2, fontSize: 12, marginBottom: 10, fontWeight: 700 }}>
                Spotlight Buddy
              </div>
              <img
                src={selectedBuddy?.imagePath}
                alt={selectedBuddy?.name}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px solid ${BORDER}`,
                  display: "block",
                }}
              />
              <div style={{ marginTop: 10, fontFamily: "'Fredoka One', cursive", color: GOLD, fontSize: 20 }}>
                {selectedBuddy?.name}
              </div>
              <div style={{ color: TEXT2, marginTop: 3, fontSize: 13 }}>
                {selectedBuddy?.role} Buddy
              </div>
              <div style={{ color: TEXT2, marginTop: 8, fontSize: 12 }}>
                Active ID: <span style={{ color: TEXT }}>{selectedBuddy?.id}</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !selectedBuddy}
              style={{
                width: "100%",
                padding: 15,
                marginTop: 14,
                background: GOLD,
                border: "none",
                borderRadius: 12,
                color: "#000",
                fontSize: 15,
                fontWeight: 800,
                cursor: saving ? "default" : "pointer",
                fontFamily: "inherit",
                transition: "opacity .2s",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Buddy Selection"}
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
