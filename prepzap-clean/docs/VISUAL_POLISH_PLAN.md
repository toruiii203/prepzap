# Studenius visual polish plan — review before implementation

## What the supplied recording demonstrates

Reviewed the 27-second `Screen Recording 2026-10-26 193511.mp4`. It shows character-
focused app presentations: large expressive faces, full-body poses, a coherent
illustrated environment, readable speech bubbles, a small number of controls, and
short reactions with pauses. The appeal comes from art direction and character
acting as much as interface transitions. The recording is a visual reference;
its on-screen wording is not an instruction to change this app.

Studenius should use these principles with its own fox scholar, subject matter,
restored palette and student voice. Do not reproduce the reference characters,
flower-like head silhouettes, scenes, colors, logos or audio.

## Direction recommended for approval

**A warm study world with a soft 3D-looking Rex, paired with responsive SVG UI.**
Keep the approved compact fox, round glasses, small graduation cap, short robe
and cream-tipped tail. Use Blender to give large hero poses soft volume, a clear
silhouette, expressive eyes and consistent studio lighting. Keep the existing
layered SVG for small, immediate interactive feedback. Extend the current Mascot
API and existing components rather than rebuilding them.

Preserve the current cream background, crimson/orange accents, and existing
coral/yellow highlights. Illustration shading can add depth; no palette reset,
whole-page inversion, decorative gradients across every panel, or permanent
WebGL canvas is proposed. A live 3D renderer is unnecessary for this first pass.

## Prioritized pieces

| Priority | Piece | Concrete change | Reuse |
|---|---|---|---|
| 1 | Original Rex art pack | One hero pose plus happy, thinking and celebration poses; expressive face studies; static layered desk/notebook scenery | Mascot moods, Blender 4.3.2, existing SVG rig |
| 2 | Dashboard focal point | A single friendly Rex study scene beside the next real study action; progress stays readable and truthful | DashboardGreeting, StudyStatus, existing study-path data |
| 3 | Connected quiz feedback | A quick selection response, Rex reacting beside the explanation, a compact feedback panel, an XP burst flowing toward its counter | QuizAnswer, QuizFeedback, SpringButton, Progress, AnimatedNumber |
| 4 | Reward scene | A focused achievement composition with Rex, a custom medal/book prop, earned XP and one clear next action | VictoryScreen, real level/streak values, existing confetti |
| 5 | Native-feeling surfaces | Consistent control depth, restrained card lift, active-tab indicator, readable sheets with anchored actions | Existing button/card/tab/dialog components and motion tokens |
| 6 | Purposeful supporting states | Small thinking/encouraging scenes for loading, empty and error states; onboarding demonstrates one useful action | AppSkeleton, PageLoading, EmptyStudyState, error boundaries, onboarding |

Avoid decorating every card with a mascot, making every number bounce, or playing
celebrations on ordinary navigation. Keep visual emphasis for actual progress.

## First reviewable deliverable

Before modifying all routes, prepare:

1. A Rex hero art sheet showing the existing design translated into the proposed
   softly lit style, including three expressions. Approve its look first.
2. One dashboard mockup at 390px and desktop, using the actual study layout.
3. One quiz feedback sequence (select → wrong/correct → continue) and one reward
   composition using the same art, scale, shadows and palette.
4. A short captured interaction demo, with light/dark and reduced-motion views.

Review this slice for character appeal, clarity and performance. Then implement
it in the existing components in small commits and roll out the proven pattern
to the remaining routes. This plan does not authorize implementing a new mascot
look or broad visual changes before that design review.

## Performance and accessibility gates

- Keep navigation improvements from PERFORMANCE_FIX.md: persistent shell, no
  artificial loading delay, no exit-animation wait, and intent-based code preload.
- Prefer route-loaded WebP/AVIF posters and small layered SVG artwork. Initial
  targets: a hero poster around 100–150KB and an optional short reaction under
  250KB, measured and revised after an actual render. Load one needed pose, not
  the whole pack. These are budgets to validate, not measured asset sizes.
- Reserve image dimensions. Show existing content before artwork arrives. An art
  download or animation must never delay a lesson, quiz action or navigation.
- Use transform/opacity for UI animation; static illustration shading is fine.
  Pause offscreen artwork. Profile a real phone rather than assuming 60fps.
- Use the existing motion tokens: immediate press feedback, short reactions, and
  limited celebration. Preserve static/reduced-motion poses and stop confetti.
- Keep 44px targets, keyboard-safe bottom actions, modal focus, visible focus,
  contrast, and existing live-region announcements. Sound/vibration stay optional.
  iOS Safari relies on visual feedback; no native haptic work is proposed.
- Keep auth, requests, routes, storage and reward calculations unchanged.

## How 21st MCP fits

Use 21st for component research and layout exploration after it is connected.
Adapt useful patterns into the existing typed primitives and restored brand.
It does not automatically supply the original character art or prove accessibility
or performance. Hosted generation depends on the account's 21st access; catalog
search/retrieval and generation are distinct capabilities.

## Status of this planning pass

- Reference recording inspected; app visuals deliberately unchanged.
- Magic compatibility command downloaded/executed; latest package reported 0.2.3.
- Official docs identify its replacement as https://21st.dev/api/mcp.
- Project Codex configuration and a launcher are prepared and validated.
- Live MCP authentication/tool discovery remains blocked by a missing fresh key.
- Plan and tooling changes are intended to be pushed; they do not deploy a new UI.
