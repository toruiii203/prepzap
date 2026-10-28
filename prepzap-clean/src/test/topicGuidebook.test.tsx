import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopicGuidebook } from "@/components/guidebook/TopicGuidebook";
import { TOPIC_GUIDES } from "@/lib/topicGuides";
vi.mock("@/lib/soundFX", () => ({ playSuccess: vi.fn(), playPop: vi.fn() }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => true,
}));
afterEach(cleanup);
beforeEach(() => localStorage.clear());
describe("topic guidebook learning flow", () => {
  it("teaches the selected topic, explains mistakes, and keeps checks separate from persistent progress", () => {
    const navigate = vi.fn();
    const { unmount } = render(
      <TopicGuidebook
        isOpen
        onClose={() => {}}
        subjectName="Math"
        navigate={navigate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Integral basics/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Read Reverse the derivative" }),
    );
    expect(screen.getByText(/An antiderivative of f/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Check my understanding" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "2x^2" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Check my understanding" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Good try");
    fireEvent.click(
      screen.getByRole("button", { name: "Try the check again" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "x^2" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Check my understanding" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("That's the idea");
    fireEvent.click(screen.getByRole("button", { name: "Back to topic map" }));
    expect(
      screen.getByText("1 of 4 checks explored this visit"),
    ).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(navigate).not.toHaveBeenCalled();
    unmount();
    render(
      <TopicGuidebook
        isOpen
        onClose={() => {}}
        subjectName="Math"
        navigate={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Integral basics/ }));
    expect(
      screen.getByText("0 of 4 checks explored this visit"),
    ).toBeInTheDocument();
  });
  it("retains checks when closing and reopening during the same mounted visit", () => {
    const props = {
      onClose: () => {},
      subjectName: "Biology",
      navigate: () => {},
    };
    const { rerender } = render(<TopicGuidebook {...props} isOpen />);
    fireEvent.click(screen.getByRole("button", { name: /Cell essentials/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Read A selective boundary" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cell membrane" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Check my understanding" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to topic map" }));
    rerender(<TopicGuidebook {...props} isOpen={false} />);
    rerender(<TopicGuidebook {...props} isOpen />);
    expect(
      screen.getByText("1 of 3 checks explored this visit"),
    ).toBeInTheDocument();
  });
  it("supports topic search and an honest empty state", () => {
    render(
      <TopicGuidebook
        isOpen
        onClose={() => {}}
        subjectName="Biology"
        navigate={() => {}}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "integral" },
    });
    expect(
      screen.getByRole("button", { name: /Integral basics/ }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "no such topic" },
    });
    expect(
      screen.getByText("No starter guide matches yet."),
    ).toBeInTheDocument();
  });
  it("ships internally consistent authored checks and worked examples", () => {
    expect(TOPIC_GUIDES.length).toBeGreaterThanOrEqual(8);
    const ids = new Set<string>();
    for (const guide of TOPIC_GUIDES) {
      expect(ids.has(guide.id)).toBe(false);
      ids.add(guide.id);
      for (const chapter of guide.chapters) {
        expect(chapter.options[chapter.correct]).toBeTruthy();
        expect(chapter.idea.length).toBeGreaterThan(40);
        expect(chapter.example.length).toBeGreaterThan(30);
        expect(chapter.why.length).toBeGreaterThan(20);
      }
    }
  });
});
