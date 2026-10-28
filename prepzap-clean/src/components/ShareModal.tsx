import React, { useState, useEffect } from "react";
import { createShareLink, SharedItemType } from "@/lib/shareService";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: SharedItemType;
  title: string;
  subject?: string;
  payload: any;
  creator?: { id?: string; name: string; code?: string };
}

export function ShareModal({
  isOpen,
  onClose,
  itemType,
  title,
  subject = "General Studies",
  payload,
  creator
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShareUrl("");
      setCopied(false);
      return;
    }

    let isMounted = true;
    async function generateLink() {
      setLoading(true);
      try {
        const result = await createShareLink(itemType, title, subject, payload, creator);
        if (isMounted) {
          setShareUrl(result.shareUrl);
        }
      } catch (e) {
        toast.error("Failed to generate share link.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    generateLink();
    return () => {
      isMounted = false;
    };
  }, [isOpen, itemType, title, subject, payload, creator]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!shareUrl) return;
    playTap();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Public link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share && shareUrl) {
      navigator.share({
        title: `Studenius Study Share: ${title}`,
        text: `Check out this ${itemType} on Studenius: "${title}"`,
        url: shareUrl
      });
    } else {
      handleCopy();
    }
  };

  const typeLabels: Record<SharedItemType, string> = {
    guide: "Study Guide / Note",
    flashcards: "Flashcard Deck",
    quiz: "Practice Quiz"
  };

  const typeIcons: Record<SharedItemType, string> = {
    guide: "edit_document",
    flashcards: "style",
    quiz: "assignment"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="border-3 border-black bg-white rounded-3xl p-6 max-w-md w-full shadow-[5px_5px_0px_#000] space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#10B981]">share</span>
            <h3 className="text-[17px] font-black text-black">
              Share {typeLabels[itemType]}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-black flex items-center justify-center font-black cursor-pointer hover:bg-black/5"
          >
            &times;
          </button>
        </div>

        {/* Content Item Summary */}
        <div className="p-3 bg-[#FAF7F2] border-2 border-black rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFD13B] border border-black flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px] text-black">
              {typeIcons[itemType]}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-black text-black truncate">{title}</div>
            <div className="text-[11px] font-bold text-black/55">{subject}</div>
          </div>
        </div>

        {/* Share Link Box */}
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-black/60 block">
            Public View & Clone Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={loading ? "Generating unguessable link..." : shareUrl}
              className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-[12px] font-bold font-mono bg-[#FFFDF5] text-black/80 truncate outline-none select-all"
            />
            <button
              type="button"
              disabled={loading || !shareUrl}
              onClick={handleCopy}
              className={`px-3.5 py-2 border-2 border-black rounded-xl text-[11.5px] font-black cursor-pointer shadow-xs active:translate-y-0.5 transition-all shrink-0 ${
                copied ? "bg-[#10B981] text-white" : "bg-black text-white hover:bg-[#10B981]"
              }`}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        <p className="text-[11.5px] font-medium text-black/60 leading-relaxed">
          Anyone with this link can view this material without logging in, or clone it directly into their Studenius workspace.
        </p>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          {navigator.share && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="px-3.5 py-1.5 bg-[#FFE566] hover:bg-[#FFD13B] text-black border-2 border-black rounded-xl text-[11.5px] font-black cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">send</span>
              <span>Send via App</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black hover:bg-stone-800 text-white border-2 border-black rounded-xl text-[11.5px] font-black cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
