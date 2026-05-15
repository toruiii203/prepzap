import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { QuickLaunchBar } from "@/components/QuickLaunchBar";
import { StudyPlannerWidget } from "@/components/StudyPlannerWidget";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Navbar } from "@/components/Navbar";

// ─── Constants ────────────────────────────────────────────────────────────────
const GOLD = "#f0a040";
const BG = "#160810";
const SURF = "#1f0b13";
const SURF2 = "#2a0e18";
const BORDER = "rgba(139,26,42,0.35)";
const TEXT = "#f5ede8";
const TEXT2 = "rgba(245,237,232,0.55)";
const TEXT3 = "rgba(245,237,232,0.28)";

// ─── Study tools grid (replaces the cramped carousel) ─────────────────────────
const TOOLS = [
  { href: "/ai-tutor",       emoji: "🤖", label: "BrainBot",    color: GOLD,      desc: "Ask anything" },
  { href: "/practice",       emoji: "📝", label: "Practice",    color: "#3b82f6", desc: "MCQ quiz sets" },
  { href: "/flashcards",     emoji: "🃏", label: "Flashcards",  color: "#8b5cf6", desc: "Spaced recall" },
  { href: "/feynman",        emoji: "🧠", label: "Feynman",     color: "#10b981", desc: "Teach to learn" },
  { href: "/math",           emoji: "🔢", label: "Math Solver", color: "#f59e0b", desc: "Step-by-step" },
  { href: "/daily5",         emoji: "⚡", label: "Daily Quiz",  color: "#06b6d4", desc: "5 a day" },
  { href: "/cram",           emoji: "🚀", label: "Cram Mode",   color: "#ef4444", desc: "Last-minute" },
  { href: "/visual-learner", emoji: "👁️", label: "Visual",      color: "#ec4899", desc: "See concepts" },
  { href: "/recall",         emoji: "💭", label: "Recall",      color: "#06b6d4", desc: "Brain dump" },
  { href: "/timer",          emoji: "⏱️", label: "Pomodoro",    color: "#10b981", desc: "Focus timer" },
  { href: "/blank-map",      emoji: "🗺️", label: "Mind Map",    color: "#a855f7", desc: "Connect ideas" },
  { href: "/mistakes",       emoji: "📖", label: "Mistakes",    color: "#f97316", desc: "Learn from errors" },
];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ emoji, value, label, sub }: { emoji: string; value: string | number; label: string; sub?: string }) {
  return (
    <div
      style={{
        background: SURF,
        border: `1.5px solid ${BORDER}`,
        borderRadius: 16,
        padding: "14px 12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        flex: 1,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: GOLD, fontFamily: "'Fredoka One', cursive", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 9, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: 9, color: TEXT3, textAlign: "center" }}>{sub}</span>
      )}
    </div>
  );
}

// ─── Today's checklist ────────────────────────────────────────────────────────
interface ChecklistItem { id: string; text: string; done: boolean }

function TodaysChecklist() {
  const LS_KEY = "pz_checklist_v1";
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");

  const save = (next: ChecklistItem[]) => {
    setItems(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  };

  const add = () => {
    if (!input.trim()) return;
    save([...items, { id: Date.now().toString(), text: input.trim(), done: false }]);
    setInput("");
  };

  const toggle = (id: string) =>
    save(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));

  const del = (id: string) => save(items.filter((i) => i.id !== id));

  return (
    <div style={{ background: SURF, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: "'Fredoka One', cursive", marginBottom: 10 }}>
        Today's Checklist
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Quick add..."
          style={{
            flex: 1,
            background: SURF2,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "8px 12px",
            color: TEXT,
            fontSize: 12,
            fontFamily: "'Nunito', sans-serif",
            outline: "none",
          }}
        />
        <button
          onClick={add}
          style={{
            background: GOLD,
            border: "none",
            borderRadius: 10,
            padding: "8px 12px",
            color: BG,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 11, color: TEXT3, textAlign: "center", padding: "8px 0" }}>No tasks yet. Add one above!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: SURF2,
                borderRadius: 10,
                padding: "8px 10px",
              }}
            >
              <button
                onClick={() => toggle(item.id)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: `2px solid ${item.done ? GOLD : BORDER}`,
                  background: item.done ? GOLD : "transparent",
                  flexShrink: 0,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  color: BG,
                }}
              >
                {item.done ? "✓" : ""}
              </button>
              <span
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: item.done ? TEXT3 : TEXT2,
                  textDecoration: item.done ? "line-through" : "none",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {item.text}
              </span>
              <button
                onClick={() => del(item.id)}
                style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", fontSize: 13, padding: "0 2px" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upcoming sessions ────────────────────────────────────────────────────────
