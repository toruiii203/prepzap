import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";

interface QuizFeedbackProps {
  answered: boolean;
  correct: boolean | null;
  canCheck: boolean;
  evaluating: boolean;
  explanation: string;
  expectedAnswer: string;
  combo: number;
  onCheck: () => void;
  onContinue: () => void;
}

export function QuizFeedback({ answered, correct, canCheck, evaluating, explanation, expectedAnswer, combo, onCheck, onContinue }: QuizFeedbackProps) {
  return (
    <section aria-label="Answer feedback" className="quiz-feedback sticky bottom-0 w-full border-t-2 border-black bg-white z-40">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-h-14 flex-1" role="status" aria-live="polite" aria-atomic="true">
          {answered ? (
            <div key={correct ? "correct" : "retry"} className="quiz-feedback-content flex gap-3 items-start">
              <Mascot key={`${correct}-${combo}`} mood={correct ? combo >= 3 ? "cheering" : "happy" : "sad"} size="xs" />
              <div>
                <p className="font-black text-lg text-black">{correct ? combo > 1 ? `${combo} in a row!` : "You’ve got it!" : "Not quite. Try it again soon."}</p>
                <p className="text-sm font-semibold text-black/75 leading-snug mt-1">{correct ? explanation || "Keep going. You’re making progress." : `Correct answer: ${expectedAnswer}`}</p>
                {!correct && explanation && <p className="text-sm text-black/75 mt-1">{explanation}</p>}
              </div>
            </div>
          ) : <div className="flex items-center gap-3"><Mascot mood={evaluating ? "thinking" : "encouraging"} size="xs" /><p className="text-sm font-bold text-black/65 pt-3">{evaluating ? "Checking your answer…" : "Choose an answer, then check."}</p></div>}
        </div>
        <SpringButton
          soundEnabled={false}
          disabled={!answered && (!canCheck || evaluating)}
          onClick={answered ? onContinue : onCheck}
          aria-busy={evaluating}
          className="w-full sm:w-auto sm:min-w-44 px-6 py-3 border-2 border-black rounded-xl bg-[var(--pz-coral)] text-[var(--pz-ink)] font-black shadow-[0_4px_0_#000000]"
        >
          {answered ? "Continue" : evaluating ? "Checking…" : "Check answer"}
          <span className="material-symbols-outlined" aria-hidden="true">{answered ? "arrow_forward" : "check"}</span>
        </SpringButton>
      </div>
    </section>
  );
}
