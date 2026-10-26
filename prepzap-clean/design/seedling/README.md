# Studenius seedling — approved option A

This supersedes the fox art direction in `docs/VISUAL_POLISH_PLAN.md`.
The user approved the seedling and **option A (no ground shadow)**. The fox is
retired as a design direction. The first integration is the entry-streak slice;
broad rollout to other screens still requires a later review.

## Review

- `review/preview.html`: download and open this self-contained file in a browser.
  It needs no server, account, API key or illustration downloads.
- `review/moods-light.png` and `review/moods-dark.png`: all seven poses.
- `review/mascot.svg`: standalone static idle artwork, generated from the same
  hand-authored component; no duplicate source geometry.
- The interactive page has theme, static-pose and replay controls. OS reduced
  motion takes precedence. Each character is a keyboard-operable tap target.
- Reference colors with **no ground shadow** are approved. The peach ground
  shadow remains in the comparison only as the rejected alternative. Do not
  enable it in app integrations. Neither option changes app colors.

The supplied mascot image establishes the cream seed-bean, peach lower band and
feet, oval eyes, blush, green leaf and curled tendril. Paths are hand-structured;
there is no tracing, embedded raster, gradient, filter or external asset.
SVG layer IDs are unique across instances. The named layers have viewBox pivots.

## Reuse audit

| Piece | Existing implementation | This draft / proposed use |
| --- | --- | --- |
| Mascot lifecycle | `src/components/Mascot.tsx` | Additive artwork slot reuses blink, inactivity, visibility, tap and accessibility behavior. Existing API and default art remain compatible. |
| Motion | `src/lib/motionTokens.ts` | Existing timing variables; additive instant variable and seedling blink interval (3–6 seconds). |
| Actions | `src/components/ui/SpringButton.tsx` | Preview replay control; future popup action. |
| Counters / bars | `AnimatedNumber.tsx`, `ui/progress.tsx` | Reuse for truthful rewards; no duplicated counters in the mascot. |
| Quiz selection / feedback | `QuizAnswer.tsx`, `QuizFeedback.tsx` | Existing select/result states and live region; future artwork swap only. |
| Completion | `VictoryScreen.tsx` | Existing earned XP, accuracy, level calculation, dialog and lazy confetti. |
| Streak presentation | `StreakCelebrationModal.tsx` | Reuse and refine for the approved entry slice; replace scattered launch paths with one queue later. Existing calendar infers days from streak length, so do not claim a verified activity history without dated evidence. |
| Greeting / status | `DashboardGreeting.tsx`, `StudyStatus.tsx` | Preserve real profile data and current placement. |
| Loading / navigation | `AppSkeleton`, `PageTransition`, persistent shell | Preserve the performance fix; no extra route, preload, exit wait or loading delay. |
| Popup accessibility | Existing Radix dialog primitives | Trap/restore focus, Escape and dismiss affordance; navigation clears the active presentation. |

**Route coverage this draft:** 0 of 57 routes changed; all 57 remain outside this
approval slice. The preview is a build artifact, not an app route. No popup,
auth, API, database, reward calculation or application storage change is made.

## Reproduce

From `prepzap-clean`:

```sh
npm ci --cache .agent/npm-cache
node scripts/buildSeedlingPreview.mjs
node scripts/testSeedlingPreview.mjs
npm test
npx eslint src/components/Mascot.tsx src/lib/motionTokens.ts src/test/seedling.test.tsx design/seedling/*.tsx
npx tsc --project design/seedling/tsconfig.json --noEmit
```

The browser script uses Chromium (`PUPPETEER_EXECUTABLE_PATH` can override the
default `/usr/bin/chromium`). It checks all seven moods, overflow at 320, 390,
844 and 1200px in both themes, OS reduced motion, allowed animated properties,
browser exceptions and external requests. Its server is internal to the test.
It regenerates the two review sheets and writes an ignored `.agent` report.

The HTML includes the existing React/motion/controller runtime for a genuine
component preview (about 317KB uncompressed), while each inline SVG is under
10KB. The artwork and preview are outside the app import graph. No dependency
was added. Phone-sized browser emulation is **not** a real-device performance
measurement; physical iOS/Android frame pacing remains a manual check.

Validation for this draft: lockfile install, production app build, standalone
preview build, 92 unit tests across 16 files, preview-specific type-check and
touched-file lint pass. Browser checks cover eight viewport/theme combinations,
OS reduced motion and zero external requests. Existing navigation smoke checks
also pass (persistent shell, no full-screen loading flash, original crimson).
All preview data is local fixture state; no real account or reward flow was
tested. Repo-wide checks still report 363 lint errors, 76 warnings and 88 type
errors outside these changes, matching the previous baseline.

## Reference coverage and next gate

Reviewed the supplied screenshots and the accessible 50-second recording:
peeking, waiting then reacting, one-action results, permission explanation, and
search sheets are interaction references only. The other uploaded recording
exceeds the attachment tool's 32MiB limit and could not be reviewed.

Character poses and option A are approved. Next is **one entry streak popup**,
following `docs/PROGRESS_POPUPS_PROPOSAL.md`. Permission for its tiny device-only
daily display record remains pending: the earlier no-storage-change constraint
is still in force. Do not enable an automatic popup that cannot honor the daily
cap. Broad rollout remains a later review.
On a phone, check leaf/face readability at small sizes, happy/celebrate timing,
peek cropping, sleepy eyes, keyboard focus, reduced motion and both themes.
