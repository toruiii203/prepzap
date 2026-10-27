import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardGreeting } from "@/components/DashboardGreeting";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
vi.mock("@/components/EntryStreakHost", () => ({ default: () => null }));
vi.mock("@/lib/soundFX", () => ({ playTap: vi.fn(), playPop: vi.fn() }));
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
const scroll = vi.fn();
beforeEach(() => { preference.reduced = false; scroll.mockClear(); Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll }); });
afterEach(() => { cleanup(); if (originalScroll) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScroll); else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView"); });
describe("dashboard's clear next step", () => {
  it("finds the actual active path node and moves keyboard focus to it", () => {
    render(<MemoryRouter><DashboardGreeting /><main data-motion-page><button aria-label="Cell biology: active">Lesson</button></main></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Find my next lesson" }));
    expect(screen.getByRole("button", { name: "Cell biology: active" })).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });
  it("uses immediate scrolling for reduced motion", () => {
    preference.reduced = true;
    render(<MemoryRouter><DashboardGreeting /><main data-motion-page><button aria-label="Cell biology: active">Lesson</button></main></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Find my next lesson" }));
    expect(scroll).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });
  it("offers practice if there is no active node, without inventing progress", () => {
    function Location() { return <p>{useLocation().pathname}</p>; }
    render(<MemoryRouter initialEntries={["/dashboard"]}><DashboardGreeting /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Find my next lesson" }));
    expect(screen.getByText("/practice")).toBeInTheDocument();
  });
});
