import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useSourceContext } from "@/contexts/SourceContext";
import { supabase } from "@/lib/supabase";
import { logQuestCompletion } from "@/lib/quests";

interface WordData {
  word: string;
  hint: string;
}

const STOPWORDS = new Set(["THEIR", "THERE", "ABOUT", "WHICH", "WOULD", "THESE", "OTHER", "COULD", "FIRST", "AFTER", "THOSE", "WHERE", "BEING", "UNDER", "YEARS", "GREAT", "STATE", "WORLD", "THREE", "FOUND", "MIGHT", "STILL", "SINCE", "NEVER", "SHOULD", "BECAUSE", "THROUGH", "BETWEEN", "ANOTHER", "HOWEVER", "WITHOUT", "DURING", "ALWAYS", "WHERE"]);

function extractWords(sourceText: string): WordData[] {
  const sentences = sourceText.match(/[^.!?]+[.!?]+/g) || [];
  const results: WordData[] = [];
  const seenWords = new Set<string>();

  for (const sentence of sentences) {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length < 20 || cleanSentence.length > 150) continue;

    const words = cleanSentence.replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
    const candidates = words.filter(w => w.length >= 5 && w.length <= 10);

    for (const word of candidates) {
      const up = word.toUpperCase();
      if (!STOPWORDS.has(up) && !seenWords.has(up)) {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        const hint = cleanSentence.replace(regex, "_____");
        results.push({ word: up, hint });
        seenWords.add(up);
        break;
      }
    }
  }

  return results.length > 0 ? results : [
    { word: "STUDY", hint: "To devote time and attention to _____." },
    { word: "LEARN", hint: "Gain or acquire knowledge to _____." },
    { word: "FOCUS", hint: "The center of interest is the _____." }
  ];
}

