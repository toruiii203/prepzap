# Pre-merge checklist

## Motion
- [ ] Only transform and opacity animated
- [ ] Shared motion tokens used, no hard-coded durations or easings
- [ ] No linear easing on movement
- [ ] Heavy animation code lazy-loaded
- [ ] prefers-reduced-motion verified (fades only, mascot static, no confetti)

## Quiz flow
- [ ] Select, correct, wrong, retry, and complete states all animated
- [ ] Wrong answer is gentle, reveals the correct answer
- [ ] Progress bar, XP, and streak counters animate smoothly
- [ ] Live region announces correct/wrong results

## Mascot
- [ ] All moods work and transition smoothly
- [ ] Reacts to correct, wrong, streak, level-up, loading, empty, inactivity
- [ ] Tap reaction works, aria-hidden when decorative
- [ ] Original design, no copied brand assets

## Mobile and iOS
- [ ] Safe-area insets respected (notch, home indicator)
- [ ] Keyboard does not cover bottom actions
- [ ] No horizontal overflow at 320, 390, 430px
- [ ] Tap targets 44px or larger
- [ ] Small landscape screens checked

## Dark mode and accessibility
- [ ] Semantic theme, no whole-page inversion
- [ ] WCAG AA contrast in light and dark
- [ ] Focus states, keyboard support, modal focus trap and restore
- [ ] Sound and vibration behind user settings

## Quality
- [ ] Install, build, tests pass
- [ ] No new lint or type errors, none suppressed
- [ ] Report lists fixture-tested versus real-data-tested items
- [ ] Remaining gaps listed honestly
