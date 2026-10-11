import { ReactNode } from "react";

interface StudeniusShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

/**
 * Responsive layout:
 * - Mobile (<md): full width, cream bg, bottom nav
 * - Desktop (md+): fullscreen with left sidebar, no phone frame
 */
export function StudeniusShell({ children, hideNav = false }: StudeniusShellProps) {
  return (
    <div className="studenius-app min-h-[100dvh] w-full flex bg-[#FAF7F2]">
      {/* Desktop sidebar — visible on md+ */}
      <aside className="hidden md:flex flex-col border-r-2 border-black bg-[#FAF7F2] pt-8 px-5 gap-1 sticky top-0 h-[100dvh] w-[240px] shrink-0 z-30">
        <div className="text-[22px] font-black mb-6 tracking-tight px-2">Studenius</div>
        {[
          { href: "/dashboard", icon: "home", label: "Home" },
          { href: "/tools", icon: "grid_view", label: "All Tools" },
          { href: "/planner", icon: "calendar_month", label: "Study Planner" },
          { href: "/leaderboard", icon: "emoji_events", label: "Leaderboard" },
          { href: "/analytics", icon: "bar_chart", label: "Analytics" },
          { href: "/sources", icon: "attach_file", label: "Source Library" },
          { href: "/timer", icon: "timer", label: "Focus Timer" },
          { href: "/profile", icon: "person", label: "Profile" },
        ].map(({ href, icon, label }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-[14px] hover:bg-black hover:text-[#FAF7F2] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            {label}
          </a>
        ))}
      </aside>

      {/* Main content — full width on mobile, fills remaining space on desktop */}
      <div className="flex flex-col flex-1 min-w-0 min-h-[100dvh] relative">
        {children}
      </div>
    </div>
  );
}
