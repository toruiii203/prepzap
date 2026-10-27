# Route audit

All 57 route patterns are exercised with HTTP/auth/realtime fixtures. This verifies route rendering, not production service correctness. The deeper 26-sample visual/control audit covers the 13 named core pages in QUALITY_AUDIT.md.

| Route pattern | Before | Current smoke |
| --- | --- | --- |
| `/` | Rendered | Passed |
| `/landing` | Rendered | Passed |
| `/login` | Rendered | Passed |
| `/signup` | Rendered | Passed |
| `/privacy` | Rendered | Passed |
| `/terms` | Rendered | Passed |
| `/onboarding` | Rendered | Passed |
| `/auth/callback` | Rendered | Passed |
| `/invite/:code` | Rendered | Passed |
| `/flashcards/shared/:id` | Rendered | Passed |
| `/share/:type/:slug` | Rendered | Passed |
| `/dashboard` | Rendered | Passed |
| `/practice` | Rendered | Passed |
| `/flashcards` | Rendered | Passed |
| `/timer` | Rendered | Passed |
| `/analytics` | Failed: undefined setters | Passed |
| `/planner` | Rendered | Passed |
| `/ai-tutor` | Rendered | Passed |
| `/call` | Rendered | Passed |
| `/tools` | Rendered | Passed |
| `/profile` | Rendered | Passed |
| `/leaderboard` | Rendered | Passed |
| `/challenges` | Rendered | Passed |
| `/friends` | Rendered | Passed |
| `/community` | Rendered | Passed |
| `/campus-vault` | Rendered | Passed |
| `/vault` | Rendered | Passed |
| `/teach-it` | Rendered | Passed |
| `/quick-study` | Rendered | Passed |
| `/math` | Rendered | Passed |
| `/sources` | Rendered | Passed |
| `/source-library` | Rendered | Passed |
| `/settings` | Rendered | Passed |
| `/cram` | Rendered | Passed |
| `/recall` | Rendered | Passed |
| `/visual-learner` | Rendered | Passed |
| `/notes` | Rendered | Passed |
| `/avatar` | Rendered | Passed |
| `/shop` | Rendered | Passed |
| `/pro` | Rendered | Passed |
| `/admin` | Rendered | Passed |
| `/high-yield` | Rendered | Passed |
| `/mistakes` | Rendered | Passed |
| `/rooms` | Rendered | Passed |
| `/live-battle` | Rendered | Passed |
| `/arena` | Rendered | Passed |
| `/arena/room/:code` | Rendered | Passed |
| `/arena/quiz/:code` | Rendered | Passed |
| `/arena/results/:code` | Rendered | Passed |
| `/arcade` | Rendered | Passed |
| `/arcade/memory-match` | Rendered | Passed |
| `/arcade/true-false` | Rendered | Passed |
| `/arcade/termle` | Rendered | Passed |
| `/arcade/anagram-sprint` | Rendered | Passed |
| `/arcade/whack-a-mole` | Rendered | Passed |
| `/arcade/odd-one-out` | Rendered | Passed |
| `*` | Rendered | Passed |
