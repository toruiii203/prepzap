import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { icon: "dashboard",      label: "Dashboard",      route: "/dashboard" },
      { icon: "smart_toy",      label: "AI Tutor",       route: "/ai-tutor" },
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

interface SharedSidebarProps {
  active: string;
}

export function SharedSidebar({ active }: SharedSidebarProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const displayName =
    (user as any)?.user_metadata?.full_name ||
    profile?.full_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Student";

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64 overflow-y-auto">
      {/* Logo */}
      <div className="mb-6 px-1">
        <h1 className="text-[24px] font-black tracking-tight text-black cursor-pointer" onClick={() => navigate("/dashboard")}>
          Studenius
        </h1>
        <p className="text-[11px] font-bold text-black/50 mt-0.5">
          Academic Level: {profile?.plan === "pro" ? "Pro" : "Free"}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1 px-2">{section.label}</p>
            {section.items.map((item) => {
              const isActive = active === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold transition-all text-left w-full ${
                    isActive ? "bg-black text-white" : "text-black hover:bg-[#E2E2E2]"
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

      {/* Footer */}
      <div className="mt-auto border-t-[1.5px] border-black pt-4 flex flex-col gap-2">
        <button
          onClick={() => navigate("/go-pro")}
          className="w-full bg-[#FF4D2E] text-white border-[1.5px] border-black py-2.5 text-[13px] font-extrabold shadow-[2px_2px_0px_#000] hover:opacity-90 transition-opacity"
        >
          Upgrade to Pro
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
            <span className="text-[11px] font-bold text-black/50">Level {profile?.level ?? 1}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
