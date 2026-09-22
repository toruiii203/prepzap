import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { AttachSourcePill } from "@/components/AttachSourcePill";
import { useAuth } from "@/contexts/AuthContext";
import { generateGameContent, TrueFalseStatement } from "@/lib/arcadePipeline";
import { getActiveSource } from "@/lib/sourceContext";
import { supabase } from "@/lib/supabase";
import { logQuestCompletion } from "@/lib/quests";

export default function TrueFalseBlitz() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeSourceForDep = getActiveSource();
  const activeSourceId = activeSourceForDep?.id || "";

  const [statements, setStatements] = useState<TrueFalseStatement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [status, setStatus] = useState<"loading" | "playing" | "finished">("loading");
  const [flash, setFlash] = useState<"correct" | "incorrect" | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadGame() {
      if (!user) return;
      const activeSource = getActiveSource();
      setStatus("loading");
      setScore(0);
      setStreak(0);
      setLongestStreak(0);
      setTimeLeft(60);
      setCurrentIndex(0);
      setFlash(null);

      try {
        const sourceText = activeSource?.fullText || activeSource?.preview || "general knowledge";
        const sourceId = activeSource?.id || "";
        
        const data = await generateGameContent(sourceText, sourceId, "true_false", user?.id || "");
        // We might get e.g. 10 statements.
        setStatements(data);
        setStatus("playing");
      } catch (e) {
        console.error("Failed to load True/False Blitz:", e);
      }
    }
    loadGame();
  }, [activeSourceId]);

  useEffect(() => {
    if (status === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleGameOver();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleAnswer = (userAnswer: boolean) => {
    if (status !== "playing" || flash !== null) return; // Prevent double click

    const currentStatement = statements[currentIndex];
    const isCorrect = currentStatement.isTrue === userAnswer;

    if (isCorrect) {
      setFlash("correct");
      setScore(s => s + 1);
      setStreak(s => {
        const newStreak = s + 1;
        if (newStreak > longestStreak) setLongestStreak(newStreak);
        return newStreak;
      });
    } else {
      setFlash("incorrect");
      setStreak(0);
    }

    setTimeout(() => {
      setFlash(null);
      if (currentIndex + 1 >= statements.length) {
        handleGameOver();
      } else {
        setCurrentIndex(i => i + 1);
      }
    }, 400); // 400ms flash duration before moving to next
  };

  const handleGameOver = async () => {
    setStatus("finished");
    if (timerRef.current) clearInterval(timerRef.current);
    if (!user) return;

    const currentSource = getActiveSource();
    const sourceId = currentSource?.id || null;
    const finalScore = (score * 10) + (longestStreak * 5); 
    
    try {
      await supabase.from("study_activity").insert({
        user_id: user.id,
        tool: 'arcade_true_false',
        source_id: sourceId,
        score: finalScore,
        metadata: { correct: score, total: statements.length, longest_streak: longestStreak }
      });
      
      await logQuestCompletion(user.id, "arcade_game");
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  const activeStatement = statements[currentIndex];

  return (
    <div className="w-full min-h-[100dvh] bg-[#FAF7F2] flex">
      <SharedSidebar active="/arcade" />
      <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
        
        {/* Mobile Header */}
        <header className="h-16 w-full px-5 flex items-center justify-between bg-[#FAF7F2] border-b-[1.5px] border-black md:hidden sticky top-0 z-30">
          <button onClick={() => navigate("/arcade")} className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div className="text-[18px] font-black tracking-wider uppercase text-center truncate">True/False Blitz</div>
          <div className="w-9"></div> 
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
          <div className="flex gap-4 items-end">
            <button onClick={() => navigate("/arcade")} className="mb-1 flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-[13px] shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Arcade
            </button>
            <div>
              <h1 className="font-black text-[36px] text-black tracking-tight leading-none flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-[#0EA5E9]">bolt</span>
                True/False Blitz
              </h1>
            </div>
          </div>
          <AttachSourcePill />
        </header>

        <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center relative">
          <div className="md:hidden w-full absolute top-4 flex justify-center"><AttachSourcePill /></div>

          {status === "loading" ? (
            <div className="text-center">
              <span className="material-symbols-outlined text-[48px] animate-spin text-black/20 mb-4">settings</span>
              <p className="font-bold text-black/50 uppercase tracking-widest">Generating Game...</p>
            </div>
          ) : status === "finished" ? (
             <div className="bg-white border-4 border-black p-8 w-full max-w-md shadow-[8px_8px_0px_#0EA5E9] text-center">
                <span className="material-symbols-outlined text-[64px] text-[#0EA5E9] mb-4">offline_bolt</span>
                <h2 className="font-black text-[32px] uppercase mb-6">Time's Up!</h2>
                <div className="flex justify-around mb-8">
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-black/50 uppercase">Correct</p>
                    <p className="font-black text-[32px]">{score} <span className="text-[16px] text-black/40">/ {statements.length}</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-black/50 uppercase">Best Streak</p>
                    <p className="font-black text-[32px] text-[#fca623]">{longestStreak}</p>
                  </div>
                </div>
                <button onClick={() => navigate("/arcade")} className="w-full py-4 bg-black text-white font-black uppercase tracking-widest border-2 border-black active:translate-y-1 transition-all">
                  Back to Arcade
                </button>
              </div>
          ) : (
            <div className="w-full max-w-2xl flex flex-col items-center w-full">
              {/* HUD */}
              <div className="w-full flex justify-between items-center mb-8 px-4">
                <div className="flex items-center gap-4">
                  <div className="font-bold text-[14px] uppercase border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
                    Score: <span className="font-black text-[#0EA5E9]">{score}</span>
                  </div>
                  <div className="font-bold text-[14px] uppercase border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#fca623]">local_fire_department</span>
                    <span className="font-black">{streak}</span>
                  </div>
                </div>
                <div className={`font-black text-[24px] uppercase border-4 border-black bg-white px-4 py-1 shadow-[4px_4px_0px_#000] ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : ''}`}>
                  0:{timeLeft.toString().padStart(2, "0")}
                </div>
              </div>

              {/* Statement Card */}
              <div className={`w-full bg-white border-4 border-black p-8 md:p-12 text-center min-h-[250px] flex items-center justify-center transition-colors duration-200 shadow-[8px_8px_0px_0px_#000] mb-8
                ${flash === 'correct' ? 'bg-green-100 border-green-600 shadow-[8px_8px_0px_0px_#16a34a]' : ''}
                ${flash === 'incorrect' ? 'bg-red-100 border-red-600 shadow-[8px_8px_0px_0px_#dc2626]' : ''}
              `}>
                <h2 className="font-black text-[24px] md:text-[32px] leading-tight">
                  {activeStatement?.statement}
                </h2>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-6 w-full px-4">
                <button 
                  onClick={() => handleAnswer(true)}
                  disabled={flash !== null}
                  className="py-6 bg-[#16a34a] border-4 border-black text-white font-black text-[24px] uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all disabled:opacity-50">
                  TRUE
                </button>
                <button 
                  onClick={() => handleAnswer(false)}
                  disabled={flash !== null}
                  className="py-6 bg-[#dc2626] border-4 border-black text-white font-black text-[24px] uppercase tracking-wider shadow-[4px_4px_0px_0px_#000] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all disabled:opacity-50">
                  FALSE
                </button>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
