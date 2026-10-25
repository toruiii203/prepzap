import { describe, it, expect } from "vitest";
import { isStreakAtRisk, getHoursUntilMidnight, getComboTier } from "@/lib/streakRisk";

describe("Phase 2: streakRisk & combo system", () => {
  describe("isStreakAtRisk", () => {
    it("returns true only when user has active streak, has not studied today, and time is 8pm (20:00) or later", () => {
      // 8:00 PM (20:00)
      expect(isStreakAtRisk(3, false, 20)).toBe(true);
      // 11:30 PM (23:00)
      expect(isStreakAtRisk(1, false, 23)).toBe(true);
      // 10-day streak
      expect(isStreakAtRisk(10, false, 21)).toBe(true);
    });

    it("returns false if user has already studied today (streak is protected)", () => {
      expect(isStreakAtRisk(3, true, 20)).toBe(false);
      expect(isStreakAtRisk(1, true, 23)).toBe(false);
      expect(isStreakAtRisk(15, true, 22)).toBe(false);
    });

    it("returns false before 8:00 PM (20:00)", () => {
      expect(isStreakAtRisk(3, false, 19)).toBe(false);
      expect(isStreakAtRisk(3, false, 14)).toBe(false);
      expect(isStreakAtRisk(3, false, 8)).toBe(false);
    });

    it("returns false if user has 0 streak days", () => {
      expect(isStreakAtRisk(0, false, 21)).toBe(false);
      expect(isStreakAtRisk(-1, false, 22)).toBe(false);
    });
  });

  describe("getHoursUntilMidnight", () => {
    it("returns an integer between 1 and 24", () => {
      const hours = getHoursUntilMidnight();
      expect(Number.isInteger(hours)).toBe(true);
      expect(hours).toBeGreaterThanOrEqual(1);
      expect(hours).toBeLessThanOrEqual(24);
    });
  });

  describe("getComboTier", () => {
    it("returns no tier for streaks under 3", () => {
      expect(getComboTier(0).icon).toBe("");
      expect(getComboTier(1).icon).toBe("");
      expect(getComboTier(2).icon).toBe("");
    });

    it("returns standard combo bonus for streak of 3", () => {
      const tier = getComboTier(3);
      expect(tier.icon).toBe("bolt");
      expect(tier.label).toContain("COMBO BONUS");
    });

    it("returns mega combo bonus for streak of 4", () => {
      const tier = getComboTier(4);
      expect(tier.icon).toBe("local_fire_department");
      expect(tier.label).toContain("MEGA COMBO BONUS");
    });

    it("returns ultra combo bonus for streak of 5 or more", () => {
      const tier5 = getComboTier(5);
      expect(tier5.icon).toBe("bolt");
      expect(tier5.label).toContain("ULTRA COMBO BONUS");

      const tier8 = getComboTier(8);
      expect(tier8.icon).toBe("bolt");
      expect(tier8.label).toContain("ULTRA COMBO BONUS");
    });
  });
});
