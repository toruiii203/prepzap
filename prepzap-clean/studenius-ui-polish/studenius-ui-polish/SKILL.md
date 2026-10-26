---
name: studenius-ui-polish
description: Use when improving, redesigning, or auditing UI/UX in the Studenius study app (repo prepzap, folder prepzap-clean). Covers Duolingo-style polish - motion, micro-interactions, mascot, quiz feedback, rewards, mobile/iOS feel, dark mode, accessibility, and performance. Do not use for backend, auth, database, or API changes.
---

# Studenius UI Polish

Goal: make Studenius feel as playful, tactile, and satisfying as a top native iOS learning app, with an ORIGINAL identity. Take inspiration from interaction patterns only. Never copy another brand's mascot, logo, illustrations, sounds, or exact colors.

Scope: UI/UX only. Do not change auth, database calls, API logic, routes, or business rules. All work lives inside `prepzap-clean`.

## Workflow (follow in order)

1. **Inspect first, no edits.** Read package.json, styling setup, existing design tokens, and existing animation code. Reuse what exists (SpringButton, PageTransition, QuizFeedback, VictoryScreen, AnimatedNumber, AppSkeleton, Mascot). Do not rebuild working components.
2. **Audit.** List the routes/pages touched and not yet touched by the motion system. Note what is stiff, inconsistent, or broken.
3. **Plan briefly**, then implement in small, reviewable commits (one concern per commit).
4. **Verify**: install, build, tests, type-check and lint on touched files. Report remaining repo-wide error counts honestly. Never hide errors with suppressions or `any`.
5. **Report**: what changed, files touched, what was tested with fixtures versus real data, and a short phone-testing checklist.

Ask before big visual decisions (mascot look, brand colors).

## Design principles

- **Tactile**: chunky buttons with a bottom "press" shadow that compresses on press (translateY + shadow shrink), quick release with small overshoot.
- **Rounded and friendly**: generous radius, large type for key actions, clear visual hierarchy, one primary action per screen.
- **Immediate feedback**: every tap gets a visible response within ~100ms.
- **Reward without punishment**: wrong answers are gentle (soft shake, calm color, encouraging copy), never harsh.
- **One motion language**: shared motion tokens (durations, easings, springs). No hard-coded values per component.
- **Calm by default**: idle screens are quiet. Save big celebration for real achievements.

See `references/motion-and-mascot.md` for specifics and `references/checklist.md` for the pre-merge checklist.

## Motion rules

- Animate only `transform` and `opacity`. Avoid animating width, height, top, left, box-shadow blur, or filters on large areas.
- Durations: micro 100-180ms, standard 200-300ms, large/celebratory 400-700ms. Exits are faster than enters.
- Prefer springs or custom ease-out with slight overshoot. Never use linear for movement.
- Stagger lists and cards 30-60ms apart, capped to the first 8-10 items.
- Use `will-change` sparingly and only during an animation.
- Lazy-load heavy animation code (mascot, confetti) so first load is not slower.
- Always respect `prefers-reduced-motion`: replace movement with fades, hold mascot in a static pose with occasional blinks, skip confetti.

## Quiz and learning flow

- Answer select: pressed state, selected highlight, no layout shift.
- Correct: green pulse, small hop or sparkle, bottom sheet slides up with positive copy, XP counts up.
- Wrong: short horizontal shake (under 400ms), soft red tint, reveal the correct answer, then offer a retry or continue.
- Progress bar fills smoothly with an easing curve and a subtle shine, not instant jumps.
- Completion: celebration screen with counting XP, streak update, and a clear Continue button.
- Announce results to assistive tech with a live region.

## Mascot

- Original character only, built as layered SVG with correct pivot points, or a Rive state-machine file if one exists.
- Moods: idle, happy, celebrate, cheering, sad, thinking, sleepy, encouraging, plus a tap reaction.
- Apply animation principles: anticipation, squash and stretch, follow-through and overlap, secondary motion, randomized idle timing.
- Reactions are triggered by app events (correct, wrong, streak, level-up, loading, empty state, long inactivity).
- Mark decorative mascot as `aria-hidden`. Keep assets small.

## Mobile and iOS feel

- Mobile-first. Tap targets at least 44px. Respect safe-area insets (notch, home indicator).
- Bottom navigation and bottom action bars must stay reachable when the keyboard opens.
- No horizontal overflow at 320, 390, 430px. Handle long text and small landscape screens.
- Use `100dvh`, not `100vh`, for full-height layouts.
- Haptics: use the Vibration API only where supported. iOS Safari does not support it, so visual feedback must carry the experience. Keep sound and vibration behind user settings.

## Dark mode

- Use semantic CSS variables for surfaces, text, borders, and accents. Do not use whole-page color inversion.
- Check contrast in both themes. Verify the mascot, images, charts, and shadows in dark mode.

## Accessibility

- Maintain WCAG AA contrast. Visible focus states. Full keyboard support.
- Focus management for modals and sheets (trap and restore focus).
- Meaningful ARIA labels. Live regions for answer feedback. Do not rely on color alone.

## Performance

- Target 60fps on mid-range phones. Keep bundle growth small and justify any new dependency before installing.
- Prefer CSS/SVG and the animation approach already in the repo.
- Avoid layout shift: reserve space for images, skeletons, and async content.

## Definition of done

- Behavior matches the checklist in `references/checklist.md`.
- Build and tests pass. No new lint or type errors from this work.
- Reduced-motion and dark mode verified.
- Summary lists remaining gaps honestly.
