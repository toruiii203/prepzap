import React from "react";
import { useNavigate } from "react-router-dom";
import { LIMITS, FeatureKey } from "@/lib/freemium";

// ─── Human-readable feature labels ───────────────────────────────────────────
const FEATURE_LABELS: Record<FeatureKey, string> = {
  ai_tutor:        "AI Tutor message",
  flashcard_gen:   "flashcard generation",
  math_solver:     "math problem",
  quick_study:     "QuickStudy session",
  teach_it:        "TeachIt session",
  mistake_journal: "journal entry",
};

function pluralLabel(feature: FeatureKey, count: number): string {
  const label = FEATURE_LABELS[feature];
  // Simple pluralisation: add 's' unless it ends in a word we know
  if (count === 1) return label;
  return label.endsWith("s") ? label : `${label}s`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface UpgradePromptProps {
  feature: FeatureKey;
  remaining: number;
  onClose: () => void;
}

// ─── Soft inline banner (1–2 uses left) ──────────────────────────────────────
export function SoftWarning({ feature, remaining }: { feature: FeatureKey; remaining: number }) {
  if (remaining > 2 || remaining <= 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-bold"
      style={{
        border:     "2px solid #E8A020",
        background: "#FEF9EE",
        color:      "#92600A",
        width:      "fit-content",
      }}
    >
      <span className="material-symbols-outlined text-[15px]" style={{ color: "#E8A020" }}>
        hourglass_bottom
      </span>
      You have {remaining} free {pluralLabel(feature, remaining)} left today.
    </div>
  );
}

// ─── Hard-limit modal (0 left) ────────────────────────────────────────────────
export default function UpgradePrompt({ feature, remaining, onClose }: UpgradePromptProps) {
  const navigate = useNavigate();
  const limit = LIMITS[feature];

  // Only render the modal when they've actually hit 0
  if (remaining > 0) return null;

  const handleGoBack = () => {
    onClose();
  };

  const handleGoPro = () => {
    onClose();
    navigate("/pricing");
  };

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card */}
      <div
        className="bg-white flex flex-col gap-5 p-7 w-full max-w-sm"
        style={{
          border:       "2px solid black",
          boxShadow:    "4px 4px 0px #000",
          borderRadius: "12px",
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{
              background:   "#FEF9EE",
              border:       "2px solid #E8A020",
              borderRadius: "8px",
            }}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ color: "#E8A020" }}
            >
              local_fire_department
            </span>
          </div>
          <button
            onClick={onClose}
            className="material-symbols-outlined text-black/40 hover:text-black transition-colors text-[20px]"
          >
            close
          </button>
        </div>

        {/* Copy */}
        <div>
          <h2 className="text-[20px] font-black leading-tight mb-2">
            You're on a roll!
          </h2>
          <p className="text-[14px] text-black/60 font-medium leading-relaxed">
            You've used all {limit} free {pluralLabel(feature, limit)} for today. Come back
            tomorrow, or go unlimited with Pro.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoPro}
            className="w-full py-3 text-[14px] font-black text-white transition-all active:translate-y-0.5"
            style={{
              background: "#CC0000",
              border:     "2px solid black",
              boxShadow:  "4px 4px 0px #000",
            }}
          >
            Go Pro ₱199/mo →
          </button>
          <button
            onClick={handleGoBack}
            className="w-full py-3 text-[14px] font-black text-black bg-white transition-all active:translate-y-0.5"
            style={{
              border:    "2px solid black",
              boxShadow: "4px 4px 0px #000",
            }}
          >
            Maybe Tomorrow
          </button>
        </div>
      </div>
    </div>
  );
}
