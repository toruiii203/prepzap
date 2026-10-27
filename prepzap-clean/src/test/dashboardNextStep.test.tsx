import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DashboardGreeting } from "@/components/DashboardGreeting";
vi.mock("@/components/EntryStreakHost",()=>({default:()=> <div>Earned celebration host</div>}));
afterEach(cleanup);
it("removes the persistent encouragement banner while retaining earned celebrations",async()=>{
 render(<DashboardGreeting/>);expect(await screen.findByText("Earned celebration host")).toBeInTheDocument();expect(screen.queryByRole("complementary")).toBeNull();expect(screen.queryByRole("button",{name:"Find my next lesson"})).toBeNull();
});
