import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { callGroq } from "@/lib/groq";
import { loadContext, loadLibrary, buildAIContext, getActiveSource } from "@/lib/sourceContext";
import { useToolHistory } from "@/pages/ToolHistory";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";

interface Flashcard {
  front: string;
  back: string;
  explanation: string;
}

interface FlashcardsProps {
}

interface DesktopFlashcardProps {
  currentCard: FlashCard;
  isFlipped: boolean;
  setIsFlipped: (v: boolean) => void;
}

function DesktopFlashcard({ currentCard, isFlipped, setIsFlipped }: DesktopFlashcardProps) {
  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      className="relative w-full cursor-pointer"
      style={{ perspective: "1000px", height: "340px" }}
    >
      <div
        className="transition-transform duration-500 w-full h-full relative"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0 border-2 border-black bg-white shadow-[5px_5px_0px_#000] flex flex-col items-center justify-center p-10 text-center rounded-xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="absolute top-5 left-5 opacity-20">
            <span className="material-symbols-outlined">style</span>
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-black/40 mb-4">Question</p>
          <h3 className="text-[22px] font-black leading-snug max-w-[480px]">{currentCard.front}</h3>
          <div className="absolute bottom-5 flex items-center gap-1.5 text-black/30">
            <span className="material-symbols-outlined text-[16px]">touch_app</span>
            <span className="text-[12px] font-bold uppercase tracking-wider">Click to flip</span>
          </div>
        </div>
        <div
          className="absolute inset-0 border-2 border-black bg-[#F0EDE0] shadow-[5px_5px_0px_#000] flex flex-col items-center justify-center p-10 text-center rounded-xl"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="material-symbols-outlined text-black text-[40px] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
          <p className="text-[24px] font-black leading-snug mb-3">{currentCard.back}</p>
          <p className="text-[14px] font-bold text-black/60 max-w-[400px] leading-relaxed">{currentCard.explanation}</p>
          <div className="absolute bottom-5 flex items-center gap-1.5 text-black/30">
            <span className="material-symbols-outlined text-[16px]">touch_app</span>
            <span className="text-[12px] font-bold uppercase tracking-wider">Click to see question</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Flashcards() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth() as any;
  const { save: saveHistory, history: deckHistory } = useToolHistory("flashcards");
  const { isPro, canUse, remaining, logUsage } = usePlan();
  const [view, setView] = useState<"setup" | "study" | "results">("setup");
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState(8);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeSourceObj, setActiveSourceObj] = useState<any>(null);
  const [libraryFiles, setLibraryFiles] = useState<any[]>([]);

  // Freemium state
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Share state
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    remaining("flashcard_gen").then(setRemainingUses);
  }, [remaining]);

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
      setActiveSourceObj(active);
    }
    const lib = loadLibrary();
    setLibraryFiles(lib || []);
  }, []);

  const handleSelectSource = (file: any) => {
    setActiveSourceObj(file);
    setTopic(`Active Source: ${file.name}`);
  };

  const handleClearSource = () => {
    setActiveSourceObj(null);
    setTopic("");
  };

  // ── Share deck to Supabase ───────────────────────────────────────────────────
  const handleShareDeck = async () => {
    if (!cards.length) return;
    setShareLoading(true);
    try {
      const deckLabel = activeSourceObj
        ? activeSourceObj.name.replace(/\.[^.]+$/, "")
        : (topic || "General Study");

      const { data, error } = await supabase
        .from("shared_flashcard_decks")
        .insert({
          title: deckLabel,
          cards: cards,
          created_by: user?.id ?? null,
          card_count: cards.length,
        })
        .select("id")
        .single();

      if (error || !data) throw error;

      const url = `${window.location.origin}/flashcards/shared/${data.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } catch (err) {
      console.error("Share failed:", err);
    }
    setShareLoading(false);
  };

  const handleGenerate = async () => {
    // Freemium gate
    if (!isPro) {
      const allowed = await canUse("flashcard_gen");
      if (!allowed) {
        setShowUpgrade(true);
        return;
      }
    }

    setIsLoading(true);
    setScores({ gotIt: 0, unsure: 0, forgot: 0 });
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShareUrl(null);

    let generatedCards: Flashcard[] = [];

    try {
      const sourceContextText = buildAIContext();
      const deckLabel = activeSourceObj ? activeSourceObj.name.replace(/\.[^.]+$/, "") : (topic || "General Study");

      const promptText = `Generate ${cardCount} highly educational study flashcards about "${deckLabel}".
${sourceContextText ? `Utilize the following material context to generate highly specific custom flashcards:\n${sourceContextText}` : ""}

Return strictly a valid raw JSON array containing exactly ${cardCount} objects. Each object must have fields:
"front" (string, the question/concept front),
"back" (string, the core answer/fact back),
"explanation" (string, detailed memory cue / educational backup).

Only return the raw system valid JSON array. No markdown codeblocks, no explanations, no prefix or suffix!`;

      const systemPrompt = "You are an elite educational science system that outputs only raw JSON content arrays matching schemas. Do not write any markdown codeblocks or non-JSON text.";

      const aiResponse = await callGroq(
        [{ role: "user", content: promptText }],
        systemPrompt,
        "llama-3.3-70b-versatile",
        2048,
        "flashcard_gen"
      );

      let sanitized = aiResponse.trim();
      if (sanitized.startsWith("```")) {
        sanitized = sanitized.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        generatedCards = parsed;
      } else {
        throw new Error("Invalid format received");
      }
    } catch (err) {
      console.warn("Flashcard generation failed, using fallback deck:", err);
      generatedCards = [];
      for (let i = 0; i < cardCount; i++) {
        generatedCards.push(mockCards[i % mockCards.length]);
      }
    }

    // ── Log usage ───────────────────────────────────────────────────────────
    if (!isPro) {
      try {
        await logUsage("flashcard_gen");
      } catch (e) {
        console.warn("Usage log failed:", e);
      }
      remaining("flashcard_gen").then(setRemainingUses);
    }

    // ── Save to Supabase history (cross-device) ──────────────────────────────
    const deckLabel2 = activeSourceObj ? activeSourceObj.name.replace(/\.[^.]+$/, "") : (topic || "General Study");
    if (user) {
      try {
        await supabase.from("tool_history").insert({
          user_id: user.id,
          tool: "flashcards",
          prompt: deckLabel2,
          preview: `${generatedCards.length} cards`,
          output: deckLabel2,
          model: "rex-ai",
          meta: `${generatedCards.length} cards generated`,
        });
      } catch (e) {
        console.warn("History save failed:", e);
      }
    }
    saveHistory({
      prompt: deckLabel2,
      preview: `${generatedCards.length} cards`,
      output: deckLabel2,
      model: "rex-ai",
      meta: `${generatedCards.length} cards generated`,
    });

    setCards(generatedCards);
    setIsLoading(false);
    setView("study");
  };

  const handleResponse = (type: "gotIt" | "unsure" | "forgot") => {
    const nextScores = { ...scores, [type]: scores[type] + 1 };
    setScores(nextScores);
    setIsFlipped(false);

    setTimeout(async () => {
      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
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
        const deckLabel = activeSourceObj ? activeSourceObj.name.replace(/\.[^.]+$/, "") : (topic || "General Study");
        saveHistory({ prompt: deckLabel, preview: `${cards.length} cards`, output: deckLabel, model: "rex-ai", meta: `${nextScores.gotIt} got it / ${nextScores.forgot} forgot` });
      }
    }, 200);
  };

  const currentCard = cards[currentCardIndex % cards.length] || mockCards[currentCardIndex % mockCards.length];

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      {/* ── Share Toast ─────────────────────────────────────────────────────── */}
      {showShareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-black text-white px-5 py-3 border-2 border-black shadow-[4px_4px_0px_#ae2925] font-bold text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Link copied! Share it with anyone.
        </div>
      )}

      {/* ── Mobile History Drawer ──────────────────────────────────────── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="w-[85vw] max-w-[340px] bg-white border-l-2 border-black flex flex-col h-full shadow-[-4px_0_0_#000]">
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">history</span>
                <h3 className="text-[16px] font-extrabold">Recent Decks</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col divide-y-2 divide-black/10">
              {!deckHistory || deckHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center opacity-40 px-4">
                  <span className="material-symbols-outlined text-[32px]">style</span>
                  <p className="text-[12px] font-bold">No decks yet.<br/>Generate your first one!</p>
                </div>
              ) : (deckHistory as any[]).slice(0, 20).map((item: any) => (
                <button key={item.id ?? item.timestamp}
                  onClick={() => { setActiveSourceObj(null); setTopic(item.prompt ?? ""); setShowHistory(false); }}
                  className="w-full text-left p-4 hover:bg-[#FAF7F2] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-[13px] font-extrabold leading-tight line-clamp-2 flex-1">
                      {item.prompt ?? item.output ?? "Untitled Deck"}
                    </h4>
                    <span className="material-symbols-outlined text-[#FF4D2E] text-[16px] shrink-0">style</span>
                  </div>
                  <p className="text-[11px] font-bold text-black/40">{item.meta ?? item.preview ?? "Flashcard deck"}</p>
                  {(item.createdAt || item.created_at) && (
                    <p className="text-[10px] text-black/30 font-bold mt-0.5">
                      {(() => {
                        const d = Math.floor((Date.now() - new Date(item.createdAt || item.created_at).getTime()) / 86400000);
                        return d === 0 ? "Today" : d === 1 ? "Yesterday" : d + "d ago";
                      })()}
                    </p>
                  )}
                </button>
              ))}
            </div>
            {deckHistory && deckHistory.length > 0 && (
              <div className="px-4 py-3 border-t-2 border-black shrink-0">
                <button onClick={() => { navigate("/analytics"); setShowHistory(false); }}
                  className="w-full py-2 border-2 border-black bg-[#F0EDE0] text-[12px] font-extrabold hover:bg-black hover:text-white transition-colors">
                  View All in Analytics →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showUpgrade && (
        <UpgradePrompt
          feature="flashcard_gen"
          remaining={remainingUses}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      <SharedSidebar active="/flashcards" />

      {/* ══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ══════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:ml-64 flex-col" style={{ height: "100vh" }}>
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel: generate form + source library */}
          <div className="w-80 border-r-2 border-black bg-[#FAF7F2] flex flex-col overflow-y-auto shrink-0">
            <div className="p-6 border-b-2 border-black">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF4D2E] mb-1">Active Session</p>
              <h2 className="text-[22px] font-black leading-tight">
                {activeSourceObj ? activeSourceObj.name.replace(/\.[^.]+$/, "") : topic || "New AI Deck"}
              </h2>
            </div>

            {/* Generate Form */}
            <div className="p-6 border-b-2 border-black flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-2">Topic or Concept</label>
                <input
                  value={activeSourceObj ? "" : topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={!!activeSourceObj}
                  className="w-full px-4 py-3 border-2 border-black bg-white text-[14px] font-bold placeholder:text-black/30 focus:outline-none shadow-[2px_2px_0px_#000] disabled:opacity-40 disabled:cursor-not-allowed"
                  placeholder="e.g. Nucleophilic Substitution"
                />
              </div>

              {activeSourceObj && (
                <div className="flex items-center gap-2 bg-[#F0EDE0] border-2 border-black px-3 py-2 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[16px]">attach_file</span>
                  <span className="text-[12px] font-extrabold truncate flex-1">{activeSourceObj.name}</span>
                  <button onClick={handleClearSource} className="hover:bg-black/10 rounded p-0.5">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider mb-2">Card Count</label>
                <div className="flex gap-2">
                  {[4, 8, 12, 16].map((count) => (
                    <button
                      key={count}
                      onClick={() => setCardCount(count)}
                      className={`flex-1 py-2 border-2 border-black text-[13px] font-extrabold transition-all ${
                        cardCount === count
                          ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                          : "bg-white text-black hover:bg-[#E2E2E2]"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-4 bg-black text-white border-2 border-black font-extrabold text-[15px] shadow-[4px_4px_0px_#FF4D2E] hover:opacity-90 transition-all flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    Generate Deck
                  </>
                )}
              </button>
              {!isPro && remainingUses !== null && (
                <p className="text-center text-[12px] text-black/50 font-bold mt-1">
                  {remainingUses} generation{remainingUses !== 1 ? "s" : ""} left today
                </p>
              )}
              {!isPro && remainingUses !== null && remainingUses <= 2 && remainingUses > 0 && (
                <div className="flex justify-center mt-1">
                  <SoftWarning feature="flashcard_gen" remaining={remainingUses} />
                </div>
              )}
            </div>

            {/* Source Library Picker */}
            <div className="p-6 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider">Your Sources</h3>
                <button
                  onClick={() => navigate("/sources")}
                  className="text-[11px] font-extrabold text-[#FF4D2E] hover:underline"
                >
                  Manage
                </button>
              </div>

              {libraryFiles.length === 0 ? (
                <button
                  onClick={() => navigate("/sources")}
                  className="w-full border-2 border-dashed border-black/30 py-6 flex flex-col items-center justify-center gap-2 text-black/40 hover:border-black hover:text-black transition-all"
                >
                  <span className="material-symbols-outlined text-[24px]">add</span>
                  <span className="text-[12px] font-extrabold">Add sources to library</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {libraryFiles.map((file: any) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectSource(file)}
                      className={`flex items-center gap-3 px-3 py-2.5 border-2 border-black text-left transition-all ${
                        activeSourceObj?.id === file.id
                          ? "bg-black text-white shadow-[2px_2px_0px_#FF4D2E]"
                          : "bg-white hover:bg-[#F0EDE0] shadow-[2px_2px_0px_#000]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        {file.type === "image" ? "image" : "description"}
                      </span>
                      <span className="text-[12px] font-extrabold truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Daily Goal */}
              <div className="mt-auto bg-[#F0EDE0] border-2 border-black p-4 shadow-[3px_3px_0px_#000] flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF4D2E] border-2 border-black flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[18px]">auto_awesome</span>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider">Daily Goal</p>
                  <p className="text-[13px] font-bold">{scores.gotIt} Got It this session</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center: active study area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Header */}
            <header className="flex items-center justify-between px-8 py-5 border-b-2 border-black shrink-0">
              <div className="flex items-center gap-3">
                {view === "study" && (
                  <button
                    onClick={() => setView("setup")}
                    className="w-9 h-9 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  </button>
                )}
                <h1 className="text-[20px] font-black">Flashcards</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                {/* Share button — desktop */}
                {view === "study" && cards.length > 0 && (
                  <button
                    onClick={handleShareDeck}
                    disabled={shareLoading}
                    className="p-2 border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] transition-colors flex items-center gap-1.5 px-3"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    <span className="text-[12px] font-extrabold">{shareLoading ? "Sharing..." : "Share"}</span>
                  </button>
                )}
              </div>
            </header>

            {/* Setup view */}
            {view === "setup" && !isLoading && (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
                  <div className="w-24 h-24 border-2 border-black bg-[#E2E2E2] flex items-center justify-center shadow-[4px_4px_0px_#000]">
                    <span className="material-symbols-outlined text-[48px]">style</span>
                  </div>
                  <div>
                    <h2 className="text-[28px] font-black mb-2">Ready to Study?</h2>
                    <p className="text-[14px] font-bold text-black/50">
                      {activeSourceObj
                        ? `Source "${activeSourceObj.name}" selected. Set your card count and generate.`
                        : "Enter a topic or pick a source from the left panel, then hit Generate."}
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="w-full py-4 bg-black text-white border-2 border-black font-extrabold text-[16px] shadow-[4px_4px_0px_#FF4D2E] hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    Generate {cardCount} Cards
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 border-4 border-black border-t-[#FF4D2E] rounded-full animate-spin" />
                <h3 className="text-[18px] font-black">Generating Flashcards...</h3>
                <p className="text-[13px] font-bold text-black/50 max-w-[300px] text-center">
                  Reading your sources and crafting personalized spaced-repetition cards.
                </p>
              </div>
            )}

            {/* Study view */}
            {view === "study" && !isLoading && (
              <div className="flex-1 flex flex-col p-8 gap-6 overflow-y-auto">
                {/* Progress */}
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-extrabold w-16 text-right">{currentCardIndex + 1} / {cards.length}</span>
                  <div className="flex-1 h-3 border-2 border-black bg-white overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-300"
                      style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-3 text-[12px] font-extrabold">
                    <span className="text-green-600">✓ {scores.gotIt}</span>
                    <span className="text-black/40">? {scores.unsure}</span>
                    <span className="text-[#FF4D2E]">✗ {scores.forgot}</span>
                  </div>
                </div>

                {/* Card */}
                <DesktopFlashcard currentCard={currentCard} isFlipped={isFlipped} setIsFlipped={setIsFlipped} />

                {/* Response buttons */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleResponse("forgot")}
                    className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-red-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[#FF4D2E] text-[28px]">sentiment_very_dissatisfied</span>
                    <span className="text-[13px] font-extrabold uppercase">Forgot</span>
                  </button>
                  <button
                    onClick={() => handleResponse("unsure")}
                    className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-yellow-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[#F5A623] text-[28px]">sentiment_neutral</span>
                    <span className="text-[13px] font-extrabold uppercase">Unsure</span>
                  </button>
                  <button
                    onClick={() => handleResponse("gotIt")}
                    className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-green-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-green-600 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>sentiment_very_satisfied</span>
                    <span className="text-[13px] font-extrabold uppercase">Got It</span>
                  </button>
                </div>
              </div>
            )}

            {/* Results view */}
            {view === "results" && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 gap-6">
                <div className="w-20 h-20 bg-[#F5A623] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_#000]">
                  <span className="material-symbols-outlined text-white text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                </div>
                <div className="text-center">
                  <h2 className="text-[32px] font-black mb-2">Deck Completed!</h2>
                  <p className="text-[14px] font-bold text-black/50">Spaced repetition logic has been updated based on your responses.</p>
                </div>
                <div className="w-full max-w-md border-2 border-black bg-white shadow-[4px_4px_0px_#000] divide-y-2 divide-black">
                  <div className="flex justify-between items-center px-6 py-4">
                    <span className="text-[14px] font-extrabold text-green-600">Got It Perfectly</span>
                    <span className="text-[20px] font-black">{scores.gotIt}</span>
                  </div>
                  <div className="flex justify-between items-center px-6 py-4">
                    <span className="text-[14px] font-extrabold text-[#F5A623]">Unsure / Hard</span>
                    <span className="text-[20px] font-black">{scores.unsure}</span>
                  </div>
                  <div className="flex justify-between items-center px-6 py-4">
                    <span className="text-[14px] font-extrabold text-[#FF4D2E]">Forgot / Needs Review</span>
                    <span className="text-[20px] font-black">{scores.forgot}</span>
                  </div>
                </div>
                <div className="flex gap-4 w-full max-w-md">
                  <button
                    onClick={() => setView("setup")}
                    className="flex-1 py-4 border-2 border-black bg-white font-extrabold text-[15px] shadow-[3px_3px_0px_#000] hover:bg-[#E2E2E2] transition-all"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="flex-1 py-4 border-2 border-black bg-black text-white font-extrabold text-[15px] shadow-[3px_3px_0px_#FF4D2E] hover:opacity-90 transition-all"
                  >
                    Dashboard
                  </button>
                </div>
                {/* Share from results */}
                <button
                  onClick={handleShareDeck}
                  disabled={shareLoading}
                  className="flex items-center gap-2 border-2 border-black bg-white px-5 py-3 font-extrabold text-[13px] shadow-[3px_3px_0px_#000] hover:bg-[#F0EDE0] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">share</span>
                  {shareLoading ? "Creating link..." : shareUrl ? "Copy link again" : "Share this deck"}
                </button>
              </div>
            )}
          </div>

          {/* Right panel: recent decks */}
          <div className="w-72 border-l-2 border-black bg-white flex flex-col overflow-y-auto shrink-0">
            <div className="p-5 border-b-2 border-black flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">history</span>
              <h3 className="text-[16px] font-extrabold">Recent Decks</h3>
            </div>

            <div className="flex flex-col divide-y-2 divide-black/10 flex-1">
              {!deckHistory || deckHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center opacity-40 flex-1">
                  <span className="material-symbols-outlined text-[32px]">history</span>
                  <p className="text-[12px] font-bold">No decks yet. Generate your first one!</p>
                </div>
              ) : deckHistory.slice(0, 8).map((item: any) => (
                <div key={item.id ?? item.timestamp} className="p-4 hover:bg-[#FAF7F2] transition-colors cursor-pointer group"
                  onClick={() => { setActiveSourceObj(null); setTopic(item.prompt ?? item.output ?? ""); }}>
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-[13px] font-extrabold leading-tight truncate">{item.prompt ?? item.output ?? "Untitled Deck"}</h4>
                    <span className="material-symbols-outlined text-[16px] text-black/20 group-hover:text-black transition-colors">more_vert</span>
                  </div>
                  <p className="text-[11px] font-bold text-black/40 mb-1">{item.meta ?? item.preview ?? "Flashcard deck"}</p>
                </div>
              ))}
            </div>

            {/* Stats mini card */}
            <div className="m-4 p-4 bg-black text-white border-2 border-black shadow-[3px_3px_0px_#FF4D2E]">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#F5A623]">Session Score</p>
                <span className="material-symbols-outlined text-[18px]">monitoring</span>
              </div>
              <p className="text-[32px] font-black leading-none mb-1">{scores.gotIt + scores.unsure + scores.forgot || "—"}</p>
              <p className="text-[12px] font-bold text-white/50">Cards reviewed this session</p>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MOBILE LAYOUT
          ══════════════════════════════════════════════════ */}
      <div className="md:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ minHeight: "100dvh" }}>
        <div className="w-full min-h-full bg-[#fcf9f4] flex flex-col flex-1 overflow-hidden">

          {/* TopAppBar */}
          <header className="w-full top-0 sticky bg-background border-b-2 border-on-background flex items-center justify-between px-5 h-16 z-50">
            <button
              onClick={() => view === "study" ? setView("setup") : navigate(-1)}
              aria-label="Go Back"
              className="material-symbols-outlined text-primary hover:bg-surface-container-high transition-colors w-10 h-10 flex items-center justify-center rounded-full"
            >
              arrow_back
            </button>
            <h1 className="font-headline text-headline-md text-primary font-bold text-[21.5px]">Flashcards</h1>
            <div className="flex items-center gap-2">
              {/* History button — mobile */}
              <button
                onClick={() => setShowHistory(true)}
                aria-label="History"
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#ebe8e3] transition-colors border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                <span className="material-symbols-outlined text-[#1A1A1A] text-[18px]">history</span>
              </button>
              {/* Source Library button */}
              <button
                onClick={() => navigate("/sources")}
                aria-label="Source Library"
                title="Source Library"
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#ebe8e3] transition-colors border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              >
                <span className="material-symbols-outlined text-[#1A1A1A] text-[18px]">library_books</span>
              </button>
            </div>
          </header>

          {/* VIEW 1: SETUP STATE */}
          {view === "setup" && (
            <main className="flex-1 px-5 py-6 flex flex-col gap-6 overflow-y-auto pb-8">
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
                  onClick={() => navigate("/sources")}
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

              {/* Daily usage counter — mobile */}
              {!isPro && remainingUses !== null && (
                <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#ae2925]">bolt</span>
                    <span className="text-[13px] font-extrabold text-black">Daily Generations</span>
                  </div>
                  <span className={`text-[13px] font-black ${remainingUses <= 2 ? "text-[#ae2925]" : "text-black"}`}>
                    {remainingUses} left today
                  </span>
                </div>
              )}

              {/* Generate Button — inside scroll, not fixed */}
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full rounded-[12px] border-2 border-on-background bg-primary text-on-primary font-headline text-headline-md h-16 shadow-ink-md hover:translate-y-0.5 active:scale-95 duration-100 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Generate Cards
                  </>
                )}
              </button>

              {/* Recent Sources — Mobile */}
              {libraryFiles.length > 0 && (
                <div className="border-2 border-black bg-white shadow-[3px_3px_0px_#000]">
                  <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-black">
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    <h3 className="text-[14px] font-extrabold">Your Sources</h3>
                  </div>
                  <div className="flex flex-col divide-y divide-black/10">
                    {libraryFiles.slice(0, 3).map((file: any) => (
                      <button key={file.id} onClick={() => handleSelectSource(file)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors w-full text-left">
                        <span className="material-symbols-outlined text-[18px] shrink-0">description</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-extrabold truncate">{file.name}</p>
                          <p className="text-[11px] font-bold text-black/40">Tap to use as source</p>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-black/20">chevron_right</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              {/* Progress Bar + Question Counter */}
              <div className="w-full flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[14px] text-[#ae2925]">style</span>
                  <span className="text-[12px] font-black">Card {currentCardIndex + 1} / {cards.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-3 text-[12px] font-extrabold">
                    <span className="text-green-600">✓ {scores.gotIt}</span>
                    <span className="text-black/40">? {scores.unsure}</span>
                    <span className="text-[#FF4D2E]">✗ {scores.forgot}</span>
                  </div>
                  {/* Share button — mobile study */}
                  <button
                    onClick={handleShareDeck}
                    disabled={shareLoading}
                    className="flex items-center justify-center w-8 h-8 border-2 border-black bg-white shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">share</span>
                  </button>
                </div>
              </div>
              <div className="w-full flex items-center gap-4 mb-4">
                <span className="font-label-md text-label-md text-on-background w-12 text-right">
                  {currentCardIndex + 1} / {cards.length}
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
                className="relative w-full flex-1 max-h-[400px] cursor-pointer mt-6"
                style={{ perspective: "1000px" }}
              >
                <div
                  className="transition-transform duration-500 w-full h-full relative"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* Front of Card (Question) */}
                  <div className="absolute inset-0 rounded-[18px] border-2 border-on-background bg-white shadow-ink-lg flex flex-col items-center justify-center p-8 text-center"
                    style={{ backfaceVisibility: "hidden" }}>
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
                  <div className="absolute inset-0 rounded-[18px] border-2 border-on-background bg-primary-fixed text-on-primary-fixed shadow-ink-lg flex flex-col items-center justify-center p-8 text-center"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
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
                <button
                  onClick={() => handleResponse("forgot")}
                  className="flex-1 h-[76px] rounded-xl border-2 border-error bg-white text-error font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-red-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
                >
                  <span className="material-symbols-outlined mb-1 text-[24px]">close</span>
                  Forgot
                </button>
                <button
                  onClick={() => handleResponse("unsure")}
                  className="flex-1 h-[76px] rounded-xl border-2 border-outline bg-white text-outline font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-neutral-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
                >
                  <span className="material-symbols-outlined mb-1 text-[24px]">question_mark</span>
                  Unsure
                </button>
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
              <div className="w-full bg-white border-2 border-[#1c1c19] rounded-2xl p-5 shadow-ink-md flex flex-col gap-3.5 mb-6 text-left">
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

              {/* Share deck button — mobile results */}
              <button
                onClick={handleShareDeck}
                disabled={shareLoading}
                className="w-full mb-4 flex items-center justify-center gap-2 border-2 border-[#1c1c19] bg-white py-3.5 rounded-xl font-bold text-[14px] shadow-ink-sm active:translate-y-0.5 active:shadow-none transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                {shareLoading ? "Creating link..." : shareUrl ? "Copy link again" : "Share this deck"}
              </button>

              <div className="flex gap-4 w-full">
                <button
                  onClick={() => setView("setup")}
                  className="flex-1 border-2 border-[#1c1c19] bg-white text-[#1c1c19] py-3.5 rounded-xl font-label-md hover:bg-neutral-100 transition-all flex items-center justify-center gap-1 active:translate-y-0.5 text-[14px] font-bold"
                >
                  Restart
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 border-2 border-[#1c1c19] bg-primary text-white py-3.5 rounded-xl font-label-md hover:opacity-90 transition-all flex items-center justify-center gap-1 active:translate-y-0.5 text-[14px] font-bold"
                >
                  Dashboard
                </button>
              </div>
            </main>
          )}

        </div>
      </div>

    </div>
  );
}
