import { useState, useEffect } from "react";
import { SharedSidebar } from "@/components/SharedSidebar";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadLibrary } from "@/lib/sourceContext";
import { usePlan } from "@/hooks/usePlan";

// ─── helpers ────────────────────────────────────────────────────────────────

function getLocalNumber(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") return parsed;
    if (Array.isArray(parsed)) return parsed.length;
    return fallback;
  } catch {
    return fallback;
  }
}

function deriveStats() {
  // Sessions = number of focus timer sessions completed
  const sessions = getLocalNumber("studenius_timer_sessions");

  // Study time in hours from focus timer total minutes
  const totalMinutes = getLocalNumber("studenius_timer_total_minutes");
  const studyHrs = Math.round(totalMinutes / 60);

  // Avg score from practice results array: [{ score, total }]
  let avgScore = 0;
  try {
    const results: { score: number; total: number }[] =
      JSON.parse(localStorage.getItem("studenius_practice_results") || "[]");
    if (results.length > 0) {
      const pct = results.map(r => (r.score / Math.max(r.total, 1)) * 100);
      avgScore = Math.round(pct.reduce((a, b) => a + b, 0) / pct.length);
    }
  } catch {}

  // Streak from mistake journal or focus timer streak key
  const streak = getLocalNumber("studenius_streak_days");

  return { sessions, studyHrs, avgScore, streak };
}

