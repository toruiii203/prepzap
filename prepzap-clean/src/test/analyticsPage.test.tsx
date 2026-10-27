import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Analytics from "@/pages/Analytics";
const study = vi.hoisted(() => ({ sessions: [] as { id: string; title: string; duration_minutes: number; created_at: string }[], loading: false, error: null as string | null, refreshStats: vi.fn() }));
vi.mock("@/hooks/useStudyStats", () => ({ useStudyStats: () => study }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student" }, profile: { streak_days: 3 } }) }));
vi.mock("@/components/SharedSidebar", () => ({ SharedSidebar: () => <nav aria-label="Study navigation" /> }));
vi.mock("@/lib/soundFX", () => ({ playTap: vi.fn(), playPop: vi.fn() }));
afterEach(() => { cleanup(); study.sessions = []; study.loading = false; study.error = null; vi.clearAllMocks(); localStorage.clear(); });
describe("working analytics page", () => {
  const show = () => render(<MemoryRouter><Analytics /></MemoryRouter>);
  it("renders one responsive heading and an actionable empty state", () => {
    show(); expect(screen.getAllByRole("heading", { name: "Your study progress" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Start practicing" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Share progress" })).toBeNull();
    expect(screen.queryByText(/unlock/i)).toBeNull();
  });
  it("uses the existing hook for refresh and real totals", () => {
    study.sessions = [{ id: "1", title: "Cell biology", duration_minutes: 45, created_at: new Date(Date.now() - 1000).toISOString() }];
    show(); expect(screen.getByRole("heading", { name: "Cell biology" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" })); expect(study.refreshStats).toHaveBeenCalledOnce();
    expect(screen.getAllByText("45 min").length).toBeGreaterThan(0);
  });
  it("uses loading skeletons without presenting an empty record count", () => {
    study.loading = true; show();
    expect(screen.getByRole("status", { name: "Loading weekly activity" })).toBeInTheDocument();
    expect(screen.queryByText("A little practice starts here")).toBeNull();
  });
  it("keeps recorded values visible during a refresh", () => {
    study.sessions = [{ id: "1", title: "Saved biology", duration_minutes: 20, created_at: new Date(Date.now() - 1000).toISOString() }];
    study.loading = true; show();
    expect(screen.getByRole("heading", { name: "Saved biology" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading recent sessions" })).toBeNull();
  });
  it("does not confuse unavailable data with a zero-progress empty state", () => {
    study.error = "Couldn’t refresh your study data."; show();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.queryByText("A little practice starts here")).toBeNull();
  });
  it("shares recorded values and provides a recoverable clipboard failure message", async () => {
    study.sessions = [{ id: "1", title: "Math", duration_minutes: 20, created_at: new Date(Date.now() - 1000).toISOString() }];
    const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    try { show(); fireEvent.click(screen.getByRole("button", { name: "Share progress" })); await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Couldn’t share")); }
    finally { if (original) Object.defineProperty(navigator, "clipboard", original); else Reflect.deleteProperty(navigator, "clipboard"); }
  });
});
