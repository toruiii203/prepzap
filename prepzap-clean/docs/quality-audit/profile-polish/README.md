# Dashboard and profile polish — 27 October 2026

User-requested live changes:

- Removed the persistent “A little practice goes a long way” / Find my next lesson
  banner. Earned EntryStreakHost celebrations remain mounted and unchanged.
- Replaced the enclosing study-tools card with a frameless shelf. Four tool cards
  remain visible, and all sixteen destinations remain accessible through swipe,
  compact 44px previous/next controls and the existing collapse preference.
  Removed the outer border, padding, shadow, count pill and redundant dots.
  Rapid arrow taps track their destination without intermediate scroll events
  resetting the counter. Reopening the shelf consistently returns to page one.
- Fixed the editor header/close-button clipping and preview stacking. The avatar
  overlaps the banner intentionally, above it; the name and handle sit below the
  banner. Long names wrap. Verified status displays only when present in data.
  The editor uses Radix focus trapping, Escape and return-focus behavior. Form
  labels are associated; identity inputs use 16px text; buttons have 44px targets.
- Added eight original, small SVG profile choices: Seedling, Sunny side, Moonlit,
  Page pal, Orbit, Bright idea, Cloud nine and Paper flight. Seedling reuses the
  approved artwork. The other portraits are authored vector study/sky objects.
  Existing saved pictures are preserved; selection stays local until Save Profile.

The upload validation, FileReader, custom-image URL and profile-save handler bodies
are byte-for-byte unchanged. `userProfileStore.ts`, Supabase calls, database schema,
auth and reward rules are untouched. Other avatar-game/customization pages are
outside this change; no existing image files or saved choices were deleted.

## Verification

- 178 unit/component tests across 31 files.
- Ten Chromium viewport/theme cases: 320×844, 390×700, 390×844, 1280×800 and 844×390,
  light and dark. Test fixture suppresses the existing first-use tutorial so it can
  exercise the shelf, all four pages, collapse/reopen, the profile dialog, the
  patterned banner, long-name wrapping, eight loaded SVGs, selection/save, Escape
  and return focus. HTTP/auth/realtime are fixtures; no live accounts are modified.
- All 57 existing route patterns pass the fixture smoke check.
- Install and production build pass. New/refactored components and profile editor
  pass lint. Full-repository debt remains 324 lint errors / 73 warnings and 68 type
  errors. Dashboard.tsx retains 25 pre-existing lint errors in unrelated sections;
  this change extracts its shelf with a typed NavigateFunction instead of adding
  suppressions or changing the page's data/quest logic.

Physical iPhone, VoiceOver, native photo picker and live Supabase sync need manual
verification. On your phone: check the dashboard spacing; tap/swipe tool pages;
collapse and reopen; open Customize Profile; try a portrait and Save; check your
own photo upload and Cancel; inspect the patterned banner, long names, dark mode
and a short landscape viewport.

```sh
npm run test:profile-polish
npm test
npm run build
npm run test:smoke
```
