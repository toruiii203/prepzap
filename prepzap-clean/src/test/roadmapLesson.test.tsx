import { it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { RoadmapLesson } from "@/components/roadmaps/RoadmapLesson";
import {
  parseOutline,
  parseLesson,
  emptyProgress,
  type SavedRoadmap,
} from "@/lib/learningRoadmap";
vi.mock("@/components/Mascot", () => ({ Mascot: () => null }));
vi.mock("@/lib/soundFX", () => ({ playTap: vi.fn() }));
const fixture = JSON.parse(
  readFileSync("scripts/fixtures/roadmap.json", "utf8"),
) as { outline: unknown; lesson: unknown };
const path: SavedRoadmap = {
  version: 1,
  id: "path",
  ownerId: "account",
  createdAt: 1,
  updatedAt: 1,
  outline: parseOutline(fixture.outline),
  topic: "Integration",
  level: "Foundations",
  lessons: { "0": parseLesson(fixture.lesson) },
  progress: {},
};
afterEach(cleanup);
it("keeps later review closed before evidence and explains that reading is not mastery", () => {
  render(
    <RoadmapLesson
      path={path}
      index={0}
      saving={false}
      busy={false}
      onProgress={vi.fn()}
      onFresh={vi.fn()}
    />,
  );
  expect(
    screen.getByText("Reading marks this chapter as read, not mastered."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Later review" }));
  expect(
    screen.getByText(/Complete reading, both practice sets/),
  ).toBeInTheDocument();
  expect(screen.queryByText(path.lessons["0"].review[0].prompt)).toBeNull();
});
it("shows a simpler example after a wrong answer and offers fresh failed-checkpoint questions", () => {
  const progress = emptyProgress();
  progress.answers = {
    "checkpoint-0": { choices: [1] },
    "checkpoint-1": { choices: [1] },
    "checkpoint-2": { choices: [1] },
  };
  const fresh = vi.fn();
  render(
    <RoadmapLesson
      path={{ ...path, progress: { "0": progress } }}
      index={0}
      saving={false}
      busy={false}
      onProgress={vi.fn()}
      onFresh={fresh}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Checkpoint" }));
  expect(screen.getByText(/Good try/)).toBeInTheDocument();
  expect(screen.getByText("A simpler example:")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Generate a fresh checkpoint" }),
  );
  expect(fresh).toHaveBeenCalledWith("checkpoint");
});
it("requires a written recall attempt before revealing a model answer", () => {
  render(
    <RoadmapLesson
      path={path}
      index={0}
      saving={false}
      busy={false}
      onProgress={vi.fn()}
      onFresh={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Recall" }));
  const compare = screen.getByRole("button", {
    name: "Compare with a model answer",
  });
  expect(compare).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Explain it from memory"), {
    target: {
      value: "Differentiate the proposed antiderivative and compare it.",
    },
  });
  fireEvent.click(compare);
  expect(
    screen.getByText("Compare the ideas, not the wording"),
  ).toBeInTheDocument();
  expect(screen.getByText(/not automatic grading/)).toBeInTheDocument();
});
