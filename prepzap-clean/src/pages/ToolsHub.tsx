import { useNavigate } from "react-router-dom";

const TOOL_PAGES = [
  [
    { route: "/ai-tutor", icon: "smart_toy", title: "AI Tutor", desc: "Interactive help" },
    { route: "/practice", icon: "assignment", title: "Practice", desc: "Mock exams" },
    { route: "/flashcards", icon: "style", title: "Flashcards", desc: "Spaced rep" },
    { route: "/quick-study", icon: "bolt", title: "Cram Mode", desc: "Quick review" },
  ],
  [
    { route: "/planner", icon: "calendar_month", title: "Study Planner", desc: "Schedule sessions" },
    { route: "/math", icon: "calculate", title: "Math Solver", desc: "Step-by-step" },
    { route: "/teach-it", icon: "psychology", title: "Teach It", desc: "Feynman mode" },
    { route: "/quick-study", icon: "menu_book", title: "Quick Study", desc: "High yield" },
  ],
  [
    { route: "/sources", icon: "attach_file", title: "Source Library", desc: "Upload notes" },
    { route: "/mistakes", icon: "playlist_remove", title: "Mistake Journal", desc: "Review errors" },
    { route: "/analytics", icon: "bar_chart", title: "Analytics", desc: "Track progress" },
    { route: "/challenges", icon: "emoji_events", title: "Challenges", desc: "Daily streaks" },
    { route: "/arena", icon: "sports_esports", title: "Arena", desc: "Compete live" },
  ],
] as const;

export default function ToolsHub() {
  const navigate = useNavigate();

  return (
    <>
      <header className="h-16 px-5 flex items-center justify-between bg-[#FAF7F2] border-b-[1.5px] border-black sticky top-0 z-40">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="material-symbols-outlined text-[22px] hover:opacity-70"
          aria-label="Back to dashboard"
        >
          arrow_back
        </button>
        <h1 className="text-[18px] font-black tracking-tight">All Tools</h1>
        <div className="w-6" />
      </header>

      <main className="px-5 pt-6 pb-28 flex flex-col gap-8">
        {TOOL_PAGES.map((page, pageIdx) => (
          <section key={pageIdx} className="flex flex-col gap-3">
            <div className="text-[11px] font-black uppercase tracking-wider opacity-50">
              Page {pageIdx + 1}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {page.map((tool) => (
                <button
                  key={tool.route}
                  type="button"
                  onClick={() => navigate(tool.route)}
                  className="text-left ink-border rounded-[14px] bg-[#FAF7F2] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-transform min-h-[110px] flex flex-col justify-between"
                >
                  <span className="material-symbols-outlined text-[22px] mb-2 block">{tool.icon}</span>
                  <div>
                    <div className="text-[14px] font-extrabold text-black">{tool.title}</div>
                    <div className="text-[11px] text-black/45 font-bold mt-0.5">{tool.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
