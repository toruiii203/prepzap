# Studenius route motion audit

Before: first polish pass (`35623aa7`). After: this redesign.

**Coverage:** all 57 route patterns enter the shared motion boundary. Eight are redirects and inherit their destination; 49 render pages. Route-level Suspense uses AppSkeleton, and route bundles are lazy-loaded. Public pages and the 404 now have the same boundary as protected pages.

The boundary supplies entry/exit, press/hover states, staggered lists/cards and reduced-motion behavior. Shared tabs, progress, counters, dialogs and sheets use the same tokens when present. A small real-data XP/streak summary supplies shared counters on study pages; focused quiz flows keep their existing counters. Features that do not exist on a route are not fabricated.

This is shared UI coverage, not proof of live authentication, quiz generation, realtime rooms, or database persistence. The stricter fixture smoke runner also records console errors and reports the existing Analytics setter defect.

| Route | Before | After |
|---|---|---|
| `/` | Redirect | Destination motion |
| `/landing` | No shared transition | Shared entry/exit + interaction scope |
| `/login` | Redirect | Destination motion |
| `/signup` | Redirect | Destination motion |
| `/privacy` | No shared transition | Shared entry/exit + interaction scope |
| `/terms` | No shared transition | Shared entry/exit + interaction scope |
| `/onboarding` | No shared transition | Shared entry/exit + interaction scope |
| `/auth/callback` | No shared transition | Shared entry/exit + interaction scope |
| `/invite/:code` | No shared transition | Shared entry/exit + interaction scope |
| `/flashcards/shared/:id` | No shared transition | Shared entry/exit + interaction scope |
| `/share/:type/:slug` | No shared transition | Shared entry/exit + interaction scope |
| `/dashboard` | Shared entry | Shared entry/exit + interaction scope |
| `/practice` | Shared entry | Shared entry/exit + interaction scope |
| `/flashcards` | Shared entry | Shared entry/exit + interaction scope |
| `/timer` | Shared entry | Shared entry/exit + interaction scope |
| `/analytics` | Shared entry | Shared entry/exit + interaction scope |
| `/planner` | Shared entry | Shared entry/exit + interaction scope |
| `/ai-tutor` | Shared entry | Shared entry/exit + interaction scope |
| `/call` | Shared entry | Shared entry/exit + interaction scope |
| `/tools` | Shared entry | Shared entry/exit + interaction scope |
| `/profile` | Shared entry | Shared entry/exit + interaction scope |
| `/leaderboard` | Shared entry | Shared entry/exit + interaction scope |
| `/challenges` | Shared entry | Shared entry/exit + interaction scope |
| `/friends` | Shared entry | Shared entry/exit + interaction scope |
| `/community` | Shared entry | Shared entry/exit + interaction scope |
| `/campus-vault` | Shared entry | Shared entry/exit + interaction scope |
| `/vault` | Redirect | Destination motion |
| `/teach-it` | Shared entry | Shared entry/exit + interaction scope |
| `/quick-study` | Shared entry | Shared entry/exit + interaction scope |
| `/math` | Shared entry | Shared entry/exit + interaction scope |
| `/sources` | Shared entry | Shared entry/exit + interaction scope |
| `/source-library` | Shared entry | Shared entry/exit + interaction scope |
| `/settings` | Shared entry | Shared entry/exit + interaction scope |
| `/cram` | Redirect | Destination motion |
| `/recall` | Redirect | Destination motion |
| `/visual-learner` | Shared entry | Shared entry/exit + interaction scope |
| `/notes` | Shared entry | Shared entry/exit + interaction scope |
| `/avatar` | Shared entry | Shared entry/exit + interaction scope |
| `/shop` | Shared entry | Shared entry/exit + interaction scope |
| `/pro` | Shared entry | Shared entry/exit + interaction scope |
| `/admin` | Shared entry | Shared entry/exit + interaction scope |
| `/high-yield` | Redirect | Destination motion |
| `/mistakes` | Shared entry | Shared entry/exit + interaction scope |
| `/rooms` | Shared entry | Shared entry/exit + interaction scope |
| `/live-battle` | Redirect | Destination motion |
| `/arena` | Shared entry | Shared entry/exit + interaction scope |
| `/arena/room/:code` | Shared entry | Shared entry/exit + interaction scope |
| `/arena/quiz/:code` | Shared entry | Shared entry/exit + interaction scope |
| `/arena/results/:code` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade/memory-match` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade/true-false` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade/termle` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade/anagram-sprint` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade/whack-a-mole` | Shared entry | Shared entry/exit + interaction scope |
| `/arcade/odd-one-out` | Shared entry | Shared entry/exit + interaction scope |
| `*` | No shared transition | Shared entry/exit + interaction scope |
