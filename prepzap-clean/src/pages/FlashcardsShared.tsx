import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";

interface Flashcard {
  front: string;
  back: string;
  explanation: string;
}

interface SharedDeck {
  id: string;
  title: string;
  cards: Flashcard[];
  card_count: number;
  created_at: string;
}

export default function FlashcardsShared() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deck, setDeck] = useState<SharedDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imported, setImported] = useState(false);
  const [importing, setImporting] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [view, setView] = useState<"study" | "results">("study");
  const [scores, setScores] = useState({ gotIt: 0, unsure: 0, forgot: 0 });

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    
    // 1. Try to load from localStorage first (Offline support)
    const cachedDeck = localStorage.getItem(`shared_deck_${id}`);
    if (cachedDeck) {
      try {
        setDeck(JSON.parse(cachedDeck));
        setLoading(false);
      } catch (e) {}
    }

    // 2. Try to fetch fresh data from Supabase
    supabase
      .from("shared_flashcard_decks")
      .select("id, title, cards, card_count, created_at")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) {
          setDeck(data as SharedDeck);
          localStorage.setItem(`shared_deck_${id}`, JSON.stringify(data));
          setNotFound(false);
        } else if (!cachedDeck) {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cachedDeck) {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [id]);

  const cards: Flashcard[] = deck?.cards ?? [];
  const currentCard = cards[currentIndex];
  const total = cards.length;

  const handleResponse = (type: "gotIt" | "unsure" | "forgot") => {
    const next = { ...scores, [type]: scores[type] + 1 };
    setScores(next);
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 < total) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setView("results");
      }
    }, 180);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setScores({ gotIt: 0, unsure: 0, forgot: 0 });
    setView("study");
  };

  const handleImportDeck = async () => {
    if (!deck || importing) return;
    setImporting(true);
    try {
      const deckId = crypto.randomUUID();
      await db.decks.add({ id: deckId, title: `${deck.title} (Shared)`, createdAt: Date.now() });
      const now = Date.now();
      for (const card of deck.cards) {
        const dexieId = crypto.randomUUID();
        await db.cards.add({
          id: dexieId,
          deckId,
          front: card.front,
          back: card.back,
          explanation: card.explanation || '',
          interval: 0,
          repetitions: 0,
          easeFactor: 2.5,
          nextReviewDate: now,
        });
      }
      setImported(true);
    } catch (e) {
      console.error("Failed to import deck to Dexie:", e);
    } finally {
      setImporting(false);
    }
  };

  // -- Loading ---------------------------------------------------------------
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-black border-t-[#CC0000] rounded-full animate-spin" />
        <p className="font-extrabold text-black/50 text-sm uppercase tracking-widest">Loading deck�</p>
      </div>
    );
  }

  // -- Not found -------------------------------------------------------------
  if (notFound || !deck) {
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="material-symbols-outlined text-[64px] text-[#CC0000]">sentiment_dissatisfied</span>
        <h1 className="text-2xl font-black text-black">Deck not found</h1>
        <p className="text-black/60 font-bold text-sm max-w-xs">
          This shared deck link may have expired or doesn't exist.
        </p>
        <button
          onClick={() => navigate(user ? "/dashboard" : "/")}
          className="px-6 py-3 bg-[#CC0000] text-white font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          {user ? "Go to Dashboard" : "Go to Studenius"}
        </button>
      </div>
    );
  }

  // -- Results ---------------------------------------------------------------
  if (view === "results") {
    const pct = Math.round((scores.gotIt / total) * 100);
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border-2 border-black shadow-[6px_6px_0px_#000] bg-white p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center">
            <span className="material-symbols-outlined text-[48px] text-[#CC0000]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {pct >= 70 ? "emoji_events" : "school"}
            </span>
            <h2 className="text-2xl font-black text-black mt-2">Session Complete!</h2>
            <p className="text-black/60 font-bold text-sm mt-1">{deck.title}</p>
          </div>

          {/* Score bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-black uppercase tracking-wider text-black/60 mb-1">
              <span>Score</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-3 bg-black/10 border border-black overflow-hidden">
              <div
                className="h-full bg-[#CC0000] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: "Got It", key: "gotIt", icon: "check_circle", color: "#22c55e" },
              { label: "Unsure", key: "unsure", icon: "help", color: "#f59e0b" },
              { label: "Forgot", key: "forgot", icon: "cancel", color: "#CC0000" },
            ] as const).map(({ label, key, icon, color }) => (
              <div key={key} className="border-2 border-black bg-[#FAF7F2] p-3 flex flex-col items-center gap-1 shadow-[3px_3px_0px_#000]">
                <span className="material-symbols-outlined text-[22px]" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                <span className="text-xl font-black text-black">{scores[key]}</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-black/50">{label}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRestart}
              className="w-full py-3 bg-[#CC0000] text-white font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Study Again
            </button>

            {user ? (
              imported ? (
                <button
                  onClick={() => navigate("/flashcards")}
                  className="w-full py-3 bg-green-600 text-white font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  Saved! Open in Flashcards
                </button>
              ) : (
                <button
                  onClick={handleImportDeck}
                  disabled={importing}
                  className="w-full py-3 bg-white text-black font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  {importing ? "Importing..." : "Save Deck to My Library"}
                </button>
              )
            ) : (
              <button
                onClick={() => navigate("/signup")}
                className="w-full py-3 bg-white text-black font-black text-sm border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                ? Create Your Own Decks on Studenius
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -- Study view ------------------------------------------------------------
  return (
    <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col text-black">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#FAF7F2] border-b-2 border-black px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-[#CC0000]" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
          <span className="font-black text-sm text-black truncate max-w-[180px] sm:max-w-xs">{deck.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-extrabold text-black/50 uppercase tracking-wider mr-1">
            {currentIndex + 1} / {total}
          </span>
          {user ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-3 py-1.5 bg-black text-white font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate("/signup")}
              className="px-3 py-1.5 bg-[#CC0000] text-white font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Try Studenius
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-black/10">
        <div
          className="h-full bg-[#CC0000] transition-all duration-300"
          style={{ width: `${((currentIndex) / total) * 100}%` }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5 max-w-lg mx-auto w-full">

        {/* Flip card */}
        <div
          onClick={() => setIsFlipped(f => !f)}
          className="w-full cursor-pointer"
          style={{ perspective: "1000px", minHeight: "320px", height: "340px" }}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 border-2 border-black bg-white shadow-[6px_6px_0px_#000] flex flex-col p-6 rounded-xl overflow-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="w-full h-full overflow-y-auto flex flex-col items-center text-center pb-12">
                <div className="m-auto flex flex-col items-center max-w-[340px]">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#CC0000] mb-3">Question</p>
                  <h3 className="text-[19px] sm:text-[21px] font-black text-black leading-snug">{currentCard.front}</h3>
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-[#FAF7F2] border border-black/20 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-black/60 flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[15px]">touch_app</span> Tap to flip
                </span>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 border-2 border-black bg-[#F0EDE0] shadow-[6px_6px_0px_#000] flex flex-col p-6 rounded-xl overflow-hidden"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="w-full h-full overflow-y-auto flex flex-col items-center text-center pb-12">
                <div className="m-auto flex flex-col items-center max-w-[340px]">
                  <span className="material-symbols-outlined text-[32px] text-black mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  <p className="text-[18px] sm:text-[20px] font-black text-black leading-snug mb-2">{currentCard.back}</p>
                  {currentCard.explanation && (
                    <p className="text-[13px] font-bold text-black/70 leading-relaxed">{currentCard.explanation}</p>
                  )}
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                <span className="bg-white/80 border border-black/20 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-black/60 flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[15px]">touch_app</span> Tap to see question
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* User import shortcut if logged in */}
        {user && (
          <div className="w-full flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); handleImportDeck(); }}
              disabled={imported || importing}
              className={`text-[12px] font-extrabold flex items-center gap-1.5 px-3 py-1 border-2 border-black shadow-[2px_2px_0px_#000] transition-all ${imported ? "bg-green-100 text-green-800" : "bg-white text-black hover:bg-black hover:text-white"}`}
            >
              <span className="material-symbols-outlined text-[15px]">{imported ? "check" : "bookmark"}</span>
              {imported ? "Deck Saved in Your Library" : "Save to My Decks"}
            </button>
          </div>
        )}

        {/* Response buttons � only show after flip */}
        {isFlipped ? (
          <div className="w-full grid grid-cols-3 gap-3">
            {([
              { type: "gotIt" as const, label: "Got It", icon: "check_circle", bg: "bg-[#22c55e]", text: "text-white" },
              { type: "unsure" as const, label: "Unsure", icon: "help", bg: "bg-[#f59e0b]", text: "text-white" },
              { type: "forgot" as const, label: "Forgot", icon: "cancel", bg: "bg-[#CC0000]", text: "text-white" },
            ]).map(({ type, label, icon, bg, text }) => (
              <button
                key={type}
                onClick={() => handleResponse(type)}
                className={`flex flex-col items-center gap-1 py-3 border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-black text-[11px] uppercase tracking-wider ${bg} ${text}`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs font-extrabold text-black/40 uppercase tracking-widest text-center">
            Tap card to reveal answer
          </p>
        )}

        {/* Score tally */}
        <div className="flex gap-4 text-xs font-extrabold uppercase tracking-wider text-black/40">
          <span>? {scores.gotIt}</span>
          <span>? {scores.unsure}</span>
          <span>? {scores.forgot}</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t-2 border-black bg-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm mt-auto">
        <p className="font-bold text-black/60 text-center sm:text-left">
          Shared via <span className="text-[#CC0000] font-black">Studenius</span> � AI study tools for students
        </p>
        {user ? (
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2 bg-black text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all shrink-0"
          >
            Open Studenius App ?
          </button>
        ) : (
          <button
            onClick={() => navigate("/signup")}
            className="px-5 py-2 bg-[#CC0000] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all shrink-0"
          >
            Create Free Account ?
          </button>
        )}
      </div>
    </div>
  );
}
