# Studenius visual and technical quality audit

27 October 2026, Asia/Manila. See `IOS_RESEARCH_AND_EXECUTION_PLAN.md` for the
research boundary, reference links, staged plan and remaining migration scope.

## Result and limits

The authorized UI/read-adapter repair batch is implemented. This is not a claim
that every production feature works: an image-import integrity defect is
confirmed and its storage migration is still outside the earlier approved scope.
The separate client-storage scope question remains pending. Paid services,
real account/RLS behavior, real-device camera/microphone, payment, true offline
recovery and physical iPhone behavior were not certified by browser fixtures.

## Before/after evidence

| Check | Before | After this batch |
| --- | --- | --- |
| Route smoke, all 57 registered patterns | 56/57; Analytics undefined setters | 57/57 with fixture HTTP/auth/realtime |
| 13 representative pages × two viewport/theme combinations | 26 inspected | Same 26 inspected |
| Unnamed visible control instances in those samples | 44 | 0 |
| Visible enabled controls under 44 CSS px in either dimension | 171 | 0 |
| Runtime-error samples | 2 (Analytics in both variants) | 0 |
| Page overflow in those samples | 0 | 0 after resolving the new CTA's unsupported icon fallback |
| Unit/component tests | 108 | 136 across 26 files |
| Repository lint | 361 errors, 76 warnings | 345 errors, 75 warnings; touched files clean |
| Repository type check | 88 errors | 72 errors; none in changed source/test files |
| Image import integrity diagnostic | Previously untested | **FAIL: source data is truncated**; no migration applied |

Counts are visible control **instances**, not distinct components or a WCAG
certification. Samples use 390px light and 1440px dark, synthetic profile data,
mocked auth/HTTP/realtime, and Chromium. Other widths are tested by the quiz,
Analytics and existing mascot/header suites. Tiny text counts are advisory;
state-specific contrast and VoiceOver still need manual review. Performance
observations from these local fixtures do not represent production backend RTT.

## Implemented findings

### P0: Analytics state and data loading were broken

`Analytics.tsx` consumed `useStudyStats()` but called undefined `setSessions` and
`setLoading`. It also ran a second copy of the session query and rendered two
responsive page trees at overlapping breakpoints. It now has one responsive
layout, one state owner and no duplicate loader. Unsupported Revision tabs and
promises to unlock analytics after arbitrary session counts were removed.

Positive-data testing then found a second defect: `useStudyStats` called
`.catch()` directly on a PostgREST PromiseLike builder. No session read request
was started. The hook now wraps those same read queries with `Promise.resolve`,
handles partial/unavailable results, clears timeout work, aborts stale reads and
does not apply a prior account's response. Query names, filters, order, server
schemas, auth rules, payments and reward calculations are unchanged.

The stats view is now read-only with respect to the legacy session cache. It
does not overwrite that global cache with a single account's response. Explicitly
foreign or unattributed cached rows are not hydrated into the view; attributable
local work is retained alongside server results. This is display protection,
not the separately proposed durable per-account migration. Other legacy cache
readers still require that broader repair.

Weekly values now use Monday–Sunday in local calendar time rather than an
absolute rolling difference that could include previous-week/future records.
Chart bars have an actual height context and use transform scaling. Zero is
zero; unavailable data shows a warning/unknown value and retry action. Recorded
values remain visible during refresh. Share uses recorded values and handles
clipboard denial/cancellation.

### P1: Control semantics and touch geometry

`LegacyControlAccessibility` fills missing names for known icon actions and
placeholder-only fields in protected legacy pages. It preserves authored ARIA,
native labels and contextual titles, handles newly inserted controls and changing
play/pause icons, and removes its own attributes on cleanup. It deliberately does
not guess unknown icons. It is an incremental compatibility bridge, not a
substitute for eventually authoring labels directly in every component.

Common interaction CSS gives raw buttons/form fields 44px hit areas. Mobile
inputs use 16px text to avoid Safari focus zoom. Pagination keeps small visible
dots within larger transparent hit areas. Tool-carousel controls wrap when
needed rather than overflowing after the next-page arrow becomes enabled.

