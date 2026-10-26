# Studenius redesign review

This continuation builds on the first polish pass (`35623aa7`). The approved
concept is a compact fox scholar referencing the original Rex: round glasses,
small cap, short academic robe, and cream-tipped tail. Yellow/coral branding is
retained. No authentication, database queries, API contracts, scoring rules,
credit rules, or reward calculations were changed.

## Review the work by commit

- `d1f81716`: reusable, layered SVG mascot and compatibility adapters.
- `4258c6e1`: shared motion tokens, public/protected entry and exit, route splitting.
- `5f6d0182`: semantic dark theme, device preferences, viewport and dialog support.
- Final verification commit: reactive Reduce Motion, landscape fixes, browser
  fixtures, stricter route/interaction tests, and this report.

## Mascot and interactions

`Mascot` exposes idle, happy, celebrate, sad, thinking, sleepy, cheering, and
encouraging moods. The eyes, eyelids, head, mouth, arms, body, cap and tail are
separate SVG groups. Idle behavior includes breathing, a 2–5 second blink timer,
head turns and tail flicks; inactivity becomes sleepy after 60 seconds. Offscreen
and hidden-tab animation pauses. Tapping is a named keyboard-accessible button,
with a happy reaction and existing synthesized feedback when enabled. Decorative
instances are hidden from assistive technology.

Existing AnimatedRex/RexMascot callers use adapters, preserving their props.
The new vector appears in the dashboard greeting, quiz feedback, completion,
streak modal, onboarding, loading skeleton, empty state, error boundary and 404.
Old raster assets are retained, but these components no longer download them.

## Motion and theme

See `ROUTE_MOTION_AUDIT.md` for all 57 route patterns before and after. All enter
one shared motion scope; eight redirects inherit their destination. Shared
buttons/cards/lists/tabs, progress, counters and dialogs use the motion tokens.
Pages are lazy-loaded behind AppSkeleton. Heavy three-dimensional and graph
routes therefore load when visited instead of through eager page imports.

Dark mode uses semantic CSS variables; the page-wide inversion and image
counter-inversion are removed. Illustration pigments remain intact. A documented
compatibility stylesheet maps existing visual literals to semantic surfaces and
text; it avoids editing unrelated data-heavy page implementations. New UI should
use semantic tokens directly. Legacy Quicksand/Jakarta family names resolve to
the existing local Nunito font, eliminating third-party font requests.

Appearance (device/light/dark), sound and vibration are device-local settings.
Vibration defaults off, works independently of sound, and is disabled under
Reduce Motion. iOS Safari uses visual feedback; no native haptic plugin was added.
Reduce Motion updates while the app is open, stops confetti, and keeps the mascot
static. Keyboard-viewport changes resize focused lesson content, and landscape
lesson content scrolls independently of its header/actions. Modals use Radix
focus management or a shared enhancement for legacy black-backdrop markup.

## Validation and limitations

- `npm ci --cache .agent/npm-cache`: passed; no new dependency was added.
- Production build: passed; existing large-chunk warnings remain. Browser checks
  use a build with clearly fake Supabase URL/anon values and intercept all external
  service requests. Generated `dist` output is excluded from commits.
- Unit/component tests: **75 passed across 14 suites**, including 22 new tests for
  mascot moods/cleanup, live motion changes, preferences and modal accessibility.
- Browser interaction checks: **10 viewport/theme combinations passed** at
  320×844, 390×844, 430×932, 844×390 landscape and 1280×800, in light and dark.
  Checked selection, wrong/correct feedback, adaptive retry, mascot reactions,
  completion focus, no horizontal overflow and live Reduce Motion. Long questions
  and typed answers also passed a keyboard-sized viewport check.
- Stricter route checks: **56/57 passed**. `/analytics` exposes a confirmed
  pre-existing `setSessions`/`setLoading` ReferenceError, also present in the
  original type-check baseline. Its data flow was left untouched under UI-only
  scope. The runner exits nonzero for that failure instead of suppressing it.
- Full lint: **366 errors and 76 warnings remain**, versus 379/79 before this
  continuation. Every source file changed in this continuation is lint-clean.
- Type checking: **89 errors remain**, versus 94 before. Every source file changed
  in this continuation has zero TypeScript diagnostics. No suppressions or `any`
  were added to hide errors.

All browser auth/profile, HTTP, quiz-generation and realtime data were fixtures.
No live account, paid generation, actual room exchange, database persistence, or
physical-device haptic behavior was exercised. Screenshots and JSON test reports
are generated under ignored `.agent/` directories. Use `npm run test:smoke` and
`npm run test:ui` after building to reproduce; Chromium must be installed or
provided through `PUPPETEER_EXECUTABLE_PATH`.

## Phone checks before release

1. Safari and installed PWA: notch/home-indicator insets, landscape, long questions,
   and input keyboard opening/closing. Confirm Check and Continue stay reachable.
2. Toggle device/light/dark; inspect images, charts, colored tags and contrast.
3. Tap Rex; leave the dashboard idle for a minute; try the streak and completion
   screens. Toggle Reduce Motion while an animation is running.
4. VoiceOver and external keyboard: choice selection/corrections, dialog focus,
   close/cancel, and focus restoration. Check sound and vibration independently.
5. Use a real account to verify login, generated lessons, XP/streak persistence,
   Arena rooms and sharing. The existing Analytics setter defect needs a separate
   data-flow fix before a clean full-route release check is possible.

## Files touched in this continuation

- `ROUTE_MOTION_AUDIT.md`
- `index.html`
- `package.json`
- `scripts/smokeTest.mjs`
- `scripts/uiFixtures.mjs`
- `scripts/uiInteractionTest.mjs`
- `src/App.tsx`
- `src/components/AnimatedNumber.tsx`
- `src/components/AnimatedRex.tsx`
- `src/components/AppSkeleton.tsx`
- `src/components/DashboardGreeting.tsx`
- `src/components/EmptyStudyState.tsx`
- `src/components/InterfacePreferences.tsx`
- `src/components/InterfaceSettings.tsx`
- `src/components/LegacyDialogAccessibility.tsx`
- `src/components/Mascot.tsx`
- `src/components/PageErrorBoundary.tsx`
- `src/components/PageTransition.tsx`
- `src/components/QuizFeedback.tsx`
- `src/components/QuizSkeleton.tsx`
- `src/components/RexMascot.tsx`
- `src/components/StreakCelebrationModal.tsx`
- `src/components/StudeniusLayout.tsx`
- `src/components/StudyStatus.tsx`
- `src/components/VictoryScreen.tsx`
- `src/components/ui/SpringButton.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/tabs.tsx`
- `src/hooks/useKeyboardViewport.ts`
- `src/hooks/usePrefersReducedMotion.ts`
- `src/index.css`
- `src/lib/confetti.ts`
- `src/lib/haptics.ts`
- `src/lib/interfacePreferences.ts`
- `src/lib/motionTokens.ts`
- `src/lib/soundFX.ts`
- `src/pages/NotFound.tsx`
- `src/styles/legacyTheme.css`
- `src/styles/mascot.css`
- `src/styles/motion.css`
- `src/styles/theme.css`
- `src/test/dialogAccessibility.test.tsx`
- `src/test/interfacePreferences.test.tsx`
- `src/test/mascot.test.tsx`
- `src/test/pageMotion.test.tsx`
- `src/test/reducedMotionPreference.test.tsx`
- `src/test/studyInteractions.test.tsx`
- `tailwind.config.ts`
