import { Link, useLocation } from "react-router-dom";

const tabs = [
  { href: "/tools", label: "Tools", icon: "grid_view" },
  { href: "/arena", label: "Arena", icon: "sports_esports" },
  { href: "/dashboard", label: "Home", icon: "home", activeFill: true },
  { href: "/timer", label: "Timer", icon: "timer" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

function isTabActive(href: string, pathname: string): boolean {
  switch (href) {
    case "/tools":
      return pathname === "/tools";
    case "/arena":
      return (
        pathname === "/arena" ||
        pathname.startsWith("/arena/")
      );
    case "/dashboard":
      return pathname === "/dashboard" || pathname === "/";
    case "/timer":
      return pathname === "/timer" || pathname === "/pomodoro-area";
    case "/profile":
      return pathname === "/profile" || pathname === "/avatar" || pathname === "/go-pro";
    default:
      return pathname === href;
  }
}

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] h-14 bg-[#FAF7F2] border-t-[1.5px] border-black flex justify-around items-center px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]"
      aria-label="Main navigation"
    >
      {tabs.map(({ href, icon, activeFill }) => {
        const active = isTabActive(href, location.pathname);

        return (
          <Link
            key={href}
            to={href}
            className={`relative flex flex-col items-center justify-center p-2 w-12 h-12 transition-colors ${
              active ? "text-black" : "text-black/40 hover:text-black/70"
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={
                active && activeFill
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {icon}
            </span>
            {active && (
              <div className="w-1.5 h-1.5 bg-black rounded-full absolute bottom-1" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
