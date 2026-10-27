# Studenius graphic study studio — first review slice

27 October 2026, Asia/Manila. The user approved layered flat art with the current
palette and Seedling. This is a clickable design proposal, separate from the live
onboarding and dashboard.

## Open the review

- `review/prototype.html`: download and open; fonts, code and artwork are embedded.
- `/design-review/study-studio.html`: the same review artifact is copied under
  `public` for viewing on the deployed site after a successful Cloudflare build.
  Deployment availability is not established by a Git push.
- Vite development: `/design/study-studio/index.html`.
- Use Prototype / Art board, Dark and Static mascot controls in the review bar.

```sh
npm run build:studio
npm run test:studio
npx tsc --noEmit -p design/study-studio/tsconfig.json
npx eslint design/study-studio/Prototype.tsx design/study-studio/StudyObject.tsx
```

## What's in this slice

A subject decision, solo Seedling response, local sample question, correct/wrong/
skipped feedback, save-progress composition, first-dashboard concept, contextual
tool dialogs and a sample celebration. Back follows the actual path, including
skipping the warm-up. More subjects and custom names are supported. A custom
subject uses an explicitly labeled general sample question, not generated subject
content. Continue is immediately available on reaction screens.

The art board shows the three connected moments, nine original hand-authored SVG
objects, the approved palette and one original image-generated composition. The
image was generated/refined with the image tool, then resized and encoded as a
62,020-byte transparent WebP. See `asset-manifest.json` for provenance and review
status. No competing brand assets were copied. The existing Seedling, SpringButton,
PageTransition and gesture system are reused. No new dependency was added.

Account actions explain where the existing authentication will connect; the
prototype never signs in, creates an account or writes study progress. Questions
and dashboard content are local fixtures. It awards no streak, XP or mastery and
makes no exam-readiness/retention forecasts. Actual consent, existing draft expiry,
returning-user protection, source storage and production auth remain unchanged.
The previously reported image-import integrity issue is not repaired here.

## Verification and limits

- Eleven browser scenarios pass: 320/390/430px phones, 844px landscape and 1440px
  desktop, each in light/dark, plus custom subject/skip/exact back navigation.
- Checks include correct and incorrect answers, immediate reaction actions, modal
  focus/restore, illustration loading, 44px control targets, no horizontal overflow,
  reduced motion, no external requests and no localStorage writes.
- Dedicated preview TypeScript and touched-file lint pass.
- All 149 existing unit/component tests, the app build and all 57 existing fixture
  route smoke checks pass. Main app source, router and API calls were not changed.
- The review HTML embeds React/motion/fonts/art to open offline; its download size
  is not the proposed production entry bundle. It loads only when opened directly.
- Real iPhone smoothness, VoiceOver, text scaling, PWA insets and real sign-in are
  not certified by these fixtures. Existing repository lint/type debt remains as
  documented in the earlier audit (330 errors/75 warnings; 68 type errors).

## Review on a phone

Choose a subject, go back and change it, try both answer outcomes, skip a question,
try a long custom subject, inspect the dashboard and sample celebration, switch
the theme, and enable Reduce Motion. Compare the Art board with the actual scenes.
Review the typography, object detail, image edges and amount of empty space.

Next production slice follows review of these compositions and pacing: integrate
reusable scenes into the existing onboarding, preserving actual auth/draft/reward
behavior, then connect the dashboard to real existing data. The broader sequence
is in `docs/ONBOARDING_AND_VISUAL_WORLD_PLAN.md`.
