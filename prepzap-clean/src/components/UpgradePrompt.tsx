import React from "react";
import { useNavigate } from "react-router-dom";
import { Drawer } from "vaul";
import { LIMITS, FeatureKey } from "@/lib/freemium";

const FEATURE_LABELS: Record<FeatureKey, string> = {
  ai_tutor:        "Rex Tutor message",
  flashcard_gen:   "flashcard generation",
  math_solver:     "math problem",
  quick_study:     "QuickStudy session",
  teach_it:        "TeachIt session",
  mistake_journal: "journal entry",
  cram:            "cram session",
  practice:        "practice quiz",
  recall:          "recall prompt",
  visual:          "visual storyboard",
  high_yield:      "high-yield scan",
};

function pluralLabel(feature: FeatureKey, count: number): string {
  const label = FEATURE_LABELS[feature] || "action";
  if (count === 1) return label;
  return label.endsWith("s") ? label : `${label}s`;
}

interface UpgradePromptProps {
  feature: FeatureKey;
  remaining: number;
  onClose: () => void;
}

export function SoftWarning({ feature, remaining }: { feature: FeatureKey; remaining: number }) {
  if (remaining > 2 || remaining <= 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-bold"
      style={{ border: "2px solid #E8A020", background: "#FEF9EE", color: "#92600A", width: "fit-content" }}
    >
      <span className="material-symbols-outlined text-[15px]" style={{ color: "#E8A020" }}>hourglass_bottom</span>
      You have {remaining} free {pluralLabel(feature, remaining)} left today.
    </div>
  );
}

export default function UpgradePrompt({ feature, remaining, onClose }: UpgradePromptProps) {
  const navigate = useNavigate();
  const limit = LIMITS[feature] || 3;

  // Only render when they've actually hit 0
  if (remaining > 0) return null;

  const handleGoPro = () => {
    onClose();
    navigate("/pro");
  };

  return (
    <Drawer.Root open={true} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[24px] mt-24 fixed bottom-0 left-0 right-0 z-50 border-t-2 border-black focus:outline-none">
          <div className="p-4 bg-white rounded-t-[24px] flex-1">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-6" />
            
            <div className="flex flex-col gap-5 max-w-md mx-auto px-2 pb-6">
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-12 h-12 flex items-center justify-center shrink-0"
                  style={{ background: "#FEF9EE", border: "2px solid #E8A020", borderRadius: "10px" }}
                >
                  <span className="material-symbols-outlined text-[24px]" style={{ color: "#E8A020" }}>local_fire_department</span>
                </div>
              </div>

              {/* Copy */}
              <div>
                <Drawer.Title className="text-[24px] font-black leading-tight mb-2">
                  You're on a roll!
                </Drawer.Title>
                <Drawer.Description className="text-[15px] text-black/60 font-medium leading-relaxed">
                  You've used all {limit} free {pluralLabel(feature, limit)} for today. Come back
                  tomorrow, or go unlimited with Pro.
                </Drawer.Description>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  onClick={handleGoPro}
                  className="w-full py-4 rounded-xl text-[15px] font-black text-white transition-all active:scale-95"
                  style={{ background: "#CC0000", border: "2px solid black", boxShadow: "4px 4px 0px #000" }}
                >
                  Go Pro ₱199/mo →
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-xl text-[15px] font-black text-black bg-white transition-all active:scale-95"
                  style={{ border: "2px solid black", boxShadow: "4px 4px 0px #000" }}
                >
                  Maybe Tomorrow
                </button>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
