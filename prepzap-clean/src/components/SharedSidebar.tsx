import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyTimeTracker } from "@/hooks/useStudyTimeTracker";
import { usePlan } from "@/hooks/usePlan";
import { formatFriendlyName } from "@/lib/formatName";
import { useUserProfile } from "@/lib/userProfileStore";
import { playTap } from "@/lib/soundFX";
import { getDueCount } from "@/lib/spacedRepetition";

// 5 Core Top-Level Destinations (Duolingo-grade simplified hierarchy)
const PRIMARY_NAV = [
  { icon: "dashboard",      label: "Learn",     route: "/dashboard" },
  { icon: "bolt",           label: "Practice",  route: "/practice" },
  { icon: "sports_esports", label: "Arena",     route: "/arena" },
  { icon: "folder_open",    label: "Library",   route: "/sources" },
  { icon: "groups",         label: "Friends",   route: "/friends" },
];

// Secondary Study Tools (grouped cleanly in collapsible section)
const MORE_TOOLS = [
  { icon: "edit_document",    label: "Notes",           route: "/notes" },
  { icon: "forum",            label: "Tutor",           route: "/ai-tutor" },
  { icon: "style",            label: "Flashcards",      route: "/flashcards" },
  { icon: "timer",            label: "Focus Timer",     route: "/timer" },
  { icon: "calendar_month",   label: "Study Planner",   route: "/planner" },
  { icon: "calculate",        label: "Math Solver",     route: "/math" },
  { icon: "psychology",       label: "Teach It",        route: "/teach-it" },
  { icon: "menu_book",        label: "Quick Study",     route: "/quick-study" },
  { icon: "auto_stories",     label: "Mistake Journal", route: "/mistakes" },
  { icon: "military_tech",    label: "Challenges",      route: "/challenges" },
  { icon: "sensors",          label: "Live Battle",     route: "/rooms" },
  { icon: "stadia_controller", label: "Arcade",         route: "/arcade" },
  { icon: "menu_book",        label: "Campus Vault",    route: "/campus-vault" },
  { icon: "bar_chart",        label: "Analytics",       route: "/analytics" },
];

const ALL_NAV_ITEMS = [...PRIMARY_NAV, ...MORE_TOOLS];

// Flat lookup so we can turn the current route into a human-readable tool
// name for logging.
const ROUTE_TO_TOOL_NAME: Record<string, string> = Object.fromEntries(
  ALL_NAV_ITEMS.map((item) => [item.route, item.label])
);
delete ROUTE_TO_TOOL_NAME["/dashboard"];
delete ROUTE_TO_TOOL_NAME["/friends"];
delete ROUTE_TO_TOOL_NAME["/community"];
delete ROUTE_TO_TOOL_NAME["/campus-vault"];
delete ROUTE_TO_TOOL_NAME["/sources"];
delete ROUTE_TO_TOOL_NAME["/analytics"];
delete ROUTE_TO_TOOL_NAME["/planner"];
delete ROUTE_TO_TOOL_NAME["/rooms"];

interface SharedSidebarProps {
  active: string;
}