function getJoinDate(isoString?: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Desktop sidebar ─────────────────────────────────────────────────────────

// ─── Hub card (shared) ───────────────────────────────────────────────────────

const HubCard = ({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group bg-[#FAF7F2] border-2 border-black p-8 flex flex-col text-left transition-all hover:bg-[#F0EDE0] active:translate-x-0.5 active:translate-y-0.5"
    style={{ boxShadow: "5px 5px 0px #000", minHeight: 220 }}
    onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translate(3px,3px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0px #000"; }}
    onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "5px 5px 0px #000"; }}
  >
    <div className="flex items-start justify-between mb-6">
      <div className="w-14 h-14 bg-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_#555]">
        <span className="material-symbols-outlined text-white text-[28px]">{icon}</span>
      </div>
      <span className="material-symbols-outlined text-[20px] text-black/40 group-hover:translate-x-1 transition-transform">
        arrow_forward
      </span>
    </div>
    <h4 className="font-black text-[18px] mb-2">{label}</h4>
    <p className="text-[14px] font-medium text-black/60 mt-auto leading-relaxed">{description}</p>
  </button>
);

// ─── Stat card (shared) ──────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  icon?: string;
}) => (
  <div
    className="bg-[#FAF7F2] border-2 border-black p-6 flex flex-col"
    style={{ boxShadow: "5px 5px 0px #000" }}
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-[11px] font-black uppercase tracking-widest text-black/50">{label}</p>
      {icon && (
        <span className="material-symbols-outlined text-[20px]" style={{ color: accent || "#000" }}>
          {icon}
        </span>
      )}
    </div>
    <p
      className="font-black text-[32px] leading-none mt-1"
      style={{ color: accent || "#000" }}
    >
      {value}
    </p>
    {sub && <p className="text-[12px] font-bold text-black/40 mt-2">{sub}</p>}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudentProfile() {
  const navigate = useNavigate();
  const { isPro } = usePlan();

  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("S");
  const [joinDate, setJoinDate] = useState("—");
  const [stats, setStats] = useState({ sessions: 0, studyHrs: 0, avgScore: 0, streak: 0 });
  const [sourceCount, setSourceCount] = useState(0);

  useEffect(() => {
    // Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        const name =
          meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Student";
        setUserName(name);
        setUserEmail(session.user.email || "");
        setUserInitial(name.charAt(0).toUpperCase());
        setJoinDate(getJoinDate(session.user.created_at));
      }
    });

    // Stats from localStorage
    setStats(deriveStats());

    // Source library count
    setSourceCount(loadLibrary().length);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/onboarding");
  };

  const hubCards = [
    { icon: "folder_open",   label: "Source Library", description: "Access your uploaded research papers and academic PDFs.", route: "/sources" },
    { icon: "leaderboard",   label: "Leaderboard",    description: "See how you rank against other students globally.", route: "/leaderboard" },
    { icon: "bar_chart",     label: "Analytics",      description: "Deep dive into your cognitive performance and subject mastery.", route: "/analytics" },
    { icon: "timer",         label: "Focus History",  description: "Review your Deep Work logs and productivity patterns.", route: "/timer" },
    { icon: "military_tech", label: "Achievements",   description: "Collected accolades for your academic excellence and consistency.", route: "/challenges" },
    { icon: "settings",      label: "Account Settings", description: "Manage your subscription, security, and personal preferences.", route: "/settings" },
  ];

  // ── Mobile file count label ──────────────────────────────────────────────
  const sourceLabel = sourceCount === 0 ? "No sources yet" : `${sourceCount} source${sourceCount !== 1 ? "s" : ""} uploaded`;

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>
      <SharedSidebar active="/profile" />

      {/* ════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ════════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col min-h-screen">

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">PROFILE</span>
            <div className="w-px h-6 bg-black/20" />
            <span className="text-[13px] font-bold text-black/50">{userName}</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90"
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-10 py-10 pb-16 max-w-6xl w-full mx-auto flex flex-col gap-8">

          {/* Profile hero */}
          <section
            className="bg-[#FAF7F2] border-2 border-black p-10 flex flex-col md:flex-row items-center gap-8"
            style={{ boxShadow: "5px 5px 0px #000" }}
          >
            {/* Initial block */}
            <div className="relative shrink-0">
              <div
                className="w-32 h-32 bg-black flex items-center justify-center border-2 border-black"
                style={{ boxShadow: "4px 4px 0px #555" }}
              >
                <span className="text-[64px] font-black text-[#FAF7F2] leading-none">{userInitial}</span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#F5A623] border-2 border-black px-2 py-0.5 text-[11px] font-black uppercase tracking-widest" style={{ display: isPro ? "block" : "none" }}>
                PRO
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-black text-[48px] leading-none tracking-tight">{userName}</h2>
              {userEmail && (
                <p className="text-[14px] font-semibold text-black/40 mt-1">{userEmail}</p>
              )}
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                <p className="text-[14px] font-semibold text-black/60 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                  Joined {joinDate}
                </p>
                <span className="w-1 h-1 bg-black/30 rounded-full" />
                <p className="text-[14px] font-semibold text-black/60 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                  {isPro ? "Pro Scholar" : "Free Plan"}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-4 shrink-0">
              <button
                onClick={() => navigate("/settings")}
                className="px-6 py-2.5 border-2 border-black font-extrabold text-[13px] bg-[#FAF7F2] hover:bg-[#E2E2E2] transition-colors shadow-[3px_3px_0px_#000]"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.origin + "/profile");
                }}
                className="px-6 py-2.5 border-2 border-black font-extrabold text-[13px] bg-black text-white hover:opacity-90 transition-opacity shadow-[3px_3px_0px_#555]"
              >
                Share Hub
              </button>
            </div>
          </section>

          {/* Stats grid — 4 equal columns */}
          <section className="grid grid-cols-4 gap-6">
            <StatCard
              label="Total Sessions"
              value={stats.sessions > 0 ? stats.sessions.toLocaleString() : "—"}
              sub={stats.sessions > 0 ? "Focus sessions logged" : "Start a Focus Timer session"}
            />
            <StatCard
              label="Study Time"
              value={stats.studyHrs > 0 ? `${stats.studyHrs}hrs` : "—"}
              sub={stats.studyHrs > 0 ? "Total tracked time" : "Time tracked via Focus Timer"}
            />
            <StatCard
              label="Avg Score"
              value={stats.avgScore > 0 ? `${stats.avgScore}%` : "—"}
              accent={stats.avgScore > 0 ? "#FF4D2E" : undefined}
              sub={stats.avgScore > 0 ? "Across all practice sets" : "Complete a Practice set"}
            />
            <StatCard
              label="Current Streak"
              value={stats.streak > 0 ? `${stats.streak}d` : "—"}
              accent="#F5A623"
              icon="local_fire_department"
              sub={stats.streak > 0 ? "Days in a row" : "Keep studying daily!"}
            />
          </section>

          {/* Hub cards grid — 2×3 */}
          <section className="grid grid-cols-2 gap-6">
            {hubCards.map(card => (
              <HubCard
                key={card.route}
                icon={card.icon}
                label={card.label}
                description={card.description}
                onClick={() => navigate(card.route)}
              />
            ))}
          </section>

          {/* Footer */}
          <div className="flex justify-center pt-6 border-t-2 border-black">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-[#ba1a1a] font-black text-[16px] hover:underline transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE LAYOUT
      ════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]">

        {/* Mobile header */}
        <header className="w-full sticky top-0 bg-[#FAF7F2] flex items-center justify-between px-5 h-16 z-40 border-b-2 border-black shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-[#ebe8e3] transition-colors active:translate-y-0.5"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" />
          </button>
          <h1 className="font-extrabold text-[20px] text-[#1A1A1A] tracking-tight text-center flex-1">
            Profile
          </h1>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-full hover:bg-[#ebe8e3] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
        </header>

        <main className="flex-1 px-5 py-6 flex flex-col gap-6 pb-24 overflow-y-auto">

          {/* Mobile hero */}
          <div className="bg-white border-2 border-black rounded-2xl p-6 flex flex-col items-center gap-4 shadow-[4px_4px_0px_0px_#000]">
            <div className="relative">
              <div className="w-24 h-24 bg-black flex items-center justify-center border-2 border-black shadow-[3px_3px_0px_#555]">
                <span className="text-[48px] font-black text-[#FAF7F2] leading-none">{userInitial}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#F5A623] border-2 border-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest" style={{ display: isPro ? "block" : "none" }}>
                PRO
              </div>
            </div>
            <div className="text-center">
              <h2 className="font-extrabold text-[26px] tracking-tight leading-none">{userName}</h2>
              {userEmail && (
                <p className="text-[12px] font-semibold text-[#888] mt-1">{userEmail}</p>
              )}
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-[12px] font-semibold text-[#888] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                  {joinDate}
                </span>
                <span className="w-1 h-1 bg-black/20 rounded-full" />
                <span className="text-[12px] font-semibold text-[#888] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                  {isPro ? "Pro Scholar" : "Free Plan"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate("/settings")}
                className="flex-1 py-2.5 border-2 border-black font-bold text-[13px] bg-[#FAF7F2] hover:bg-[#E2E2E2] shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all"
              >
                Edit Profile
              </button>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(window.location.origin + "/profile");
                }}
                className="flex-1 py-2.5 border-2 border-black font-bold text-[13px] bg-black text-white hover:opacity-90 shadow-[2px_2px_0px_#555] active:translate-y-0.5 transition-all"
              >
                Share Hub
              </button>
            </div>
          </div>

          {/* Mobile stats — 2×2 grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sessions",     value: stats.sessions > 0 ? stats.sessions.toLocaleString() : "—", accent: undefined,   icon: undefined },
              { label: "Study Time",   value: stats.studyHrs > 0 ? `${stats.studyHrs}h` : "—",           accent: undefined,   icon: undefined },
              { label: "Avg Score",    value: stats.avgScore > 0 ? `${stats.avgScore}%` : "—",           accent: "#FF4D2E",   icon: undefined },
              { label: "Streak",       value: stats.streak > 0 ? `${stats.streak}d` : "—",               accent: "#F5A623",   icon: "local_fire_department" },
            ].map(s => (
              <div
                key={s.label}
                className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_#000]"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">{s.label}</p>
                  {s.icon && (
                    <span className="material-symbols-outlined text-[16px]" style={{ color: s.accent || "#000" }}>
                      {s.icon}
                    </span>
                  )}
                </div>
                <p className="font-black text-[28px] leading-none" style={{ color: s.accent || "#1A1A1A" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Mobile source count callout */}
          <div className="bg-[#F0EDE0] border-2 border-black rounded-2xl p-4 flex items-center gap-3 shadow-[3px_3px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[24px]">folder_open</span>
            <div>
              <p className="font-black text-[14px]">Source Library</p>
              <p className="text-[12px] font-semibold text-black/50">{sourceLabel}</p>
            </div>
            <button
              onClick={() => navigate("/sources")}
              className="ml-auto text-[12px] font-extrabold uppercase tracking-widest border-2 border-black px-3 py-1.5 bg-white shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] active:translate-y-0.5 transition-all"
            >
              Open
            </button>
          </div>

          {/* Mobile hub cards */}
          <section className="flex flex-col gap-3">
            <h2 className="font-extrabold text-[16px]">Quick Navigation</h2>
            {hubCards.map(card => (
              <button
                key={card.route}
                onClick={() => navigate(card.route)}
                className="bg-white border-2 border-black rounded-2xl p-4 flex items-center gap-4 text-left shadow-[3px_3px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <div className="w-12 h-12 bg-black flex items-center justify-center border-2 border-black shrink-0">
                  <span className="material-symbols-outlined text-white text-[20px]">{card.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-[15px]">{card.label}</p>
                  <p className="text-[12px] font-semibold text-black/50 truncate">{card.description}</p>
                </div>
                <span className="material-symbols-outlined text-[18px] text-black/30">arrow_forward</span>
              </button>
            ))}
          </section>

          {/* Mobile sign out */}
          <div className="flex justify-center pt-4 border-t-2 border-black">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-[#ba1a1a] font-black text-[15px] hover:underline"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
