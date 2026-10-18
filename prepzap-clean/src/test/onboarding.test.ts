import { describe, it, expect, beforeEach } from "vitest";
import {
  getDiagnosticQuestion,
  DIAGNOSTIC_QUESTION_BANK,
  getOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  ONBOARDING_DRAFT_KEY,
} from "../lib/onboardingBank";

describe("Onboarding Diagnostic Question Bank", () => {
  it("retrieves Math question accurately with case-insensitivity and trim", () => {
    const q1 = getDiagnosticQuestion("Math");
    const q2 = getDiagnosticQuestion("  math  ");
    expect(q1.question).toBe("What is the slope of the line given by 2y = 4x + 6?");
    expect(q2.question).toBe("What is the slope of the line given by 2y = 4x + 6?");
  });

  it("retrieves Science, English, Biology, and History accurately", () => {
    expect(getDiagnosticQuestion("Science").question).toContain("organelle");
    expect(getDiagnosticQuestion("English").question).toContain("oxymoron");
    expect(getDiagnosticQuestion("Biology").question).toContain("Krebs cycle");
    expect(getDiagnosticQuestion("History").question).toContain("1215 document");
  });

  it("falls back to general question for custom or unknown subjects", () => {
    const q = getDiagnosticQuestion("Advanced Organic Chemistry");
    expect(q.question).toBe(DIAGNOSTIC_QUESTION_BANK.general.question);
  });

  it("shuffles answer choices while properly maintaining correctIndex", () => {
    const q = getDiagnosticQuestion("Math");
    // The correct answer for math is "2"
    expect(q.options[q.correctIndex]).toBe("2");
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain("2");
    expect(q.options).toContain("4");
    expect(q.options).toContain("1/2");
    expect(q.options).toContain("6");
  });
});

describe("Onboarding Draft Persistence & Expiry", () => {
  beforeEach(() => {
    clearOnboardingDraft();
  });

  it("saves and retrieves draft successfully", () => {
    saveOnboardingDraft({
      subject: "Biology",
      firstWinCompleted: true,
      dailyGoalMinutes: 30,
      streakTargetDays: 14,
    });

    const draft = getOnboardingDraft();
    expect(draft).not.toBeNull();
    expect(draft?.subject).toBe("Biology");
    expect(draft?.firstWinCompleted).toBe(true);
    expect(draft?.dailyGoalMinutes).toBe(30);
    expect(draft?.streakTargetDays).toBe(14);
  });

  it("expires draft older than 24 hours to protect shared computers", () => {
    const expiredDraft = {
      version: 2,
      timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      subject: "Chemistry",
      firstWinCompleted: true,
      dailyGoalMinutes: 15,
      streakTargetDays: 7,
      ageConfirmed: true,
      audioMuted: false,
    };
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(expiredDraft));

    const retrieved = getOnboardingDraft();
    expect(retrieved).toBeNull();
    expect(localStorage.getItem(ONBOARDING_DRAFT_KEY)).toBeNull();
  });

  it("clears draft completely on clearOnboardingDraft", () => {
    saveOnboardingDraft({ subject: "Calculus" });
    expect(getOnboardingDraft()).not.toBeNull();
    clearOnboardingDraft();
    expect(getOnboardingDraft()).toBeNull();
  });
});
