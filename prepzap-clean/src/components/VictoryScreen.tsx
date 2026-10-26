import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { Progress } from "@/components/ui/progress";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fireConfetti } from "@/lib/confetti";
import { levelFromXp } from "@/lib/xp";

export interface VictoryScreenProps {
  xpEarned: number;
  accuracy: number;
  streakDays: number;
  previousXp?: number;
  onContinue: () => void;
  onShare?: () => void;
}

export function VictoryScreen({ xpEarned, accuracy, streakDays, previousXp, onContinue, onShare }: VictoryScreenProps) {
  const reduced = useReducedMotion();
  const fired = useRef(false);
  const [shareStatus, setShareStatus] = useState("");
  const level = previousXp === undefined ? undefined : levelFromXp(previousXp + xpEarned);
  const leveledUp = level !== undefined && level > levelFromXp(previousXp!);
  useEffect(() => {
    if (!fired.current && !reduced) { fired.current = true; fireConfetti(); }
  }, [reduced]);

  const handleShare = async () => {
    const text = `I scored ${Math.round(accuracy)}% and earned ${xpEarned} XP on Studenius!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setShareStatus("Result copied. Ready to share!"); }
      onShare?.();
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareStatus("Couldn’t share this time. Please try again.");
    }
  };
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onContinue(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content data-victory-screen="true" className="quiz-shell quiz-feedback fixed inset-0 z-[61] bg-[#FAF7F2] text-black overflow-y-auto" aria-describedby="victory-description">
          <div className="min-h-full max-w-md mx-auto px-6 py-8 flex flex-col items-center justify-center gap-6 text-center">
            <Mascot mood="celebrate" size="lg" interactive label="Celebrate with Rex" />
            <div className="space-y-2">
              <Dialog.Title className="text-3xl">{leveledUp ? `Hello, level ${level}!` : "Session complete!"}</Dialog.Title>
              <Dialog.Description id="victory-description" className="text-black/75 font-semibold">{leveledUp ? "Your practice is adding up. Keep going." : "One more step forward. Nice work today."}</Dialog.Description>
            </div>
            <div className="w-full rounded-2xl border-2 border-black bg-white p-5 shadow-[0_4px_0_#000000] space-y-5">
              <div className="flex items-center justify-between font-black">
                <span className="flex items-center gap-2"><span aria-hidden="true" className="material-symbols-outlined">bolt</span>XP earned</span>
                <span className="text-2xl">+<AnimatedNumber value={xpEarned} /></span>
              </div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-sm font-bold"><span>Accuracy</span><span><AnimatedNumber value={Math.round(accuracy)} />%</span></div>
                <Progress value={accuracy} aria-label="Session accuracy" className="border-2 border-black [&>div]:bg-[#10B981]" />
              </div>
              {streakDays > 0 && <div className="flex justify-center items-center gap-2 font-black border-t-2 border-black pt-4">
                <span aria-hidden="true" className="material-symbols-outlined animate-flame text-[#DC2626]">local_fire_department</span>
                <span><AnimatedNumber value={streakDays} /> day study streak</span>
              </div>}
            </div>
            <div className="w-full space-y-4">
              <SpringButton soundEnabled={false} onClick={onContinue} className="w-full p-4 rounded-xl border-2 border-black bg-[#FFD13B] text-black font-black shadow-[0_4px_0_#000000]">Keep learning<span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></SpringButton>
              <SpringButton onClick={handleShare} className="w-full p-3 rounded-xl border-2 border-black bg-white text-black font-bold">Share result<span aria-hidden="true" className="material-symbols-outlined">share</span></SpringButton>
              <p role="status" className="min-h-5 text-sm font-semibold">{shareStatus}</p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
