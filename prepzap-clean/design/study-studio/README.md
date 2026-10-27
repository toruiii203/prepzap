# Studenius onboarding — live and review

The user approved the shared presentation for **live `/onboarding`** on 27 October.
Production dashboard remains unchanged. The next dashboard direction is a separate
review at `/design-review/study-garden.html`; it has not replaced any app page.

## Updated onboarding

Welcome → subject → subject response → goal → goal response → question → feedback
→ save. The review also includes the arrival/handoff scene. Google sign-in and
existing-account login are visible on welcome. Get started opens the question-first
path. Google continues through the existing OAuth/account callback; there is no new
sign-in-then-question account protocol.

The header contains only Back. Review controls, wordmark header, step dots, subject
“one try” eyebrow and Skip actions are removed. The notebook/pencil variant remains
removed. Original SVG objects enter around Seedling; a one-time peek/wave/dance
sequence settles into breathing. Nothing waits for the intro to finish. Green
replaces the previous red/coral onboarding accents; Google's official mark retains
its own colors. Reduced motion presents a static composition.

`src/components/onboarding/` is shared by production and preview. The live page
retains its existing shuffled local four-answer bank, auth endpoint payloads,
native/browser redirects, required age/terms consent, email-link/password methods,
returning-user protection and 24-hour draft helper. Consent is now in an accessible
focus-managed dialog opened from Google/email entry. Saved preferences that are no
longer asked about remain governed by the existing draft/default rules. The three
new intent choices are presentation hints, as specified in the earlier brief.
No database schema, API, reward or account-completion rule was changed.

## Review links

- `/onboarding` — live app entry, after deployment. Completed accounts retain their
  existing redirect to the dashboard; use a signed-out window to inspect welcome.
- `/design-review/study-studio.html` — account-free review of the shared UI.
- `?theme=dark` and `?motion=static` — clean review configuration without toolbar UI.
- `?view=board` — archived original concept board, not the new dashboard direction.
- `review/prototype.html` — offline preview with embedded fonts and code.

```sh
npm run build
npm run test:studio
npm run test:onboarding:live
npm test
npm run test:smoke
```

`npm run build` regenerates both review pages before building the app. Browser
checks use Chromium and HTTP/auth fixtures. Live OAuth, physical iPhone Safari,
VoiceOver and Cloudflare's deployment status require manual verification.

Phone review: inspect the opening animation; try Google and the consent checkbox;
use Get started, More subjects, Back and an incorrect answer; reload after the
warm-up to check resume; try dark mode and Reduce Motion; open existing-account login and check the email dialog
with the keyboard open. Test actual Google sign-in with your own account.

Latest polish: the welcome arch uses forest green so the light-green leaf remains
visible in every pose. The final onboarding save screen now offers Google only;
existing-account password and email-link login remain available through welcome.
The live question bank, account callbacks and consent guard remain unchanged.
Latest verification: 176 unit tests and ten live onboarding viewport/theme cases
plus the completed-account redirect. No new dependency was added.