function UpcomingSessions() {
  return (
    <div style={{ background: SURF, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: "'Fredoka One', cursive", marginBottom: 10 }}>
        Upcoming Sessions
      </p>
      <p style={{ fontSize: 11, color: TEXT3, textAlign: "center", padding: "8px 0" }}>No sessions yet</p>
      <Link
        to="/planner"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px",
          border: `1px dashed ${BORDER}`,
          borderRadius: 10,
          color: TEXT3,
          textDecoration: "none",
          fontSize: 11,
          fontFamily: "'Nunito', sans-serif",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = GOLD;
          (e.currentTarget as HTMLElement).style.color = GOLD;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = BORDER;
          (e.currentTarget as HTMLElement).style.color = TEXT3;
        }}
      >
        + Add Session
      </Link>
    </div>
  );
}

// ─── Study Heatmap (simplified) ───────────────────────────────────────────────
function StudyHeatmap() {
  const days = Array.from({ length: 35 }, (_, i) => {
    const rand = Math.random();
    return rand < 0.5 ? 0 : rand < 0.7 ? 1 : rand < 0.85 ? 2 : 3;
  });
  const colors = ["#2a0e18", "#3b0f1e", "#7c2035", GOLD];

  return (
    <div style={{ background: SURF, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: "'Fredoka One', cursive", marginBottom: 10 }}>
        Study Heatmap
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((level, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 4,
              background: colors[level],
              border: `1px solid ${BORDER}`,
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 9, color: TEXT3, textAlign: "center", marginTop: 8 }}>Last 5 weeks</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, profile } = useAuth() as any;
  const navigate = useNavigate();

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Learner";

  const firstName = displayName.split(" ")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  // Avatar config from profile
  const avatarConfig = profile?.avatar_config || null;
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const streak = profile?.streak || 0;
  const totalSessions = profile?.total_sessions || 0;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', sans-serif" }}>
      {/* Navbar (desktop) */}
      <div className="hidden md:block">
        <Navbar
          isLoggedIn={!!user}
          user={{
            name: displayName,
            xp,
            streak,
            plan: profile?.plan || "free",
          }}
        />
      </div>

      {/* Mobile top bar */}
      <div
        className="md:hidden"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: 52,
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 800, color: GOLD, fontFamily: "'Fredoka One', cursive" }}>
          STUDENIUS
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/study-tools" style={{ fontSize: 11, color: TEXT2, textDecoration: "none", fontWeight: 700 }}>
            Study Tools
          </Link>
          <Link to="/pomodoro-area" style={{ fontSize: 11, color: TEXT2, textDecoration: "none", fontWeight: 700 }}>
            Pomodoro Area
          </Link>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "20px 16px 100px",
        }}
      >
        {/* ── Mobile Layout ── */}
        <div className="md:hidden">
          {/* Greeting */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: TEXT, fontFamily: "'Fredoka One', cursive", margin: 0 }}>
              Hey, {firstName}! 👋
            </h1>
            <p style={{ fontSize: 12, color: TEXT2, marginTop: 4 }}>Ready to study?</p>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <StatCard emoji="🔥" value={streak} label="Day Streak" sub="Start today" />
            <StatCard emoji="⏰" value="0.0" label="HRS / Week" sub="Goal: 1h/wk" />
            <StatCard emoji="✓" value={totalSessions} label="Sessions" sub="This week" />
          </div>

          {/* Avatar + checklist row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {/* Avatar card */}
            <div
              style={{
                background: SURF,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 16,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                minWidth: 130,
                flexShrink: 0,
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: GOLD, fontFamily: "'Fredoka One', cursive", margin: 0 }}>
                My Avatar
              </p>
              <div
                style={{
                  width: 80,
                  height: 80,
                  background: "#8b1a2a",
                  borderRadius: 14,
                  border: `2px solid ${GOLD}`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {avatarConfig ? (
                  <AvatarDisplay config={avatarConfig} pose="idle" />
                ) : (
                  <span style={{ fontSize: 32 }}>🦊</span>
                )}
              </div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: GOLD,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1.4,
                  maxWidth: 100,
                }}
              >
                {displayName.toUpperCase()}
              </p>
              <p style={{ fontSize: 9, color: TEXT3, margin: 0 }}>
                Bronze Fox · Lv. {level}
              </p>
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: TEXT3, marginBottom: 3 }}>
                  <span>XP to Lv {level + 1}</span>
                  <span>{xp} / 500</span>
                </div>
                <div style={{ height: 4, background: SURF2, borderRadius: 999 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min((xp / 500) * 100, 100)}%`,
                      background: GOLD,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
              <Link
                to="/avatar"
                style={{
                  fontSize: 9,
                  color: TEXT3,
                  textDecoration: "none",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: "4px 8px",
                }}
              >
                Customize
              </Link>
            </div>

            {/* Checklist */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <TodaysChecklist />
            </div>
          </div>

          {/* Upcoming sessions */}
          <div style={{ marginBottom: 20 }}>
            <UpcomingSessions />
          </div>

          {/* Study Heatmap */}
          <div style={{ marginBottom: 20 }}>
            <StudyHeatmap />
          </div>

          {/* Quick Launch */}
          <div style={{ marginBottom: 20 }}>
            <QuickLaunchBar />
          </div>

          {/* Study Tools Grid (replaces cramped carousel) */}
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: TEXT3,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 12,
              }}
            >
              Study Tools
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
              }}
            >
              {TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  to={tool.href}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: SURF,
                      border: `1.5px solid ${BORDER}`,
                      borderRadius: 14,
                      padding: "12px 10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = tool.color;
                      (e.currentTarget as HTMLElement).style.background = `${tool.color}11`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                      (e.currentTarget as HTMLElement).style.background = SURF;
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{tool.emoji}</span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: TEXT,
                        textAlign: "center",
                        lineHeight: 1.2,
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      {tool.label}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: TEXT3,
                        textAlign: "center",
                      }}
                    >
                      {tool.desc}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Privacy policy link (required for Google Play / AdSense) */}
          <div
            style={{
              textAlign: "center",
              padding: "12px 0",
              borderTop: `1px solid ${BORDER}`,
              marginTop: 8,
            }}
          >
            <Link
              to="/privacy"
              style={{ fontSize: 10, color: TEXT3, textDecoration: "none", marginRight: 16 }}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              style={{ fontSize: 10, color: TEXT3, textDecoration: "none" }}
            >
              Terms of Service
            </Link>
          </div>
        </div>

        {/* ── Desktop Layout ── */}
        <div className="hidden md:block">
          {/* Greeting */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: TEXT, fontFamily: "'Fredoka One', cursive", margin: 0 }}>
              Welcome back, {firstName}! 👋
            </h1>
            <p style={{ fontSize: 14, color: TEXT2, marginTop: 6 }}>
              Here's your study overview for today.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Stats */}
              <div style={{ display: "flex", gap: 12 }}>
                <StatCard emoji="🔥" value={streak} label="Day Streak" sub="Start today" />
                <StatCard emoji="⏰" value="0.0" label="HRS / Week" sub="Goal: 1h/wk" />
                <StatCard emoji="✓" value={totalSessions} label="Sessions" sub="This week" />
                <StatCard emoji="🎯" value="0%" label="Goal" sub="Set a goal" />
              </div>

              {/* Quick Launch */}
              <QuickLaunchBar />

              {/* Tools grid */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>
                  Study Tools
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {TOOLS.map((tool) => (
                    <Link key={tool.href} to={tool.href} style={{ textDecoration: "none" }}>
                      <div
                        style={{
                          background: SURF,
                          border: `1.5px solid ${BORDER}`,
                          borderRadius: 14,
                          padding: "14px 12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = tool.color;
                          (e.currentTarget as HTMLElement).style.background = `${tool.color}11`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                          (e.currentTarget as HTMLElement).style.background = SURF;
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{tool.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: TEXT, textAlign: "center" }}>{tool.label}</span>
                        <span style={{ fontSize: 10, color: TEXT3, textAlign: "center" }}>{tool.desc}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Heatmap */}
              <StudyHeatmap />
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Avatar card */}
              <div
                style={{
                  background: SURF,
                  border: `1.5px solid ${BORDER}`,
                  borderRadius: 16,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: "'Fredoka One', cursive", margin: 0, alignSelf: "flex-start" }}>
                  My Avatar
                </p>
                <div
                  style={{
                    width: 120,
                    height: 120,
                    background: "#8b1a2a",
                    borderRadius: 18,
                    border: `2px solid ${GOLD}`,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {avatarConfig ? (
                    <AvatarDisplay config={avatarConfig} pose="idle" />
                  ) : (
                    <span style={{ fontSize: 48 }}>🦊</span>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 800, color: GOLD, fontFamily: "'Fredoka One', cursive", textAlign: "center", margin: 0, textTransform: "uppercase" }}>
                  {displayName.toUpperCase()}
                </p>
                <p style={{ fontSize: 11, color: TEXT3, margin: 0 }}>Bronze Fox · Lv. {level}</p>
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: TEXT3, marginBottom: 4 }}>
                    <span>XP to Level {level + 1}</span>
                    <span>{xp} / 500</span>
                  </div>
                  <div style={{ height: 6, background: SURF2, borderRadius: 999 }}>
                    <div style={{ height: "100%", width: `${Math.min((xp / 500) * 100, 100)}%`, background: GOLD, borderRadius: 999 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  <Link to="/avatar" style={{ flex: 1, textAlign: "center", padding: "8px", border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT2, textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                    Customize
                  </Link>
                  <Link to="/shop" style={{ flex: 1, textAlign: "center", padding: "8px", border: `1px solid ${GOLD}44`, borderRadius: 10, color: GOLD, textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                    Shop
                  </Link>
                </div>
              </div>

              {/* Checklist */}
              <TodaysChecklist />

              {/* Upcoming sessions */}
              <UpcomingSessions />

              {/* Study Planner */}
              <StudyPlannerWidget />
            </div>
          </div>

          {/* Footer links */}
          <div style={{ textAlign: "center", padding: "24px 0 12px", borderTop: `1px solid ${BORDER}`, marginTop: 32 }}>
            <Link to="/privacy" style={{ fontSize: 11, color: TEXT3, textDecoration: "none", marginRight: 20 }}>Privacy Policy</Link>
            <Link to="/terms" style={{ fontSize: 11, color: TEXT3, textDecoration: "none" }}>Terms of Service</Link>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
