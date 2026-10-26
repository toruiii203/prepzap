import { playTap } from "@/lib/soundFX";

interface QuizAnswerProps {
  index: number;
  children: string;
  selected: boolean;
  answered: boolean;
  correct: boolean;
  onSelect: () => void;
}

/** Selection is announced before checking; correctness is revealed only afterwards. */
export function QuizAnswer({ index, children, selected, answered, correct, onSelect }: QuizAnswerProps) {
  const state = answered && correct ? "correct" : answered && selected ? "wrong" : selected ? "selected" : "idle";
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={answered}
      data-state={state}
      onClick={() => { playTap(); onSelect(); }}
      className="quiz-answer w-full rounded-xl border-2 border-black bg-white p-4 text-left text-black flex items-center gap-3"
    >
      <span aria-hidden="true" className="w-8 h-8 shrink-0 rounded-lg border-2 border-black bg-white text-black flex items-center justify-center text-sm font-black">
        {answered && (correct || selected) ? <span className="material-symbols-outlined">{correct ? "check" : "close"}</span> : String.fromCharCode(65 + index)}
      </span>
      <span className="text-[15px] font-bold leading-snug flex-1">{children}</span>
      {answered && (correct || selected) && <span className="sr-only">{correct ? "Correct answer" : "Incorrect answer"}</span>}
    </button>
  );
}
