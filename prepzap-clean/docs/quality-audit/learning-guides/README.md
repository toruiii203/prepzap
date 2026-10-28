# Learning guides and topic paths

## What changed

- Arena now shows its daily challenge and leaderboard, with an Open Live battles link to `/rooms`. Removed the duplicate Exam Rooms listing, creation/join dialogs and their unused Arena-only queries/subscriptions. Existing room routes and stored room data remain intact.
- Dashboard → Guidebook now opens a lazy-loaded topic library instead of navigating to Quick Study. Nine curated starter topics contain 28 chapters: an explanation, worked example and three-option check. Subjects: Math, Biology, Science, English, History, Computing and Study skills.
- Each topic has a chapter path with the existing animated Seedling. Chapters are freely readable; wrong checks offer an explanation and retry. Correct checks mark a visit-only check. They do not award XP, unlock existing lessons, write cloud progress or modify quiz scores.
- Closing and reopening Guidebook retains checks while Dashboard stays mounted. Reloading or leaving Dashboard resets them. No new localStorage/sessionStorage keys are used for reading checks, per the user's choice.
- The shared tutorial now presents one step at a time with Next, Back, Escape and focus trapping/restoration. Where a real target exists, a spotlight points to it. Missing targets use a centered card.
- Page guide is replayable throughout the signed-in app layout. Fourteen existing page tours retain their existing seen flags; eight additional pages have contextual guidance, and other signed-in pages receive basic navigation help. Active quiz screens hide the launcher. First-visit guidance waits while a dialog, victory screen or quiz is active.
- Onboarding reuses its existing story and SVG assets, adding short scene fades and neutral Seedling reactions to selections. Correctness is revealed only after checking. The approved welcome copy, Google entry action, consent, question bank and auth controller are unchanged.

## Reference-video findings

References were inspected locally, not shipped as application assets:

1. `Screen Recording 2026-10-27 221346.mp4` (4.47s): sequential tooltips point to Filter and Settings; Next/Got it controls keep attention on one action. Adapted as real-control spotlights with keyboard dismissal and replay.
2. `az_recorder_20261027_000912.mp4` (50.4s): 0–24s voice recall and permission fallback; 28–36s grouped topic path; 40–46s topic selection. Adapted the topic → chapter → check pattern. No microphone API or permission-flow changes were added.
3. `az_recorder_20261027_000251 (1).mp4` (99s): 8–48s single-intent selection screens; 56–64s synthesis animation; 72–96s short structured lessons. Adapted selection reactions, readable explanations and worked checks. Artificial scanning delays, grade forecasts and competitor art were not reproduced.

## Scope and limits

The new library is a curated starter collection, not a generator for arbitrary uploaded notes. Source Library remains available for personal material. No database schema, auth, paid endpoint, reward policy or existing practice launch behavior was changed. No dependencies were added. Existing SpringButton, Mascot, StudyObject, motion tokens, reduced-motion hook, sound settings and Radix Dialog are reused.

These are targeted improvements, not a redesign of every route. Public/auth pages do not receive the signed-in Page guide launcher. Page guides beyond the specific control tours use explanatory cards rather than claiming to highlight controls that do not exist.

## Verification

- Install: `npm install --ignore-scripts` passed; lockfile unchanged.
- Build: passed with fixture Supabase environment values; existing chunk-size warning remains.
- Unit tests: 185 passing across 33 files, including seven new tests for topic content, retry/correct behavior, visit-only reset, close/reopen retention, one-step tutorials, replay and route aliases.
- Touched-file lint: zero errors, one existing StudyPathMap fast-refresh warning.
- Repository-wide lint: 316 errors / 72 warnings remain outside this change's errors. Type check: 67 existing errors remain; none in touched files. These checks are not globally clean.
- Route smoke: 57/57 patterns passed with HTTP/auth/realtime fixtures.
- Onboarding: ten viewport/theme combinations plus returning-account redirect passed; 17 standalone story scenarios passed.
- Ten learning-guide browser cases passed and are recorded in `browser-results.json`. They cover 320px phones, short phones, desktop and small landscape in both themes, correct/wrong checks, close/reopen/reload, storage invariants, Arena room-query removal, Live battles navigation and reduced-motion guidance.

Browser verification uses actual built UI and real curated chapter content, with fixture accounts and service responses. Google sign-in, live Supabase data, multiplayer synchronization and Cloudflare deployment status were not tested against production. Screenshots are Chromium captures, not physical iOS Safari tests.

## Phone review

1. Dashboard → Guidebook → Math → Integral basics: read, try an incorrect answer, retry correctly, close/reopen, then reload to verify the reset.
2. Open Page guide, use Next/Back/Got it and reopen it. Check highlighted controls and short-landscape scrolling.
3. Arena: confirm the duplicate rooms block is gone; Open Live battles should reach the existing rooms page.
4. Onboarding: check subject/goal reactions, readable text, Google entry button and Back navigation.
5. Check dark mode, reduced motion, mute settings and safe-area spacing in iOS Safari/PWA. Browser vibration is unavailable in iOS Safari; visual feedback remains.

## Captures

- [Phone topic path](phone-topic-path.png)
- [Desktop topic path](desktop-topic-path.png)
- [Phone page guide](phone-page-guide.png)
- [Arena in dark mode](phone-arena-dark.png)
