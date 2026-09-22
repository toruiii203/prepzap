import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { AttachSourcePill } from "@/components/AttachSourcePill";
import { useAuth } from "@/contexts/AuthContext";
import { TermleWord, FALLBACKS } from "@/lib/arcadePipeline";
import { getActiveSource } from "@/lib/sourceContext";
import { supabase } from "@/lib/supabase";
import { logQuestCompletion } from "@/lib/quests";


const STOPWORDS = new Set(["THEIR", "THERE", "ABOUT", "WHICH", "WOULD", "THESE", "OTHER", "COULD", "FIRST", "AFTER", "THOSE", "WHERE", "BEING", "UNDER", "YEARS", "GREAT", "STATE", "WORLD", "THREE", "FOUND", "MIGHT", "STILL", "SINCE", "NEVER", "SHOULD", "BECAUSE", "THROUGH", "BETWEEN", "ANOTHER", "HOWEVER", "WITHOUT", "DURING", "ALWAYS"]);

function extractTermleWords(sourceText: string): TermleWord[] {
  const sentences = sourceText.match(/[^.!?]+[.!?]+/g) || [];
  const results: TermleWord[] = [];
  const seenWords = new Set<string>();

  for (const sentence of sentences) {
    const words = sentence.match(/\b[A-Za-z]{5,10}\b/g) || [];
    for (const word of words) {
      const upperWord = word.toUpperCase();
      if (!STOPWORDS.has(upperWord) && !seenWords.has(upperWord)) {
        seenWords.add(upperWord);
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        const hint = sentence.replace(regex, '_____').trim();
        results.push({ word: upperWord, hint });
      }
    }
  }

  if (results.length < 5) {
    return FALLBACKS.general.termle;
  }
  return results;
}