Desktop navigation now communicates the current page. The sidebar's clickable
brand heading is a real keyboard-operable home button; it no longer introduces
a second content H1. A short live region announces page names and updates the
tab title without stealing pointer focus. Existing modal focus behavior remains.

### P1: Settings presented unsupported outcomes

The account-deletion handler only signed out, then claimed data was queued for
deletion. That false destructive action is replaced with an explicit unavailable
notice. A real deletion service remains missing; no new auth or server operation
was added. Existing sign-out behavior is unchanged.

Notification switches now have names, checked states, keyboard support and 44px
hit areas with reduced-motion support. Toasts identify unsaved preferences;
browser permission is no longer presented as proof of scheduled delivery.
Denied/rejected permission and unsupported notification construction receive
recoverable feedback. Real push delivery has not been certified. The existing
profile-save payload and notification preference values are unchanged.

Settings' appearance and account panels share a 560px content column, clear the
sidebar at tablet/desktop widths, and keep the two real profile statistics in two
columns. The credit fill uses a clamped transform rather than animating width.

### P1: The dashboard lacked a clear next action

The duplicate global progress strip is hidden on Dashboard because its own
header already presents progress. The seedling greeting is calm on normal
navigation, with a clear **Find my next lesson** action. It scrolls to and focuses
the actual active path button, respects reduced motion, and offers Practice if
there is no active node. It does not invent progress or bypass the existing
lesson-launch logic. A missing icon-font glyph discovered in testing was removed
from the new CTA; the action remains clear without an icon dependency.

### P1: Manual calendar checks were fabricated from a total

The manual streak presentation used `streakCount` to reconstruct prior dates and
always checked today. It now marks only owned, positive-duration, dated activity
already available on the device. Unknown days stay neutral, not "missed". The
actual streak count is unchanged. No activity records are rewritten. Its calendar
is labeled for assistive technology and the guilt-based reset warning is replaced
with an explanation of confirmed days. Reduced motion skips its unnecessary
delayed timers. Entry-popup frequency/eligibility rules are preserved.

### P2: Loading and error recovery felt unfinished

Loading retains the shared shell and uses existing skeletons plus friendly copy;
no new minimum delay or full-page loading gate is added. Render-error details are
collapsed under an explicit support disclosure rather than dominating the
student's first error view. Retry and Dashboard actions remain available. The
approved palette and original seedling are preserved throughout.

## Confirmed unresolved storage findings

### P1: Image import discards most of the source data

`SourceLibrary.tsx` truncates a FileReader result to 50,000 characters before
checking whether it is image data. The isolated synthetic-image probe generated
1,203,538 characters and observed only 50,000 persisted. Chrome still decoded
the partial PNG, so a successful decode is **not** evidence of intact pixels.
The report records `bytesPreserved: false`. This diagnostic exits nonzero.

Captured/uploaded image data is also serialized into localStorage by
`sourceContext.saveLibrary`, despite its small quota. This can lead to quota
failures as the library grows. A correct fix must separate metadata and binary
storage, preserve originals until verified migration, and provide recovery.
Previously truncated originals cannot be reconstructed by moving their bytes.

### P1: Legacy session-cache ownership is incomplete

The global `pz_study_sessions` key is still used by legacy writers/readers, and
sign-out only clears the auth cache. Analytics now refuses foreign/unattributed
cached rows and never rewrites the cache, but this does not repair every legacy
consumer. Per-account cache isolation and attributable migration are proposed
separately. No source files, study records or images were migrated/deleted in
this batch.

### Further investigation, not invented failures

- Real service authorization, payment and invitation correctness need real
  accounts/services and deliberate testing; fixture success proves neither.
- Source upload-limit wording says 20 Pro files in one error although the local
  limit constant is 10. Resolve that copy with the document/storage slice.
- Dashboard remains a large legacy component with type/lint debt. A subsequent
  typed UI extraction should bring the learning path before the full tool shelf
  in DOM order, preserving existing launch behavior and stored preferences.
