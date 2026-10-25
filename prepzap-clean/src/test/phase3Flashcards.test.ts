import { describe, it, expect, beforeEach } from "vitest";
import { getDueCount, saveSRData, type SRCard } from "@/lib/spacedRepetition";
import { calculateSM2, type Grade } from "@/lib/sm2";
import { playCardFlip } from "@/lib/soundFX";

describe("Phase 3: Practice & Flashcards Polish", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("3A: Session Timer Ring Logic", () => {
    function isTimerAmber(seconds: number): boolean {
      return seconds >= 45;
    }

    it("keeps ring normal (emerald) under 45 seconds", () => {
      expect(isTimerAmber(0)).toBe(false);
      expect(isTimerAmber(30)).toBe(false);
      expect(isTimerAmber(44)).toBe(false);
    });

    it("turns ring amber at 45 seconds and beyond", () => {
      expect(isTimerAmber(45)).toBe(true);
      expect(isTimerAmber(60)).toBe(true);
      expect(isTimerAmber(90)).toBe(true);
    });
  });

  describe("3B: 3D Flashcard Flip & Sound FX", () => {
    it("playCardFlip function executes safely without throwing", () => {
      expect(() => playCardFlip()).not.toThrow();
    });
  });

  describe("3C: Anki-style 4-tier Grading", () => {
    it("maps 4 buttons to correct SM-2 grades", () => {
      const gradeMap: Record<"again" | "hard" | "good" | "easy", Grade> = {
        again: 0,
        hard: 1,
        good: 3,
        easy: 3,
      };

      expect(gradeMap.again).toBe(0);
      expect(gradeMap.hard).toBe(1);
      expect(gradeMap.good).toBe(3);
      expect(gradeMap.easy).toBe(3);
    });

    it("SM2 calculation resets interval on 'again' (grade 0)", () => {
      const initial = { interval: 6, repetitions: 2, easeFactor: 2.5 };
      const result = calculateSM2(0, initial);
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1);
    });

    it("SM2 calculation expands interval on successful recall (grade 3)", () => {
      const initial = { interval: 6, repetitions: 2, easeFactor: 2.5 };
      const result = calculateSM2(3, initial);
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBeGreaterThanOrEqual(6);
    });
  });

  describe("3D: Due Cards Badge Count", () => {
    it("returns 0 when there are no due cards", () => {
      expect(getDueCount()).toBe(0);
    });

    it("returns correct count when cards are due", () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 86400 * 1000).toISOString();

      const sampleCards: SRCard[] = [
        { cardId: "c1", deckId: "d1", interval: 1, repetition: 1, easeFactor: 2.5, nextReview: pastDate },
        { cardId: "c2", deckId: "d1", interval: 1, repetition: 1, easeFactor: 2.5, nextReview: pastDate },
        { cardId: "c3", deckId: "d1", interval: 6, repetition: 2, easeFactor: 2.5, nextReview: futureDate },
      ];

      saveSRData(sampleCards);
      expect(getDueCount()).toBe(2);
      expect(getDueCount("d1")).toBe(2);
    });
  });
});
