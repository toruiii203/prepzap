import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyPlanGeneratorModal } from "@/components/StudyPlanGeneratorModal";
import { QuizFeedback } from "@/components/QuizFeedback";
vi.mock("@/lib/soundFX", () => ({ playPop: vi.fn(), playTap: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("honest quiz preparation", () => {
  it("does not simulate completion while the request is waiting", () => {
    vi.useFakeTimers();
    render(<StudyPlanGeneratorModal isOpen stage="generating" />);
    act(() => { vi.advanceTimersByTime(30000); });
    expect(screen.getByRole("status")).toHaveTextContent("Creating practice questions");
    expect(screen.getByText("Your quiz is ready").closest("li")).toHaveAttribute("data-state", "waiting");
    expect(screen.queryByText(/20%/)).not.toBeInTheDocument();
  });
  it("updates steps from caller state and closes immediately with the request", () => {
    const { rerender } = render(<StudyPlanGeneratorModal isOpen stage="preparing" />);
    rerender(<StudyPlanGeneratorModal isOpen stage="checking" />);
    expect(screen.getByText("Creating practice questions").closest("li")).toHaveAttribute("data-state", "done");
    expect(screen.getByRole("status")).toHaveTextContent("Reading the response");
    rerender(<StudyPlanGeneratorModal isOpen stage="ready" />);
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "false");
    rerender(<StudyPlanGeneratorModal isOpen={false} stage="ready" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("lets students dismiss without claiming to cancel work, then resets next time", () => {
    const { rerender } = render(<StudyPlanGeneratorModal isOpen stage="generating" />);
    fireEvent.click(screen.getByRole("button", { name: "Keep waiting in background" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(<StudyPlanGeneratorModal isOpen={false} stage="generating" />);
    rerender(<StudyPlanGeneratorModal isOpen stage="preparing" />);
    expect(screen.getByRole("dialog", { name: "Getting your quiz ready" })).toBeInTheDocument();
  });
});
describe("encouraging answer correction", () => {
  it("keeps the correct answer and explanation with a supportive seedling", () => {
    const next = vi.fn();
    const { container } = render(<QuizFeedback answered correct={false} canCheck evaluating={false} explanation="Mitosis divides a cell." expectedAnswer="Mitosis" combo={0} onCheck={() => {}} onContinue={next} />);
    expect(container.querySelector('[data-pose="encourage"]')).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Correct answer: Mitosis");
    expect(screen.getByRole("status")).toHaveTextContent("Each try is practice");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(next).toHaveBeenCalledOnce();
  });
});
