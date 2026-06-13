import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface QuestCard {
  id: number;
  q: string;
  answer: string;
  hint: string;
  completed?: boolean;
}

// ─── Desktop Sidebar (matches AITutor pattern) ────────────────────────────────
const DesktopSidebar = ({ navigate }: { navigate: (r: string) => void }) => (
  <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-2 border-black bg-[#FAF7F2] w-64">
    <div className="mb-6">
      <h1 className="text-[28px] font-black tracking-tight">Studenius</h1>
      <p className="text-[13px] font-bold text-black/50">Academic Level: Pro</p>
    </div>
    <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
      {[
        { icon: "dashboard",      label: "Dashboard",      route: "/dashboard" },
        { icon: "smart_toy",      label: "AI Tutor",       route: "/ai-tutor" },
        { icon: "style",          label: "Flashcards",     route: "/flashcards" },
        { icon: "assignment",     label: "Practice",       route: "/practice" },
        { icon: "timer",          label: "Focus Timer",    route: "/timer" },
        { icon: "calendar_today", label: "Study Planner",  route: "/planner" },
        { icon: "military_tech",  label: "Challenges",     route: "/challenges", active: true },
        { icon: "history_edu",    label: "Mistake Journal",route: "/mistake-journal" },
        { icon: "folder_open",    label: "Source Library", route: "/sources" },
        { icon: "bar_chart",      label: "Analytics",      route: "/analytics" },
      ].map((item: any) => (
        <button key={item.route} onClick={() => navigate(item.route)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-bold transition-all text-left w-full ${
            item.active ? "bg-black text-white scale-95" : "text-black hover:bg-[#E2E2E2]"
          }`}>
          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
    <div className="mt-auto border-t-2 border-black pt-4 flex flex-col gap-2">
      <button onClick={() => navigate("/go-pro")}
        className="w-full bg-[#F5A623] border-2 border-black py-2 text-[13px] font-extrabold shadow-[2px_2px_0px_#000] hover:opacity-90">
        Upgrade to Pro
      </button>
      <button onClick={() => navigate("/settings")}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] w-full">
        <span className="material-symbols-outlined text-[20px]">settings</span>Settings
      </button>
      <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] w-full">
        <span className="material-symbols-outlined text-[20px]">help_outline</span>Help
      </button>
    </div>
  </aside>
);

export default function Challenges() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"Daily5" | "BossRound">("Daily5");
  const [activeFocus, setActiveFocus] = useState("Anatomy");
  const [expandedCard, setExpandedCard] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [quests, setQuests] = useState<QuestCard[]>([]);
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const streakDays = [
    { day: "M", completed: true },
    { day: "T", completed: true },
    { day: "W", completed: true },
    { day: "T", completed: true, activeToday: true },
    { day: "F", completed: false },
    { day: "S", completed: false },
    { day: "S", completed: false },
  ];

  const focusAreas = ["Anatomy", "Microbiology", "Ethics", "Cell Biology"];

  const staticChallenges = [
    {
      id: "perfect-recall",
      tag: "Daily 5",
      tagStyle: "bg-black text-white",
      icon: "star",
      iconStyle: "text-[#F5A623]",
      title: "Perfect Recall",
      desc: "Complete 5 sets of flashcards without a single mistake.",
      progress: 3,
      total: 5,
      progressLabel: "3/5",
      barColor: "bg-black",
      barWidth: "60%",
      cta: "START ATTEMPT",
      ctaAction: () => navigate("/flashcards?challenge=true"),
    },
    {
      id: "deep-work-titan",
      tag: "Boss Round",
      tagStyle: "bg-[#FF4D2E] text-white",
      icon: "skull",
      iconStyle: "text-black",
      title: "Deep Work Titan",
      desc: "Log 4 consecutive hours of focus timer today.",
      progress: 1.5,
      total: 4,
      progressLabel: "1.5/4h",
      barColor: "bg-[#FF4D2E]",
      barWidth: "37.5%",
      cta: "RESUME FOCUS",
      ctaAction: () => navigate("/timer"),
    },
    {
      id: "morning-sprint",
      tag: "Daily Quiz",
      tagStyle: "bg-black text-white",
      icon: "psychology",
      iconStyle: "text-[#F5A623]",
      title: "Morning Sprint",
      desc: "Quick 10-question AI-generated review of yesterday's notes.",
      expiry: "EXPIRES IN 4H",
      cta: "TAKE QUIZ",
      ctaAction: () => navigate("/practice?mode=daily-quiz"),
    },
    {
      id: "knowledge-share",
      tag: "Community",
      tagStyle: "bg-black text-white",
      icon: "groups",
      iconStyle: "text-[#F5A623]",
      title: "Knowledge Share",
      desc: "Share one study guide with your class peer group.",
      cta: "SHARE GUIDE",
      isShare: true,
    },
  ];

  const generateQuests = async (subject: string) => {
    setLoading(true);
    try {
      const sourceContext = buildAIContext();
      const promptText = `Generate 2 highly engaging study questions/quests for medical or engineering students about "${subject}".
${sourceContext ? `Incorporate details from the loaded source document context:\n${sourceContext}` : ""}

Return strictly a valid raw JSON array containing exactly 2 objects. Format:
[
  {
    "id": 1,
    "q": "What is the primary function...?",
    "answer": "Detailed answer matching standard textbook solutions...",
    "hint": "Think of oxygen demands..."
  },
  {
    "id": 2,
    "q": "Why is...",
    "answer": "Explanation of biological or chemical rationale...",
    "hint": "Also is known for..."
  }
]

No markdown formatting, no explanations! Output strictly a valid raw JSON string array.`;

      const systemPrompt = "You are a master academic educator returning raw JSON arrays only.";

      const callGroqWithModel = async (pText: string, sysPrompt: string) => {
        const fn = callGroq as any;
        const fnStr = fn.toString();
        if (fnStr.includes("messages") || fnStr.includes("llama")) {
          return await fn([{ role: "user", content: pText }], sysPrompt, "llama-3.3-70b-versatile", 1000);
        } else {
          return await fn(pText, sysPrompt, "application/json");
        }
      };

      const aiResponse = await callGroqWithModel(promptText, systemPrompt);
      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const generated = JSON.parse(sanitized);
      if (Array.isArray(generated) && generated.length > 0) {
        setQuests(generated.map((q: any, idx: number) => ({ ...q, id: idx + 1, completed: false })));
        setExpandedCard(1);
      } else throw new Error("Invalid format");
    } catch (err) {
      console.warn("Dynamic challenges failed, using fallback:", err);
      setQuests([
        { id: 1, q: `Core concept inquiry: ${subject} primary factors`, answer: `The primary features of ${subject} focus on cell structures, biological assays, and safe molecular protocols.`, hint: "Focus on early research breakthroughs.", completed: false },
        { id: 2, q: `Describe structural challenges involving ${subject}`, answer: `Modern research resolves ${subject} constraints by deploying targeted enzyme vectors and CRISPR models.`, hint: "Involves nucleic sequencing steps.", completed: false },
      ]);
      setExpandedCard(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generateQuests(activeFocus); }, [activeFocus]);

  const handleCompleteQuest = async (questId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (completedQuestIds.includes(questId)) return;
    const xpAwarded = 25;
    const coinsAwarded = 10;
    if (user && profile) {
      try {
        await supabase.from("profiles").update({
          total_xp: (profile.total_xp || profile.xp || 0) + xpAwarded,
          coins: (profile.coins || 0) + coinsAwarded,
        }).eq("id", user.id);
        if (typeof refreshProfile === "function") await refreshProfile();
      } catch (err) {
        console.error("Error rewarding challenge:", err);
      }
    }
    setCompletedQuestIds(prev => [...prev, questId]);
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/share/guide");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ─── Streak dots (shared) ─────────────────────────────────────────────────
  const StreakBar = () => (
    <div className="flex justify-between items-center gap-2">
      {streakDays.map((st, idx) => (
        <div key={idx} className={`flex-1 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
          st.completed ? "bg-black text-white shadow-[2px_2px_rgba(0,0,0,1)]"
          : st.activeToday ? "bg-white border-[#E8534A] border-[3px] text-black"
          : "bg-white border-black text-neutral-400"
        }`}>
          <span className="font-black text-[13px] z-10">{st.day}</span>
        </div>
      ))}
    </div>
  );

  // ─── Focus area chips (shared) ────────────────────────────────────────────
  const FocusChips = () => (
    <div className="flex flex-wrap gap-2">
      {focusAreas.map((area) => (
        <button key={area} onClick={() => setActiveFocus(area)}
          className={`px-4 py-1.5 rounded-full border-2 border-black text-[13px] font-bold transition-all cursor-pointer ${
            activeFocus === area ? "bg-black text-white shadow-[2px_2px_rgba(0,0,0,1)]" : "bg-white text-black hover:bg-[#ebe8e3]"
          }`}>
          {area}
        </button>
      ))}
    </div>
  );

  // ─── Quest accordion list (shared) ───────────────────────────────────────
  const QuestList = () => (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="text-center py-10 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
          <span className="text-[13px] font-bold text-black/50">Generating study tasks with AI...</span>
        </div>
      ) : (
        <>
          {quests.map((card) => {
            const isOpen = expandedCard === card.id;
            const isDone = completedQuestIds.includes(card.id) || card.completed;
            return (
              <div key={card.id} onClick={() => setExpandedCard(isOpen ? null : card.id)}
                className={`bg-white rounded-2xl border-2 border-black p-5 shadow-[4px_4px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer relative ${isDone ? "opacity-75 bg-slate-50" : ""}`}>
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full border-2 border-black bg-[#FAF7F2] text-black flex items-center justify-center font-black text-[13px] shadow-[2px_2px_rgba(0,0,0,1)]">
                  {card.id}
                </div>
                <div className="flex justify-between items-start pt-2 pl-2">
                  <h4 className={`font-black text-[15px] text-black leading-tight pr-4 ${isDone ? "line-through opacity-60" : ""}`}>{card.q}</h4>
                  <span className="material-symbols-outlined text-[#ae2925]">{isOpen ? "expand_less" : "expand_more"}</span>
                </div>
                {isOpen && (
                  <div className="mt-4 pl-2 border-t pt-4 border-black/10 flex flex-col gap-3">
                    <p className="text-[14px] text-black leading-relaxed">
                      <span className="bg-black/10 text-black font-bold px-2 py-0.5 rounded mr-1">Answer</span>
                      {card.answer}
                    </p>
                    <p className="text-[12px] text-[#ae2925] font-bold italic">//// Hint: {card.hint}</p>
                    {!isDone && (
                      <button onClick={(e) => handleCompleteQuest(card.id, e)}
                        className="w-full bg-[#E8534A] text-white border-2 border-black py-2 rounded-xl mt-2 font-bold text-[12px] hover:opacity-90 shadow-[2px_2px_rgba(0,0,0,1)] cursor-pointer">
                        /// Double-Check & Complete Task
                      </button>
                    )}
                    {isDone && (
                      <div className="flex items-center justify-end gap-1 text-[12px] text-green-600 font-bold mt-1">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        Awarded +25 XP
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="bg-[#f6f3ee] rounded-2xl border-2 border-black border-dashed p-5 flex items-center justify-center min-h-[72px] opacity-60 cursor-not-allowed">
            <span className="material-symbols-outlined text-black/30 mr-2">lock</span>
            <span className="font-black text-black/40 text-[14px]">Level 3 (Locked)</span>
          </div>
        </>
      )}
    </div>
  );

  // ─── Static challenge card (desktop grid) ────────────────────────────────
  const StaticCard = ({ ch }: { ch: typeof staticChallenges[0] }) => (
    <div className="group bg-[#FAF7F2] border-2 border-black flex flex-col" style={{ boxShadow: "5px 5px 0px #000" }}>
      <div className="px-4 py-3 border-b-2 border-black flex justify-between items-center">
        <span className={`text-[12px] font-black px-2 py-1 uppercase ${ch.tagStyle}`}>{ch.tag}</span>
        <span className={`material-symbols-outlined ${ch.iconStyle}`} style={{ fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
      </div>
      <div className="p-4 flex-1">
        <p className="font-black text-[18px] mb-1">{ch.title}</p>
        <p className="text-[13px] text-black/60 font-medium mb-4 leading-relaxed">{ch.desc}</p>
        {ch.progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-[12px] font-black">
              <span>Progress</span><span>{ch.progressLabel}</span>
            </div>
            <div className="w-full h-3 bg-[#E8E4DC] border-2 border-black">
              <div className={`h-full ${ch.barColor}`} style={{ width: ch.barWidth }} />
            </div>
          </div>
        )}
        {ch.expiry && (
          <div className="flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-[#FF4D2E] text-[16px]">history</span>
            <span className="text-[12px] font-black text-[#FF4D2E]">{ch.expiry}</span>
          </div>
        )}
      </div>
      <button
        onClick={ch.isShare ? () => setShareModalOpen(true) : ch.ctaAction}
        className="w-full py-3 border-t-2 border-black text-[13px] font-black bg-[#FAF7F2] group-hover:bg-black group-hover:text-white transition-colors active:translate-x-0.5 active:translate-y-0.5"
      >
        {ch.cta}
      </button>
    </div>
  );

  // ─── Locked card ─────────────────────────────────────────────────────────
  const LockedCard = ({ title, hint }: { title: string; hint: string }) => (
    <div className="relative bg-[#f3f3f3] border-2 border-black opacity-60 select-none">
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-black text-white p-3 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
          <span className="material-symbols-outlined text-[28px]">lock</span>
        </div>
      </div>
      <div className="px-4 py-3 border-b-2 border-black">
        <span className="text-[12px] font-black px-2 py-1 bg-black/30 text-white uppercase">Mystery</span>
      </div>
      <div className="p-4 blur-sm">
        <p className="font-black text-[18px] mb-1">{title}</p>
        <p className="text-[13px] text-black/60 mb-4">{hint}</p>
        <div className="w-full h-3 bg-[#E8E4DC] border-2 border-black" />
      </div>
    </div>
  );

  // ─── Share modal (shared) ─────────────────────────────────────────────────
  const ShareModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-[#FAF7F2] border-2 border-black w-full max-w-md" style={{ boxShadow: "6px 6px 0px #000" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black">
          <h3 className="font-black text-[18px]">Share Study Guide</h3>
          <button onClick={() => setShareModalOpen(false)} className="material-symbols-outlined text-black hover:text-[#FF4D2E]">close</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[14px] text-black/60 font-medium">Share your current study guide with your peer group to complete this challenge.</p>
          <div className="flex gap-2">
            <div className="flex-1 border-2 border-black bg-white px-3 py-2 text-[13px] font-bold text-black/50 truncate">
              {window.location.origin}/share/guide
            </div>
            <button onClick={handleCopyLink}
              className={`px-4 py-2 border-2 border-black font-black text-[13px] transition-colors ${copiedLink ? "bg-green-500 text-white" : "bg-black text-white hover:bg-[#FF4D2E]"}`}>
              {copiedLink ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-black font-black text-[13px] bg-white hover:bg-[#ebe8e3] transition-colors">
              <span className="material-symbols-outlined text-[18px]">share</span>Share to Group
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-black font-black text-[13px] bg-white hover:bg-[#ebe8e3] transition-colors">
              <span className="material-symbols-outlined text-[18px]">mail</span>Send Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <DesktopSidebar navigate={navigate} />

      {shareModalOpen && <ShareModal />}

      {/* ═══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:ml-64 flex-col min-h-screen">

        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0 z-30">
          <div className="flex items-center gap-4">
            <span className="text-[22px] font-black tracking-tight">CHALLENGES & QUESTS</span>
            <div className="w-px h-6 bg-black/20" />
            <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#F0EDE0]">
              <span className="material-symbols-outlined text-[#FF4D2E] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <span className="text-[12px] font-black">{profile?.streak || 12} Day Streak</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-black hover:text-[#FF4D2E] transition-colors">notifications</button>
            <button onClick={() => navigate("/go-pro")} className="material-symbols-outlined text-black hover:text-[#F5A623] transition-colors">workspace_premium</button>
            <div onClick={() => navigate("/profile")}
              className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
              R
            </div>
          </div>
        </header>

        {/* Desktop Dual Pane */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Pane — Static challenges grid */}
          <div className="w-[60%] flex flex-col border-r-2 border-black overflow-y-auto">

            {/* Streak + heatmap */}
            <div className="px-8 pt-6 pb-5 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Weekly Activity</h3>
              <StreakBar />
            </div>

            {/* Tab toggle */}
            <div className="px-8 pt-5 pb-4 shrink-0">
              <div className="flex w-full border-2 border-black rounded-xl overflow-hidden">
                <button onClick={() => setActiveTab("Daily5")}
                  className={`flex-1 py-3 text-[13px] font-black transition-colors cursor-pointer ${activeTab === "Daily5" ? "bg-black text-white" : "bg-white text-black hover:bg-[#ebe8e3]"}`}>
                  Daily 5 Challenges
                </button>
                <div className="w-[2px] bg-black" />
                <button onClick={() => setActiveTab("BossRound")}
                  className={`flex-1 py-3 text-[13px] font-black transition-colors cursor-pointer ${activeTab === "BossRound" ? "bg-black text-white" : "bg-white text-black hover:bg-[#ebe8e3]"}`}>
                  Boss Round
                </button>
              </div>
            </div>

            {/* Active Quests section title */}
            <div className="px-8 pb-2 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50">Active Quests</h3>
            </div>

            {/* Challenge cards grid */}
            <div className="px-8 pb-8">
              <div className="grid grid-cols-2 gap-5">
                {staticChallenges.map((ch) => <StaticCard key={ch.id} ch={ch} />)}
                <LockedCard title="The Archivist" hint="Unlocked after 14-day streak. Keep pushing to reveal." />
                <LockedCard title="Grandmaster" hint="Complete all monthly challenges to unlock the vault." />
              </div>
            </div>
          </div>

          {/* Right Pane — AI Daily Quests */}
          <div className="w-[40%] flex flex-col overflow-y-auto bg-[#FAF7F2]">

            {/* Topic selector */}
            <div className="px-8 pt-6 pb-4 border-b-2 border-black/10 shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-3">Choose Topic</h3>
              <FocusChips />
              <button onClick={() => navigate("/sources")}
                className="mt-3 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-black bg-white text-black font-black text-[13px] hover:bg-[#ebe8e3] transition-colors cursor-pointer rounded-lg">
                <span className="material-symbols-outlined text-[18px]">attach_file</span>
                Extract from Source Library
              </button>
            </div>

            {/* AI Quest list */}
            <div className="px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-black/50">AI Daily Quests</h3>
                <button onClick={() => generateQuests(activeFocus)}
                  className="flex items-center gap-1 text-[11px] font-black text-black/40 hover:text-black transition-colors">
                  <span className="material-symbols-outlined text-[14px]">refresh</span>Regenerate
                </button>
              </div>
              <QuestList />
            </div>

            {/* Streak widget */}
            <div className="px-8 pb-8 shrink-0 mt-auto">
              <div className="border-2 border-black bg-[#F0EDE0] p-5 relative overflow-hidden" style={{ boxShadow: "3px 3px 0px #000" }}>
                <div className="absolute top-3 right-3">
                  <span className="material-symbols-outlined text-black/15 text-[40px]">military_tech</span>
                </div>
                <h4 className="text-[18px] font-black mb-2">Daily Progress</h4>
                <div className="flex items-end gap-1 mb-3">
                  <span className="text-[40px] font-black text-[#FF4D2E] leading-none">
                    {completedQuestIds.length}
                  </span>
                  <span className="text-[14px] font-black uppercase tracking-widest mb-1">/ 5 Done</span>
                </div>
                <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black rounded-full overflow-hidden">
                  <div className="h-full bg-black transition-all" style={{ width: `${(completedQuestIds.length / 5) * 100}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-bold text-black/50">Keep going — complete all 5 for max XP</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE LAYOUT
          ═══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]">

        {/* Mobile TopAppBar */}
        <header className="w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-black z-50">
          <div className="flex items-center justify-between px-5 h-14">
            <button onClick={() => navigate(-1)}
              className="flex items-center justify-center p-2 rounded-full hover:bg-[#ebe8e3] border-2 border-black bg-white w-9 h-9 shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined text-black text-[18px]">arrow_back</span>
            </button>
            <span className="font-black text-[18px]">Daily Quests</span>
            <button onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center p-1 rounded-full hover:bg-[#ebe8e3]">
              <span className="material-symbols-outlined text-black">emoji_events</span>
            </button>
          </div>
        </header>

        {/* Mobile Scroll Content */}
        <main className="flex-1 flex flex-col px-5 pb-24 pt-6 gap-6">

          {/* Tab toggle */}
          <div className="flex w-full border-2 border-black rounded-2xl overflow-hidden bg-white shrink-0">
            <button onClick={() => setActiveTab("Daily5")}
              className={`flex-1 py-3.5 text-center font-black transition-colors text-[14px] cursor-pointer ${activeTab === "Daily5" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"}`}>
              Daily 5 Challenges
            </button>
            <div className="w-[2px] bg-black" />
            <button onClick={() => setActiveTab("BossRound")}
              className={`flex-1 py-3.5 text-center font-black transition-colors text-[14px] cursor-pointer ${activeTab === "BossRound" ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"}`}>
              Boss Round
            </button>
          </div>

          {/* Streak */}
          <section className="flex flex-col gap-3">
            <div className="flex justify-between items-end mb-1">
              <h2 className="font-black text-[16px]">Streak Log</h2>
              <span className="text-[#ae2925] font-black text-[13px]">{profile?.streak || 12} Day Streak</span>
            </div>
            <StreakBar />
          </section>

          {/* Focus chips */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[#ae2925] font-black text-[11px] uppercase tracking-wider">Choose Topic</h3>
            <FocusChips />
            <button onClick={() => navigate("/sources")}
              className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-black bg-white text-black font-black text-[13px] hover:bg-[#ebe8e3] transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">attach_file</span>
              Extract from Source Library
            </button>
          </section>

          {/* Static challenges on mobile */}
          <section className="flex flex-col gap-4">
            <h3 className="font-black text-[16px]">Active Quests</h3>
            {staticChallenges.map((ch) => (
              <div key={ch.id} className="group bg-white border-2 border-black flex flex-col rounded-2xl overflow-hidden shadow-[4px_4px_rgba(0,0,0,1)]">
                <div className="px-4 py-3 border-b-2 border-black flex justify-between items-center">
                  <span className={`text-[12px] font-black px-2 py-1 rounded-full uppercase ${ch.tagStyle}`}>{ch.tag}</span>
                  <span className={`material-symbols-outlined ${ch.iconStyle}`} style={{ fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
                </div>
                <div className="p-4 flex-1">
                  <p className="font-black text-[17px] mb-1">{ch.title}</p>
                  <p className="text-[13px] text-black/60 font-medium mb-3 leading-relaxed">{ch.desc}</p>
                  {ch.progress !== undefined && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[12px] font-black">
                        <span>Progress</span><span>{ch.progressLabel}</span>
                      </div>
                      <div className="w-full h-3 bg-[#E8E4DC] border-2 border-black rounded-full overflow-hidden">
                        <div className={`h-full ${ch.barColor} rounded-full`} style={{ width: ch.barWidth }} />
                      </div>
                    </div>
                  )}
                  {ch.expiry && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[#FF4D2E] text-[16px]">history</span>
                      <span className="text-[12px] font-black text-[#FF4D2E]">{ch.expiry}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={ch.isShare ? () => setShareModalOpen(true) : ch.ctaAction}
                  className="w-full py-3.5 border-t-2 border-black text-[13px] font-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer active:translate-x-0.5 active:translate-y-0.5">
                  {ch.cta}
                </button>
              </div>
            ))}
            {/* Locked mobile x2 */}
            {[
              { title: "The Archivist", hint: "Unlocked after 14-day streak." },
              { title: "Grandmaster", hint: "Complete all monthly challenges." },
            ].map((lc) => (
              <div key={lc.title} className="relative bg-[#f3f3f3] border-2 border-black rounded-2xl opacity-60 select-none overflow-hidden min-h-[120px] flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-black text-white p-3 rounded-full">
                    <span className="material-symbols-outlined text-[28px]">lock</span>
                  </div>
                </div>
                <div className="blur-sm p-4 w-full">
                  <p className="font-black text-[17px]">{lc.title}</p>
                  <p className="text-[13px] text-black/60">{lc.hint}</p>
                </div>
              </div>
            ))}
          </section>

          {/* AI Daily Quests */}
          <section className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[16px]">AI Daily Quests</h3>
              <button onClick={() => generateQuests(activeFocus)}
                className="flex items-center gap-1 text-[12px] font-black text-black/40 hover:text-black transition-colors">
                <span className="material-symbols-outlined text-[16px]">refresh</span>Regenerate
              </button>
            </div>
            <QuestList />
          </section>

          {/* Daily Progress widget */}
          <section>
            <div className="border-2 border-black bg-[#F0EDE0] p-5 relative overflow-hidden rounded-2xl" style={{ boxShadow: "3px 3px 0px #000" }}>
              <div className="absolute top-3 right-3">
                <span className="material-symbols-outlined text-black/15 text-[40px]">military_tech</span>
              </div>
              <h4 className="text-[18px] font-black mb-2">Daily Progress</h4>
              <div className="flex items-end gap-1 mb-3">
                <span className="text-[40px] font-black text-[#FF4D2E] leading-none">{completedQuestIds.length}</span>
                <span className="text-[14px] font-black uppercase tracking-widest mb-1">/ 5 Done</span>
              </div>
              <div className="h-3 w-full bg-[#E8E4DC] border-2 border-black rounded-full overflow-hidden">
                <div className="h-full bg-black transition-all" style={{ width: `${(completedQuestIds.length / 5) * 100}%` }} />
              </div>
              <p className="mt-2 text-[11px] font-bold text-black/50">Keep going — complete all 5 for max XP</p>
            </div>
          </section>

        </main>
      </div>

    </div>
  );
}
