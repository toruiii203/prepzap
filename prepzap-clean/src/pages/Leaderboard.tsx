import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface LeaderboardProps {
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"All" | "Friends">("All");
  const [playedQuiz, setPlayedQuiz] = useState(false);
  const [activeQuizModal, setActiveQuizModal] = useState(false);

  const players = [
    {
      rank: 1,
      name: "Alex G.",
      level: 42,
      xp: "9,420",
      streak: "14 Day Streak",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnMqXFEdYRP4Xq80UFNXa8-08Tx1M_OtuOdEXJoPLQb9s2unZtKO6ZQCaoRDfpZapxS-1Jcmyn9QrjgnbCRWLvBHSHgC2DpA-xEuForSczggl91iXodtpTb9Iwdh1uoJOzJLXo2hSz3WpbSrHUBknYP7dMKm4NZJaB6eNQC_AHtQhJts_xFyCzx5UAYPnBfxq5Eq3lTu_N8htQ8M_s-u_LTjQv7QBRiGwURNihGH1OBVuGCV8qoqoq5GaaI0dWSowNg-pvvv4ZHbVx",
      bgColor: "bg-secondary-container"
    },
    {
      rank: 2,
      name: "Sam W.",
      level: 38,
      xp: "8,950",
      streak: "9 Day Streak",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBwnfgQ7GE39V5YH7vyxmY3XgHDENI5mgiTO5Q2U8FVZ4BOuiqQiKIIRJE3atG_R5fxA-06HRdDoY3zkl9592PDTj6Gp0CM88jNYf9UBqhdxp0SlqQbguuxfEdjQEsoxBgxWM4LGicqpPtnUV-TNlusX-CC44VGddAmB-q-MM1bniT-1ns6YqbZRk1GNntkNm4T5Ht9OsnXsU8wdHpREXqDWU2y6mPMeO5tXmfeDSY87-FI6yGzabwqx0iG6QcwCHYMzKbUz8cnAM23",
      bgColor: "bg-tertiary-fixed"
    },
    {
      rank: 3,
      name: "Jordan M.",
      level: 35,
      xp: "8,100",
      streak: "5 Day Streak",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDXwYFTxjl6FqE3Xdyecni_RyaL8WKWyT_khkyGxuXNzpFaGrWZ2s_VXIWz9sQ_UhcORJ1sNqb6qe2Hoe2Feq9I5A7vpEG2Qu5QOE2s-uWxgBHoNC5CNlUQAFYZLPb1KSwpZjjCG8Fr8lId3fKSk9_UL6bg1YdVtLE3YHZP3-qEBDbxy9VI9qkppgQNEoCQf_jqdmvg5SxkBmsBsD9SIleLMApEtrR_bVR0otQzQRLaXa0p3MJuKV9dxLNyxVcIwGHHcsT2eKFXw6Q5",
      bgColor: "bg-outline-variant"
    }
  ];

  const handlePlayQuiz = () => {
    setActiveQuizModal(true);
  };

  const handleQuizAnswer = async (optionIdx: number) => {
    if (optionIdx === 2) { // Math question correct answer
      const xpAwarded = 100;
      

      if (user && profile) {
        try {
          const currentXp = profile.total_xp || profile.xp || 0;
          await supabase
            .from("profiles")
            .update({ 
              total_xp: currentXp + xpAwarded
            })
            .eq("id", user.id);
          if (typeof refreshProfile === "function") {
            await refreshProfile();
          }
        } catch (err) {
          console.error("Error supporting dynamic award:", err);
          await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? ""); await refreshProfile();
        }
      } else {
        await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpAwarded }).eq("id", user?.id ?? ""); await refreshProfile();
      }
    } else {
      
    }
    setPlayedQuiz(true);
    setActiveQuizModal(false);
  };

  // Compute dynamic levels relative to profile state
  const activeXp = profile?.total_xp || profile?.xp || 2150;
  const userLevel = profile?.level || Math.floor(activeXp / 800) + 1;
  const userStreak = profile?.streak || user?.streak || 4;

  return (
    <div className="bg-[#fcf9f4] text-on-surface flex flex-col min-h-full relative pb-32 w-full flex-1 overflow-y-auto">
      {/* Top Navigation Bar */}
      <header className="flex w-full sticky top-0 left-0 z-50 justify-between items-center px-5 h-16 bg-[#FAF7F2] border-b-2 border-on-surface navbar-custom">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="text-on-surface hover:opacity-85 transition-transform active:translate-y-0.5 border-2 border-black bg-white shadow-[2px_2px_rgba(0,0,0,1)] w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <span className="font-headline text-[18px] text-[#1c1c19] font-extrabold">Studenius Ranks</span>
        </div>
        <button 
          onClick={() => navigate("/go-pro")}
          className="text-label-sm font-label-lg text-on-surface px-4 py-1.5 bg-[#ffb4ab] border-2 border-on-surface rounded-full shadow-[2px_2px_rgba(0,0,0,1)] flex items-center gap-1 active:translate-y-0.5 font-bold cursor-pointer"
        >
          <span className="material-symbols-outlined text-black" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>star</span>
          PRO
        </button>
      </header>

      {/* Main Content Scroll Canvas */}
      <main className="flex-1 w-full px-5 pt-4 flex flex-col gap-6 overflow-y-auto">
        
        {/* Quiz of the Day Promos banner */}
        <section className="bg-neutral-900 border-2 border-[#1c1c19] text-white rounded-2xl relative overflow-hidden p-6 shadow-[4px_4px_rgba(0,0,0,1)]">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 2px, transparent 0)", backgroundSize: "20px 20px" }}></div>
          <div className="relative z-10 flex flex-col gap-5">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-yellow-450" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                <span className="font-headline font-bold text-[11px] text-zinc-400 uppercase tracking-wider">DAILY QUIZ</span>
              </div>
              <div className="flex flex-col items-end gap-[7px]">
                <span className="bg-[#ffb4ab] text-black border-2 border-on-surface text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-[1.5px_1.5px_rgba(0,0,0,1)]">
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-16 h-16 bg-white rounded-full border-2 border-on-surface mb-3 flex items-center justify-center text-on-surface shadow-[3px_3px_rgba(0,0,0,1)] transform -rotate-6">
                <span className="material-symbols-outlined text-4xl text-black" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
              </div>
              <h2 className="font-headline text-headline-xl text-center mb-1 text-white font-extrabold tracking-tight text-[21px]">Study Arena Challenge</h2>
              <p className="text-zinc-400 text-[13.5px] text-center max-w-[240px] font-semibold">
                Answer today's premium diagnostic question and earn +100 XP instantly.
              </p>
            </div>

            <button 
              onClick={handlePlayQuiz}
              className="w-full bg-[#E8534A] text-white border-2 border-on-surface py-3 rounded-lg text-label-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-opacity-95 shadow-[2px_2px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              {playedQuiz ? "Practice Daily Quiz Again" : "Complete Daily Challenge"}
            </button>
          </div>
        </section>

        {/* Modal daily quiz gameplay */}
        {activeQuizModal && (
          <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_rgba(0,0,0,1)] flex flex-col gap-4 animate-fade-in relative z-50">
            <span className="text-xs uppercase text-primary font-bold">Daily Study Arena</span>
            <p className="font-headline font-extrabold text-[15.5px] leading-snug">
              Which mathematical base constant represents standard organic exponential growth in physical curves?
            </p>
            <div className="grid grid-cols-1 gap-2.5 mt-2">
              {["Pi (?/)", "Golden Ratio (?/)", "Euler's Number (e)", "Square Root of 2"].map((ansOption, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => handleQuizAnswer(sIdx)}
                  className="w-full text-left bg-zinc-50 hover:bg-zinc-100 border-2 border-black p-3 rounded-xl font-bold font-headline text-[13.5px] cursor-pointer"
                >
                  {sIdx + 1}. {ansOption}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setActiveQuizModal(false)}
              className="text-center font-bold text-xs underline p-1 mt-1 cursor-pointer text-slate-500"
            >
              Dismiss Quiz
            </button>
          </div>
        )}

        {/* Leaderboard Tabs */}
        <div className="flex gap-5 border-b-2 border-on-surface pb-2 mt-2">
          <button 
            onClick={() => setActiveTab("All")}
            className={`text-headline text-headline-md pb-1 -mb-[10px] z-10 font-extrabold cursor-pointer ${
              activeTab === "All" ? "border-b-4 border-primary text-black" : "text-neutral-400 hover:text-black"
            }`}
          >
            All Students
          </button>
          
          <button 
            onClick={() => {
              setActiveTab("Friends");
              
            }}
            className={`text-headline text-headline-md pb-1 -mb-[10px] z-10 font-extrabold cursor-pointer ${
              activeTab === "Friends" ? "border-b-4 border-primary text-black" : "text-neutral-400 hover:text-black"
            }`}
          >
            Friends
          </button>
        </div>

        {/* Ranked Players list */}
        <section className="flex flex-col gap-4 mt-2 pb-[120px]">
          {players.map((plyr, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-2xl border-2 border-[#1c1c19] flex items-center p-5 relative overflow-hidden shadow-[2px_2px_rgba(0,0,0,1)]"
            >
              <div className="w-8 flex-shrink-0 text-center font-headline text-headline-lg font-extrabold text-[#E8534A]">
                {plyr.rank}
              </div>
              
              <div className="relative mx-3.5 shrink-0">
                <div className={`w-12 h-12 rounded-full border-2 border-on-surface overflow-hidden p-0.5 ${plyr.bgColor} bg-white`}>
                  <img 
                    alt={`${plyr.name} avatar`} 
                    className="w-full h-full object-cover rounded-full" 
                    referrerPolicy="no-referrer"
                    src={plyr.avatar}
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-neutral-900 text-white text-[9px] font-bold px-1 rounded-full border border-on-surface">
                  Lv.{plyr.level}
                </div>
              </div>

              <div className="flex-1 min-w-0 pl-1 text-left">
                <h3 className="text-body-lg text-on-surface truncate pr-2 font-headline font-extrabold text-[16px]">
                  {plyr.name}
                </h3>
                <p className="text-label-md text-[#E8534A] flex items-center gap-1 font-bold text-[12px] mt-0.5">
                  //// {plyr.streak}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="font-headline text-headline-md font-bold text-on-surface">{plyr.xp}</div>
                <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">XP</div>
              </div>
            </div>
          ))}

          {/* Ellipsis separator */}
          <div className="flex justify-center text-on-surface-variant opacity-60">
            <span className="material-symbols-outlined">more_vert</span>
          </div>

        </section>
      </main>

      {/* Sticky "Your Rank" baseline Card */}
      <div className="absolute bottom-[86px] left-0 w-full z-45 px-5">
        <div className="rounded-2xl border-2 border-on-surface bg-[#f7f3ec] flex items-center p-4.5 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] border-solid">
          <div className="w-8 flex-shrink-0 text-center font-headline font-bold text-on-surface">
            4
          </div>
          
          <div className="relative mx-3.5 shrink-0">
            <div className="w-12 h-12 rounded-full border-2 border-on-surface overflow-hidden bg-primary text-white flex items-center justify-center font-bold">
              ////
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white text-[9px] font-bold px-1 rounded-full border border-on-surface">
              Lv.{userLevel}
            </div>
          </div>

          <div className="flex-grow min-w-0 pl-1 text-left">
            <h3 className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-0.5">
              YOUR PERSONAL RANK
            </h3>
            <h3 className="font-headline text-[15.5px] font-extrabold text-on-surface truncate">
              {profile?.full_name || profile?.username || user?.email || "You (Master)"}
            </h3>
            <p className="text-[12px] font-bold text-orange-600">//// {userStreak} Day Streak</p>
          </div>

          <div className="text-right shrink-0">
            <div className="font-headline text-headline-md font-bold text-on-surface">{activeXp.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">XP</div>
          </div>
        </div>
      </div>
    </div>
  );
}
