# Studenius UI review

All changes are contained in `prepzap-clean`. No routes, auth rules, scoring,
Supabase operations, or API contracts were changed. One pre-existing duplicate
import in ArenaResults was removed because it stopped the development app loading.

## Reviewable pieces

1. **Foundation:** yellow/coral accents, black outlines, rounded shared controls,
   44px button targets, static bottom shadows with transform-only press feedback,
   visible keyboard focus, and reduced-motion overrides. Nunito, Fredoka, and an
   outlined Material Symbols subset are locally served; licenses and provenance
   are in `public/fonts`. The legacy text accent uses a deeper ink tone for contrast.
2. **Practice:** one reusable answer control and feedback panel for lesson,
   desktop, and mobile layouts. Selection stays separate from revealed correctness;
   correct answers pulse, wrong choices shake gently, and progress animates using
   transforms. Feedback has a live region, safe-area padding, and stable action
   placement. Loading uses a quiz skeleton; the mobile empty state has a clear CTA.
3. **Rewards:** focus-trapped completion dialog, real XP/streak counters, existing
   500-XP level threshold, local outlined award icon, limited brand confetti, and
   nonblocking share feedback. Existing vibration helpers respect reduced motion;
   existing sound mute preferences are honored. No new sounds or characters.
4. **Shared pages:** short page/tab entrances, rounded cards, mobile navigation
   with current-page semantics, full-width phone canvas, loading skeletons, and
   friendlier error recovery. Arena timer progress now uses transforms.

## Validation

- Frozen installation (`npm ci`) passed with the updated lockfile.
- Production build passed. Existing bundle-size warnings remain.
- Unit/component tests: **53 passed** across 9 suites, including six new tests
  covering selection, correction, disabled answers, checking/continuing, accessible
  progress, level-up, and reduced-motion completion.
- All **57 route patterns** passed the existing smoke runner's render/runtime
  checks, using cached test authentication and fixture IDs for parameterized routes.
  This does not establish successful live data operations for those fixture IDs.
- Browser interaction checks passed at **320, 390, 430, and 1280px**: wrong answer,
  correction, adaptive retry, correct answer, completion, focus containment, no
  quiz horizontal overflow, and reduced-motion CSS. Backend responses were fixtures.
- Full lint remains failing: **379 errors, 79 warnings**. Source diagnostics were
  compared with untouched HEAD: no new lint diagnostics from this work.
- Type checking remains failing: **94 errors**, versus **101** in untouched HEAD;
  no new diagnostics. Existing errors include profile types, flashcard types, and
  Tiptap API mismatches. They were not hidden or suppressed.
- `@testing-library/dom` is the only added dependency, and is development-only:
  it is the missing peer needed by the already-installed React Testing Library.
  No animation library was added.

## Check on a phone before release

- Finish a lesson, including one wrong answer and retry, in Safari and installed PWA.
- Check the home indicator/notch, keyboard opening, long answers, and small landscape
  screens. Confirm the bottom actions remain reachable without horizontal scrolling.
- Try VoiceOver and keyboard navigation: selected choices, correction announcements,
  focus on completion, share cancellation, and Continue.
- Enable Reduce Motion before loading and while using the app; check sound mute.
  Browser vibration is optional and generally unavailable in iOS Safari; visual
  feedback works independently. Native iOS haptics were not added or device-tested.
- Test dark mode: its pre-existing whole-page inversion mechanism is retained.
  This change does not replace it with a complete semantic dark theme.
- Validate real login, quiz generation, XP persistence, streak updates, Arena rooms,
  and sharing with your actual account. Live account/data operations were not exercised.

## Files touched

- `index.html`
- `package-lock.json`
- `package.json`
- `public/fonts/Fredoka-OFL.txt`
- `public/fonts/LICENSE.txt`
- `public/fonts/Nunito-OFL.txt`
- `public/fonts/README.md`
- `public/fonts/fredoka.woff2`
- `public/fonts/material-symbols-outlined.woff2`
- `public/fonts/nunito.woff2`
- `src/App.tsx`
- `src/components/AnimatedNumber.tsx`
- `src/components/AppSkeleton.tsx`
- `src/components/EmptyStudyState.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/components/PageErrorBoundary.tsx`
- `src/components/PageTransition.tsx`
- `src/components/QuizAnswer.tsx`
- `src/components/QuizFeedback.tsx`
- `src/components/QuizSkeleton.tsx`
- `src/components/StreakCelebrationModal.tsx`
- `src/components/StreakHubCard.tsx`
- `src/components/StudeniusShell.tsx`
- `src/components/VictoryScreen.tsx`
- `src/components/ui/SpringButton.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/tabs.tsx`
- `src/index.css`
- `src/lib/confetti.ts`
- `src/lib/haptics.ts`
- `src/lib/soundFX.ts`
- `src/pages/ArenaQuiz.tsx`
- `src/pages/ArenaResults.tsx`
- `src/pages/Practice.tsx`
- `src/test/studyInteractions.test.tsx`
- `tailwind.config.ts`

Generated build output is excluded from the source diff.
