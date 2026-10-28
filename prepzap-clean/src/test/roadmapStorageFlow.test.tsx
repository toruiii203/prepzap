import { it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { LearningRoadmaps } from "@/components/roadmaps/LearningRoadmaps";
import { parseOutline } from "@/lib/learningRoadmap";
const mocks = vi.hoisted(() => ({
  account: { id: "account-one" },
  load: vi.fn(),
  save: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.account }),
}));
vi.mock("@/lib/roadmapStore", () => ({
  loadRoadmaps: mocks.load,
  saveRoadmap: mocks.save,
  deleteRoadmap: vi.fn(),
  exportRoadmap: vi.fn(),
  parseRoadmapBackup: vi.fn(),
}));
vi.mock("@/lib/roadmapGeneration", () => ({
  generateRoadmap: mocks.generate,
  generateRoadmapLesson: vi.fn(),
  generateFreshChecks: vi.fn(),
  roadmapError: () => "Generation failed",
}));
vi.mock("@/lib/sourceContext", () => ({ loadLibrary: () => [] }));
vi.mock("@/components/Mascot", () => ({ Mascot: () => null }));
vi.mock("@/lib/soundFX", () => ({ playTap: vi.fn() }));
const fixture = JSON.parse(
  readFileSync("scripts/fixtures/roadmap.json", "utf8"),
) as { outline: unknown };
const outline = parseOutline(fixture.outline);
beforeEach(() => {
  mocks.account = { id: "account-one" };
  mocks.load.mockReset().mockResolvedValue([]);
  mocks.save.mockReset().mockResolvedValue(undefined);
  mocks.generate.mockReset().mockResolvedValue(outline);
});
afterEach(cleanup);
async function start() {
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create a learning roadmap" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Create a learning roadmap" }),
  );
  fireEvent.change(screen.getByLabelText("Topic"), {
    target: { value: "Integration" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview my roadmap" }));
}
it("keeps a generated preview available when storage fails, allowing a genuine save retry", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Quota exceeded"));
  render(<LearningRoadmaps subjectName="Math" />);
  await start();
  await screen.findByRole("button", { name: "Start learning" });
  fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
  await screen.findByText(/Your latest change was not saved/);
  expect(
    screen.getByRole("button", { name: "Start learning" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start learning" }));
  await screen.findByRole("list", { name: "Topic chapters" });
  expect(mocks.save).toHaveBeenCalledTimes(2);
  expect(mocks.save.mock.calls[1][0].ownerId).toBe("account-one");
});
it("discards an in-flight generation result when the signed-in account changes", async () => {
  let finish: (value: typeof outline) => void = () => {
    throw new Error("No pending request");
  };
  mocks.generate.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<LearningRoadmaps subjectName="Math" />);
  await start();
  await screen.findByText("Planning your chapters");
  mocks.account = { id: "account-two" };
  view.rerender(<LearningRoadmaps subjectName="Math" />);
  finish(outline);
  await waitFor(() => expect(mocks.load).toHaveBeenCalledWith("account-two"));
  expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();
});
