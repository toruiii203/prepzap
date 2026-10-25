import { describe, it, expect, beforeEach } from "vitest";
import { 
  getCompletedNodeIds, 
  markNodeCompleted, 
  resetPathProgress,
  setCurrentLessonNodeId,
  getCurrentLessonNodeId,
  clearCurrentLessonNodeId,
} from "@/lib/studyPathStorage";
import { sanitizeQuestion, getQuestionsForLesson } from "@/lib/lessonLauncher";

describe("Study Path Progression & Question Sanitization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Study Path Node Progression", () => {
    it("initializes with baseline node-1 completed by default", () => {
      const completed = getCompletedNodeIds();
      expect(completed).toEqual(["node-1"]);
    });

    it("marks node-2 completed and persists across calls", () => {
      markNodeCompleted("node-2");
      const completed = getCompletedNodeIds();
      expect(completed).toContain("node-1");
      expect(completed).toContain("node-2");
    });

    it("tracks current lesson node id properly", () => {
      setCurrentLessonNodeId("node-2");
      expect(getCurrentLessonNodeId()).toBe("node-2");

      clearCurrentLessonNodeId();
      expect(getCurrentLessonNodeId()).toBeNull();
    });

    it("resets path progress back to baseline", () => {
      markNodeCompleted("node-2");
      markNodeCompleted("node-3");
      expect(getCompletedNodeIds().length).toBe(3);

      resetPathProgress();
      expect(getCompletedNodeIds()).toEqual(["node-1"]);
    });
  });

  describe("Question Sanitization (Giveaway & Hint Removal)", () => {
    it("strips parenthetical clause if only one option has parentheses", () => {
      const q = {
        q: "During which phase of sleep does the brain consolidate facts?",
        options: [
          "Slow-Wave Sleep (Deep NREM)",
          "Light NREM Stage 1",
          "Hypnagogic State",
          "Awake Rest State",
        ],
        correct: 0,
        subject: "Learning Science",
        difficulty: "Medium",
        hint: "Characterized by delta waves.",
      };

      const sanitized = sanitizeQuestion(q);
      // Option 0 should have the giveaway parenthetical removed
      expect(sanitized.options?.[0]).toBe("Slow-Wave Sleep");
      // Hints must be completely stripped
      expect(sanitized.hint).toBeUndefined();
    });

    it("preserves options when all options legitimately share parentheses", () => {
      const q = {
        q: "Which layer of the OSI model handles TCP?",
        options: [
          "Transport (Layer 4)",
          "Network (Layer 3)",
          "Data Link (Layer 2)",
          "Application (Layer 7)",
        ],
        correct: 0,
        subject: "Computer Science",
        difficulty: "Medium",
      };

      const sanitized = sanitizeQuestion(q);
      expect(sanitized.options?.[0]).toBe("Transport (Layer 4)");
    });

    it("ensures curated lesson questions have no hints and clean options", () => {
      const questions = getQuestionsForLesson("General Studies");
      expect(questions.length).toBeGreaterThan(0);
      questions.forEach((q) => {
        expect(q.hint).toBeUndefined();
        // Check that options don't have single outlier parentheses
        const withParens = (q.options || []).filter(opt => /\([^)]+\)/.test(opt));
        if (withParens.length > 0) {
          expect(withParens.length).toBe((q.options || []).length);
        }
      });
    });
  });
});
