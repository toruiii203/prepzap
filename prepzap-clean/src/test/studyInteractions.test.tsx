import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuizAnswer } from "@/components/QuizAnswer";
import { QuizFeedback } from "@/components/QuizFeedback";
import { Progress } from "@/components/ui/progress";
import { VictoryScreen } from "@/components/VictoryScreen";
import { fireConfetti } from "@/lib/confetti";

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => motionPreference.reduced }));
vi.mock("@/lib/soundFX", () => ({ playTap: vi.fn() }));
vi.mock("@/lib/confetti", () => ({ fireConfetti: vi.fn(), stopConfetti: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("practice feedback", () => {
  it("conceals correctness until checked and prevents changes after revealing", () => {
    const select = vi.fn();
    const { rerender } = render(<QuizAnswer index={0} selected={false} answered={false} correct onSelect={select}>Mitosis</QuizAnswer>);
    const answer = screen.getByRole("button", { name: "Mitosis" });
    expect(answer).toHaveAttribute("data-state", "idle");
    fireEvent.click(answer);
    expect(select).toHaveBeenCalledTimes(1);
    rerender(<QuizAnswer index={0} selected answered={false} correct onSelect={select}>Mitosis</QuizAnswer>);
    expect(answer).toHaveAttribute("aria-pressed", "true");
    expect(answer).toHaveAttribute("data-state", "selected");
    rerender(<QuizAnswer index={0} selected answered correct onSelect={select}>Mitosis</QuizAnswer>);
    expect(answer).toHaveAttribute("data-state", "correct");
    expect(answer).toBeDisabled();
    fireEvent.click(answer);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("marks a checked wrong choice explicitly", () => {
    render(<QuizAnswer index={1} selected answered correct={false} onSelect={vi.fn()}>Meiosis</QuizAnswer>);
    expect(screen.getByRole("button")).toHaveAttribute("data-state", "wrong");
    expect(screen.getByText("Incorrect answer")).toBeInTheDocument();
  });

  it("gates checking, announces corrections, and calls Continue independently", () => {
    const check = vi.fn(), next = vi.fn();
    const props = { correct: false, evaluating: false, explanation: "Cells divide.", expectedAnswer: "Mitosis", combo: 0, onCheck: check, onContinue: next };
    const { rerender } = render(<QuizFeedback {...props} answered={false} canCheck={false} />);
    expect(screen.getByRole("button", { name: /Check answer/ })).toBeDisabled();
    rerender(<QuizFeedback {...props} answered={false} canCheck />);
    fireEvent.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(check).toHaveBeenCalledOnce();
    rerender(<QuizFeedback {...props} answered canCheck />);
    expect(screen.getByRole("status")).toHaveTextContent("Correct answer: Mitosis");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(next).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledOnce();
  });

  it("exposes bounded progress values to assistive technology", () => {
    render(<Progress value={120} aria-label="Lesson mastery" />);
    expect(screen.getByRole("progressbar", { name: "Lesson mastery" })).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("completion", () => {
  it("uses the existing XP level threshold and exposes a keyboard-accessible dialog", () => {
    const next = vi.fn();
    render(<VictoryScreen xpEarned={50} previousXp={475} accuracy={80} streakDays={3} onContinue={next} />);
    expect(screen.getByRole("dialog", { name: "Hello, level 2!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep learning" }));
    expect(next).toHaveBeenCalledOnce();
  });

  it("shows final counters and skips confetti for reduced motion", () => {
    motionPreference.reduced = true;
    try {
      render(<VictoryScreen xpEarned={80} accuracy={100} streakDays={0} onContinue={vi.fn()} />);
      expect(screen.getByRole("dialog", { name: "Session complete!" })).toBeInTheDocument();
      expect(screen.queryByText(/day study streak/)).not.toBeInTheDocument();
      expect(fireConfetti).not.toHaveBeenCalled();
      expect(screen.getAllByText("80")).toHaveLength(2);
    } finally { motionPreference.reduced = false; }
  });
});