export function SharedSidebar({ active }: SharedSidebarProps) {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { isPro, loading: planLoading } = usePlan();

  const isMoreToolActive = MORE_TOOLS.some((t) => t.route === active);
  const [showMoreTools, setShowMoreTools] = useState<boolean>(() => {
    return isMoreToolActive || localStorage.getItem("pz_sidebar_more_open") === "true";
  });

  // Phase 3D: Due-cards badge & pulse effect
  const [dueCount, setDueCount] = useState<number>(0);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    const checkDue = () => {
      try {
        const count = getDueCount();
        if (count !== prevCountRef.current && count > 0) {
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 800);
        }
        prevCountRef.current = count;
        setDueCount(count);
      } catch { /* The sidebar still works without persisted display preferences. */ }
    };
    checkDue();
    window.addEventListener("focus", checkDue);
    return () => window.removeEventListener("focus", checkDue);
  }, []);

  useEffect(() => {
    if (isMoreToolActive) {
      setShowMoreTools(true);
    }
  }, [isMoreToolActive]);

  const toggleMoreTools = () => {
    playTap();
    setShowMoreTools((prev) => {
      const next = !prev;
      localStorage.setItem("pz_sidebar_more_open", String(next));
      return next;
    });
  };

  // Centralized time tracking
  useStudyTimeTracker(ROUTE_TO_TOOL_NAME[active] ?? null, user?.id);

  const profileUsername = profile && "username" in profile && typeof profile.username === "string" ? profile.username : undefined;
  const rawName =
    user?.user_metadata?.full_name ||
    profile?.full_name ||
    profileUsername ||
    user?.email?.split("@")[0] ||
    "Student";

  const displayName = formatFriendlyName(rawName);
  const { profile: studentProfile } = useUserProfile(user?.id, rawName);
  const userAvatar = studentProfile?.avatar || (profile as any)?.avatar_url;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64 overflow-hidden select-none font-['Quicksand',sans-serif]">
      {/* Logo */}
      <div className="mb-5 px-1">
        <button type="button" aria-label="Studenius home"
          className="text-[24px] font-black tracking-tight text-black cursor-pointer hover:opacity-85 transition-opacity"
          data-route="/dashboard"
          onClick={() => navigate("/dashboard")}
        >
          Studenius
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #FAF7F2;
          border-left: 1px solid rgba(0,0,0,0.15);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: black;
          border-radius: 4px;
        }
      `}</style>

      {/* Primary & Collapsible Navigation */}
      <div className="flex-1 relative min-h-0">
        <nav className="h-full flex flex-col gap-2 overflow-y-auto pb-4 custom-scrollbar pr-1">
          {/* 5 Core Destinations (Duolingo Style) */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5 px-2">Main</p>
            {PRIMARY_NAV.map((item) => {
              const isActive = active === item.route;
              return (
                <button
                  data-route={item.route}
                  aria-current={isActive ? "page" : undefined}
                  key={item.route}
                  type="button"
                  onClick={() => {
                    playTap();
                    navigate(item.route);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-[13.5px] font-black transition-all text-left w-full rounded-xl cursor-pointer ${
                    isActive
                      ? "bg-black text-white shadow-[0px_3px_0px_#10B981] -translate-y-0.5"
                      : "text-black hover:bg-black/5 hover:-translate-y-0.5"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    aria-hidden="true"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.route === "/practice" && dueCount > 0 && (
                    <span
                      className={`ml-auto border border-black bg-[#10B981] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full transition-transform ${
                        isPulsing ? "scale-125" : "scale-100"
                      }`}
                    >
                      {dueCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* More Study Tools Accordion */}
          <div className="flex flex-col gap-1 mt-2 border-t border-black/15 pt-2">
            <button
              type="button"
              onClick={toggleMoreTools}
              className="flex items-center justify-between px-2 py-1.5 text-[11px] font-black uppercase tracking-wider text-black/50 hover:text-black rounded-lg hover:bg-black/5 transition-colors cursor-pointer w-full text-left"
              aria-expanded={showMoreTools}
            >
              <div className="flex items-center gap-1.5">
                <span>More Tools ({MORE_TOOLS.length})</span>
                {!showMoreTools && dueCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#10B981] border border-black inline-block" />
                )}
              </div>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {showMoreTools ? "expand_less" : "expand_more"}
              </span>
            </button>

            {showMoreTools && (
              <div className="flex flex-col gap-0.5 pl-1 animate-fadeIn">
                {MORE_TOOLS.map((tool) => {
                  const isActive = active === tool.route;
                  return (
                    <button
                      data-route={tool.route}
                      aria-current={isActive ? "page" : undefined}
                      key={tool.route}
                      type="button"
                      onClick={() => {
                        playTap();
                        navigate(tool.route);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-2 min-h-[38px] text-[12.5px] font-bold transition-all text-left w-full rounded-lg cursor-pointer ${
                        isActive
                          ? "bg-black text-white font-black shadow-[0px_2px_0px_#10B981]"
                          : "text-black/80 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        aria-hidden="true"
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {tool.icon}
                      </span>
                      <span className="truncate">{tool.label}</span>
                      {tool.route === "/flashcards" && dueCount > 0 && (
                        <span
                          className={`ml-auto border border-black bg-[#10B981] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full transition-transform ${
                            isPulsing ? "scale-125" : "scale-100"
                          }`}
                        >
                          {dueCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t-[1.5px] border-black pt-3 flex flex-col gap-1.5">
        {!planLoading && !isPro && (
          <button
            type="button"
            data-route="/pro"
            onClick={() => navigate("/pro")}
            className="flex items-center justify-center gap-2 px-3 py-2.5 mx-1 mb-1 bg-[#10B981] border-2 border-black text-white text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] hover:bg-black hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">workspace_premium</span>
            UPGRADE TO PRO
          </button>
        )}
        <button
          type="button"
          data-route="/settings"
          aria-current={active === "/settings" ? "page" : undefined}
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-3 py-2 min-h-[44px] text-[13px] font-bold text-black hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">settings</span>
          <span>Settings</span>
        </button>
        <button
          type="button"
          data-route="/profile"
          aria-current={active === "/profile" ? "page" : undefined}
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3 px-3 py-2 min-h-[44px] hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 bg-[#10B981] text-white border-[1.5px] border-black rounded-lg flex items-center justify-center font-black text-[13px] shrink-0 overflow-hidden">
            {userAvatar && (userAvatar.startsWith("/") || userAvatar.startsWith("http") || userAvatar.startsWith("data:")) ? (
              <img
                src={userAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] font-bold text-black truncate max-w-[130px]">{displayName}</span>
          </div>
        </button>
      </div>
    </aside>
  );
}
