import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

const NAV_LINKS = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/tools", icon: "grid_view", label: "All Tools" },
  { href: "/practice", icon: "assignment", label: "Practice" },
  { href: "/flashcards", icon: "style", label: "Flashcards" },
  { href: "/ai-tutor", icon: "smart_toy", label: "AI Tutor" },
  { href: "/planner", icon: "calendar_month", label: "Study Planner" },
  { href: "/math", icon: "calculate", label: "Math Solver" },
  { href: "/sources", icon: "attach_file", label: "Source Library" },
  { href: "/analytics", icon: "bar_chart", label: "Analytics" },
  { href: "/leaderboard", icon: "emoji_events", label: "Leaderboard" },
  { href: "/timer", icon: "timer", label: "Focus Timer" },
  { href: "/profile", icon: "person", label: "Profile" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

/**
 * StudeniusLayout — React Router v6 layout route component.
 * Mobile  (<md): full-width single column, bottom nav.
 * Desktop (md+): full-screen, left sidebar (240px) + scrollable main content.
 * No phone-frame on desktop.
 */
export function StudeniusLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="studenius-app w-full flex bg-[#FAF7F2]" style={{ minHeight: "100dvh" }}>
      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col border-r-2 border-[#1A1A1A] bg-[#FAF7F2] pt-6 pb-4 px-4 gap-1 sticky top-0 h-[100dvh] w-[224px] shrink-0 z-30 overflow-y-auto">
        {/* Logo */}
        <div
          className="flex items-center gap-2 mb-5 px-2 cursor-pointer select-none"
          onClick={() => navigate("/dashboard")}
        >
          <span className="text-[22px] font-black tracking-tight text-[#1A1A1A]">Studenius</span>
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#ae2925] text-white tracking-wider"
          >
            BETA
          </span>
        </div>

        {/* Nav links */}
        {NAV_LINKS.map(({ href, icon, label }) => {
          const isActive =
            location.pathname === href ||
            (href !== "/dashboard" && location.pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                navigate(href);
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[13.5px] transition-all duration-100 ${
                isActive
                  ? "bg-[#1A1A1A] text-[#FAF7F2] shadow-none"
                  : "text-[#1A1A1A] hover:bg-[#1A1A1A]/10"
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              {label}
            </a>
          );
        })}

        {/* Divider + Go Pro */}
        <div className="mt-auto pt-4 border-t-2 border-[#1A1A1A]/10">
          <a
            href="/go-pro"
            onClick={(e) => { e.preventDefault(); navigate("/go-pro"); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[13.5px] text-[#ae2925] hover:bg-[#ae2925]/10 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              workspace_premium
            </span>
            Go Pro
          </a>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 relative" style={{ minHeight: "100dvh" }}>
        {/* Page content rendered by React Router */}
        <Outlet />

        {/* Bottom nav — mobile only */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
