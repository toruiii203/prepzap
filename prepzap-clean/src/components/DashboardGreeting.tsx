import { useAuth } from "@/contexts/AuthContext";
import { Mascot } from "@/components/Mascot";

export function DashboardGreeting() {
  const { profile } = useAuth();
  return (
    <aside className="dashboard-greeting" aria-label="A little encouragement">
      <Mascot mood={(profile?.streak_days || 0) >= 3 ? "cheering" : "idle"} size="sm" interactive />
      <div><p className="font-bold">A little practice goes a long way.</p><p className="text-sm opacity-75">Pick one thing to work on today.</p></div>
    </aside>
  );
}
