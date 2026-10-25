import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getQuestionsForLesson,
  launchPathLesson,
  SUBJECT_LESSON_BANKS,
  PathNodeInfo,
} from "@/lib/lessonLauncher";

describe("lessonLauncher", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("provides 5 curated questions for known subjects", () => {
    const mathQuestions = getQuestionsForLesson("Math");
    expect(mathQuestions).toHaveLength(5);
    mathQuestions.forEach((q) => {
      expect(q.q).toBeTruthy();
      expect(q.options).toHaveLength(4);
      expect(typeof q.correct).toBe("number");
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(3);
    });
  });

  it("falls back to general learning science questions for unrecognized subjects", () => {
    const questions = getQuestionsForLesson("UnrecognizedSubjectxyz");
    expect(questions).toHaveLength(5);
    expect(questions[0].q).toBeTruthy();
  });

  it("hydrates localStorage and navigates directly to /practice on 1-tap launch", () => {
    const mockNavigate = vi.fn();
    const mockNode: PathNodeInfo = {
      id: "node-2",
      title: "Active Recall Sprint",
      unit: 1,
      description: "5 rapid recall questions",
      icon: "bolt",
      xpReward: 35,
      status: "active",
      route: "/practice",
    };

    launchPathLesson("Biology", mockNode, mockNavigate);

    expect(mockNavigate).toHaveBeenCalledWith("/practice");
    expect(localStorage.getItem("pz_practice_view")).toBe("quiz");
    expect(localStorage.getItem("pz_practice_total_count")).toBe("5");
    expect(localStorage.getItem("pz_practice_mastered_count")).toBe("0");

    const savedQueue = JSON.parse(localStorage.getItem("pz_practice_queue") || "[]");
    expect(savedQueue).toHaveLength(5);
    expect(savedQueue[0].question.options).toHaveLength(4);
    expect(savedQueue[0].isReTest).toBe(false);
  });
});
