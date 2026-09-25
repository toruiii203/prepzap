import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSourceContext } from "@/contexts/SourceContext";
import { supabase } from "@/lib/supabase";
import { logQuestCompletion } from "@/lib/quests";
import { generateGameContent, WhackAMoleQuestion } from "@/lib/arcadePipeline";

export default function WhackAMole() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSource } = useSourceContext();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<WhackAMoleQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [gameState, setGameState] = useState<"loading" | "playing" | "game_over">("loading");
  
  const [moles, setMoles] = useState<{id: string, text: string, isCorrect: boolean, visible: boolean}[]>([]);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const sourceText = activeSource?.fullText || activeSource?.preview || "General knowledge.";
      const sourceId = activeSource?.id || "";
      
      const data = await generateGameContent(sourceText, sourceId, "whack_a_mole", user.id);
      setQuestions(data.slice(0, 15)); // max 15
      setLoading(false);
      setGameState("playing");
      setStartTime(Date.now());
    }
    load();
  }, [activeSource, user]);

  useEffect(() => {
    if (gameState !== "playing" || questions.length === 0) return;
    
    if (currentIndex >= questions.length) {
      handleGameOver();
      return;
    }

    const currentQ = questions[currentIndex];
    const answers = [
      { id: '1', text: currentQ.correctAnswer, isCorrect: true, visible: false },
      ...currentQ.wrongAnswers.slice(0, 3).map((w, i) => ({ id: `w${i}`, text: w, isCorrect: false, visible: false }))
    ].sort(() => 0.5 - Math.random());
    
    setMoles(answers);

    // Simple staggered show logic
    const timeouts: NodeJS.Timeout[] = [];
    answers.forEach((ans, i) => {
      const delay = 500 + Math.random() * 1500; // pop up
      
      const tShow = setTimeout(() => {
        setMoles(prev => prev.map((m, idx) => idx === i ? { ...m, visible: true } : m));
        
        // Disappear after 2-3 seconds
        const tHide = setTimeout(() => {
          setMoles(prev => {
            const isStillVisible = prev[i].visible;
            if (isStillVisible) {
              if (ans.isCorrect) {
                // If correct mole hides without being whacked, it's a miss and we move to next question
                setMisses(m => m + 1);
                setTimeout(() => {
                  setCurrentIndex(curr => curr + 1);
                }, 500);
              }
              return prev.map((m, idx) => idx === i ? { ...m, visible: false } : m);
            }
            return prev;
          });
        }, 2000 + Math.random() * 1000);
        timeouts.push(tHide);
      }, delay);
      timeouts.push(tShow);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [currentIndex, gameState, questions]);

  const handleGameOver = async () => {
    setGameState("game_over");
    const duration = Math.round((Date.now() - startTime) / 60000) || 1;
    if (user) {
      await supabase.from("study_activity").insert({
        user_id: user.id,
        duration_minutes: duration,
        activity_type: "Arcade: Whack-a-Mole",
        tool: "arcade_whack_a_mole",
        score: score,
        max_score: questions.length,
      });
      await logQuestCompletion(user.id, "arcade_game");
      window.dispatchEvent(new Event("studenius:session-logged"));
    }
  };

  const handleWhack = (mole: {id: string, text: string, isCorrect: boolean, visible: boolean}) => {
    if (!mole.visible) return; // can't whack a hidden mole
    
    if (mole.isCorrect) {
      setScore(s => s + 1);
    } else {
      setMisses(m => m + 1);
    }
    
    // Hide all instantly, next question
    setMoles(prev => prev.map(m => ({ ...m, visible: false })));
    setTimeout(() => {
      setCurrentIndex(curr => curr + 1);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center">
      <header className="w-full h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#10B981] text-white shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/arcade")} className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center bg-white text-black hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]"><span className="material-symbols-outlined text-[18px]">arrow_back</span></button>
          <span className="text-[20px] font-black tracking-tight uppercase">Whack-a-Mole</span>
        </div>
        <div className="flex items-center gap-6 font-black text-[14px]">
          <span>SCORE: {score}</span>
          <span>MISSES: {misses}</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl flex flex-col p-8 items-center justify-center relative">
        {gameState === "loading" && (
          <div className="animate-pulse font-black text-[24px]">Spawning Moles...</div>
        )}
        
        {gameState === "game_over" && (
          <div className="border-2 border-black bg-white p-8 shadow-[8px_8px_0px_#000] text-center max-w-md w-full">
            <span className="material-symbols-outlined text-[64px] text-[#10B981] mb-4">pest_control</span>
            <h2 className="text-[32px] font-black mb-2">GAME OVER!</h2>
            <p className="text-[16px] font-bold opacity-60 mb-8">You whacked {score} correctly with {misses} misses.</p>
            <button onClick={() => navigate("/arcade")} className="w-full h-12 bg-black text-white font-black text-[16px] border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all">RETURN TO ARCADE</button>
          </div>
        )}

        {gameState === "playing" && questions[currentIndex] && (
          <div className="w-full flex flex-col h-full gap-8">
            <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0px_#000] text-center shrink-0 z-10">
              <h2 className="text-[20px] font-bold">{questions[currentIndex].question}</h2>
              <div className="text-[11px] font-black uppercase text-black/40 mt-3">Q {currentIndex + 1} of {questions.length}</div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-6 relative p-8 bg-[#8B5CF6] border-4 border-black rounded-xl overflow-hidden shadow-inner">
              {moles.map((mole, i) => (
                <div key={mole.id} className="relative flex items-end justify-center h-full pb-4">
                  {/* The Hole */}
                  <div className="absolute bottom-4 w-32 h-12 bg-black/40 rounded-[100%] border-b-4 border-black/60 shadow-inner" />
                  
                  {/* The Mole */}
                  <button 
                    onClick={() => handleWhack(mole)}
                    className={`absolute bottom-6 w-36 bg-white border-4 border-black p-4 text-center font-black shadow-[0_8px_0px_#000] transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${mole.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none hover:bg-white'}`}
                    style={{ borderRadius: '40px 40px 10px 10px' }}
                  >
                    {mole.text}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
