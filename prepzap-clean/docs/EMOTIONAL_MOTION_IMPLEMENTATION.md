# Emotional design adaptation

27 October 2026 (Asia/Manila). Based on the user's supplied Knowunity,
Duolingo, Studley and CapCut report; its frame timings, APK extraction details
and learning-outcome claims were not independently verified here. No extracted
assets, sounds, mascots or exact competing brand palettes are used.

## Scope and adaptation

1. **Real preparation progress.** `StudyPlanGeneratorModal` observes existing
   Practice work: preparing the topic/source, waiting for question generation,
   reading the response/arranging the existing queue, and ready. It introduces
   no API request, artificial delay, timer-based completion or percentage.
   Fast stages may finish before a frame is painted. No fabricated checks for
   distractor calibration, difficulty balancing or roadmap synthesis are shown.
   The existing success sound plays once at the existing successful outcome.
   Students can dismiss with Escape or wait in the background; dismissal does
   not pretend to cancel the request. The existing skeleton remains behind it.
2. **Live path companion.** The active node uses the shared Seedling in `peek`
   pose instead of an animated-image URL. The START LESSON bubble stays. Active
   nodes retain depth and depress on press; pulse/legendary effects now animate
   transform/opacity, with reduced-motion alternatives. Path-header actions and
   the smallest dashboard header wrap rather than overflowing. Below the wide
   desktop breakpoint, quiz history sits below the generator instead of squeezing
   the tablet/landscape content column.
3. **Supportive correction.** QuizFeedback keeps correct-answer disclosure,
   explanation, live announcements, retry/continue behavior and scoring. The
   wrong-answer mascot encourages instead of drooping; copy treats attempts as
   practice. The existing mistake sound becomes a quiet, damped 220Hz triangle
   tone through the existing sound preference gate. Haptics keep the existing
   supported-device preference gate; native iOS haptics are not added.
4. **Existing study modes and honest mastery.** Source Library already has
   horizontal mobile study shortcuts and desktop launch actions for Tutor,
   Flashcards, Practice and Quick Study. They are retained, including their
   selected-source behavior. No duplicate mode selector is introduced.
   SourceFile has an optional three-color confidence value, not the report's
   four-level mastery model. No new thresholds or mastery claims are invented,
   and the existing session progress calculation remains unchanged. Four-tier
   badges need a separately agreed authoritative data contract. The report's
   pastel badge colors are not introduced into the approved visual identity.

The approved Seedling artwork, existing routes, source persistence, query
payloads, plan checks, auth and reward calculations remain unchanged. Type
cleanup in touched legacy code removes `any`, describes existing optional
profile fields and existing view states, and includes the already-used
legendary node state in the launcher input type; it does not add reward rules.
No dependencies were added.

## Files changed

- `src/components/StudyPlanGeneratorModal.tsx`, `src/pages/Practice.tsx`,
  `src/styles/study-generation.css`: real request progress and responsive
  generator/history layout, using the existing skeleton and API flow.
- `src/components/StudyPathMap.tsx`, `src/styles/study-path-motion.css`,
  `src/styles/quality.css`, `src/lib/lessonLauncher.ts`: shared Seedling,
  transform-only motion, compact wrapping and an existing-state type correction.
- `src/components/QuizFeedback.tsx`, `src/lib/soundFX.ts`: supportive correction
  and the quiet original synthesized mistake tone.
- `src/test/studyGeneration.test.tsx`, `scripts/emotionalMotionTest.mjs`,
  `scripts/uiInteractionTest.mjs`, `scripts/uiFixtures.mjs`, `package.json`:
  regression checks and test-only delayed/failed generation responses.
- This report and selected fixture screenshots/results in `docs/emotional-motion`.

## Verification

- Unit/component tests: 140 across 27 files, including real stage changes,
  no simulated completion after 30 seconds, dismissal/reset and encouraging
  correction with correct-answer disclosure.
- `npm run test:emotion`: modal focus, real pending/fulfilled fixture progress,
  background dismissal, generation failure, path presence, reduced motion and
  no page overflow at 320, 390, 844 landscape and 1440px in both themes.
- Existing route smoke and quiz interaction suites cover all 57 route patterns
  and ten quiz viewport/theme combinations plus long text/keyboard-sized view.
- Build, whole-repository lint and TypeScript are run. Remaining counts are
  330 lint errors, 75 warnings and 68 type errors remain repository-wide.
  Changed files have no lint/type errors; four existing hook/fast-refresh
  warnings remain in touched legacy files and are not suppressed.

All service responses in browser tests are synthetic local fixtures. No real
student accounts, paid model calls, device microphones or image imports are
used. Sound synthesis is source-inspected; actual sound balance, Safari focus,
VoiceOver, installed PWA insets and iPhone permissions require a physical phone.

On a phone: generate a quiz with sound muted and enabled, dismiss its progress
window while waiting, try a wrong answer, use Continue/retry, inspect the active
path in portrait/landscape, and enable Reduce Motion. Check a failed real request
leaves usable controls. iOS Safari uses visual feedback because it lacks the
Vibration API.

The separately reported image truncation and account-cache migration remain
outside this UI batch. The existing native alert for quiz-generation failures
is also retained; no error-service or request-lifecycle rewrite is included.
