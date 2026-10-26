import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { motionTokens, motionVariables } from "@/lib/motionTokens";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
afterEach(() => { cleanup(); preference.reduced = false; });
describe("shared page motion", () => {
  it("provides a consistent scope and tokens without changing its content", () => {
    const { container } = render(<MemoryRouter><PageTransition><h1>Practice</h1><button>Check</button></PageTransition></MemoryRouter>);
    expect(screen.getByRole('heading',{name:'Practice'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Check'})).toBeEnabled();
    expect(container.querySelector('[data-motion-page]')).toHaveStyle({ '--motion-enter': motionVariables['--motion-enter' as keyof typeof motionVariables] });
  });
  it("uses a fade without translation in reduced-motion mode", () => {
    preference.reduced = true;
    const {container} = render(<MemoryRouter><PageTransition><p>Study</p></PageTransition></MemoryRouter>);
    expect(container.querySelector('[data-motion-page]')).toHaveStyle({ transform:'none' });
  });
  it("keeps exit shorter than entry and reuses typed spring configurations", () => {
    expect(motionTokens.exit).toBeLessThan(motionTokens.enter);
    expect(motionTokens.spring.type).toBe('spring');
    expect(motionTokens.sheet.damping).toBeGreaterThan(0);
  });
});
