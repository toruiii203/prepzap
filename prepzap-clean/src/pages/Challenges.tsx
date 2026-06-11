import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { buildAIContext } from "@/lib/sourceContext";

interface ChallengesProps {
  onNavigate: (screen: string) => void;
}

interface QuestCard {
  id: number;
  q: string;
  answer: string;
  hint: string;
  completed?: boolean;
}

export default function Challenges({ onNavigate }: ChallengesProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"Daily5" | "BossRound">("Daily5");
  const [activeFocus, setActiveFocus] = useState("Anatomy");
  const [expandedCard, setExpandedCard] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [quests, setQuests] = useState<QuestCard[]>([]);

  // Local storage mapping for completed quest IDs to avoid duplicates
  const [completedQuestIds, setCompletedQuestIds] = useState<number[]>([]);

  const streakDays = [
    { day: "M", completed: true },
    { day: "T", completed: true },
    { day: "W", completed: true },
    { day: "T", completed: true, activeToday: true }, // Current day Thursday/active
    { day: "F", completed: false },
    { day: "S", completed: false },
    { day: "S", completed: false },
  ];

  const focusAreas = ["Anatomy", "Microbiology", "Ethics", "Cell Biology"];

  // Fetch / Generate daily quests based on focus area
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

      // Safe callGroq signature resolver
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
        setQuests(generated.map((q: any, idx: number) => ({
          ...q,
          id: idx + 1,
          completed: false
        })));
        setExpandedCard(1);
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      console.warn("Dynamic challenges failed, showing robust fallback daily quests:", err);
      const fallbacks: QuestCard[] = [
        {
          id: 1,
          q: `Core concept inquiry: ${subject} primary factors`,
          answer: `The primary features of ${subject} focus on cell structures, biological assays, and safe molecular protocols.`,
          hint: "Focus on early research breakthroughs.",
          completed: false
        },
        {
          id: 2,
          q: `Describe structural challenges involving ${subject}`,
          answer: `Modern research resolves ${subject} constraints by deploying targeted enzyme vectors and CRISPR models.`,
          hint: "Involves nucleic sequencing steps.",
          completed: false
        }
      ];
      setQuests(fallbacks);
      setExpandedCard(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQuests(activeFocus);
  }, [activeFocus]);

  const handleCompleteQuest = async (questId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent collapsing/expanding parent block
    if (completedQuestIds.includes(questId)) return;

    // Award +25 XP and +10 Coins!
    const xpAwarded = 25;
    const coinsAwarded = 10;

    if (user && profile) {
      try {
        const currentXp = profile.total_xp || profile.xp || 0;
        const currentCoins = profile.coins || 0;
        await supabase
          .from("profiles")
          .update({ 
            total_xp: currentXp + xpAwarded,
            coins: currentCoins + coinsAwarded
          })
          .eq("id", user.id);
        if (typeof refreshProfile === "function") {
          await refreshProfile();
        }
      } catch (err) {
        console.error("Error rewarding challenge:", err);
        await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? ""); await refreshProfile();
      }
    } else {
      await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? ""); await refreshProfile();
    }

    setCompletedQuestIds(prev => [...prev, questId]);
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, completed: true } : q));
    alert(`🎉 Quest completed! You received +${xpAwarded} XP and +${coinsAwarded} Study Coins.`);
  };

  return (
    <div className="bg-[#fcf9f4] text-[#1c1c19] min-h-screen flex flex-col font-body-md overflow-y-auto shadow-xl w-full max-w-[390px] mx-auto border-x border-[#1c1c19]/10 pb-20 flex-1">
      
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-[#1c1c19] z-50 shadow-xs navbar-custom">
        <div className="flex items-center justify-between px-5 h-16 w-full">
          <button 
            onClick={() => onNavigate("Dashboard")}
            className="text-primary hover:bg-surface-container-high transition-colors p-2 rounded-full flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold pr-4 flex-1 text-center">Daily Quests</span>
          
          <button 
            onClick={() => onNavigate("Leaderboard")}
            className="text-primary hover:bg-surface-container-high transition-colors p-1 rounded-full flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-black">emoji_events</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col px-5 pb-24 pt-6 gap-6">
        
        {/* Toggle Nav Tabs */}
        <div className="flex w-full border-[#1c1c19] border-2 rounded-2xl overflow-hidden bg-white shrink-0">
          <button 
            onClick={() => setActiveTab("Daily5")}
            className={`flex-1 py-3.5 text-center font-label-md text-label-md font-bold transition-colors text-[14px] cursor-pointer ${
              activeTab === "Daily5" ? "bg-primary text-white" : "bg-white text-black hover:bg-neutral-50"
            }`}
          >
            Daily 5 Challenges
          </button>
          <div className="w-[2px] bg-[#1c1c19]"></div>
          <button 
            onClick={() => {
              setActiveTab("BossRound");
              alert("Boss rounds unlock automatically at level 15!");
            }}
            className={`flex-1 py-3.5 text-center font-label-md text-label-md font-bold transition-colors text-[14px] cursor-pointer ${
              activeTab === "BossRound" ? "bg-primary text-white" : "bg-white text-black hover:bg-neutral-50"
            }`}
          >
            Boss Round
          </button>
        </div>

        {/* Streak Heatmap Banner */}
        <section className="flex flex-col gap-3">
          <div className="flex justify-between items-end mb-1">
            <h2 className="font-headline text-headline-md text-black font-extrabold text-[16px]">Streak Log</h2>
            <span className="font-label-md text-label-md text-secondary font-bold text-[13px]">{profile?.streak || user?.streak || 5} Day Streak</span>
          </div>

          <div className="flex justify-between items-center gap-2.5">
            {streakDays.map((st, idx) => (
              <div 
                key={idx}
                className={`w-full h-14 rounded-xl border-[#1c1c19] border-2 flex items-center justify-center transition-all ${
                  st.completed 
                    ? "bg-primary text-white shadow-[2px_2px_rgba(0,0,0,1)]" 
                    : st.activeToday
                    ? "bg-surface-container-highest border-[#E8534A] border-4 text-[#1A1A1A] relative"
                    : "bg-white text-neutral-400"
                }`}
              >
                <span className="font-label-sm text-label-sm font-extrabold z-10 text-[13px]">{st.day}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Focus Area Selectors */}
        <section className="flex flex-col gap-3">
          <h3 className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wider text-[11px]">Choose Topic</h3>
          <div className="flex flex-wrap gap-2.5">
            {focusAreas.map((area) => (
              <button
                key={area}
                onClick={() => setActiveFocus(area)}
                className={`px-4 py-2 rounded-full border-[#1c1c19] border-2 font-label-md transition-all text-[13px] cursor-pointer ${
                  activeFocus === area
                    ? "bg-primary text-white font-extrabold shadow-[2px_2px_rgba(0,0,0,1)]"
                    : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => onNavigate("SourceLibrary")}
            className="mt-2 flex items-center justify-center gap-2 w-full py-3 rounded-xl border-[#1c1c19] border-2 border-dashed bg-surface-container-low text-black font-bold font-headline select-none hover:bg-neutral-100 transition-colors cursor-pointer text-[13.5px]"
          >
            <span className="material-symbols-outlined text-xl">attach_file</span>
            Extract from Source Library
          </button>
        </section>

        {/* Selected Daily 5 Questions */}
        <section className="flex flex-col gap-4 mt-2">
          <h3 className="font-headline text-headline-md text-[#1c1c19] font-extrabold text-[16px]">Active Daily Quests</h3>
          
          {loading ? (
            <div className="text-center py-10 font-bold text-on-surface-variant text-sm flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span>Generating study tasks with AI...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {quests.map((card) => {
                const isOpen = expandedCard === card.id;
                const isDone = completedQuestIds.includes(card.id) || card.completed;
                return (
                  <div 
                    key={card.id}
                    onClick={() => setExpandedCard(isOpen ? null : card.id)}
                    className={`bg-white rounded-2xl border-2 border-black p-5 shadow-[4px_4px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer relative ${
                      isDone ? "opacity-75 bg-slate-50" : ""
                    }`}
                  >
                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full border-black border-2 bg-[#FAF7F2] text-black flex items-center justify-center font-bold font-label-md shadow-[2px_2px_rgba(0,0,0,1)]">
                      {card.id}
                    </div>
                    
                    <div className="flex justify-between items-start pt-2 pl-2">
                      <h4 className={`font-headline text-[15.5px] text-black font-extrabold leading-tight pr-4 ${
                        isDone ? "line-through opacity-60" : ""
                      }`}>
                        {card.q}
                      </h4>
                      <span className="material-symbols-outlined text-secondary transition-transform">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </div>

                    {isOpen && (
                      <div className="mt-4 pl-2 border-t pt-4 border-black/10 flex flex-col gap-3">
                        <p className="font-body-md text-[#1A1A1A] leading-relaxed text-[14px]">
                          <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded mr-1">Answer</span>
                          {card.answer}
                        </p>
                        <p className="font-caption text-secondary font-semibold italic text-[12.5px] mt-1">
                          💡 Hint: {card.hint}
                        </p>

                        {!isDone && (
                          <button
                            onClick={(e) => handleCompleteQuest(card.id, e)}
                            className="w-full bg-[#E8534A] text-white border border-black py-2 rounded-xl mt-2 font-bold text-xs hover:bg-opacity-95 shadow-[1.5px_1.5px_rgba(0,0,0,1)] cursor-pointer"
                          >
                            ✓ Double-Check & Complete Task
                          </button>
                        )}
                        {isDone && (
                          <div className="text-right text-xs text-green-600 font-bold flex items-center justify-end gap-1 mt-1">
                            <span className="material-symbols-outlined text-[15px]">verified</span>
                            Awarded +25 XP
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Locked levels simulation */}
              <div className="bg-[#f6f3ee] rounded-2xl border-2 border-black border-dashed p-5 flex items-center justify-center min-h-[72px] opacity-60 cursor-not-allowed">
                <span className="material-symbols-outlined text-neutral-400 mr-2">lock</span>
                <span className="font-headline font-bold text-neutral-500 text-[14.5px]">Level 3 (Locked)</span>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
