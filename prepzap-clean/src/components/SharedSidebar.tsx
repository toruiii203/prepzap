/**
 * SharedSidebar.tsx
 * Single source of truth for the desktop left sidebar.
 * Drop this in /components/ or /pages/ alongside your other files.
 *
 * Usage:
 *   import { SharedSidebar } from "@/components/SharedSidebar";
 *   <SharedSidebar active="ai-tutor" />
 */

import React from "react";
import { useNavigate } from "react-router-dom";

// ─── All nav items in canonical order ────────────────────────────────────────
// Matches the most complete sidebar (MistakeJournal / Challenges) and adds
// the section grouping from Practice's sidebar for clarity.

const MAIN_NAV = [
  { icon: "dashboard",      label: "Dashboard",      route: "/dashboard" },
  { icon: "smart_toy",      label: "AI Tutor",       route: "/ai-tutor" },
  { icon: "style",          label: "Flashcards",     route: "/flashcards" },
  { icon: "quiz",           label: "Practice",       route: "/practice" },
] as const;

const TOOLS_NAV = [
  { icon: "calculate",      label: "Math Solver",    route: "/math" },
  { icon: "timer",          label: "Focus Timer",    route: "/timer" },
  { icon: "calendar_today", label: "Study Planner",  route: "/planner" },
  { icon: "military_tech",  label: "Challenges",     route: "/challenges" },
  { icon: "history_edu",    label: "Mistake Journal",route: "/mistakes" },
] as const;

const RESOURCES_NAV = [
  { icon: "library_books",  label: "Source Library", route: "/sources" },
  { icon: "monitoring",     label: "Analytics",      route: "/analytics" },
] as const;

type NavRoute =
  | typeof MAIN_NAV[number]["route"]
  | typeof TOOLS_NAV[number]["route"]
  | typeof RESOURCES_NAV[number]["route"];

interface SharedSidebarProps {
  /** Pass the route string of the current page to highlight it */
  active: NavRoute | (string & {});
}

export function SharedSidebar({ active }: SharedSidebarProps) {
  const navigate = useNavigate();

  const NavBtn = ({ icon, label, route }: { icon: string; label: string; route: string }) => {
    const isActive = route === active;
    return (
      <button
        onClick={() => navigate(route)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-all text-left w-full ${
          isActive
            ? "bg-black text-white"
            : "text-black hover:bg-[#E2E2E2]"
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64">
      {/* Brand */}
      <div className="mb-8">
        <h1 className="text-[24px] font-extrabold text-black leading-tight">Studenius</h1>
        <p className="text-[11px] font-bold mt-1 text-black/50">Academic Level: Pro</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Main</p>
        {MAIN_NAV.map(item => <NavBtn key={item.route} {...item} />)}

        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1 mt-5">Tools</p>
        {TOOLS_NAV.map(item => <NavBtn key={item.route} {...item} />)}

        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1 mt-5">Resources</p>
        {RESOURCES_NAV.map(item => <NavBtn key={item.route} {...item} />)}
      </nav>

      {/* Footer */}
      <div className="mt-auto border-t-[1.5px] border-black pt-4 flex flex-col gap-2">
        <button
          onClick={() => navigate("/go-pro")}
          className="w-full bg-[#FF4D2E] text-white border-[1.5px] border-black py-3 text-[13px] font-extrabold shadow-[3px_3px_0px_#000] hover:opacity-90 active:translate-y-0.5 transition-all"
        >
          Upgrade to Pro
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-bold text-black hover:bg-[#E2E2E2] w-full"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>Settings
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-bold text-black hover:bg-[#E2E2E2] w-full">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>Help
        </button>
      </div>
    </aside>
  );
}
