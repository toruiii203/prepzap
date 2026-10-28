import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TutorialModal } from "@/components/TutorialModal";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { guideForPage } from "@/lib/pageGuides";
vi.mock("@/hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => true,
}));
vi.mock("@/lib/soundFX", () => ({ playTap: vi.fn(), playPop: vi.fn() }));
afterEach(cleanup);
beforeEach(() => localStorage.clear());
it("shows one guide step at a time, supports Back and dismisses with Escape", () => {
  const dismiss = vi.fn();
  render(
    <TutorialModal
      isOpen
      onDismiss={dismiss}
      title="Practice"
      features={[
        {
          icon: "quiz",
          title: "Choose a topic",
          desc: "Enter a topic to practise.",
        },
        {
          icon: "check",
          title: "Review an answer",
          desc: "Use the explanation after answering.",
        },
      ]}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Choose a topic" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Review an answer")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    screen.getByRole("heading", { name: "Review an answer" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous guide step" }));
  expect(
    screen.getByRole("heading", { name: "Choose a topic" }),
  ).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(dismiss).toHaveBeenCalled();
});
it("uses existing seen flags and replays from the shared page-guide action", () => {
  localStorage.setItem("pz_tutorial_seen_/notes", "true");
  function Example() {
    const guide = useTutorialModal("/notes");
    return (
      <TutorialModal
        isOpen={guide.isOpen}
        onDismiss={guide.dismiss}
        title="Notes"
        features={[
          { icon: "edit", title: "Write a note", desc: "Start with one idea." },
        ]}
      />
    );
  }
  render(<Example />);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent(
    window,
    new CustomEvent("studenius:show-page-guide", { detail: "/notes" }),
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(localStorage.getItem("pz_tutorial_seen_/notes")).toBe("true");
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("resolves page aliases and points Arena guidance to Live battles", () => {
  expect(guideForPage("/leaderboard").key).toBe("/arena");
  expect(guideForPage("/source-library").key).toBe("/sources");
  expect(guideForPage("/rooms").title).toBe("Live battles");
  expect(
    guideForPage("/arena").steps.some(
      (step) => step.title === "Rooms are in Live battles",
    ),
  ).toBe(true);
});
