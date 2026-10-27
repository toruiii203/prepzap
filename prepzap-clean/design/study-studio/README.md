# Studenius onboarding story — review prototype

27 October 2026, Asia/Manila. Scope: onboarding presentation and mascot support.
**The production dashboard and its existing prototype composition are unchanged.**
Dashboard work remains excluded until a new explicit user request.
Production auth, consent, draft expiry, reward rules and returning-user logic are
also untouched. This page remains a design review with local sample questions,
no account operations, no external service requests and no storage writes.

## Open and compare

- Deployed review, after Cloudflare finishes: `/design-review/study-studio.html`.
- Download/open `review/prototype.html` without a server; code and fonts are embedded.
- Development: `/design/study-studio/index.html`.
- Question layout selector: **Scribe / Quiet**. Compare the same questions in both.
- Dark and Static mascot controls remain in the review bar. OS Reduce Motion wins.

```sh
npm run build:studio
npm run test:studio
node scripts/buildSeedlingPreview.mjs
node scripts/testSeedlingPreview.mjs
npx tsc --noEmit -p design/study-studio/tsconfig.json
npm test
npm run test:smoke
```

## Implemented flow

Subject choice → subject reaction → local warm-up → answer reaction → save layout
→ arrival/handoff. The optional goal/reaction pair was omitted to keep the flow
short and avoid introducing goal persistence. More subjects opens a focus-managed
sheet with presets and custom input. Back follows the actual path and restores a
calm reaction instead of replaying a large move or confetti.

Question slides keep a quiet field, a compact 72px mobile scribe slot and six 2×3
subject cards. Selection has a coral offset shadow, check badge and object wobble.
Warm-up selection uses a crimson outline. The notebook/pencil are an opt-in SVG
variant of the same Seedling, with paused scribbling, selection/rewrite reactions,
a 400ms pencil lift, neutral skip closure and one inactivity glance. It never hints
at the correct answer. Quiet layout and reduced motion skip the pencil-lift delay.

Reaction slides use the requested subject field and authored copy: Math/Biology
yellow, Science/History coral, English crimson, Computing/custom paper. Layered
shapes drift quietly; the selected SVG object uses a shared layout transition,
then the field/peek/gesture sequence plays. Continue is available throughout.
A 45svh mascot canvas plus responsive jump clearance preserves room for the art.
Objects sit outside the mascot's motion envelope. Primary actions stay in a
separate footer, reachable at 390×700; content can scroll independently.

Subject details: Math blocks hop, Science bubbles rise, English turns a page,
Biology pulses, History turns its globe, and Computing blinks its code strokes.
All onboarding artwork is SVG; the earlier raster concept remains only in the
unchanged art-board/dashboard concept.

Correct answers use “You got it.” and a why card. Wrong answers use “Good try.
Here's the trick.” with the correct answer/explanation and a gentle forward bounce.
Skipping is neutral. No sad pose, red X, streak, XP or mastery is awarded. Save
uses the crimson field, cream arch, small separate cards, bow and wave. Arrival
spins/waves and links to the existing dashboard; it does not redesign that page.

## Motion architecture

The existing five gestures remain. Six opt-in gestures were added: spin,
twirl-jump, somersault-lite, peek-in, shake-it-off and bow. They are independently
replayable in the movement gallery. The default interactive tap set remains the
original five so existing dashboard interactions do not pick up the new moves.

One large signature per scene resolves the brief's overlapping choreography
requests. Entrance and quiet secondary gestures can accompany it. Consecutive
reaction scenes do not repeat a large signature; a correct Science response uses
a cheer if the preceding reaction already used a twirl jump. Quiet scenes reset
that comparison. Gestures settle into idle and cancel cleanly on navigation.

Story placements opt into visibility-aware completion callbacks; hidden-tab time
does not consume the remaining gesture duration. Default placements retain their
previous behavior. Background/scribe animation pauses while hidden. All keyframes
use transform/opacity, shared durations and existing preferences. Small landscape
screens use a shorter jump. Reduced motion has static expressions, no confetti,
and no scribble/erase loops. Scribe SVG markup is tested below 8KB.

## Verification

- 167 unit/component tests across 29 files.
- 27 browser scenarios: Scribe/Quiet × light/dark × 390×844, 1280×800, 390×700,
  320×844 and 844×390; all six subject signatures; custom/wrong/skip/exact Back.
- Captures include every scene and mid-reaction poses. Assertions cover reachable
  primary actions, full mascot bounds, separate object bounds, real headline
  spaces, reduced motion, modal focus/return, no external requests/storage writes,
  and no repeated large signatures.
- Movement gallery: eight viewport/theme checks plus all eleven gesture playbacks,
  settling, transform/opacity keyframes and OS Reduce Motion.
- Preview/app builds and dedicated TypeScript/touched-file lint pass. All 57 existing
  fixture route smoke checks pass. Repository-wide legacy debt remains 330 lint
  errors/75 warnings and 68 type errors; no touched-file errors are hidden.
- Scope evidence compares the dashboard concept block byte-for-byte and records
  unchanged production dashboard/auth/onboarding sources. Neither dashboard was
  opened by the onboarding test suite.

These are Chromium fixtures, not a certification of live OAuth, physical iPhone
performance, VoiceOver or Safari/PWA keyboard behavior. The existing review auth
modal explains the actual sign-in/consent handoff; no imitation consent or account
creation was added. The separate source-image integrity issue remains out of scope.

On a phone: compare Scribe/Quiet; change subjects; try custom input, wrong/correct
and skip; go Back during a gesture/check; inspect Science's jump and Save at short
heights; enable Reduce Motion; background/resume the tab. Login and the main action
should remain reachable. Real auth/draft integration is a later production slice.
