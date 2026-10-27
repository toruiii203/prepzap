import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Mascot } from "@/components/Mascot";
import { mascotMovements, nextTapMovement, type MascotMovement } from "@/lib/mascotMovement";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
vi.mock("@/lib/soundFX", () => ({ playPop: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); preference.reduced = false; });
describe("independent seedling gestures", () => {
  it.each(Object.keys(mascotMovements) as MascotMovement[])("plays %s once without changing the expression", movement => {
    vi.useFakeTimers();
    const { container, unmount } = render(<Mascot mood="thinking" movement={movement} />);
    expect(container.querySelector("svg")).toHaveAttribute("data-pose", "thinking");
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", movement);
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "rest");
    expect(container.querySelector("svg")).toHaveAttribute("data-pose", "thinking");
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
  it("replays the same gesture and cancels an interrupted gesture", () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Mascot mood="thinking" movement="dance" reactionKey={0} />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<Mascot mood="thinking" movement="wave" reactionKey={1} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "rest");
    rerender(<Mascot mood="thinking" movement="wave" reactionKey={2} />);
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "wave");
    act(() => vi.advanceTimersByTime(1000));
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "rest");
  });
  it("keeps reduced-motion expressions static without gesture timers", () => {
    vi.useFakeTimers(); preference.reduced = true;
    const { container } = render(<Mascot mood="thinking" movement="dance" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "rest");
    expect(container.querySelector("svg")).toHaveAttribute("data-pose", "thinking");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("distinguishes cheering from a happy hop", () => {
    const { container, rerender } = render(<Mascot mood="cheering" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "cheer");
    rerender(<Mascot mood="happy" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-movement", "hop");
  });
  it("does not repeat the preceding tap reaction, even with the same random value", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(nextTapMovement("wave")).not.toBe("wave");
    const { container } = render(<Mascot interactive />);
    fireEvent.click(screen.getByRole("button"));
    const first = container.querySelector("svg")?.getAttribute("data-movement");
    fireEvent.click(screen.getByRole("button"));
    expect(container.querySelector("svg")?.getAttribute("data-movement")).not.toBe(first);
  });
});
