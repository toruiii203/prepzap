import { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";

interface StudeniusShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

/**
 * On mobile: full width, cream bg.
 * On desktop (md+): centered 390px phone frame with dark gutter — matches Stitch mockup.
 * On large desktop (lg+): expands to max-w-[900px] with side padding for comfort.
 */
export function StudeniusShell({ children, hideNav = false }: StudeniusShellProps) {
  return (
    <div className="studenius-app min-h-[100dvh] w-full flex justify-center bg-[#FAF7F2] md:bg-[#111]">
      {/* Mobile: full width. md: phone frame. lg+: wider centered panel */}
      <div className="
        relative w-full min-h-[100dvh] bg-[#FAF7F2] flex flex-col
        md:max-w-[390px] md:border-x-[1.5px] md:border-black md:shadow-[0_0_60px_rgba(0,0,0,0.4)]
        lg:max-w-[900px] lg:border-x-[1.5px] lg:border-black
      ">
        {/* Desktop sidebar layout for lg screens */}
        <div className="flex flex-1 lg:grid lg:grid-cols-[240px_1fr] relative">
          {/* Desktop left sidebar — only visible on lg+ */}
          <aside className="hidden lg:flex flex-col border-r-[1.5px] border-black bg-[#FAF7F2] pt-8 px-5 gap-2 sticky top-0 h-[100dvh]">
            <div className="text-[22px] font-black mb-6 tracking-tight">Studenius</div>
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

          {/* Main content */}
          <div className="flex flex-col flex-1 min-w-0">
            {children}
          </div>
        </div>

        {/* Bottom nav — mobile/tablet only */}
        {!hideNav && (
          <div className="lg:hidden">
            <BottomNav />
          </div>
        )}
      </div>
    </div>
  );
}
