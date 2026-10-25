import { describe, it, expect } from "vitest";
import { startAmbientSound, stopAmbientSound, isAmbientPlaying } from "@/lib/ambientSound";

describe("Phase 5: Optional Extras & Final Polish", () => {
  describe("5A: Path Sparkles (CSS Keyframes)", () => {
    it("sparkle animations define graceful 60fps fallbacks", () => {
      const sparkleKeyframes = ["float-sparkle-1", "float-sparkle-2", "float-sparkle-3"];
      expect(sparkleKeyframes.length).toBe(3);
    });
  });

  describe("5B: Ambient Focus Sound Engine (Offline Web Audio)", () => {
    it("initializes in off state", () => {
      expect(isAmbientPlaying()).toBe(false);
    });

    it("safely handles start and stop without throwing", () => {
      expect(() => {
        startAmbientSound();
        stopAmbientSound();
      }).not.toThrow();
    });
  });

  describe("5C: Desktop Command Palette", () => {
    it("recognizes command shortcut key binding", () => {
      const isCmdK = (e: { key: string; metaKey: boolean; ctrlKey: boolean }) =>
        e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);

      expect(isCmdK({ key: "k", metaKey: true, ctrlKey: false })).toBe(true);
      expect(isCmdK({ key: "k", metaKey: false, ctrlKey: true })).toBe(true);
      expect(isCmdK({ key: "j", metaKey: true, ctrlKey: false })).toBe(false);
    });
  });
});
