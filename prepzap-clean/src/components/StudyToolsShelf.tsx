import { useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { playPop, playTap } from "@/lib/soundFX";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// 4 Slides of 4 Tools Each (4x4 = 16 Study Tools)
const STUDY_TOOLS_PAGES = [
  {
    id: "core",
    label: "Core Revision",
    tools: [
      {
        route: "/practice",
        icon: "assignment",
        title: "Practice Tests",
        desc: "Active recall quizzes & exam simulations",
        color: "text-black",
      },
      {
        route: "/flashcards",
        icon: "style",
        title: "Flashcards",
        desc: "Spaced repetition & memory reinforcement",
        color: "text-black",
      },
      {
        route: "/ai-tutor",
        icon: "forum",
        title: "Study Tutor",
        desc: "24/7 concept breakdown & Socratic dialogue",
        color: "text-black",
      },
      {
        route: "/notes",
        icon: "edit_document",
        title: "My Notes",
        desc: "Organize lecture notes & study docs",
        color: "text-black",
      },
    ],
  },
  {
    id: "focus",
    label: "Focus & Solving",
    tools: [
      {
        route: "/quick-study",
        icon: "edit_note",
        title: "Quick Study",
        desc: "High-yield cheat sheets & summaries",
        color: "text-black",
      },
      {
        route: "/math",
        icon: "calculate",
        title: "Math Solver",
        desc: "Step-by-step problem solver",
        color: "text-black",
      },
      {
        route: "/timer",
        icon: "timer",
        title: "Focus Timer",
        desc: "Pomodoro timer & study breaks",
        color: "text-black",
      },
      {
        route: "/visual-learner",
        icon: "visibility",
        title: "Visual Learner",
        desc: "Mind maps & concept diagrams",
        color: "text-black",
      },
    ],
  },
  {
    id: "coaching",
    label: "Coaching & Strategy",
    tools: [
      {
        route: "/teach-it",
        icon: "psychology",
        title: "Teach It",
        desc: "Feynman explanation technique",
        color: "text-black",
      },
      {
        route: "/planner",
        icon: "calendar_month",
        title: "Study Planner",
        desc: "Schedules & revision deadlines",
        color: "text-black",
      },
      {
        route: "/mistakes",
        icon: "playlist_remove",
        title: "Mistake Journal",
        desc: "Targeted error review",
        color: "text-black",
      },
      {
        route: "/challenges",
        icon: "military_tech",
        title: "Challenges",
        desc: "Daily quests & milestone rewards",
        color: "text-black",
      },
    ],
  },
  {
    id: "arena-lib",
    label: "Multiplayer & Library",
    tools: [
      {
        route: "/campus-vault",
        icon: "menu_book",
        title: "Campus Vault",
        desc: "Search & clone classmate study guides",
        color: "text-black",
      },
      {
        route: "/sources",
        icon: "folder_open",
        title: "Source Library",
        desc: "Upload syllabus, notes & PDFs",
        color: "text-black",
      },
      {
        route: "/rooms",
        icon: "sensors",
        title: "Live Battle",
        desc: "Real-time 6-digit PIN study multiplayer",
        color: "text-black",
      },
      {
        route: "/arcade",
        icon: "stadia_controller",
        title: "Arcade",
        desc: "Speed drills & memory games",
        color: "text-black",
      },
    ],
  },
] as const;


/** Frameless tool cards with the existing persisted collapse preference. */
export function StudyToolsShelf({ navigate, isMobile = false }: { navigate: NavigateFunction; isMobile?: boolean }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("pz_study_tools_collapsed") === "true"; } catch { return false; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetPage = useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();
  function toggle() {
    playTap();if(collapsed){setCurrentPage(0);targetPage.current=null;}setCollapsed(value => {
      const next = !value;
      try { localStorage.setItem("pz_study_tools_collapsed", String(next)); } catch { /* Preference remains usable for this session. */ }
      return next;
    });
  }
  function showPage(page: number) {
    playTap();targetPage.current=page;setCurrentPage(page);
    scrollRef.current?.scrollTo({ left: page * scrollRef.current.clientWidth, behavior: reduced ? "auto" : "smooth" });
  }
  function onScroll() {
    const node = scrollRef.current;
    if (!node?.clientWidth) return;
    if(targetPage.current !== null){if(Math.abs(node.scrollLeft-targetPage.current*node.clientWidth)>1)return;targetPage.current=null;}
    const next = Math.round(node.scrollLeft / node.clientWidth);
    if (next >= 0 && next < STUDY_TOOLS_PAGES.length) setCurrentPage(next);
  }
  return <section data-study-tools-shelf aria-label="Study tools" className="min-w-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 min-w-0"><h2 className="text-sm font-black text-black">Study tools</h2>{!collapsed && <span className="text-xs font-bold text-black/60 whitespace-nowrap" aria-live="polite">{currentPage+1} of {STUDY_TOOLS_PAGES.length}</span>}</div>
      <div className="flex items-center gap-1 shrink-0">
        {!collapsed && <><button type="button" aria-label="Previous tools" disabled={currentPage===0} onClick={()=>showPage(currentPage-1)} className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-black/5 disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"><span className="material-symbols-outlined" aria-hidden="true">chevron_left</span></button><button type="button" aria-label="Next tools" disabled={currentPage===STUDY_TOOLS_PAGES.length-1} onClick={()=>showPage(currentPage+1)} className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-black/5 disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></button></>}
        <button type="button" aria-label={collapsed?"Show study tools":"Hide study tools"} aria-expanded={!collapsed} onClick={toggle} className="min-w-11 h-11 px-2 flex items-center justify-center rounded-xl hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">{collapsed && <span className="text-xs font-bold mr-1">Show tools</span>}<span className="material-symbols-outlined" aria-hidden="true">{collapsed?"expand_more":"expand_less"}</span></button>
      </div>
    </div>
    {!collapsed && <div ref={scrollRef} onScroll={onScroll} onPointerDown={()=>{targetPage.current=null;}} onWheel={()=>{targetPage.current=null;}} className="flex w-full overflow-x-auto snap-x snap-mandatory scrollbar-none motion-safe:scroll-smooth pb-1" style={{scrollbarWidth:"none"}}>
      {STUDY_TOOLS_PAGES.map((page,index)=><div key={page.id} aria-hidden={index!==currentPage} className="w-full shrink-0 snap-center px-0.5"><div className={isMobile?"grid grid-cols-2 gap-3":"grid grid-cols-2 lg:grid-cols-4 gap-3.5"}>
        {page.tools.map(tool=><button key={tool.route} type="button" tabIndex={index===currentPage?0:-1} onClick={()=>{playPop();navigate(tool.route);}} className="min-w-0 min-h-[124px] border-2 border-black rounded-2xl bg-[#FAF7F2] p-4 text-left shadow-[2px_2px_0px_#000] active:translate-y-px active:shadow-none hover:bg-white motion-safe:hover:-translate-y-0.5 transition-transform group">
          <span className="w-10 h-10 mb-3 rounded-xl bg-white border-2 border-black/15 flex items-center justify-center"><span className="material-symbols-outlined text-[22px] text-black" aria-hidden="true">{tool.icon}</span></span><strong className="block text-sm font-black text-black leading-snug break-words">{tool.title}</strong><span className="block text-xs font-semibold text-black/60 mt-1 leading-snug">{tool.desc}</span>
        </button>)}
      </div></div>)}
    </div>}
  </section>;
}