- Heavy editor/PDF/landing chunks remain. The build's main bundle is about
  770KB minified / 237KB gzip; NotesWorkspace about 708KB / 226KB gzip. These are
  artifact sizes, not measured mobile load times. Do not preload all routes.
- Remaining subject/accuracy/unlock data must use authoritative sources; no
  reward adapter should infer earned XP from a celebratory animation alone.

## Files changed

- Pages/data presentation: `src/pages/Analytics.tsx`, `src/pages/Settings.tsx`,
  `src/hooks/useStudyStats.ts`, `src/lib/analyticsPresentation.ts`.
- Shared UI: `DashboardGreeting`, `InterfaceSettings`, `MobileBottomNav`,
  `PageErrorBoundary`, `PageLoading`, `SharedSidebar`, `StreakCelebrationModal`,
  `StudeniusLayout`, plus new `LegacyControlAccessibility`, `RouteAnnouncement`
  and `PreferenceSwitch` components under `src/components`.
- Styles: `src/styles/analytics.css`, `src/styles/quality.css`.
- Tests: eight new files under `src/test` for Analytics presentation/page,
  dashboard next step, legacy controls, route announcements, verified streak
  calendar, study stats and preference switches.
- Browser tools: `scripts/qualityAudit.mjs`, `testQualityFlows.mjs`,
  `probeImageImport.mjs`, existing `uiFixtures.mjs` and `uiInteractionTest.mjs`;
  corresponding npm commands in `package.json`.
- Documentation: this audit, `IOS_RESEARCH_AND_EXECUTION_PLAN.md`, and the
  route table, machine-readable summary and four comparison images in
  `docs/quality-audit`.

No dependency, server schema, endpoint, auth rule, reward rule or stored source
record was changed. Generated `dist` files are excluded from this change.

## What was tested

- All 57 route patterns: HTTP/auth/realtime fixtures; no runtime/console errors,
  blank roots or missing route content in the scripted scenarios.
- 26 visual/structural combinations across Dashboard, Practice, Sources,
  Flashcards, Notes, Planner, Analytics, Settings, Tutor, Timer, Arena, Friends
  and Tools.
- Quiz correction → retry → correct → completion at 320, 390, 430, 844-landscape
  and desktop sizes in both themes; completion focus, reduced motion, long text
  and keyboard-sized viewport. The stale removed-fox selector was replaced with
  a nonempty seedling rig check.
- Eight positive-data functional flows: next-node focus plus tool controls,
  recorded Analytics values/visible chart/single refresh query/share text, and
  local text-source create/delete, plus aligned settings, theme changes, named switches and notification permission failures, each on mobile/light and desktop/dark.
  Analytics also checks 320/768/1024/1440px without duplicate page headings.
- Unit tests cover dates, invalid/future/foreign records, actual zeroes, timeout,
  PromiseLike builders without `.catch`, cancellation, account changes, cache
  preservation, inaccessible controls, dynamic labels, route announcements,
  refresh/error states and verified calendar days.
- The image diagnostic uses generated pixels in a disposable browser context;
  it confirms a defect rather than claiming an upload passed.

No paid endpoint, real invitation, real student photo, live payment or real
account was used. All test-created local data belonged to disposable fixtures.

## Reproduce and phone checklist

```sh
npm ci --cache .agent/npm-cache
VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_ANON_KEY=fixture-anon-key npm run build
npm test
npm run test:smoke
npm run test:ui
npm run test:navigation
npm run test:quality
npm run test:quality:flows
npm run audit:image-import  # Known failing integrity diagnostic, not a green gate.
```

Browser scripts use `/usr/bin/chromium` or `PUPPETEER_EXECUTABLE_PATH`. Production
fixture builds use a fake Supabase URL/key; no real secrets are necessary. Raw
reports/screenshots are ignored under `.agent/quality`; committed summaries and
selected before/after examples live beside this report.

On an actual iPhone: check Safari/PWA safe areas, text zoom, VoiceOver names and
page changes, Reduced Motion, keyboard overlap, local text-source save/delete,
real Analytics refresh/error/share behavior and real quiz completion. Check
landscape and a larger text setting. Image imports should not be treated as
reliable until the separate integrity/storage repair is completed.
