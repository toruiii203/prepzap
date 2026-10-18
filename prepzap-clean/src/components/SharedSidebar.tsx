import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyTimeTracker } from "@/hooks/useStudyTimeTracker";
import { playTap } from "@/lib/soundFX";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { icon: "dashboard",      label: "Dashboard",      route: "/dashboard" },
      { icon: "groups",         label: "Community Hub",  route: "/community" },
      { icon: "edit_document",  label: "Notes",          route: "/notes" },
      { icon: "forum",      label: "Rex Tutor",       route: "/ai-tutor" },
      { icon: "style",          label: "Flashcards",     route: "/flashcards" },
      { icon: "assignment",     label: "Practice",       route: "/practice" },
      { icon: "timer",          label: "Focus Timer",    route: "/timer" },
      { icon: "calendar_month", label: "Study Planner",  route: "/planner" },
    ],
  },
  {
    label: "Tools",
    items: [
      { icon: "calculate",      label: "Math Solver",    route: "/math" },
      { icon: "psychology",     label: "Teach It",       route: "/teach-it" },
      { icon: "menu_book",      label: "Quick Study",    route: "/quick-study" },
      { icon: "auto_stories",   label: "Mistake Journal",route: "/mistakes" },
      { icon: "military_tech",  label: "Challenges",     route: "/challenges" },
      { icon: "sports_esports", label: "Arena",          route: "/arena" },
        { icon: "stadia_controller", label: "Arcade",         route: "/arcade" },
    ],
  },
  {
    label: "Resources",
    items: [
      { icon: "folder_open",    label: "Source Library", route: "/sources" },
      { icon: "bar_chart",      label: "Analytics",      route: "/analytics" },
    ],
  },
];

// Flat lookup so we can turn the current route into a human-readable tool
// name for logging. Routes not listed here (settings, profile, go-pro, etc.)
// intentionally aren't "study tools", so time tracking no-ops on those pages.
const ROUTE_TO_TOOL_NAME: Record<string, string> = Object.fromEntries(
  NAV_SECTIONS.flatMap((section) => section.items).map((item) => [item.route, item.label])
);
// DO NOT log time for non-study tools just because they are in the nav.
delete ROUTE_TO_TOOL_NAME["/dashboard"];
delete ROUTE_TO_TOOL_NAME["/community"];
delete ROUTE_TO_TOOL_NAME["/sources"];
delete ROUTE_TO_TOOL_NAME["/analytics"];
delete ROUTE_TO_TOOL_NAME["/planner"];

interface SharedSidebarProps {
  active: string;
}

export function SharedSidebar({ active }: SharedSidebarProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  // Centralized time tracking: this one hook instance covers every route that
  // renders SharedSidebar (i.e. the whole app), so no per-page wiring needed.
  useStudyTimeTracker(ROUTE_TO_TOOL_NAME[active] ?? null, user?.id);

  const displayName =
    (user as any)?.user_metadata?.full_name ||
    profile?.full_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64 overflow-hidden">
      {/* Logo */}
      <div className="mb-6 px-1">
        <h1 className="text-[24px] font-black tracking-tight text-black cursor-pointer" onClick={() => navigate("/dashboard")}>
          Studenius
        </h1>
      </div>

      
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #FAF7F2;
            border-left: 1.5px solid black;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: black;
            border: 1.5px solid black;
          }
        `}</style>
        {/* Nav */}

      <div className="flex-1 relative min-h-0">
        <nav className="h-full flex flex-col gap-4 overflow-y-auto pb-4 custom-scrollbar" >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1 px-2">{section.label}</p>
            {section.items.map((item) => {
              const isActive = active === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => {
                    playTap();
                    navigate(item.route);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-black transition-all text-left w-full rounded-xl ${
                    isActive
                      ? "bg-black text-white shadow-[0px_3px_0px_#AE2925] -translate-y-0.5"
                      : "text-black hover:bg-black/5 hover:-translate-y-0.5"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t-[1.5px] border-black pt-4 flex flex-col gap-2">
        <button
          onClick={() => navigate("/pro")}
          className="flex items-center justify-center gap-2 px-3 py-2.5 mx-3 mb-1 bg-[#ae2925] border-2 border-black text-white text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] hover:bg-black hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
          UPGRADE TO PRO
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-3 py-2 text-[13px] font-bold text-black hover:bg-[#E2E2E2] w-full transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>Settings
        </button>
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 px-3 py-2 hover:bg-[#E2E2E2] w-full transition-colors"
        >
          <div className="w-8 h-8 bg-[#ae2925] text-white border-[1.5px] border-black flex items-center justify-center font-black text-[13px] flex-shrink-0">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] font-bold text-black truncate max-w-[130px]">{displayName}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}





