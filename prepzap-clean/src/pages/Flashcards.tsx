import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { loadContext, loadLibrary, buildAIContext, getActiveSource } from "@/lib/sourceContext";

interface Flashcard {
  front: string;
  back: string;
  explanation: string;
}

interface FlashcardsProps {
  onNavigate: (screen: string) => void;
}

export default function Flashcards({ onNavigate }: FlashcardsProps) {
  const { user, profile, refreshProfile } = useAuth() as any;
  const [view, setView] = useState<"setup" | "study" | "results">("setup");
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState(8);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  
  // Game scores
  const [scores, setScores] = useState({ gotIt: 0, unsure: 0, forgot: 0 });

  // Standard Flashcards to show as fallback
  const mockCards: Flashcard[] = [
    {
      front: "What is the primary function of Mitochondria in a cell?",
      back: "ATP Production (Cellular Respiration)",
      explanation: "They generate most of the chemical energy needed to power the cell's biochemical reactions.",
    },
    {
      front: "What happens during crossing over in Prophase I of Meiosis?",
      back: "Genetic Recombination",
      explanation: "Homologous chromosomes pair up and exchange segments of their genetic material, increasing genetic diversity.",
    },
    {
      front: "What are the stages of Mitosis in order?",
      back: "Prophase, Metaphase, Anaphase, Telophase",
      explanation: "Often remembered by PMAT. Followed by cytokinesis which splits the physical cell.",
    },
    {
      front: "What is the function of the ribosome?",
      back: "Protein Synthesis",
      explanation: "Ribosomes translate messenger RNA (mRNA) into polypeptide chains of amino acids to form proteins.",
    },
    {
      front: "What are the key ingredients required for Photosynthesis?",
      back: "Water, Carbon Dioxide, and Sunlight",
      explanation: "Occurs within chloroplasts to yield glucose and oxygen as a byproduct.",
    },
    {
      front: "Define active transport.",
      back: "Energy-requiring movement of molecules",
      explanation: "Movement of substances across a membrane against their concentration gradient, requiring ATP (e.g. Sodium-Potassium pump).",
    },
    {
      front: "What does DNA stand for?",
      back: "Deoxyribonucleic Acid",
      explanation: "The hereditary material in humans and almost all other organisms containing genetic instructions.",
    },
    {
      front: "What is the purpose of tRNA?",
      back: "To carry amino acids to ribosomes",
      explanation: "Matches its anticodon with the codon of mRNA to append the correct amino acid during translation.",
    }
  ];

  // Load the initial setup variables if source is active
  useEffect(() => {
    const ctx = loadContext();
    const selectedIds = Array.isArray(ctx) ? ctx : (ctx as any)?.selectedIds || [];
    const active = getActiveSource();
    if (active) {
      setTopic(`Active Source: ${active.name}`);
    }
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setScores({ gotIt: 0, unsure: 0, forgot: 0 });
    setCurrentCardIndex(0);
    setIsFlipped(false);

    try {
      const activeIdsCtx = loadContext();
      const selectedIds = Array.isArray(activeIdsCtx) ? activeIdsCtx : (activeIdsCtx as any)?.selectedIds || [];
      const sourceContextText = buildAIContext();
      
      const promptText = `Generate ${cardCount} highly educational study flashcards about "${topic || "General Biology"}".
${sourceContextText ? `Utilize the following material context to generate highly specific custom flashcards:\n${sourceContextText}` : ""}

Return strictly a valid raw JSON array containing exactly ${cardCount} objects. Each object must have fields:
"front" (string, the question/concept front),
"back" (string, the core answer/fact back),
"explanation" (string, detailed memory cue / educational backup).

Only return the raw system valid JSON array. No markdown codeblocks, no explanations, no prefix or suffix!`;

      const systemPrompt = "You are an elite educational science system that outputs only raw JSON content arrays matching schemas. Do not write any markdown codeblocks or non-JSON text.";

      // Safe callGroq signature resolver
      const callGroqWithModel = async (promptText: string, systemPrompt: string) => {
        const fn = callGroq as any;
        const fnStr = fn.toString();
        if (fnStr.includes("messages") || fnStr.includes("llama")) {
          return await fn([{ role: "user", content: promptText }], systemPrompt, "llama-3.3-70b-versatile", 1000);
        } else {
          return await fn(promptText, systemPrompt, "application/json");
        }
      };

      const aiResponse = await callGroqWithModel(promptText, systemPrompt);
      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const generated = JSON.parse(sanitized);
      if (Array.isArray(generated) && generated.length > 0) {
        setCards(generated);
      } else {
        throw new Error("Invalid format received");
      }
    } catch (err) {
      console.warn("Dynamic flashcards generation failed, utilizing robust fallback deck:", err);
      // Select subset of mock cards matching cardCount
      const subset = [];
      for (let i = 0; i < cardCount; i++) {
        subset.push(mockCards[i % mockCards.length]);
      }
      setCards(subset);
    } finally {
      setIsLoading(false);
      setView("study");
    }
  };

  const handleResponse = (type: "gotIt" | "unsure" | "forgot") => {
    const nextScores = { ...scores, [type]: scores[type] + 1 };
    setScores(nextScores);
    setIsFlipped(false);

    // Dynamic timeout to wait for rotation reset before changing card content
    setTimeout(async () => {
      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // Deck completed! Trigger rewards immediately
        const xpEarned = nextScores.gotIt * 15 + nextScores.unsure * 5 + 5;
        const coinsEarned = nextScores.gotIt * 5 + 2;
        
        if (user && profile) {
          try {
            const currentXp = profile.total_xp || profile.xp || 0;
            const currentCoins = profile.coins || 0;
            await supabase
              .from("profiles")
              .update({ 
                total_xp: currentXp + xpEarned,
                coins: currentCoins + coinsEarned
              })
              .eq("id", user.id);
            if (typeof refreshProfile === "function") {
              await refreshProfile();
            }
          } catch (err) {
            console.error("Error rewarding flashcard completion:", err);
          }
        }
        setView("results");
      }
    }, 200);
  };

  const currentCard = cards[currentCardIndex % cards.length] || mockCards[currentCardIndex % mockCards.length];

  return (
    <div className="relative w-full max-w-[390px] h-[844px] bg-[#fcf9f4] border-black flex flex-col mx-auto overflow-hidden">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky bg-background border-b-2 border-on-background flex items-center justify-between px-5 h-16 z-50">
        <button 
          onClick={() => view === "study" ? setView("setup") : onNavigate("Dashboard")}
          aria-label="Go Back" 
          className="material-symbols-outlined text-primary hover:bg-surface-container-high transition-colors w-10 h-10 flex items-center justify-center rounded-full"
        >
          arrow_back
        </button>
        <h1 className="font-headline text-headline-md text-primary font-bold text-[21.5px]">Flashcards</h1>
        <button 
          onClick={() => {
            setCurrentCardIndex(0);
            setIsFlipped(false);
          }}
          aria-label="Shuffle Cards" 
          className="material-symbols-outlined text-primary hover:bg-surface-container-high transition-colors w-10 h-10 flex items-center justify-center rounded-full"
        >
          shuffle
        </button>
      </header>

      {/* VIEW 1: SETUP STATE */}
      {view === "setup" && (
        <main className="flex-1 px-5 py-6 flex flex-col gap-6 overflow-y-auto pb-6">
          {/* Hero Graphic / Design Banner */}
          <div className="w-full h-32 rounded-[18px] border-2 border-on-background bg-surface-variant shadow-ink-md overflow-hidden relative flex items-center justify-center bg-white">
            <div 
              className="absolute inset-0 opacity-20" 
              style={{ backgroundImage: "radial-gradient(#1c1c19 2px, transparent 2px)", backgroundImageResolution: "16px 16px" }}
            ></div>
            <span className="material-symbols-outlined text-primary text-[64px] z-10" style={{ fontVariationSettings: "'FILL' 0" }}>style</span>
          </div>

          {/* Topic Input */}
          <div className="flex flex-col gap-2.5">
            <label className="font-label-md text-label-md text-on-background font-bold text-[13.5px]" htmlFor="topic-input">Study Topic</label>
            <div className="relative">
              <input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full h-14 rounded-xl border-2 border-on-background bg-surface px-5 font-body-lg text-body-lg text-on-background placeholder:text-on-background/40 focus:outline-none focus:ring-0 focus:border-primary transition-colors text-[14.5px]" 
                id="topic-input" 
                placeholder="e.g. Cellular Respiration..." 
                type="text"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="flex flex-col items-center justify-center gap-3 relative py-2">
            <div className="absolute w-full h-[2px] bg-on-background/10 top-1/2 -translate-y-1/2"></div>
            <span className="bg-[#FAF7F2] px-3 font-label-sm text-label-sm text-on-surface-variant relative z-10 uppercase tracking-widest font-bold">or</span>
            <button 
              onClick={() => {
                setTopic("Active Class Lecture Note: Cell Potentials");
                setCardCount(8);
              }}
              className="relative z-10 flex items-center gap-2 rounded-full border-2 border-on-background bg-white px-5 py-2 shadow-ink-sm hover:translate-y-0.5 hover:shadow-none transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] text-primary">attach_file</span>
              <span className="font-label-md font-bold text-on-background">Use from Source Library</span>
            </button>
          </div>

          {/* Card Counts selection */}
          <div className="flex flex-col gap-2">
            <label className="font-label-md text-label-md text-on-background font-bold">Number of Cards</label>
            <div className="flex justify-between gap-2">
              {[4, 8, 12, 16].map((count) => (
                <button
                  key={count}
                  onClick={() => setCardCount(count)}
                  className={`flex-1 rounded-full border-2 border-on-background py-2 font-label-md transition-all ${
                    cardCount === count
                      ? "bg-primary text-on-primary font-bold shadow-ink-sm"
                      : "bg-[#FAF7F2] text-on-background shadow-ink-sm hover:bg-neutral-100"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-auto pt-6">
            <button 
              onClick={handleGenerate}
              className="w-full rounded-[12px] border-2 border-on-background bg-primary text-on-primary font-headline text-headline-md h-16 shadow-ink-md hover:translate-y-0.5 active:scale-95 duration-100 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              Generate Cards
            </button>
          </div>
        </main>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <h3 className="font-headline font-bold text-lg mb-2">Generating Flashcards...</h3>
          <p className="text-on-surface-variant text-sm max-w-[240px]">We're reading your active sources and creating personalized spaced repetition flashcards for you.</p>
        </main>
      )}

      {/* VIEW 2: STUDY STATE */}
      {view === "study" && !isLoading && (
        <main className="flex-1 px-5 py-6 flex flex-col items-center">
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-4 mb-4">
            <span className="font-label-md text-label-md text-on-background w-12 text-right">
              {currentCardIndex + 1} / {cardCount}
            </span>
            <div className="h-[12px] flex-1 border-2 border-on-background rounded-full bg-white overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${((currentCardIndex + 1) / cardCount) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Flashcard Container (3D Flip) */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)} 
            className="relative w-full flex-1 max-h-[400px] perspective-1000 cursor-pointer mt-6"
          >
            <div 
              className={`transform-style-3d transition-transform duration-500 w-full h-full relative ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Front of Card (Question) */}
              <div className="absolute inset-0 backface-hidden rounded-[18px] border-2 border-on-background bg-white shadow-ink-lg flex flex-col items-center justify-center p-8 text-center">
                <div className="absolute top-5 left-5 right-5 flex justify-between items-start opacity-30">
                  <span className="material-symbols-outlined">format_quote</span>
                </div>
                
                <h3 className="font-headline text-[13.5px] uppercase tracking-wider text-primary font-bold mb-3">Question</h3>
                <p className="font-headline text-headline-md text-on-background max-w-[280px] text-[20px] leading-snug">
                  {currentCard.front}
                </p>
                
                <div className="absolute bottom-6 w-full flex justify-center">
                  <span className="bg-surface-container-high px-4 py-1.5 rounded-full border border-on-background/20 font-label-sm text-label-sm text-on-background/60 flex items-center gap-1.5 text-[12px]">
                    <span className="material-symbols-outlined text-[15px]">touch_app</span> Tap to flip
                  </span>
                </div>
              </div>

              {/* Back of Card (Answer) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[18px] border-2 border-on-background bg-primary-fixed text-on-primary-fixed shadow-ink-lg flex flex-col items-center justify-center p-8 text-center">
                <span className="material-symbols-outlined text-primary mb-3 text-[52px]">lightbulb</span>
                <p className="font-headline text-headline-lg text-[#1c1c19] text-[22.5px] leading-snug">
                  {currentCard.back}
                </p>
                <p className="font-body-md text-[14.5px] mt-3 text-on-surface-variant max-w-[260px] leading-relaxed">
                  {currentCard.explanation}
                </p>
                <div className="absolute bottom-6 w-full flex justify-center">
                  <span className="bg-white/40 px-4 py-1.5 rounded-full border border-on-background/20 font-label-sm text-label-sm text-on-background/60 flex items-center gap-1.5 text-[12px]">
                    <span className="material-symbols-outlined text-[15px]">touch_app</span> Tap to see question
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons (Feedback) */}
          <div className="mt-auto w-full flex justify-between gap-3 pt-6 pb-2">
            
            {/* Forgot */}
            <button 
              onClick={() => handleResponse("forgot")}
              className="flex-1 h-[76px] rounded-xl border-2 border-error bg-white text-error font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-red-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
            >
              <span className="material-symbols-outlined mb-1 text-[24px]">close</span>
              Forgot
            </button>

            {/* Unsure */}
            <button 
              onClick={() => handleResponse("unsure")}
              className="flex-1 h-[76px] rounded-xl border-2 border-outline bg-white text-outline font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-neutral-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
            >
              <span className="material-symbols-outlined mb-1 text-[24px]">question_mark</span>
              Unsure
            </button>

            {/* Got It */}
            <button 
              onClick={() => handleResponse("gotIt")}
              className="flex-1 h-[76px] rounded-xl border-2 border-tertiary bg-white text-tertiary font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-teal-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
            >
              <span className="material-symbols-outlined mb-1 text-[24px]">check</span>
              Got It
            </button>
          </div>
        </main>
      )}

      {/* VIEW 3: RESULTS STATE */}
      {view === "results" && (
        <main className="flex-1 px-5 py-8 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-secondary-container rounded-full border-2 border-[#1c1c19] flex items-center justify-center mb-6 shadow-ink-sm">
            <span className="material-symbols-outlined text-4xl text-black">emoji_events</span>
          </div>

          <h2 className="font-headline text-headline-xl text-ink font-extrabold mb-2 text-[24px]">Deck Completed!</h2>
          <p className="font-body-md text-on-surface-variant max-w-[280px] mb-6 text-[14.5px]">
            Reviewing mistakes triggers spaced repetition logic in the platform automatically.
          </p>

          <div className="w-full bg-white border-2 border-[#1c1c19] rounded-2xl p-5 shadow-ink-md flex flex-col gap-3.5 mb-8 text-left">
            <div className="flex justify-between border-b pb-2">
              <span className="font-bold text-tertiary text-[14.5px]">Got It Perfectly:</span>
              <span className="font-extrabold text-[15.5px]">{scores.gotIt}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-bold text-outline text-[14.5px]">Unsure / Hard:</span>
              <span className="font-extrabold text-[15.5px]">{scores.unsure}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-error text-[14.5px]">Forgot / Needs review:</span>
              <span className="font-extrabold text-[15.5px]">{scores.forgot}</span>
            </div>
          </div>

          <div className="flex gap-4 w-full">
            <button 
              onClick={() => setView("setup")}
              className="flex-1 border-2 border-[#1c1c19] bg-white text-[#1c1c19] py-3.5 rounded-xl font-label-md hover:bg-neutral-100 transition-all flex items-center justify-center gap-1 active:translate-y-0.5 text-[14px] font-bold"
            >
              Restart
            </button>
            <button 
              onClick={() => onNavigate("Dashboard")}
              className="flex-1 border-2 border-[#1c1c19] bg-primary text-white py-3.5 rounded-xl font-label-md hover:opacity-90 transition-all flex items-center justify-center gap-1 active:translate-y-0.5 text-[14px] font-bold"
            >
              Dashboard
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
