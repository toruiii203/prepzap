import { useAuth } from "@/contexts/AuthContext";
import { AnimatedNumber } from "@/components/AnimatedNumber";

/** A small, shared read-only summary uses real profile data across study pages. */
export function StudyStatus() {
  const { profile } = useAuth();
  const xp = profile?.total_xp || 0;
  const streak = profile?.streak_days || 0;
  if (!xp && !streak) return null;
  return (
    <div className="study-status" aria-label="Your study progress">
      {streak > 0 && <span><span aria-hidden="true" className="material-symbols-outlined animate-flame">local_fire_department</span><AnimatedNumber value={streak} /> day streak</span>}
      {xp > 0 && <span><span aria-hidden="true" className="material-symbols-outlined">bolt</span><AnimatedNumber value={xp} /> XP</span>}
    </div>
  );
}