function shuffle(str: string) {
  let arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function AnagramSprint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSource } = useSourceContext();
  
  const ROUND_COUNT = 8;
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [userArrangement, setUserArrangement] = useState<(string|null)[]>([]);
  const [availableLetters, setAvailableLetters] = useState<{char: string, id: number}[]>([]);
  
  const [gameState, setGameState] = useState<"playing" | "game_over">("playing");
  const [startTime, setStartTime] = useState(Date.now());
  
  useEffect(() => {
    const sourceText = activeSource?.fullText || activeSource?.preview || "General knowledge placeholder text to study and learn concepts with strong focus.";
    const extracted = extractWords(sourceText);
    
    // Shuffle and pick ROUND_COUNT words
    const shuffledExtracted = [...extracted].sort(() => 0.5 - Math.random());
    const selected = shuffledExtracted.slice(0, ROUND_COUNT);
    // If not enough, pad with copies
    while (selected.length < ROUND_COUNT && selected.length > 0) {
      selected.push(selected[Math.floor(Math.random() * selected.length)]);
    }
    setWords(selected);
  }, [activeSource]);

  useEffect(() => {
    if (words.length > 0 && currentIndex < ROUND_COUNT) {
      const current = words[currentIndex].word;
      let shuf = shuffle(current);
      while (shuf.join("") === current && current.length > 1) {
        shuf = shuffle(current);
      }
      setScrambled(shuf);
      setAvailableLetters(shuf.map((c, i) => ({char: c, id: i})));
      setUserArrangement(new Array(current.length).fill(null));
    } else if (words.length > 0 && currentIndex >= ROUND_COUNT) {
      handleGameOver();
    }
  }, [words, currentIndex]);

  const handleGameOver = async () => {
    setGameState("game_over");
    const duration = Math.round((Date.now() - startTime) / 60000) || 1;
    if (user) {
      await supabase.from("study_activity").insert({
        user_id: user.id,
        duration_minutes: duration,
        activity_type: "Arcade: Anagram Sprint",
        tool: "arcade_anagram_sprint",
        score: ROUND_COUNT,
        max_score: ROUND_COUNT,
      });
      await logQuestCompletion(user.id, "arcade_game");
      window.dispatchEvent(new Event("studenius:session-logged"));
    }
  };

  const handleTapAvailable = (letter: {char: string, id: number}) => {
    const firstEmpty = userArrangement.indexOf(null);
    if (firstEmpty !== -1) {
      const newArr = [...userArrangement];
      newArr[firstEmpty] = letter.char;
      setUserArrangement(newArr);
      setAvailableLetters(availableLetters.filter(l => l.id !== letter.id));
    }
  };

  const handleTapPlaced = (char: string, index: number) => {
    const newArr = [...userArrangement];
    newArr[index] = null;
    setUserArrangement(newArr);
    // Add back to available. ID doesn't strictly matter for rendering but keep it uniqueish
    setAvailableLetters([...availableLetters, {char, id: Math.random()}]);
  };

  useEffect(() => {
    // Check win condition
    if (words.length > 0 && currentIndex < ROUND_COUNT && !userArrangement.includes(null)) {
      const target = words[currentIndex].word;
      if (userArrangement.join("") === target) {
        // Correct!
        setTimeout(() => {
          setCurrentIndex(curr => curr + 1);
        }, 300);
      } else {
        // Wrong, reset
        setTimeout(() => {
          setAvailableLetters(scrambled.map((c, i) => ({char: c, id: i})));
          setUserArrangement(new Array(target.length).fill(null));
        }, 500);
      }
    }
  }, [userArrangement]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center">
      <header className="w-full h-16 flex items-center justify-between px-8 border-b-2 border-black bg-white shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/arcade")} className="w-9 h-9 border-2 border-black rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000]"><span className="material-symbols-outlined text-[18px]">arrow_back</span></button>
          <span className="text-[20px] font-black tracking-tight">ANAGRAM SPRINT</span>
        </div>
        <div className="text-[14px] font-bold">
          {Math.min(currentIndex + 1, ROUND_COUNT)} / {ROUND_COUNT}
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl flex flex-col p-8 justify-center items-center">
        {gameState === "game_over" ? (
          <div className="border-2 border-black bg-white p-8 shadow-[8px_8px_0px_#000] text-center max-w-md w-full">
            <span className="material-symbols-outlined text-[64px] text-[#FF4D2E] mb-4">sprint</span>
            <h2 className="text-[32px] font-black mb-2">SPRINT COMPLETE!</h2>
            <p className="text-[16px] font-bold opacity-60 mb-8">You unscrambled {ROUND_COUNT} words perfectly.</p>
            <button onClick={() => navigate("/arcade")} className="w-full h-12 bg-black text-white font-black text-[16px] border-2 border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] transition-all">RETURN TO ARCADE</button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-12">
            {/* Clue */}
            <div className="text-center bg-white border-2 border-black p-6 shadow-[4px_4px_0px_#000] w-full">
              <span className="text-[11px] font-black uppercase text-black/40 mb-2 block">Context Clue</span>
              <p className="text-[18px] font-medium leading-relaxed">
                {words[currentIndex]?.hint}
              </p>
            </div>

            {/* Placed letters */}
            <div className="flex flex-wrap justify-center gap-3 min-h-[64px]">
              {userArrangement.map((char, i) => (
                <button
                  key={i}
                  onClick={() => char && handleTapPlaced(char, i)}
                  className={`w-14 h-16 border-2 border-black flex items-center justify-center text-[28px] font-black transition-transform ${char ? 'bg-black text-white hover:scale-105 shadow-[3px_3px_0px_#FF4D2E]' : 'bg-[#E5E2DA] border-dashed opacity-50'}`}
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Available letters */}
            <div className="flex flex-wrap justify-center gap-3">
              {availableLetters.map(letter => (
                <button
                  key={letter.id}
                  onClick={() => handleTapAvailable(letter)}
                  className="w-14 h-16 bg-white border-2 border-black flex items-center justify-center text-[28px] font-black shadow-[3px_3px_0px_#000] hover:-translate-y-1 hover:shadow-[3px_6px_0px_#000] transition-all"
                >
                  {letter.char}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
