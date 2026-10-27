# Studenius onboarding — eight-slide review

Scope: `/design-review/study-studio.html` only. Production onboarding, dashboard,
auth, consent, draft expiry, APIs, storage and reward rules are unchanged. The
existing dashboard concept and its screenshots are also unchanged. This remains
a local-fixture design review, not a replacement for the live signup flow.

## Flow and copy

1. **Subject:** “What are we learning today?” Six illustrated choices, More subjects
   sheet, custom input and “Let's go”.
2. **Subject response:** the brief's subject-specific headline and support on its
   approved field, with a large Seedling and separate subject object.
3. **Optional goal:** “What's today's goal?” Catch up on class / Prep for a test /
   Just exploring. Skip remains available. Selection exists in React memory only.
4. **Goal response:** “Catching up works. We'll go at your pace.” / “Test coming?
   We'll make it count.” / “Exploring is a great start.” Then “Try a question”.
5. **Warm-up:** one local subject question, three answers, Check and Skip. No timer,
   invented progress or remote generation. Feedback is immediate.
6. **Answer response:** “You got it.”, “Good try. Here's the trick.” or “No problem.
   We'll come back to it.” Correct answer and a short explanation when applicable.
7. **Save:** “Keep what you just did.” Existing review sign-in dialog entry points
   and Not now. No account is created by this prototype.
8. **Arrival:** “You're in. Here's your next step.” Existing dashboard link; the
   dashboard itself is not redesigned or automatically opened.

The notebook/pencil artwork, writing controller, Scribe/Quiet selector and
artificial pencil-lift delay have been removed at the user's request. Seedling
keeps the approved standalone silhouette and all eleven existing gestures. A
compact companion sits on quiet question slides; reaction slides have a large
mascot, subject shapes and distinct choreography. Back restores the exact route
without replaying celebrations. Continue never waits for an animation.

## Readability and composition

Portrait headlines are 30–34px on phones and up to 48px on desktop. Subject
labels are 15–18px; answers and primary actions are 18px; supporting copy is
16–18px. Larger type uses real spaces and natural balanced wrapping. The primary
footer stays reachable at 390×700. Short landscape reactions use two columns
instead of shrinking the type. Shapes and objects stay outside the moving mascot.
Theme variables, focus rings, sheet focus restoration, result announcements,
safe areas and reduced motion remain supported. No new dependency was added.

## Review and verification

- Open `/design-review/study-studio.html` after the Cloudflare build completes.
- Offline: `review/prototype.html` includes fonts and code.
- Development: `/design/study-studio/index.html`.
- Review controls: Dark and Static mascot; OS Reduce Motion takes priority.

```sh
npm run build:studio
npm run test:studio
node scripts/buildSeedlingPreview.mjs
node scripts/testSeedlingPreview.mjs
npx tsc --noEmit -p design/study-studio/tsconfig.json
npm test
npm run test:smoke
```

Results and unchanged-file hashes are in `review/results.json` and
`review/scope.json`. Browser coverage includes all eight slides at 320×844,
390×700, 390×844, 1280×800 and 844×390 in both themes, all six subjects,
custom/wrong/skip/back paths, modal focus and reduced motion. The separate
movement gallery verifies all eleven gestures at eight viewport/theme cases.
These checks use Chromium and local fixtures; live OAuth, real student data,
physical iPhone Safari, VoiceOver and deployment status are not certified.

Phone review: follow the eight scenes; try a wrong answer and Skip; use Back;
check small-screen wrapping and the bottom actions; open More subjects with the
keyboard; try dark mode and Reduce Motion. Auth buttons are review dialogs here.

Latest checks: install, preview/app builds, 170 unit tests (29 files), 17 animated
browser scenarios, 60 additional all-subject copy-fit probes, 57 fixture routes,
and 10 quiz viewport/theme checks plus the long-text/keyboard case passed.
Dedicated preview types and touched-file lint pass. Existing repository debt:
330 lint errors, 75 warnings, 68 type errors. The screenshot archive contains
68 current captures; retired Scribe/Quiet captures are no longer included.
