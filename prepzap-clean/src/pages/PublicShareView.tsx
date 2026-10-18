import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSharedMaterial, cloneSharedMaterial, SharedMaterial } from "@/lib/shareService";
import { useAuth } from "@/contexts/AuthContext";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";

export default function PublicShareView() {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [material, setMaterial] = useState<SharedMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);

  // Flashcards preview state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let isSubscribed = true;

    async function load() {
      setLoading(true);
      const data = await getSharedMaterial(slug!);
      if (isSubscribed) {
        setMaterial(data);
        setLoading(false);
      }
    }

    load();
    return () => {
      isSubscribed = false;
    };
  }, [slug]);

  const handleClone = async () => {
    if (!material) return;
    playPop();

    if (!user) {
      // Guest: save pending clone to sessionStorage and redirect to auth
      sessionStorage.setItem("pz_pending_clone", JSON.stringify({ slug: material.share_slug, type: material.item_type }));
      toast.info("Create a free account or log in to clone this study material!");
      navigate(`/auth?redirect=/share/${material.item_type}/${material.share_slug}`);
      return;
    }

    setCloning(true);
    const result = await cloneSharedMaterial(material);
    setCloning(false);

    if (result.success) {
      playSuccess();
      toast.success(result.message);
      navigate(result.targetUrl);
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl border-3 border-black bg-[#FFD13B] animate-spin flex items-center justify-center shadow-[3px_3px_0px_#000]">
          <span className="material-symbols-outlined text-[24px]">sync</span>
        </div>
        <p className="text-[13px] font-black text-black mt-4">Loading shared study material...</p>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 text-center">
        <div className="border-3 border-black bg-white rounded-3xl p-8 max-w-md w-full shadow-[5px_5px_0px_#000] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-black flex items-center justify-center mx-auto text-rose-600 shadow-xs">
            <span className="material-symbols-outlined text-[30px]">search_off</span>
          </div>
          <h2 className="text-[20px] font-black text-black">Study Material Not Found</h2>
          <p className="text-[13px] font-medium text-black/60 leading-relaxed">
            This shared link may have expired or was removed by its author.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-5 py-2.5 bg-black text-white border-2 border-black rounded-xl font-black text-[13px] hover:bg-[#FF4D2E] transition-colors cursor-pointer shadow-xs"
          >
            Go to Studenius Home
          </button>
        </div>
      </div>
    );
  }

  // Cards derivation for flashcards
  const cards: any[] = Array.isArray(material.payload?.cards)
    ? material.payload.cards
    : Array.isArray(material.payload)
    ? material.payload
    : [];

  const currentCard = cards[currentCardIndex];

  // Questions derivation for quiz
  const questions: any[] = Array.isArray(material.payload?.questions)
    ? material.payload.questions
    : Array.isArray(material.payload)
    ? material.payload
    : [];

  return (
    <div className="w-full min-h-screen bg-[#FAF7F2] flex flex-col font-body-md text-black">
      {/* Top Public Bar */}
      <header className="h-16 w-full px-4 sm:px-8 border-b-2 border-black bg-white flex items-center justify-between sticky top-0 z-40">
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="text-[20px] font-black tracking-tight text-black">STUDENIUS</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D2E]" />
          <span className="hidden sm:inline-block text-[11px] font-black uppercase text-black/45 ml-1 bg-black/5 px-2 py-0.5 rounded-full border border-black/10">
            Shared Material
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={cloning}
            onClick={handleClone}
            className="px-4 py-2 bg-[#10B981] hover:bg-black hover:text-white text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            <span>{cloning ? "Cloning..." : user ? "Clone to Workspace" : "Clone Free"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Material Meta Card */}
        <div className="border-3 border-black rounded-3xl bg-white p-6 md:p-8 shadow-[4px_4px_0px_#1A1A1A] space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full border border-black/20 bg-[#FFE566] text-black font-black text-[11px] uppercase tracking-wider">
              {material.subject}
            </span>
            <div className="text-[12px] font-bold text-black/50 flex items-center gap-1.5">
              <span>Shared by</span>
              <strong className="text-black font-black">{material.creator_name}</strong>
              {material.creator_code && (
                <span className="font-mono text-[11px] text-black/40">({material.creator_code})</span>
              )}
            </div>
          </div>

          <h1 className="text-[26px] md:text-[34px] font-black text-black leading-tight">
            {material.title}
          </h1>

          <div className="flex items-center gap-4 text-[12px] font-extrabold text-black/60 pt-1 border-t border-black/10">
            <span className="capitalize">{material.item_type} Resource</span>
            <span>&bull;</span>
            <span>{material.view_count || 0} Views</span>
            <span>&bull;</span>
            <span>{material.clone_count || 0} Clones</span>
          </div>
        </div>

        {/* ── PREVIEW: GUIDE / NOTES ── */}
        {material.item_type === "guide" && (
          <div className="border-2 border-black rounded-2xl bg-white p-6 md:p-8 shadow-[3px_3px_0px_#1A1A1A] space-y-4 leading-relaxed">
            <div className="prose max-w-none text-black text-[15px] font-medium whitespace-pre-wrap">
              {typeof material.payload === "string"
                ? material.payload
                : (material.payload?.content || JSON.stringify(material.payload, null, 2))}
            </div>
          </div>
        )}

        {/* ── PREVIEW: FLASHCARDS ── */}
        {material.item_type === "flashcards" && cards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black uppercase text-black/60">
                Card {currentCardIndex + 1} of {cards.length} (Click card to flip)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentCardIndex === 0}
                  onClick={() => {
                    playTap();
                    setIsFlipped(false);
                    setCurrentCardIndex((c) => Math.max(0, c - 1));
                  }}
                  className="w-8 h-8 rounded-lg border-2 border-black bg-white disabled:opacity-30 flex items-center justify-center font-black cursor-pointer shadow-xs"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  disabled={currentCardIndex === cards.length - 1}
                  onClick={() => {
                    playTap();
                    setIsFlipped(false);
                    setCurrentCardIndex((c) => Math.min(cards.length - 1, c + 1));
                  }}
                  className="w-8 h-8 rounded-lg border-2 border-black bg-white disabled:opacity-30 flex items-center justify-center font-black cursor-pointer shadow-xs"
                >
                  &rarr;
                </button>
              </div>
            </div>

            {/* Interactive Flipper */}
            <div
              onClick={() => {
                playPop();
                setIsFlipped((f) => !f);
              }}
              className="min-h-[260px] md:min-h-[320px] border-3 border-black rounded-3xl p-8 bg-white hover:bg-[#FFFDF5] shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between cursor-pointer transition-all text-center select-none"
            >
              <div className="text-[11px] font-black uppercase tracking-wider text-black/40">
                {isFlipped ? "Answer (Back)" : "Prompt (Front)"}
              </div>

              <div className="text-[20px] md:text-[24px] font-black text-black leading-snug my-auto px-4">
                {isFlipped
                  ? currentCard.back || currentCard.answer
                  : currentCard.front || currentCard.question}
              </div>

              <div className="text-[11px] font-bold text-black/40">
                Tap anywhere to flip
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW: QUIZ ── */}
        {material.item_type === "quiz" && questions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[15px] font-black uppercase tracking-wider text-black">
              Questions Included ({questions.length})
            </h3>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black rounded-2xl p-4 bg-white shadow-xs space-y-2"
                >
                  <div className="text-[11px] font-black uppercase text-black/50">
                    Question {idx + 1}
                  </div>
                  <h4 className="text-[14.5px] font-black text-black leading-snug">
                    {q.question}
                  </h4>
                  {Array.isArray(q.options) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: string, oIdx: number) => (
                        <div
                          key={oIdx}
                          className="p-2 border border-black/20 rounded-xl text-[12px] font-medium bg-[#FAF7F2]"
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Clone Banner */}
        <div className="border-3 border-black rounded-3xl bg-[#FFD13B] p-6 text-center space-y-3 shadow-[4px_4px_0px_#1A1A1A]">
          <h3 className="text-[20px] font-black text-black">
            Want to study this in your own space?
          </h3>
          <p className="text-[13px] font-bold text-black/70 max-w-md mx-auto">
            Clone this into your Studenius workspace to run spaced repetition drills, AI tutoring, and exam simulations.
          </p>
          <button
            type="button"
            disabled={cloning}
            onClick={handleClone}
            className="px-6 py-2.5 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[13px] shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[17px]">content_copy</span>
            <span>{cloning ? "Cloning..." : "Clone to My Workspace"}</span>
          </button>
        </div>
      </main>
    </div>
  );
}
