import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseOutline,
  parseLesson,
  emptyProgress,
  isReadyForReview,
  unitStatus,
  REVIEW_DELAY,
  type SavedRoadmap,
} from "@/lib/learningRoadmap";
import { sourceFromText, readRoadmapFile } from "@/lib/roadmapSource";
import { parseRoadmapBackup } from "@/lib/roadmapStore";
const fixture = JSON.parse(
  readFileSync("scripts/fixtures/roadmap.json", "utf8"),
) as { outline: unknown; lesson: unknown };
const outline = parseOutline(fixture.outline),
  lesson = parseLesson(fixture.lesson);
it("rejects shallow, malformed, ambiguous and repeated generated material", () => {
  expect(() => parseOutline({ title: "Generic" })).toThrow();
  expect(() => parseLesson({ ...lesson, checkpoint: [] })).toThrow();
  expect(() => parseLesson({ ...lesson, practice: lesson.guided })).toThrow();
  expect(() =>
    parseLesson({
      ...lesson,
      guided: [{ ...lesson.guided[0], correct: 8 }, lesson.guided[1]],
    }),
  ).toThrow();
  expect(() =>
    parseLesson({
      ...lesson,
      guided: [
        { ...lesson.guided[0], options: ["same", "same", "same", "same"] },
        lesson.guided[1],
      ],
    }),
  ).toThrow();
});
it("requires exact evidence for the selected source and forbids invented topic citations", () => {
  const source = sourceFromText(
    "notes.txt",
    "The derivative of x squared is two x. ".repeat(5),
  );
  expect(() => parseLesson(lesson, source)).toThrow(/linked reliably/);
  expect(() =>
    parseLesson(
      { ...lesson, evidence: ["Not actually present in the document"] },
      source,
    ),
  ).toThrow();
  expect(() =>
    parseLesson(
      { ...lesson, evidence: ["The derivative of x squared is two x."] },
      source,
    ),
  ).not.toThrow();
  expect(() =>
    parseLesson({ ...lesson, evidence: ["Imaginary citation"] }),
  ).toThrow(/unsupported/);
});
it("does not treat reading, retries or one answer as readiness; later review is time based", () => {
  const progress = emptyProgress();
  progress.read = true;
  expect(isReadyForReview(lesson, progress)).toBe(false);
  for (const stage of ["guided", "practice", "checkpoint"] as const)
    lesson[stage].forEach((q, i) => {
      progress.answers[`${stage}-${i}`] = { choices: [q.correct] };
    });
  lesson.recall.forEach((_, i) => {
    progress.recalls[String(i)] = {
      response: "A specific written explanation of the concept.",
      rating: "got-it",
    };
  });
  expect(isReadyForReview(lesson, progress)).toBe(true);
  progress.answers["checkpoint-0"] = { choices: [1, 0] };
  progress.answers["checkpoint-1"] = { choices: [1, 0] };
  expect(isReadyForReview(lesson, progress)).toBe(false);
  expect(
    unitStatus(lesson, { ...progress, readyAt: 100 }, 100 + REVIEW_DELAY - 1),
  ).toBe("Ready for review");
  expect(
    unitStatus(lesson, { ...progress, readyAt: 100 }, 100 + REVIEW_DELAY),
  ).toBe("Review due");
});
it("makes file coverage explicit and rejects unreadable, oversized and unsupported files", async () => {
  const source = sourceFromText("long.txt", "x".repeat(40000));
  expect(source.text).toHaveLength(32000);
  expect(source.coverage).toContain("32,000");
  expect(() => sourceFromText("empty.txt", "a few words")).toThrow();
  expect(() => sourceFromText("raw.pdf", "%PDF-" + "x".repeat(200))).toThrow();
  await expect(
    readRoadmapFile(new File(["abc"], "photo.png", { type: "image/png" })),
  ).rejects.toThrow(/not supported/);
  await expect(
    readRoadmapFile(new File([new Uint8Array(6 * 1024 * 1024)], "big.txt")),
  ).rejects.toThrow(/5 MB/);
});
it("validates backup data and restores it under the current account with a new ID", () => {
  vi.spyOn(crypto, "randomUUID").mockReturnValue(
    "new-id-0000-0000-0000-000000000000",
  );
  const path: SavedRoadmap = {
    version: 1,
    id: "old",
    ownerId: "other-account",
    createdAt: 1,
    updatedAt: 2,
    outline,
    topic: "Integration",
    level: "Foundations",
    lessons: { "0": lesson },
    progress: {},
  };
  const restored = parseRoadmapBackup(path, "current-account");
  expect(restored.ownerId).toBe("current-account");
  expect(restored.id).not.toBe("old");
  expect(restored.lessons["0"]).toEqual(lesson);
  expect(() =>
    parseRoadmapBackup({ title: "Not a roadmap" }, "current-account"),
  ).toThrow();
  vi.restoreAllMocks();
});

it("rejects legacy image data rather than sending it as readable source text",()=>{expect(()=>sourceFromText("camera.jpg","DATA:(data:image/png;base64,"+"A".repeat(200))).toThrow(/no readable extracted text/);});
