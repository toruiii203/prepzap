# Motion tokens and mascot reference

## Suggested motion tokens (adapt to the repo's existing tokens)

| Token | Value | Use |
|---|---|---|
| duration-micro | 120ms | button press, toggles |
| duration-standard | 240ms | cards, tabs, sheets |
| duration-large | 500ms | celebrations, page entrances |
| ease-out | cubic-bezier(0.22, 1, 0.36, 1) | most enters |
| ease-in | cubic-bezier(0.4, 0, 1, 1) | exits |
| spring-soft | stiffness 260, damping 24 | cards, sheets |
| spring-bouncy | stiffness 420, damping 18 | buttons, rewards |

## Chunky button press

- Rest: bottom shadow 4px solid darker shade of the button color.
- Pressed: translateY(4px), shadow collapses to 0, 80-100ms.
- Release: spring back with small overshoot.
- Disabled: flat color, no shadow, no press animation.

## Answer feedback timings

- Wrong shake: 3 oscillations, 6-8px amplitude, 300-350ms total.
- Correct pulse: scale 1 -> 1.04 -> 1, 250ms, plus green tint.
- Bottom sheet: slides up with spring-soft, backdrop fades 150ms.
- XP counter: counts up over 600-900ms with ease-out.

## Mascot rig (layered SVG)

Layers: body, head, ear-left, ear-right, eye-left, eye-right, eyelids, pupils, eyebrows, mouth (swappable shapes), cheeks, arm-left, arm-right, tail (2-3 segments), accessory.

Pivots: head at neck, ears at roots, tail at base, arms at shoulders, eyelids at eye top.

Hierarchy: body moves everything, head moves ears/eyes/mouth.

Idle loop intervals (randomize within range):
- blink every 2-5s
- look-around every 4-9s
- tail flick every 3-7s
- ear twitch every 5-10s
- breathing: continuous 3-4s cycle, 1-2% scale

Reactions:
- correct: anticipation crouch (80ms), hop, ears up, sparkle, cheer
- wrong: small flinch, ears droop, slow head shake, recover to encouraging
- streak/level-up: bigger celebration with flame or confetti
- loading: thinking pose with looping gesture
- inactivity (30-60s): yawn, droop, sleepy eyes
- tap: quick squash-and-stretch with a happy face

State API suggestion (also usable as Rive state-machine inputs): mood, correct, wrong, streak, levelUp, tap, loading, sleepy.

Keep the component swappable so a Rive (.riv) file can replace the SVG later without app changes.
