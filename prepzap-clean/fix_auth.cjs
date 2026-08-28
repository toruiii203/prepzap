const fs = require('fs');
let c = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const replacement = `
        if (import.meta.env.DEV) {
          console.log("DEV MODE: Injecting mock user");
          const mockUser = {
            id: "mock-user-123",
            email: "mock@example.com",
            user_metadata: { full_name: "Mock User (Offline PRO)" },
            app_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString()
          };
          const mockSession = {
            access_token: "mock-token",
            user: mockUser,
            expires_at: Date.now() + 9999999
          };
          setSession(mockSession);
          cachedSession = mockSession;
          setUser(mockUser);
          setProfile({
            id: "mock-user-123",
            full_name: "Mock User (Offline PRO)",
            email: "mock@example.com",
            plan: "pro",
            credits_remaining: 9999,
            total_xp: 5000,
            streak_days: 0,
            daily_goal_minutes: 60,
            questions_answered: 100,
            accuracy_percent: 85,
          });
          setNeedsOnboarding(false);
          setLoading(false);
          return;
        }

        const {
          data: { session: s },
`;

c = c.replace('const {\n          data: { session: s },', replacement);

// And we need to ignore onAuthStateChange in DEV
const subReplacement = `
    if (import.meta.env.DEV) {
      const subscription = { unsubscribe: () => {} };
      return () => {
        cancelled = true;
        subscription.unsubscribe();
      };
    }

    const {
`;
c = c.replace('const {\n      data: { subscription },\n    } = supabase.auth.onAuthStateChange', subReplacement);

fs.writeFileSync('src/contexts/AuthContext.tsx', c);