export default function Termle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeSourceForDep = getActiveSource();
  const activeSourceId = activeSourceForDep?.id || "";

  const [targetWord, setTargetWord] = useState<string>("");
  const [targetHint, setTargetHint] = useState<string>("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [hintUsed, setHintUsed] = useState(false);
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost">("loading");

  const MAX_GUESSES = 6;

  useEffect(() => {
    async function loadGame() {
      const activeSource = getActiveSource();
      setStatus("loading");
      setGuesses([]);
      setCurrentGuess("");
      setHintUsed(false);

      try {
        const sourceText = activeSource?.fullText || activeSource?.preview || "general knowledge";
        const sourceId = activeSource?.id || "";
        
        const data = extractTermleWords(sourceText);
        // Pick random word from the 5
        const picked = data[Math.floor(Math.random() * data.length)];
        setTargetWord(picked.word.toUpperCase());
        setTargetHint(picked.hint);
        setStatus("playing");
      } catch (e) {
        console.error("Failed to load Termle:", e);
      }
    }
    loadGame();
  }, [activeSourceId]);

  const handleGameOver = async (finalStatus: "won" | "lost", finalGuesses: string[]) => {
    setStatus(finalStatus);
    if (!user) return;

    const currentSource = getActiveSource();
    const sourceId = currentSource?.id || null;
    let finalScore = 0;
    if (finalStatus === "won") {
      finalScore = (MAX_GUESSES - finalGuesses.length + 1) * 100;
      if (hintUsed) finalScore = Math.floor(finalScore / 2);
    }
    
    try {
      await supabase.from("study_activity").insert({
        user_id: user.id,
        tool: 'arcade_termle',
        source_id: sourceId,
        score: finalScore,
        metadata: { guesses: finalGuesses.length, won: finalStatus === "won", hintUsed }
      });
      await logQuestCompletion(user.id, "arcade_game");
    } catch (e) {
      console.error("Failed to log activity:", e);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status !== "playing") return;

    if (e.key === "Enter") {
      if (currentGuess.length === targetWord.length) {
        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess("");

        if (currentGuess === targetWord) {
          handleGameOver("won", newGuesses);
        } else if (newGuesses.length >= MAX_GUESSES) {
          handleGameOver("lost", newGuesses);
        }
      }
    } else if (e.key === "Backspace") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Za-z]$/.test(e.key)) {
      if (currentGuess.length < targetWord.length) {
        setCurrentGuess(prev => (prev + e.key).toUpperCase());
      }
    }
  }, [status, currentGuess, guesses, targetWord, hintUsed]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getLetterState = (guess: string, index: number) => {
    if (!targetWord) return 'empty';
    const letter = guess[index];
    if (letter === targetWord[index]) return 'correct';
    if (targetWord.includes(letter)) return 'present';
    return 'absent';
  };

  // Keyboard helper for mobile clicks
  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  const handleKeyClick = (key: string) => {
    if (key === 'ENTER') {
      handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    } else if (key === 'BACKSPACE') {
      handleKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));
    } else {
      handleKeyDown(new KeyboardEvent('keydown', { key }));
    }
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
          <div className="text-[18px] font-black tracking-wider uppercase text-center truncate">Termle</div>
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
                <span className="material-symbols-outlined text-[32px] text-[#EC4899]">spellcheck</span>
                Termle
              </h1>
            </div>
          </div>
          <AttachSourcePill />
        </header>

        <main className="flex-1 p-4 md:p-8 flex flex-col items-center pb-24">
          <div className="md:hidden w-full mb-4 flex justify-center"><AttachSourcePill /></div>

          {status === "loading" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-[48px] animate-spin text-black/20 mb-4">settings</span>
              <p className="font-bold text-black/50 uppercase tracking-widest">Generating Game...</p>
            </div>
          ) : (
            <div className="w-full max-w-lg flex flex-col items-center">
              
              {/* Hint UI */}
              <div className="mb-6 h-12 flex items-center justify-center w-full">
                {!hintUsed && guesses.length >= 2 && status === "playing" ? (
                  <button onClick={() => setHintUsed(true)}
                    className="border-2 border-black bg-[#f0a040] font-black text-[12px] uppercase tracking-widest px-4 py-2 shadow-[2px_2px_0px_#000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">lightbulb</span> Use Hint (-50% Score)
                  </button>
                ) : hintUsed ? (
                  <div className="border-2 border-black bg-white p-3 text-center text-[14px] font-bold shadow-[2px_2px_0px_#000] w-full break-words">
                    💡 {targetHint}
                  </div>
                ) : null}
              </div>

              {/* Grid */}
              <div className="grid gap-2 mb-8" style={{ gridTemplateRows: `repeat(${MAX_GUESSES}, 1fr)` }}>
                {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
                  const guess = guesses[rowIndex];
                  const isCurrentRow = rowIndex === guesses.length;
                  const wordToRender = guess || (isCurrentRow ? currentGuess : "");

                  return (
                    <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${targetWord.length}, 1fr)` }}>
                      {Array.from({ length: targetWord.length }).map((_, colIndex) => {
                        const letter = wordToRender[colIndex] || "";
                        let stateClass = "bg-white border-black text-black";
                        
                        if (guess) {
                          const state = getLetterState(guess, colIndex);
                          if (state === 'correct') stateClass = "bg-[#16a34a] border-[#16a34a] text-white";
                          else if (state === 'present') stateClass = "bg-[#fca623] border-[#fca623] text-white";
                          else stateClass = "bg-[#52525b] border-[#52525b] text-white";
                        } else if (letter) {
                          stateClass = "bg-white border-black border-[3px]";
                        } else {
                          stateClass = "bg-[#FAF7F2] border-black/20 border-2";
                        }

                        return (
                          <div key={colIndex} 
                            className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center font-black text-[24px] md:text-[32px] ${stateClass} transition-colors duration-300`}>
                            {letter}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Status Overlay */}
              {status !== "playing" && (
                <div className="mb-8 border-4 border-black p-6 w-full shadow-[8px_8px_0px_#EC4899] text-center bg-white">
                  <h2 className="font-black text-[28px] uppercase mb-2">
                    {status === "won" ? "You Got It!" : "Game Over"}
                  </h2>
                  <p className="font-bold text-[16px] text-black/60 mb-6">
                    The word was: <span className="text-black font-black bg-yellow-200 px-2">{targetWord}</span>
                  </p>
                  <button onClick={() => navigate("/arcade")} className="w-full py-4 bg-black text-white font-black uppercase tracking-widest border-2 border-black active:translate-y-1 transition-all">
                    Back to Arcade
                  </button>
                </div>
              )}

              {/* Virtual Keyboard */}
              {status === "playing" && (
                <div className="w-full flex flex-col gap-2 select-none">
                  {keyboardRows.map((row, i) => (
                    <div key={i} className="flex justify-center gap-1 md:gap-2 w-full">
                      {row.map(key => {
                        const isAction = key === 'ENTER' || key === 'BACKSPACE';
                        return (
                          <button key={key} onClick={() => handleKeyClick(key)}
                            className={`${isAction ? 'px-2 md:px-4 text-[10px] md:text-[12px]' : 'w-8 md:w-10 text-[14px] md:text-[16px]'} 
                            h-12 bg-white border-2 border-black shadow-[2px_2px_0px_#000] font-black flex items-center justify-center active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all`}>
                            {key === 'BACKSPACE' ? <span className="material-symbols-outlined text-[18px]">backspace</span> : key}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
