# Original colors and faster navigation

The original cream background (`#FAF7F2`), white surfaces, crimson primary
(`#ae2925`), and orange accent (`#f0a040`) are restored. Existing yellow/coral
brand accents remain. Quiz/continue actions return to coral. Light mode is again
the default; explicit dark/device-following preferences remain available. The
optional dark theme uses warm neutrals instead of the introduced purple tones.

The navigation slowdown came from three stacked presentation costs: the entire
protected shell was keyed to the pathname, its loading presentation imposed a
350ms minimum on each remount, and `AnimatePresence mode="wait"` held the next
page for the old page's exit. Lazy route imports could also replace the entire
shell with AppSkeleton. Broad stagger rules then delayed card visibility.

The shell and its auth gate now remain mounted across protected routes. The
artificial minimum delay and sequential exit wait are removed. Page content has
its own Suspense/error boundary; a missed chunk can load within the shell. New
content is readable immediately. Intent prefetching on navigation hover, focus
and touch shares the same cached import as React.lazy. It does not preload every
route or call data APIs, and a failed prefetch can be retried. Authentication
conditions, profile queries, API calls and business rules are unchanged.

## Evidence

A production-build browser comparison with the same local HTTP/auth fixtures
measured Tools → Practice → Library → Practice → Library at 390px:

| Navigation | Before | After |
|---|---:|---:|
| First Practice visit | 656ms | 164ms |
| First Library visit | 591ms | 62ms |
| Cached Practice visit | 534ms | 51ms |
| Cached Library visit | 593ms | 58ms |

Before: all four navigations replaced the app shell and flashed a full-screen
skeleton. After: all four preserved the shell without a full-screen skeleton.
These are local fixture timings, not a claim about live backend/network latency.

`npm run test:navigation` now checks shell persistence, no full-screen loading
flash, shared route import behavior, and the original primary palette. Timings
are reported rather than asserted so machine speed does not make tests flaky.

Verification also includes the production build, unit/component tests, and quiz
interactions at five viewport sizes in light/dark mode, including long text and
a keyboard-sized viewport. All changed source files are lint/type-clean.
The full-route check remains 56/57: the pre-existing Analytics undefined-setter
error is unchanged. Repository-wide lint/type failures outside this fix remain.

Check a few navigation tabs and sidebar items on your phone after deployment;
first visits can still fetch their route chunk and backend data. Explicit dark
mode can be changed to Light under Settings → Appearance.
