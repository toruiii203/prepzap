const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const hookCode = `  // Listen for streak updates from useStudyTimeTracker / bumpStreakIfNeeded
  useEffect(() => {
    const handleStreakUpdate = (e: any) => {
      if (e.detail?.newStreak !== undefined) {
        setProfile((prev: any) => prev ? { ...prev, streak_days: e.detail.newStreak } : prev);
      }
    };
    window.addEventListener("studenius:streak-updated", handleStreakUpdate);
    return () => window.removeEventListener("studenius:streak-updated", handleStreakUpdate);
  }, []);

  const completeOnboarding`;

content = content.replace('  const completeOnboarding', hookCode);

fs.writeFileSync('src/contexts/AuthContext.tsx', content, 'utf8');
