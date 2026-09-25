import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSourceContext } from "@/contexts/SourceContext";
import { supabase } from "@/lib/supabase";
import { logQuestCompletion } from "@/lib/quests";
import { generateGameContent, OddOneOutRound } from "@/lib/arcadePipeline";

export default function OddOneOut() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSource } = useSourceContext();

  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<OddOneOutRound[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  
  const [gameState, setGameState] = useState<"loading" | "playing" | "revealed" | "game_over">("loading");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const sourceText = activeSource?.fullText || activeSource?.preview || "General knowledge.";
      const sourceId = activeSource?.id || "";
      
      const data = await generateGameContent(sourceText, sourceId, "odd_one_out", user.id);
      setRounds(data.slice(0, 10)); // max 10
      setLoading(false);
      setGameState("playing");
      setStartTime(Date.now());
    }
    load();
  }, [activeSource, user]);

  const handleGameOver = async (finalScore: number) => {
    setGameState("game_over");
    const duration = Math.round((Date.now() - startTime) / 60000) || 1;
    if (user) {
      await supabase.from("study_activity").insert({
        user_id: user.id,
        duration_minutes: duration,
        activity_type: "Arcade: Odd One Out",
        tool: "arcade_odd_one_out",
        score: finalScore,
        max_score: rounds.length,
      });
      await logQuestCompletion(user.id, "arcade_game");
      window.dispatchEvent(new Event("studenius:session-logged"));
    }
  };

  const handleSelect = (idx: number) => {
    if (gameState !== "playing") return;
    
    setSelectedIdx(idx);
    setGameState("revealed");
    
    const isCorrect = idx === rounds[currentIndex].oddIndex;
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= rounds.length) {
      handleGameOver(score + (selectedIdx === rounds[currentIndex].oddIndex ? 1 : 0));
    } else {
      setSelectedIdx(null);
      setCurrentIndex(c => c + 1);
      setGameState("playing");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center">
      <header className="w-full h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#EAB308] text-black shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/arcade")} className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]"><span className="material-symbols-outlined text-[18px]">arrow_back</span></button>
          <span className="text-[20px] font-black tracking-tight uppercase">Odd One Out</span>
        </div>
        <div className="flex items-center gap-6 font-black text-[14px]">
          <span>ROUND: {currentIndex + 1} / {rounds.length}</span>
          <span>SCORE: {score}</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl flex flex-col p-8 items-center justify-center">
        {gameState === "loading" && (
          <div className="animate-pulse font-black text-[24px]">Analyzing Categories...</div>
        )}
        
        {gameState === "game_over" && (
          <div className="border-2 border-black bg-white p-8 shadow-[8px_8px_0px_#000] text-center max-w-md w-full">
            <span className="material-symbols-outlined text-[64px] text-[#EAB308] mb-4">pageview</span>
            <h2 className="text-[32px] font-black mb-2">GAME OVER!</h2>
            <p className="text-[16px] font-bold opacity-60 mb-8">You found {score} out of {rounds.length} odd ones out.</p>
            <button onClick={() => navigate("/arcade")} className="w-full h-12 bg-black text-white font-black text-[16px] border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all">RETURN TO ARCADE</button>
          </div>
        )}

        {(gameState === "playing" || gameState === "revealed") && rounds[currentIndex] && (
          <div className="w-full flex flex-col gap-10">
            <h2 className="text-[24px] font-black text-center">Which one doesn't belong?</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {rounds[currentIndex].items.map((item, idx) => {
                const isOdd = idx === rounds[currentIndex].oddIndex;
                const isSelected = selectedIdx === idx;
                
                let btnClass = "bg-white border-2 border-black shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[4px_8px_0px_#000]";
                if (gameState === "revealed") {
                  if (isOdd) btnClass = "bg-[#10B981] border-2 border-black shadow-[4px_4px_0px_#000] text-white"; // Correct answer glows green
                  else if (isSelected && !isOdd) btnClass = "bg-[#EF4444] border-2 border-black shadow-[4px_4px_0px_#000] text-white"; // Wrong pick turns red
                  else btnClass = "bg-[#E5E2DA] border-2 border-black opacity-50"; // Others fade
                }

                return (
                  <button 
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={gameState === "revealed"}
                    className={`h-28 px-4 flex items-center justify-center text-center font-bold text-[18px] transition-all ${btnClass}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {gameState === "revealed" && (
              <div className="mt-4 border-2 border-black bg-white p-6 shadow-[5px_5px_0px_#000] animate-in slide-in-from-bottom-4 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined text-[28px] ${selectedIdx === rounds[currentIndex].oddIndex ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {selectedIdx === rounds[currentIndex].oddIndex ? "check_circle" : "cancel"}
                  </span>
                  <div>
                    <span className="text-[11px] font-black uppercase text-black/40 block mb-1">Reason</span>
                    <p className="text-[16px] font-bold leading-relaxed">{rounds[currentIndex].reason}</p>
                  </div>
                </div>
                <button onClick={handleNext} className="w-full h-12 bg-black text-white font-black text-[16px] border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all mt-2">
                  {currentIndex + 1 >= rounds.length ? "FINISH" : "NEXT ROUND"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
