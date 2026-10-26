# First entry-streak slice

The user approved the seedling, option A (no ground shadow), and a small
device-only popup/date record. Only the daily entry-streak adapter is enabled.
Other popup types and a broad mascot replacement are deliberately still pending
the next review; existing manual streak/onboarding presentations are preserved.

## Behavior

- A lazy host is mounted by the existing dashboard greeting, with a null fallback
  so optional art never replaces content with a loading screen.
- It reads the already-loaded matching profile's positive integer streak count
  and existing `pz_study_sessions` cache. Only positive-duration sessions with
  the current user's `user_id`, a valid timestamp and no future date are evidence.
  Missing, unowned and malformed entries produce no popup. There is no request
  to fill missing data, no new authentication field and no reward/streak write.
- The calendar marks only dates supported by that evidence. A streak total does
  not imply a complete calendar. One ordinary entry uses the encourage pose;
  automatic milestone/level-up adapters are not enabled yet.
- One queue sorts pending events by priority then time, deduplicates them, drops
  stale dates/previous accounts and expires waiting events after five minutes.
  It caps entry presentations at one and total presentations at two per runtime
  session. The sole enabled adapter is further capped to once per local day.
- No popup during route loading, onboarding, another dialog, a victory screen or
  a full-screen overlay. It is mounted only on the dashboard, so active lesson,
  quiz and timer pages have no entry host. If a dashboard dialog opens later,
  the entry panel immediately yields. It never queues a delayed surprise after
  five minutes.
- The panel is an explicitly **non-modal dialog**. No backdrop or pointer lock;
  navigation remains clickable and Tab can leave. Dismiss with X, Continue,
  Escape or an outside interaction. Focus starts at dismiss and returns to the
  invoker/current main where appropriate; outside navigation keeps its focus.
  Navigation unmounts the host and cancels any pending cross-tab lock request.

## Tiny persistence and multi-tab caps

`pz_popup_seen_v1:<account scope>` contains only
`{version:1, day:"YYYY-MM-DD", types:["daily-streak"]}`. It has no session records,
XP, rewards, study content or historical calendar. The next day's display
replaces the previous date. Each account has its own key; session counters stay
in memory. A Web Lock serializes the check/write at the safe display boundary
across tabs. A failed storage write or invalid metadata suppresses the popup.
There is no metadata write merely for enqueuing or waiting behind a dialog.

**Conservative compatibility:** browsers without Web Locks skip this optional
automatic popup. This preserves the daily cross-tab guarantee. The dashboard,
manual streak view and study actions continue normally. Modern HTTPS browsers
support this API; do not remove the guard to make a demo appear everywhere.

## Reuse, files and performance

Reused Mascot's controller, approved SVG rig, SpringButton, AnimatedNumber,
Radix dialog behavior, shared motion tokens and semantic theme variables. No
dependency added. `EntryStreakHost.tsx` is the only enabled event adapter;
`EntryStreakPopup.tsx` is its presentation; `progressPopupPolicy.ts` owns queue,
evidence and metadata policy. `DashboardGreeting.tsx` adds only the lazy mount.
The art moved from `design/seedling` to `src/components/mascot`; the standalone
review still renders the same source. New styles are `seedling.css` and
`entryStreak.css`. Tests live in `entryStreak.test.tsx`,
`progressPopupPolicy.test.ts`, and the existing updated seedling tests;
`scripts/testEntryStreak.mjs` exercises the production build with browser fixtures.

The SVG remains 4,485 bytes standalone. The entry chunk is approximately 11KB JS
and 8KB CSS uncompressed (about 4.5KB and 2KB gzip), fetched only on dashboard
entry. React, Radix and motion reuse existing shared chunks. The artwork has no
external requests, gradients, filters or raster downloads. Animations use
transform/opacity; reduced motion holds the pose and final number. The host
disconnects observers after dismissal/denial and cancels them on navigation.
The shared persistent shell, navigation preload and immediate page transitions
are preserved. No physical-phone frame-rate claim is made.

## Validation and next review

Lockfile install, production build, standalone preview build, 108 unit tests
across 18 files, touched-file lint and preview type check pass. Full-repo checks
retain the baseline 363 lint errors, 76 warnings and 88 type errors outside the
changed files. Route smoke: 56/57; the existing `/analytics` failure still reports
undefined `setSessions` and `setLoading`. No unrelated analytics fix is included.

Browser fixtures cover light/dark, 320/390px portrait and 844px landscape,
reduced motion, one confirmed calendar day despite a three-day profile streak,
reload suppression, another account's cache, cross-tab suppression, tutorial
waiting, newly opened dialog precedence, Escape and navigation while open.
Existing navigation checks pass: persistent shell, no full-screen loading flash,
original crimson palette. The standalone mascot preview also passes all eight
size/theme combinations and OS reduced motion. Browser screenshots in
`design/seedling/review/entry-streak-{light,dark}.png` use clearly synthetic
profile/session fixtures. No live account, paid endpoint or real phone was used.

On a phone: after real study activity, open Dashboard and check the count and
known calendar days; close then reload to confirm no repeat. Check dark mode,
Reduce Motion, landscape scrolling and dismiss reachability, tap another bottom
tab while open, and verify optional sound/vibration settings on Continue. iOS
Safari relies on visual feedback because it has no vibration API.

Review this one slice before enabling other popup types or replacing mascot
placements throughout the app. Additional event adapters must consume existing
authoritative data rather than initiating new requests or inventing history.
