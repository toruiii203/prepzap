import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { LegacyControlAccessibility } from "@/components/LegacyControlAccessibility";
afterEach(cleanup);
describe("legacy control accessibility bridge", () => {
  it("names icon controls and fields, without overwriting authored labels", () => {
    render(<><LegacyControlAccessibility /><button><span className="material-symbols-outlined">search</span></button><input placeholder="Search notes" /><button aria-label="Search library"><span className="material-symbols-outlined">search</span></button><button title="Search your sources"><span className="material-symbols-outlined">search</span></button></>);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search library" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search your sources" })).toHaveAttribute("title", "Search your sources");
  });
  it("updates dynamic icon actions instead of leaving a stale accessible name", async () => {
    function TimerControl() { const [running, setRunning] = useState(false); return <><LegacyControlAccessibility /><button onClick={() => setRunning(value => !value)}><span className="material-symbols-outlined">{running ? "pause" : "play_arrow"}</span></button></>; }
    render(<TimerControl />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("button", { name: "Pause" })).toBeInTheDocument();
  });
  it("handles newly inserted controls and removes its own attributes on cleanup", async () => {
    const { rerender } = render(<><LegacyControlAccessibility /><div /></>);
    rerender(<><LegacyControlAccessibility /><button><svg className="lucide lucide-camera" /></button></>);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Capture notes" })).toBeInTheDocument();
    rerender(<><button><svg className="lucide lucide-camera" /></button></>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-label");
  });
  it("preserves native labels and does not guess unsupported icons", () => {
    render(<><LegacyControlAccessibility /><label htmlFor="topic">Topic</label><input id="topic" placeholder="Example" /><button><span className="material-symbols-outlined">unrecognized</span></button></>);
    expect(screen.getByRole("textbox", { name: "Topic" })).not.toHaveAttribute("aria-label");
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-label");
  });
});
