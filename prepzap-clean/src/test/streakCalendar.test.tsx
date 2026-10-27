import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StreakCelebrationModal } from "@/components/StreakCelebrationModal";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student" } }) }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => true }));
vi.mock("@/lib/soundFX", () => ({ playCelebration: vi.fn(), playPop: vi.fn(), triggerHaptic: vi.fn(), isSoundEnabled: () => false }));
vi.mock("canvas-confetti", () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));
afterEach(() => { cleanup(); localStorage.clear(); });
describe("truthful manual streak calendar", () => {
  it("does not invent calendar activity from a five-day count", () => {
    render(<StreakCelebrationModal streakCount={5} onContinue={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Study streak: 5 days" })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-confirmed-study="true"]')).toHaveLength(0);
    expect(screen.getByText("Only confirmed study days are marked.")).toBeInTheDocument();
  });
  it("marks only owned, dated evidence without rewriting stored activity", () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const raw = JSON.stringify([{ user_id: "student", created_at: new Date().toISOString(), duration_minutes: 5 }, { user_id: "student", created_at: yesterday.toISOString(), duration_minutes: 5 }, { user_id: "other", created_at: yesterday.toISOString(), duration_minutes: 5 }]);
    localStorage.setItem("pz_study_sessions", raw);
    render(<StreakCelebrationModal streakCount={5} onContinue={vi.fn()} />);
    expect(document.querySelectorAll('[data-confirmed-study="true"]')).toHaveLength(2);
    expect(localStorage.getItem("pz_study_sessions")).toBe(raw);
  });
});
