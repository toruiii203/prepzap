import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreferenceSwitch } from "@/components/PreferenceSwitch";
const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/usePrefersReducedMotion", () => ({ usePrefersReducedMotion: () => preference.reduced }));
afterEach(() => { cleanup(); preference.reduced = false; });
describe("notification preference switch", () => {
  it("exposes its name and state with a full touch target", () => {
    const change = vi.fn();
    render(<PreferenceSwitch label="Streak reminders" on onChange={change} />);
    const button = screen.getByRole("switch", { name: "Streak reminders", checked: true });
    expect(button).toHaveStyle({ width: "44px", height: "44px" });
    fireEvent.click(button);
    expect(change).toHaveBeenCalledOnce();
  });
  it("removes knob movement transitions when motion is reduced", () => {
    preference.reduced = true;
    const { container } = render(<PreferenceSwitch label="Weekly summary" on={false} onChange={() => {}} />);
    expect(screen.getByRole("switch", { checked: false })).toBeInTheDocument();
    expect(container.querySelector("span span")).toHaveStyle({ transition: "none" });
  });
});
