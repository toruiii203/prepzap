import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { playPop, playSuccess } from "@/lib/soundFX";

interface VictoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  topic?: string;
  score: number;
  totalQuestions: number;
  comboStreak: number;
  xpEarned: number;
  friendCode: string;
  displayName: string;
}

export function VictoryCardModal({
  isOpen,
  onClose,
  title = "Quiz Mastered!",
  topic = "Active Recall Practice",
  score,
  totalQuestions,
  comboStreak,
  xpEarned,
  friendCode,
  displayName,
}: VictoryCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    playPop();
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        style: {
          borderRadius: "0px",
        },
      });
      const link = document.createElement("a");
      link.download = `studenius-brag-${displayName.toLowerCase().replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      playSuccess();
    } catch (err) {
      console.error("[VictoryCardModal] Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    playPop();
    if (!cardRef.current) return;

    if (navigator.share) {
      try {
        setIsExporting(true);
        const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "studenius-mastery.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `Studenius Mastery: ${topic}`,
            text: `I just scored ${accuracy}% on ${topic} with a ${comboStreak}-question streak on Studenius! Add my friend code: ${friendCode}`,
            files: [file],
          });
          playSuccess();
          return;
        }
      } catch {
        // Fallback to text share
      } finally {
        setIsExporting(false);
      }

      try {
        await navigator.share({
          title: "Studenius Study Brag",
          text: `I just scored ${accuracy}% on ${topic} with a ${comboStreak}-question streak on Studenius! Add my friend code: ${friendCode} at studenius.com`,
          url: "https://studenius.com",
        });
        playSuccess();
        return;
      } catch {}
    }

    // Fallback: Copy link
    handleCopyFriendCode();
  };

  const handleCopyFriendCode = () => {
    navigator.clipboard.writeText(friendCode);
    setCopied(true);
    playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#FAF7F2] border-3 border-black shadow-[8px_8px_0px_#000] rounded-3xl p-5 flex flex-col items-center max-h-[95dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 border-2 border-black rounded-full bg-white hover:bg-black hover:text-white flex items-center justify-center font-black text-[14px] transition-colors cursor-pointer shadow-[2px_2px_0px_#000] active:translate-y-0.5"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <span className="text-[11px] font-black uppercase tracking-widest text-black/50 mb-1">
          Shareable Brag Card
        </span>
        <h2 className="text-[20px] font-black text-black text-center mb-4 leading-tight">
          Brag to Your Classmates!
        </h2>

        {/* ── CARD TO EXPORT (9:16 Story format preview) ── */}
        <div
          ref={cardRef}
          className="w-full bg-[#FFFDF5] border-3 border-black rounded-2xl p-5 shadow-[4px_4px_0px_#000] flex flex-col items-center select-none"
        >
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div className="flex items-center gap-2">
              <img
                src="/mascot/seedling-mascot.png"
                alt="Pip"
                className="w-8 h-8 rounded-full border-2 border-black bg-white object-cover"
              />
              <span className="font-black text-[14px] tracking-tight uppercase">STUDENIUS</span>
            </div>
            <span className="bg-[#10B981] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-black uppercase tracking-wider">
              VERIFIED SCORE
            </span>
          </div>

          {/* Pip Hero Mascot & Topic */}
          <div className="text-center mb-4">
            <span className="inline-block text-[11px] font-extrabold text-black/60 uppercase tracking-widest mb-1 truncate max-w-[240px]">
              {topic}
            </span>
            <h3 className="text-[26px] font-black leading-tight text-black tracking-tight">
              {title}
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-2.5 mb-4">
            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Accuracy</span>
              <span className="text-[24px] font-black text-[#10B981]">{accuracy}%</span>
              <span className="text-[10px] font-bold text-black/40">({score}/{totalQuestions})</span>
            </div>

            <div className="p-3 bg-[#FFE566] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/70">Combo Streak</span>
              <span className="text-[24px] font-black text-black flex items-center gap-1">
                <span className="material-symbols-outlined text-[20px] text-[#10B981]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
                {comboStreak}
              </span>
              <span className="text-[10px] font-bold text-black/60">In a row</span>
            </div>

            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50">XP Gained</span>
              <span className="text-[22px] font-black text-[#F5A623]">+{xpEarned}</span>
              <span className="text-[10px] font-bold text-black/40">Knowledge Power</span>
            </div>

            <div className="p-3 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Scholar</span>
              <span className="text-[15px] font-black text-black truncate max-w-[100px] mt-1">{displayName}</span>
              <span className="text-[10px] font-bold text-black/40 font-mono mt-0.5">{friendCode}</span>
            </div>
          </div>

          {/* Social Call-to-action Footer */}
          <div className="w-full bg-[#FAF7F2] border-2 border-black rounded-xl p-2.5 flex items-center justify-between text-left">
            <div>
              <p className="text-[11px] font-black text-black leading-tight">Can you beat my score?</p>
              <p className="text-[10px] font-bold text-black/50">Add me: <span className="font-mono text-black font-black">{friendCode}</span></p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-black text-[12px]">
              <span className="material-symbols-outlined text-[16px]">bolt</span>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div className="w-full flex flex-col gap-2.5 mt-4">
          <button
            type="button"
            onClick={handleNativeShare}
            disabled={isExporting}
            className="w-full py-3 bg-[#10B981] hover:bg-black text-white border-2 border-black rounded-2xl font-black text-[13px] tracking-wide uppercase shadow-[3px_3px_0px_#000] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            {isExporting ? "Preparing Story..." : "Share to Story / Chat"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="py-2.5 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-xl font-extrabold text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Save Image
            </button>

            <button
              type="button"
              onClick={handleCopyFriendCode}
              className="py-2.5 bg-white hover:bg-[#FAF7F2] text-black border-2 border-black rounded-xl font-extrabold text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied Code!" : "Copy Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VictoryCardModal;
