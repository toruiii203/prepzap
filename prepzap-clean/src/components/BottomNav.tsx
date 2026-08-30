import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { icon: "smart_toy", label: "Tutor", path: "/ai-tutor" },
  { icon: "style", label: "Cards", path: "/flashcards" },
  { icon: "home", label: "Home", path: "/dashboard" },
  { icon: "calendar_month", label: "Planner", path: "/planner" },
  { icon: "sports_esports", label: "Arena", path: "/arena" },
];

// Routes with their own full-screen fixed bottom bar (chat input, quiz
// prev/next/submit controls, etc). Rendering the global nav on top of these
// was covering the page's own button and blocking taps — this was the
// mobile "stuck button" bug in AI Tutor and the Arena quiz screen.
const HIDDEN_ON: RegExp[] = [
  /^\/ai-tutor/,
  /^\/arena\/quiz\//,
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (HIDDEN_ON.some((pattern) => pattern.test(pathname))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex ios-blur safe-pb">
      {NAV_ITEMS.map(({ icon, label, path }) => {
        const active = pathname === path || (path !== "/dashboard" && pathname.startsWith(path));
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active ? "bg-black text-white" : "text-black/60"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
