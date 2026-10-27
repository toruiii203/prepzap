# Studenius: iOS-inspired quality plan

Prepared 27 October 2026 (Asia/Manila). The approved cream/crimson/orange palette,
yellow/coral accents and original seedling remain the design direction. This is
an interaction and quality improvement, not a new visual identity.

## Research boundary

Direct requests to Apple's Human Interface Guidelines, Duolingo's blog and the
Things product site were rejected by this environment's network proxy (403).
No claim is made that the current versions of those apps or pages were freshly
inspected. The framework below combines established iOS design principles,
the user's supplied interaction references, the installed Taste research, and
direct inspection of Studenius's source and browser screenshots. Taste's app
study is primarily desktop software, not a physical-iPhone study.

Reference links for verification when web access is available:

| Reference | Pattern to evaluate | Studenius adaptation |
| --- | --- | --- |
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | Clear hierarchy, consistent navigation, familiar controls | Stable shell; named navigation; concise route titles and announcements |
| [Apple Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Large targets, meaningful names, text readability, reduced motion | 44 CSS-pixel web hit areas, persistent field names, mobile 16px inputs, existing reduced-motion system |
| [Apple Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | Immediate, understandable outcomes and recoverable errors | Share confirmation/error text; clear refresh failures; preserve prior results while refreshing |
| [Duolingo](https://www.duolingo.com/) | A focused next learning step and feedback connected to actual progress | Find the actual active lesson; keep celebration for achievements; verified streak dates |
| [Things](https://culturedcode.com/things/) | A clear next action and secondary tools that recede | Remove duplicate dashboard status; provide a direct next-step action; give Analytics one readable layout |
| [Headspace](https://www.headspace.com/headspace-meditation-app) | Reassuring, approachable starts and calm recovery | Original seedling, useful empty states, friendly loading copy, no guilt-based calendar warning |

These are qualitative references, not claims about conversion rates, retention,
current screen implementations or a measured comparison with native apps.
44 CSS pixels are a practical web target, not a certification of physical iOS
point sizing. No brand characters, artwork, colors or sounds are copied.

## What was missing

The main gap was continuity: the app had an appealing new character, but unclear
entry points, repeated progress chrome, unnamed controls, inconsistent touch
geometry, unavailable data presented as empty progress, and incomplete testing
of positive data flows. More animation would not repair those defects.

Directly observed problems included an Analytics crash, duplicate tablet layouts,
inert chart tabs, an SDK query adapter that never started its requests, fabricated
calendar checks inferred from a streak count, and corrupted image persistence.
The ordinary navigation greeting also replayed a celebration for an existing
streak. It is now calm, with tap reactions and achievement celebrations retained.

## Prioritized execution

| Priority | Work | Status |
| --- | --- | --- |
| P0 | Repair Analytics's undefined setters and duplicate state owners | Implemented: existing read hook is the owner |
| P0 | Repair PromiseLike query awaiting; prove positive records load | Implemented: same queries/filters, correct Promise wrapping, request cancellation, timeout/error states |
| P1 | Replace duplicate responsive layouts and broken chart geometry | Implemented: one page, current calendar week, transform-based bars, real zero values |
| P1 | Distinguish failed refresh from an empty account | Implemented: warnings, unknown values, retry; prior data remains visible |
| P1 | Fix semantic names and hit areas across legacy protected pages | Implemented: incremental compatibility bridge, 44px geometry, readable mobile inputs |
| P1 | Make desktop navigation and page changes understandable | Implemented: current-page states, keyboard-operable logo, short live announcements |
| P1 | Make the next lesson discoverable | Implemented: actual active-node focus/scroll, reduced-motion alternative, Practice fallback |
| P1 | Stop inferring calendar evidence from a streak total | Implemented in entry and manual streak views; stored activity is not rewritten |
| P1 | Correct Settings layout, switch semantics and false account-deletion/notification claims | Implemented: honest unavailable/draft/permission states; real deletion and push delivery remain service work |
| P1 | Repair image truncation and move binary persistence out of localStorage | Confirmed defect; separate migration scope awaiting the user's choice |
| P1 | Fully scope legacy session caches per account | Read-only display filtering and stale-result protection implemented; durable migration still separate |
| P2 | Refactor Dashboard's large legacy component and data contracts | Planned: keep the lesson path ahead of the full tools catalogue; preserve DOM/keyboard order and existing launch behavior |
| P2 | Finish tiny metadata typography, remaining authored labels and state-specific contrast review | Further visual/accessibility work; current checks are not WCAG certification |
| P2 | Profile heavy editor/PDF/landing chunks on real devices | Planned; no heavy dependency added and navigation delay protections retained |
| P2 | Extend the unified reward queue with authoritative event adapters | Still deferred; no invented unlocks or new reward rules |
| Release | Real account, real iPhone/Android, offline, payment, permissions and recovery checks | Manual/service verification required; mocks cannot establish production correctness |

## Storage repair proposal (not yet applied)

The prior UI-only/no-storage-change boundary remains in force except for the
already-approved popup display ledger. A separate scope question was sent for
these repairs; elapsed time is not approval.

For an approved repair: keep metadata lightweight and per account, store image
blobs in IndexedDB using existing dependencies, preserve legacy records until
the new write has been verified, migrate only attributable account data, provide
quota/failure recovery and export, and test account changes plus interrupted
migration. Never delete an unverified original. Previously truncated images may
need re-import from the student's original file; lost pixels cannot be recreated
by a migration. Auth, server schemas, endpoints and reward calculations need not
change for that client-storage work.

## Acceptance gates

The execution report in `QUALITY_AUDIT.md` separates route smoke, functional UI
tests, heuristic accessibility, visual review, storage diagnostics, repository
lint/type debt, and physical-device checks. A green route smoke test alone is
not a release certification. The known image-integrity failure must remain
visible until repaired and verified.
