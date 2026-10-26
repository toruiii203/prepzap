# Studenius route motion audit

Latest correction: navigation now preserves the protected shell and does not wait for exit animations. Route content has its own loading/error boundary. See `PERFORMANCE_FIX.md`.

Before: first polish pass (`35623aa7`). After: this redesign.

**Coverage:** all 57 route patterns enter the shared motion boundary. Eight are redirects and inherit their destination; 49 render pages. Public first loads use AppSkeleton; protected pages load within the existing shell using PageLoading. Route bundles remain lazy-loaded. Public pages and the 404 now have the same boundary as protected pages.

The boundary supplies immediately readable content, press/hover states and reduced-motion behavior. Explicit quiz, tab and modal motion remains; navigation no longer waits for exit animations or global card stagger delays. Shared tabs, progress, counters, dialogs and sheets use the same tokens when present. A small real-data XP/streak summary supplies shared counters on study pages; focused quiz flows keep their existing counters. Features that do not exist on a route are not fabricated.

This is shared UI coverage, not proof of live authentication, quiz generation, realtime rooms, or database persistence. The stricter fixture smoke runner also records console errors and reports the existing Analytics setter defect.

| Route | Before | After |
|---|---|---|
| `/` | Redirect | Destination motion |
| `/landing` | No shared transition | Immediate content + shared interaction scope |
| `/login` | Redirect | Destination motion |
| `/signup` | Redirect | Destination motion |
| `/privacy` | No shared transition | Immediate content + shared interaction scope |
| `/terms` | No shared transition | Immediate content + shared interaction scope |
| `/onboarding` | No shared transition | Immediate content + shared interaction scope |
| `/auth/callback` | No shared transition | Immediate content + shared interaction scope |
| `/invite/:code` | No shared transition | Immediate content + shared interaction scope |
| `/flashcards/shared/:id` | No shared transition | Immediate content + shared interaction scope |
| `/share/:type/:slug` | No shared transition | Immediate content + shared interaction scope |
| `/dashboard` | Shared entry | Immediate content + shared interaction scope |
| `/practice` | Shared entry | Immediate content + shared interaction scope |
| `/flashcards` | Shared entry | Immediate content + shared interaction scope |
| `/timer` | Shared entry | Immediate content + shared interaction scope |
| `/analytics` | Shared entry | Immediate content + shared interaction scope |
| `/planner` | Shared entry | Immediate content + shared interaction scope |
| `/ai-tutor` | Shared entry | Immediate content + shared interaction scope |
| `/call` | Shared entry | Immediate content + shared interaction scope |
| `/tools` | Shared entry | Immediate content + shared interaction scope |
| `/profile` | Shared entry | Immediate content + shared interaction scope |
| `/leaderboard` | Shared entry | Immediate content + shared interaction scope |
| `/challenges` | Shared entry | Immediate content + shared interaction scope |
| `/friends` | Shared entry | Immediate content + shared interaction scope |
| `/community` | Shared entry | Immediate content + shared interaction scope |
| `/campus-vault` | Shared entry | Immediate content + shared interaction scope |
| `/vault` | Redirect | Destination motion |
| `/teach-it` | Shared entry | Immediate content + shared interaction scope |
| `/quick-study` | Shared entry | Immediate content + shared interaction scope |
| `/math` | Shared entry | Immediate content + shared interaction scope |
| `/sources` | Shared entry | Immediate content + shared interaction scope |
| `/source-library` | Shared entry | Immediate content + shared interaction scope |
| `/settings` | Shared entry | Immediate content + shared interaction scope |
| `/cram` | Redirect | Destination motion |
| `/recall` | Redirect | Destination motion |
| `/visual-learner` | Shared entry | Immediate content + shared interaction scope |
| `/notes` | Shared entry | Immediate content + shared interaction scope |
| `/avatar` | Shared entry | Immediate content + shared interaction scope |
| `/shop` | Shared entry | Immediate content + shared interaction scope |
| `/pro` | Shared entry | Immediate content + shared interaction scope |
| `/admin` | Shared entry | Immediate content + shared interaction scope |
| `/high-yield` | Redirect | Destination motion |
| `/mistakes` | Shared entry | Immediate content + shared interaction scope |
| `/rooms` | Shared entry | Immediate content + shared interaction scope |
| `/live-battle` | Redirect | Destination motion |
| `/arena` | Shared entry | Immediate content + shared interaction scope |
| `/arena/room/:code` | Shared entry | Immediate content + shared interaction scope |
| `/arena/quiz/:code` | Shared entry | Immediate content + shared interaction scope |
| `/arena/results/:code` | Shared entry | Immediate content + shared interaction scope |
| `/arcade` | Shared entry | Immediate content + shared interaction scope |
| `/arcade/memory-match` | Shared entry | Immediate content + shared interaction scope |
| `/arcade/true-false` | Shared entry | Immediate content + shared interaction scope |
| `/arcade/termle` | Shared entry | Immediate content + shared interaction scope |
| `/arcade/anagram-sprint` | Shared entry | Immediate content + shared interaction scope |
| `/arcade/whack-a-mole` | Shared entry | Immediate content + shared interaction scope |
| `/arcade/odd-one-out` | Shared entry | Immediate content + shared interaction scope |
| `*` | No shared transition | Immediate content + shared interaction scope |
