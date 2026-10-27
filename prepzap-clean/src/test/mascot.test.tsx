import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { playPop } from "@/lib/soundFX";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
vi.mock("@/lib/soundFX", () => ({ playPop: vi.fn() }));
afterEach(() => { cleanup(); vi.useRealTimers(); preference.reduced = false; vi.clearAllMocks(); });

describe("Studenius seedling mascot", () => {
  const moods: MascotMood[] = ["idle", "happy", "celebrate", "sad", "thinking", "sleepy", "cheering", "encouraging"];
  it.each(moods)("renders %s with independently rigged parts and no image downloads", mood => {
    const { container } = render(<Mascot mood={mood} />);
    expect(container.querySelector('[data-mascot]')).toHaveAttribute('data-mood', mood);
    for (const part of ["body", "eye-left", "eye-right", "eyelid-left", "eyelid-right", "mouth-states", "arm-left", "arm-right", "leaf", "tendril"]) expect(container.querySelector(`[data-layer="${part}"]`)).toBeInTheDocument();
    expect(container.querySelector('img,video,[data-part=cap],[data-part=tail]')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden','true');
  });
  it("provides a named, keyboard-operable button and resets its reaction", () => {
    vi.useFakeTimers();
    const clicked = vi.fn();
    const { container, unmount } = render(<Mascot interactive onClick={clicked} />);
    fireEvent.click(screen.getByRole('button', {name:'Say hello to Studenius mascot'}));
    expect(clicked).toHaveBeenCalledOnce();
    expect(playPop).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-mascot]')).toHaveAttribute('data-mood','happy');
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector('[data-mascot]')).toHaveAttribute('data-mood','idle');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("gets sleepy after inactivity and wakes on interaction", () => {
    vi.useFakeTimers();
    const {container} = render(<Mascot />);
    act(() => vi.advanceTimersByTime(60001));
    expect(container.querySelector('[data-mascot]')).toHaveAttribute('data-mood','sleepy');
    fireEvent.keyDown(window,{key:'Tab'});
    expect(container.querySelector('[data-mascot]')).toHaveAttribute('data-mood','idle');
  });
  it("makes reduced-motion poses static without scheduling blink animation", () => {
    vi.useFakeTimers();preference.reduced = true;
    const {container, unmount} = render(<Mascot mood="thinking" />);
    expect(container.querySelector('[data-mascot]')).toHaveAttribute('data-reduced-motion','true');
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });
  it("exposes an optional informative label instead of decorative content", () => {
    render(<Mascot mood="thinking" label="Preparing your lesson" />);
    expect(screen.getByRole('img', {name:'Preparing your lesson'})).toBeInTheDocument();
  });
});
