# Seedling rollout and desktop header fix

The user requested replacing the remaining old mascot artwork and fixing the
desktop header shown in their screenshot. This supersedes the earlier
entry-popup-only art rollout; other reward-popup adapters remain deferred.

## What changed

- `Mascot.tsx` now defaults to approved seedling A, with no ground shadow. Its
  public props, lifecycle, mood aliases, reduced-motion support, visibility pause,
  and existing adapters remain compatible. Old inline fox paths and fox-only CSS
  were removed. The dashboard greeting always shows the new character; seeing it
  no longer depends on eligibility for the once-daily streak popup.
- Existing mascot placements automatically use the same rig: dashboard, quiz,
  victory, loading, empty/error states, and onboarding. Arena invite, Pro and
  streak-risk illustrations now use the shared SVG directly. The old black paw
  shadow was removed from the manual streak presentation.
- `exportMascotAssets.mjs` renders the approved SVG into 45 legacy image URLs,
  including tutor expressions, study-path images, saved/default fox-avatar URLs,
  call background and branding. The URLs and saved avatar IDs remain compatible;
  their displayed art is the seedling. No account data or avatar preferences are
  migrated. Unused historical rig sources are not imported by the app.
- Browser/PWA icons were regenerated from the same artwork. Legacy GIF/WebP
  image slots are small static poses; shared SVG placements provide animation.
  The updated tracked images total about 0.57MB, down from 42.1MB. This is asset
  size, not a claim about first-page transfer or measured phone frame rate.
- `sw.js`'s image cache version is bumped so cache-first installations can retire
  the old images. Only the service-worker asset-cache version changes; uploaded
  files, local study data, auth and reward persistence are unaffected.

## Desktop bug

`theme.css` reserved 280px for the fixed sidebar, but the later `motion.css`
greeting rule reset it with `padding:12px 24px`. The sidebar then covered the
mascot and first part of the greeting. The responsive rule now follows that
shorthand, reserving the existing 16rem sidebar plus 24px. Status spacing uses
the same sidebar width. Mobile spacing is unchanged.

At tablet widths, the existing weekly chart's fixed-width bars also exceeded
their narrow column. A scoped CSS rule lets those bars shrink with their column
without changing chart values. No route definition, request, database call,
reward calculation or payment behavior changes. Pro's existing legacy boolean
check is preserved with a type guard rather than `any`.

## Validation

- Lockfile install, production build and all 108 unit tests pass.
- Touched-file lint and type checks show no errors. Repo-wide baseline is now
  361 lint errors, 76 warnings and 88 type errors in other files.
- `testMascotRollout.mjs`: 12 light/dark viewport checks at 390, 768, 1024, 1440,
  1920 and 2560px. Assertions verify visible seedling art, no old fox SVG parts,
  mascot/text clear of the sidebar and no page overflow. Legacy image pixel
  checks verify the approved cream body at representative tutor/path/avatar URLs.
- Existing eight entry-popup browser scenarios and navigation regression checks
  pass. Route smoke remains 56/57: the prior `/analytics` undefined
  `setSessions`/`setLoading` error is unchanged.
- Browser checks use synthetic profile/session data, not a live account. Header
  examples are `design/seedling/review/desktop-header-{light,dark}.png`.

On a phone/PC after deployment: reload to pick up the updated worker, confirm
the dashboard greeting and path companion, open the tutor, check light/dark and
Reduce Motion, and confirm the header at narrow and full-width desktop sizes.
Existing OS home-screen icons may require the OS to refresh its installed icon.
Deployment success must be checked separately; a successful Git push alone does
not prove Cloudflare has finished deploying.
