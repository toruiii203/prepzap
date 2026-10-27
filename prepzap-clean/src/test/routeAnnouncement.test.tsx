import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { RouteAnnouncement } from "@/components/RouteAnnouncement";
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("route announcements", () => {
  it("updates the page title and a short live region without moving focus", async () => {
    const rect = { x: 0, y: 0, width: 200, height: 40, top: 0, left: 0, right: 200, bottom: 40, toJSON: () => ({}) };
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(Object.assign([rect], { item: () => rect }));
    function Nav() { const navigate = useNavigate(); return <button onClick={() => navigate("/progress")}>Progress</button>; }
    render(<MemoryRouter initialEntries={["/practice"]}><Nav /><RouteAnnouncement /><div data-motion-page><Routes><Route path="/practice" element={<main><h1>Practice</h1></main>} /><Route path="/progress" element={<main><h1>Your study progress</h1></main>} /></Routes></div></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe("Practice · Studenius"));
    const button = screen.getByRole("button", { name: "Progress" });
    button.focus(); fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Your study progress"));
    expect(document.title).toBe("Your study progress · Studenius");
    expect(button).toHaveFocus();
  });
});
