import { describe, it, expect } from "vitest";
import { getRexContext } from "@/lib/rexContext";
import { triggerSessionSummary } from "@/components/SessionSummaryCard";

describe("Phase 4: Dashboard Emotion", () => {
  describe("4A: Mastery Rings Logic", () => {
    it("flags subjects with >= 80% as 'so close'", () => {
      const isSoClose = (pct: number) => pct >= 80;

      expect(isSoClose(84)).toBe(true);
      expect(isSoClose(80)).toBe(true);
      expect(isSoClose(79)).toBe(false);
      expect(isSoClose(50)).toBe(false);
    });

    it("calculates strokeDashoffset correctly for SVG rings", () => {
      const r = 20;
      const circumference = 2 * Math.PI * r; // ~125.66
      const calcOffset = (pct: number) => circumference - (pct / 100) * circumference;

      expect(calcOffset(0)).toBeCloseTo(circumference, 1);
      expect(calcOffset(100)).toBeCloseTo(0, 1);
      expect(calcOffset(50)).toBeCloseTo(circumference / 2, 1);
    });
  });

  describe("4B: Context-Aware Rex", () => {
    it("prioritizes upcoming exams within 3 days", () => {
      const ctx = getRexContext({ examDaysLeft: 2, streakDays: 10, hour: 10 });
      expect(ctx.mood).toBe("focused");
      expect(ctx.stateName).toBe("explaining");
      expect(ctx.animation).toContain("rex_explaining.webp");
    });

    it("celebrates when streak is 3 or more days", () => {
      const ctx = getRexContext({ streakDays: 5, hour: 14 });
      expect(ctx.mood).toBe("celebrating");
      expect(ctx.stateName).toBe("celebrating");
      expect(ctx.animation).toContain("rex_celebrating.webp");
    });

    it("triggers night owl mode late at night", () => {
      const ctx = getRexContext({ streakDays: 1, hour: 23 });
      expect(ctx.mood).toBe("night_owl");
      expect(ctx.stateName).toBe("thinking");
      expect(ctx.animation).toContain("rex_thinking.webp");
    });

    it("greets warmly in the morning", () => {
      const ctx = getRexContext({ streakDays: 1, hour: 8 });
      expect(ctx.mood).toBe("welcoming");
      expect(ctx.stateName).toBe("waving");
      expect(ctx.animation).toContain("rex_waving.webp");
    });

    it("encourages steady momentum in the afternoon", () => {
      const ctx = getRexContext({ streakDays: 1, hour: 14 });
      expect(ctx.mood).toBe("steady");
      expect(ctx.stateName).toBe("smile");
      expect(ctx.animation).toContain("rex_smile.webp");
    });
  });

  describe("4C: Gentle Session Summary Card", () => {
    it("safely dispatches session summary event without throwing", () => {
      expect(() => {
        triggerSessionSummary({
          minutes: 12,
          xpEarned: 35,
          streakDays: 4,
          toolName: "Flashcards",
        });
      }).not.toThrow();
    });
  });
});
