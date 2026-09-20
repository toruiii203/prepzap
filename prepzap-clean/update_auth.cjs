const fs = require('fs');
let content = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

if (!content.includes('studenius:streak-updated')) {
  const replacement = `  // Listen for streak updates from useStudyTimeTracker / bumpStreakIfNeeded
  useEffect(() => {
    const handleStreakUpdate = (e: any) => {
      if (e.detail?.newStreak !== undefined) {
        setProfile((prev: any) => prev ? { ...prev, streak_days: e.detail.newStreak } : prev);
      }
    };
    window.addEventListener("studenius:streak-updated", handleStreakUpdate);
    return () => window.removeEventListener("studenius:streak-updated", handleStreakUpdate);
  }, []);

  return (`;
  
  content = content.replace('  return (', replacement);
  fs.writeFileSync('src/contexts/AuthContext.tsx', content, 'utf8');
}
