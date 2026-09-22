import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { GlobalContextBar } from "@/components/GlobalContextBar";
import { useAuth } from "@/contexts/AuthContext";
import { generateGameContent, MemoryMatchPair } from "@/lib/arcadePipeline";
import { getActiveSource } from "@/lib/sourceContext";
import { supabase } from "@/lib/supabase";
import { logQuestCompletion } from "@/lib/quests";

interface Card {
  id: string;
  text: string;
  matchId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeSourceForDep = getActiveSource();
  const activeSourceId = activeSourceForDep?.id || "";

  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [status, setStatus] = useState<"loading" | "playing" | "finished">("loading");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadGame() {
      const activeSource = getActiveSource();
      setStatus("loading");
      setCards([]);
      setMoves(0);
      setElapsedTime(0);
      if (timerRef.current) clearInterval(timerRef.current);

      try {
        // Fallback to empty string if no active source
        const sourceText = activeSource?.fullText || activeSource?.preview || "general knowledge";
        const sourceId = activeSource?.id || "";
        
        const data = await generateGameContent(sourceText, sourceId, "memory_match");
        
        // Transform pairs into individual cards
        let generatedCards: Card[] = [];
        data.forEach((pair, idx) => {
          generatedCards.push({ id: `term-${idx}`, text: pair.term, matchId: `match-${idx}`, isFlipped: false, isMatched: false });
          generatedCards.push({ id: `def-${idx}`, text: pair.definition, matchId: `match-${idx}`, isFlipped: false, isMatched: false });
        });

        // Shuffle
        generatedCards = generatedCards.sort(() => Math.random() - 0.5);
        
        setCards(generatedCards);
        setStatus("playing");
        setStartTime(Date.now());
      } catch (e) {
        console.error("Failed to load Memory Match:", e);
      }
    }

    loadGame();
  }, [activeSourceId]);

  useEffect(() => {
    if (status === "playing" && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (status === "finished" && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, startTime]);

  const handleCardClick = (clickedId: string) => {
    if (isLocked || status !== "playing") return;
    
    const cardIndex = cards.findIndex(c => c.id === clickedId);
    if (cardIndex === -1 || cards[cardIndex].isFlipped || cards[cardIndex].isMatched) return;

    const newCards = [...cards];
    newCards[cardIndex].isFlipped = true;
    setCards(newCards);

    const flippedCards = newCards.filter(c => c.isFlipped && !c.isMatched);

    if (flippedCards.length === 2) {
      setIsLocked(true);
      setMoves(m => m + 1);

      if (flippedCards[0].matchId === flippedCards[1].matchId) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.matchId === flippedCards[0].matchId ? { ...c, isMatched: true, isFlipped: true } : c
          ));
          setIsLocked(false);
          checkWinCondition();
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (!c.isMatched && c.isFlipped) ? { ...c, isFlipped: false } : c
          ));
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  const checkWinCondition = () => {
    // We check against newCards state from the setTimeout, so safest is a functional update or checking if only 2 remain unmatched
    setCards(currentCards => {
      if (currentCards.every(c => c.isMatched)) {
        handleGameWin();
      }
      return currentCards;
    });
  };

  const handleGameWin = async () => {
    setStatus("finished");
    if (!user) return;

    // Log to study_activity
    const currentSource = getActiveSource();
    const sourceId = currentSource?.id || null;
    const finalScore = Math.max(0, 1000 - (moves * 10) - elapsedTime); // Basic arbitrary scoring
    
    try {
      await supabase.from("study_activity").insert({
        user_id: user.id,
        tool: 'arcade_memory_match',
        source_id: sourceId,
        score: finalScore,
        metadata: { moves, time_seconds: elapsedTime }
      });
      
      await logQuestCompletion(user.id, "arcade_game");
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#FAF7F2] flex">
      <SharedSidebar active="/arcade" />
      <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
        
        {/* Mobile Header */}
        <header className="h-16 w-full px-5 flex items-center justify-between bg-[#FAF7F2] border-b-[1.5px] border-black md:hidden sticky top-0 z-30">
          <button onClick={() => navigate("/arcade")} className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div className="text-[18px] font-black tracking-wider uppercase text-center truncate">Memory Match</div>
          <div className="w-9"></div> {/* Spacer for center alignment */}
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex items-end justify-between px-8 pt-8 pb-4 border-b-2 border-black">
          <div className="flex gap-4 items-end">
            <button onClick={() => navigate("/arcade")} className="mb-1 flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-[13px] shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Arcade
            </button>
            <div>
              <h1 className="font-black text-[36px] text-black tracking-tight leading-none flex items-center gap-3">
                <span className="material-symbols-outlined text-[32px] text-[#F5A623]">content_copy</span>
                Memory Match
              </h1>
            </div>
          </div>
          <GlobalContextBar compact />
        </header>

        <main className="flex-1 p-4 md:p-8 flex flex-col items-center">
          <div className="md:hidden w-full mb-4 flex justify-center"><GlobalContextBar /></div>

          {status === "loading" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[48px] animate-spin text-black/20 mb-4">settings</span>
              <p className="font-bold text-black/50 uppercase tracking-widest">Generating Game...</p>
            </div>
          ) : status === "finished" ? (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
              <div className="bg-white border-4 border-black p-8 w-full shadow-[8px_8px_0px_#F5A623] text-center">
                <span className="material-symbols-outlined text-[64px] text-[#F5A623] mb-4">emoji_events</span>
                <h2 className="font-black text-[32px] uppercase mb-6">Complete!</h2>
                <div className="flex justify-around mb-8">
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-black/50 uppercase">Moves</p>
                    <p className="font-black text-[24px]">{moves}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-black/50 uppercase">Time</p>
                    <p className="font-black text-[24px]">{formatTime(elapsedTime)}</p>
                  </div>
                </div>
                <button onClick={() => navigate("/arcade")} className="w-full py-4 bg-black text-white font-black uppercase tracking-widest border-2 border-black active:translate-y-1 transition-all">
                  Back to Arcade
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-4xl flex flex-col items-center">
              <div className="flex justify-between w-full max-w-2xl mb-6 px-4">
                <div className="font-bold text-[14px] uppercase border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
                  Moves: <span className="font-black">{moves}</span>
                </div>
                <div className="font-bold text-[14px] uppercase border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
                  Time: <span className="font-black">{formatTime(elapsedTime)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full">
                {cards.map(card => (
                  <div key={card.id} 
                    onClick={() => handleCardClick(card.id)}
                    className={`relative w-full aspect-square cursor-pointer transition-transform duration-500`}
                    style={{ perspective: "1000px" }}
                  >
                    <div className="w-full h-full absolute inset-0 transition-transform duration-500"
                      style={{ 
                        transformStyle: "preserve-3d", 
                        transform: (card.isFlipped || card.isMatched) ? "rotateY(180deg)" : "rotateY(0deg)"
                      }}>
                      {/* Front (Face Down) */}
                      <div className="absolute inset-0 bg-[#F5A623] border-4 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center backface-hidden"
                        style={{ backfaceVisibility: "hidden" }}>
                        <span className="material-symbols-outlined text-[32px] text-black/20">question_mark</span>
                      </div>
                      
                      {/* Back (Face Up) */}
                      <div className={`absolute inset-0 bg-white border-4 border-black flex items-center justify-center p-3 text-center backface-hidden ${card.isMatched ? 'opacity-50' : 'shadow-[4px_4px_0px_#000]'}`}
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                        <p className="font-bold text-[13px] md:text-[15px] break-words line-clamp-4">{card.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
