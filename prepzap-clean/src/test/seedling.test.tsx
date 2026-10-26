import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Mascot, type MascotArtwork, type MascotMood } from "@/components/Mascot";
import { motionTokens } from "@/lib/motionTokens";
import { SeedlingArtwork } from "../../design/seedling/SeedlingArtwork";

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
vi.mock("@/lib/soundFX", () => ({ playPop: vi.fn() }));
const artwork: MascotArtwork = { render: state => <SeedlingArtwork {...state} />, aspectRatio: "1 / 1", blinkInterval: motionTokens.seedlingBlink };
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); preference.reduced = false; });

describe("seedling review artwork using the existing Mascot controller", () => {
  const moods: MascotMood[] = ["idle", "happy", "thinking", "celebrate", "sleepy", "encourage", "peek"];
  it.each(moods)("renders %s as a small, independent vector rig", mood => {
    const { container } = render(<Mascot mood={mood} artwork={artwork} />);
    expect(container.querySelector("svg")).toHaveAttribute("data-pose", mood);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 400 400");
    for (const part of ["shadow", "feet-left", "feet-right", "body-lower", "body", "arm-left", "arm-right", "blush-left", "blush-right", "eye-left", "eye-right", "eyelid-left", "eyelid-right", "mouth-states", "leaf", "tendril", "sprout-stem"]) {
      expect(container.querySelector(`[data-layer="${part}"]`)).toHaveAttribute("id");
    }
    expect(container.querySelector("image,img,video,filter,linearGradient,radialGradient,foreignObject")).toBeNull();
    expect(container.querySelector('[data-part="cap"]')).toBeNull();
    expect(new TextEncoder().encode(renderToStaticMarkup(<SeedlingArtwork mood={mood} blink={false} reduced={false} />)).length).toBeLessThan(10_000);
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("uses unique layer ids when multiple moods are displayed", () => {
    const { container } = render(<><Mascot artwork={artwork} /><Mascot artwork={artwork} /></>);
    const ids = [...container.querySelectorAll("[id]")].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("uses the existing tap reaction and cleans up timers", () => {
    vi.useFakeTimers();
    const { container, unmount } = render(<Mascot artwork={artwork} interactive label="Say hello to the seedling" />);
    fireEvent.click(screen.getByRole("button", { name: "Say hello to the seedling" }));
    expect(container.querySelector("svg")).toHaveAttribute("data-pose", "happy");
    act(() => vi.advanceTimersByTime(motionTokens.reaction * 1000 + 1));
    expect(container.querySelector("svg")).toHaveAttribute("data-pose", "idle");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("uses the seedling blink cadence and respects reduced motion", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { container, rerender, unmount } = render(<Mascot mood="thinking" artwork={artwork} />);
    act(() => vi.advanceTimersByTime(2999));
    expect(container.querySelector("svg")).toHaveAttribute("data-blink", "false");
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector("svg")).toHaveAttribute("data-blink", "true");
    preference.reduced = true;
    rerender(<Mascot mood="thinking" artwork={artwork} />);
    expect(container.querySelector("[data-mascot]")).toHaveAttribute("data-reduced-motion", "true");
    expect(container.querySelector("svg")).toHaveAttribute("data-blink", "false");
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    vi.restoreAllMocks();
  });
  it("stops scheduled animation work when offscreen", () => {
    vi.useFakeTimers();
    let notify: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof notify) { notify = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const { container, unmount } = render(<Mascot mood="thinking" artwork={artwork} />);
    act(() => notify([{ isIntersecting: false }]));
    expect(container.querySelector("[data-mascot]")).toHaveAttribute("data-paused", "true");
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
