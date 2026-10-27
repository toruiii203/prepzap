# Studenius: onboarding and visual world master plan

Planning proposal · 27 October 2026 · Asia/Manila

## Product direction

Make Studenius feel like a friendly study studio: clear actions, tactile controls,
original illustrated objects and a living Seedling companion. Keep the approved
cream/crimson/orange base, yellow/coral accents, semantic feedback colors and
Seedling artwork. The user approved the graphic study studio direction: layered flat
graphic objects matching the current Seedling and palette.

The visual signature is a small vocabulary used well: rounded learning tiles,
folded note corners, offset circles, dotted paths, leaf-shaped cutouts and chunky
study objects. Large artwork belongs to introductions, empty states and completed
work. Active study keeps the question, source or document prominent.

This plan follows inspection of the current onboarding, dashboard, tool catalogue,
shared mascot, movement gallery and popup components. It is not a claim of a new
live competitor study. Previous live research attempts were blocked by the proxy.

## Success criteria

- A new student can choose a subject and try a question before creating an account.
- Each onboarding decision has one clear primary action and a visible way back.
- Reaction screens can be continued immediately and do not add mandatory waiting.
- The first dashboard viewport communicates the next useful study action.
- Tools have related, recognizable visual identities and consistent controls.
- Notifications and popups respect focus, actual events and existing settings.
- Page changes remain fast; new illustration assets have explicit byte budgets.
- Keyboard, screen-reader, reduced-motion, text-size and safe-area behavior work.
- Quality reporting separates real services, fixtures and physical-device checks.

## 1. Onboarding storyboard

The latest approved live direction has a Back-only header, green accents derived
from Seedling, a coordinated SVG welcome and no Skip action. Google sign-in is on
the welcome screen; Get started opens the question-first route. Both reuse the
existing account callback and consent rules. The study goal is a presentation
hint and does not add persistence or reward logic.

| Scene | Content and action | Visual/motion | Exit behavior |
| --- | --- | --- | --- |
| Welcome | Google, Get started, existing-account login | Original SVG garden; objects enter, Seedling peeks/waves/dances, then rests | Actions available throughout; no animation gate |
| Subject | Six choices, More subjects/custom | Existing SVG icon kit, compact Seedling | Back to welcome; no Skip |
| Subject response | Authored subject-specific copy | Large Seedling, yellow/leaf/forest field and separate subject object | Continue immediately |
| Goal | Three low-pressure intent choices | Quiet surface and illustrated options | Required choice; hint only |
| Goal response | Reassuring choice-specific copy | Bow/wave and a yellow arch | Try a question immediately |
| Warm-up | Existing shuffled local question bank on live route | Large readable choices; no subject eyebrow or timer | Check after selection; no Skip |
| Answer response | Correct explanation or reassuring correction | Existing transform/opacity gesture rig | Continue immediately; no new award rules |
| Save | Google sign-in, consent and error recovery; email login stays under existing-account entry | Forest field, cream Seedling, separate cards | Existing account callback handles entry |
| Arrival | Existing dashboard handoff | Spin/wave in the standalone review | Actual live callback/redirect remains authoritative |

Subject-specific reactions use a small authored copy table and reusable objects,
not generated content per user. A custom subject gets neutral copy. Back navigation
does not replay a long celebration, erase the choice or create another reward.

Move daily minutes, reminders, exam date, multi-select goals and source import into
optional contextual setup after entry. Offer one suggestion at a time, with Not
now. Only imply scheduled notifications when a delivery service actually supports
them. Remove the current unverified mastery/retention forecasts, projected ready
date, streak-loss pressure, broken font glyphs and unsupported pricing promises.

Preserve draft expiry, existing account protection, local question fallback,
source data and account rules. Changes to when a streak or reward is actually
earned need a separate business-rule decision; presentation must not award one.

## 2. Original visual asset kit

Build a small art bible before generating a large library: palette, silhouettes,
corner shapes, outline weight, perspective, material, light direction and export
sizes. Compare assets beside the actual Seedling and real UI in both themes.

| Asset family | First deliverable | Reuse |
| --- | --- | --- |
| Hero compositions | Subject discovery, first practice, welcome home | Onboarding and dashboard |
| Study objects | Notebook, card stack, timer, speech bubble, calendar, geometric model | Tool headers, cards, empty states |
| Subject objects | Math blocks, science vessel, open book, cell, globe, code tiles | Subject choices and paths |
| Shape primitives | Arches, discs, folded corners, outlined loops, leaf cutouts | Framing, selection and page accents |
| Outcome compositions | Finished practice, saved notes, helpful retry | Completion and recovery |
| Empty-state compositions | No sources, no notes, no sessions | Source Library, Notes, Analytics |
| Reward objects | Original badge, small medal, progress ribbon | Existing verified achievements only |

Use image generation for concept sheets and a few original hero/empty-state
compositions. Generate object-only artwork with transparent backgrounds where
needed, consistent perspective and no baked-in text, numbers or app interface.
Select one direction before expanding it. Inspect results for stray letters,
inconsistent lighting, accidental brand resemblance and unnecessary detail.

Use hand-authored SVG/CSS for icons, interactive shapes, progress, buttons and
objects that must animate by part. Raster output is not automatically a usable
vector rig. Keep the approved Seedling as the existing layered SVG; it is not
regenerated for each illustration. Export approved raster illustrations to
appropriate WebP/AVIF sizes with a suitable fallback. Test transparent edges on
dark surfaces. Store generated assets and provenance with an asset manifest.

Example concept brief: original student study objects arranged around a rounded
notebook and three recall cards; generous negative space; current Studenius
palette; simple readable silhouette; consistent outlines; no text, logos or mascot.
The final prompt will follow the chosen art treatment rather than mixing styles.

## 3. Dashboard hierarchy

1. A compact greeting with Seedling and one real next action, such as continuing
   the active lesson or starting practice. Keep XP/streak information concise.
2. Continue studying: existing active lesson, recent source or document when that
   data is available. An empty account gets a useful start state.
3. Learning path: active node, original subject objects and a restrained companion.
   Decorative scenery does not imply unlocks or progress.
4. A few useful tool shortcuts, followed by All tools. Use honest static grouping
   when there is no authoritative recommendation data.
5. Optional progress/details lower on the page. Avoid duplicate statistics across
   greeting, header, hero and popup.

Explore three dashboard states: first visit, returning with work, and no connection.
Review each at 390px and wide desktop before expanding the design. Desktop uses
its available space and existing sidebar; mobile keeps a reachable bottom nav.

## 4. Tool identity system

Use consistent ToolShell-style structure: concise title, distinctive object,
one-line purpose, main action, existing content/history. Tool graphics recede once
the student starts working. Keep names consistent between dashboard and tools.

| Tool/area | Visual motif | Meaningful interaction |
| --- | --- | --- |
| Practice | Answer tiles and a checkpoint flag | Existing answer select, correction and completion |
| Flashcards | Layered recall cards | Flip, rating response, honest remaining count |
| Tutor / voice conversation | Speech forms and a listening arc | Actual waiting/listening/speaking state only |
| Teach It | Small presentation board and speech form | Encouraging listener; permission recovery |
| Quick Study | Folded study guide and ordered blocks | Real generation progress and section navigation |
| Notes | Notebook and folded page corner | Save feedback; content remains the focus |
| Source Library | File tray and paper stack | Import progress, selection and actionable recovery |
| Math Solver | Number blocks and geometric pieces | Clear step reveal; math stays selectable text |
| Visual Learner | Connected nodes | Diagram creation and accessible navigation |
| Planner | Calendar tiles and a bookmark | Selected date, scheduled item and empty plan |
| Focus Timer | Simple dial and a resting leaf | Actual timer state, pause and completion |
| Mistake Journal | Repaired card and bookmark | Supportive review, without failure labels |
| Analytics | Clear bars and a progress ribbon | Recorded values, refresh and honest unknown states |
| Challenges | Original checkpoint badge | Actual eligibility and completed requirements |
| Arena / Live Battle | Paired flags and versus tiles | Existing lobby, matching, quiz and results states |
| Arcade and its games | Modular play blocks | Reuse game feedback and controls; restrained backdrop |
| Friends / Community / Campus Vault | Paired cards and a shared shelf | Real people, shared items and empty-state invitations |
| Profile / Settings / Pro / legal / errors | Quiet framing and small contextual objects | Clear controls, real terms and recoverable actions |

Cover all 57 registered route patterns through a route/state matrix, including
aliases, shared content, auth callbacks, 404s, dialogs and error states. Not every
route needs unique art; every route needs coherent hierarchy and behavior.

## 5. Mascot and popup choreography

Keep one contextual mascot focal point in a view. Reuse the shared Mascot,
movement API, QuizFeedback, VictoryScreen, StreakCelebrationModal, EntryStreakHost
and existing progress-popup policy. Extend components where useful; do not build
another parallel overlay system.

| Event | Presentation | Seedling behavior | Interruption policy |
| --- | --- | --- | --- |
| Subject chosen | Dedicated onboarding response | Curious lean / wave | Continue immediately |
| Correct answer | Existing feedback sheet | Happy hop | Keep question readable |
| Incorrect answer | Existing correction sheet | Reassuring nod | Keep answer/explanation visible |
| Session completed | Existing victory screen | Cheer or dance variation | One coherent outcome screen |
| Verified streak/level milestone | Existing queued celebration | Double cheer / dance | Only after authoritative event |
| Tool introduction | Small anchored tip or sheet | Wave / curious lean | Dismissible and contextual |
| First source saved | Inline confirmation | Small happy reaction | No extra blocking popup |
| Empty state | In-page guidance | Encouraging pose | One useful action |
| Error/offline | Inline notice or required action dialog | Calm pose | Preserve drafts; offer recovery |

Never stack celebrations, interrupt an active answer, cover the keyboard input or
show a promotional modal immediately after an error. Reuse account-scoped display
metadata already authorized for popup frequency; any broader persistence change
needs its own scope. Offer access to dismissed guidance through Help. Keyboard
focus, Escape behavior, live announcements and return focus are part of every
popup's acceptance criteria.

## 6. Motion and emotional pacing

- Quiet idle: breathing, randomized blinks and small secondary motion.
- Intent: quick press response, selected shape, curious lean or glance.
- Work: real task status; no fake percentages or artificial completion delays.
- Outcome: small confirmation for ordinary actions; larger movement for genuine
  completion. Sound stays optional; visuals carry every important outcome.
- Settle: gestures finish and return to idle; avoid an always-dancing dashboard.

Reuse shared timing/spring tokens, one-shot gesture metadata and existing page
transitions. Animate transform/opacity; keep geometry stable. Stop offscreen and
background motion. Reduced motion uses static expressions and concise state text.
Keep sound/haptics behind existing settings. iOS Safari uses visual feedback;
native iOS haptics require a native shell and are outside this plan.

## 7. iOS-quality interaction and performance gates

Use 44px minimum hit targets, readable form text, safe-area padding, short
landscape layouts, keyboard-aware actions and content that wraps at 320px. Check
Safari/PWA viewport behavior on a real phone. Preserve desktop keyboard workflows,
visible focus, contrast and meaningful names. Dark mode uses semantic surfaces;
illustrations retain their intended pigments and are checked against both themes.

Proposed art budgets: simple SVG objects usually under 8KB; hero raster assets
target 80–120KB per displayed size; new above-fold illustration payload target
under 150KB per entry screen. These are review targets, measured after export.
Reserve dimensions, lazy-load below-fold art, avoid decorative autoplay video,
and keep the preview/art-generation tooling outside production entry bundles.
Profile real devices and network conditions before claiming smoother/faster load.

The known source-image truncation, source binary storage and legacy account-cache
ownership issues remain a separate integrity workstream. Source-import promotion
must not imply those defects are repaired. Confirm storage-repair scope, test
migration/recovery and preserve originals before increasing reliance on imports.

## 8. Delivery sequence and review gates

| Slice | Concrete review artifact | Completion gate |
| --- | --- | --- |
| A: art direction | Approved graphic study studio; one board showing subject choice, solo Seedling response and dashboard | Review concrete compositions before mass generation |
| B: visual kit | Small first batch of objects, shapes and two hero compositions | Match Seedling, both themes, small-size readability and byte budget |
| C: onboarding prototype | Clickable subject → response → warm-up → response → save sequence | Returning user, custom subject, wrong answer, skip, back and auth failure paths |
| D: onboarding production | Existing flow simplified with reusable scenes | No paid pre-auth calls, draft/account preservation, keyboard/phone checks |
| E: dashboard | First-visit, returning and offline layouts | Clear next action, stable loading and no duplicate progress chrome |
| F: core study tools | Practice, Sources, Notes, Flashcards, Tutor, Teach It | Real task states, content focus, accessible feedback |
| G: remaining tools/pages | Route/state coverage matrix and screenshots | Consistent shell, empty/error/loading states and all route checks |
| H: popup integration | Event/presentation matrix using existing queue | No stacking, no false rewards, frequency/focus/keyboard checks |
| I: release quality | Build/test reports, real-device notes, rollback-ready commits | All agreed automated checks and manual phone/service checks |

Review slices in small commits; do not combine a site-wide art swap, auth rewrite
and storage migration. Broad rollout follows approval of the first complete
vertical slice: onboarding, first dashboard and one practice session together.

## 9. Testing and measurement

Automated coverage: unit tests for state/reaction mapping, no-repeat gestures,
cleanup and reduced motion; all route smoke tests; onboarding back/skip/custom
subject/login cases; modal focus; 320/390/430px, landscape, tablet and desktop;
both themes; long text; missing assets; slow/failing requests and keyboard-sized
viewports. Fixture tests never certify live auth, paid services or data migration.

Physical-device review: iPhone Safari and installed PWA, Android browser, screen
reader, larger text, Reduce Motion, muted sound, permission denial, offline return,
keyboard overlap and app resume. Record device/browser and actual findings.

Evaluate onboarding completion, skips, first question attempted, first useful
dashboard action, and return to study only if a suitable existing measurement
system supports them. New analytics collection requires a separate implementation
decision. Do not invent conversion numbers or add tracking merely for decoration.

## Immediate next deliverable

An art-direction board and a clickable prototype of subject choice plus the solo
Seedling reaction, shown alongside a first-dashboard concept. Approve those as
one connected experience, then produce the first asset batch and integrate the
short onboarding. No full-site implementation starts from an unreviewed pile of
generated images.


## Latest delivery and next visual review — 27 October 2026

- `/onboarding`: updated live presentation, including SVG welcome and consent-
  gated Google entry. Existing local question bank, draft expiry and API payloads
  remain in place; unsupported forecasts and streak-loss copy are removed.
- `/design-review/study-studio.html`: the same shared presentation with review
  dialogs and no account operations. Theme/Art board controls are off the main UI;
  review options use `?theme=dark`, `?motion=static`, `?view=board`.
- `/design-review/study-garden.html`: a NEW dashboard/Practice/Library visual
  review. Original icons retained; simplified hierarchy, SVG study art, green CTA,
  responsive navigation and sample contextual mascot dialogs. Sample data only.
- Production dashboard and other pages remain unchanged pending approval of this
  new direction. The request for more page reactions/popups is represented in the
  review before wider implementation, as the user requested.
- Contextual support should never stack overlays or interrupt an active answer.
  Reuse existing queued celebrations and popup frequency policy after approval;
  expand useful event coverage rather than manufacturing milestones or urgency.


### Targeted live dashboard/profile cleanup approved afterward

The user explicitly requested removal of the persistent dashboard encouragement
banner and the outer four-tool shelf frame. Those targeted changes are live-code
updates, alongside a corrected profile editor and eight original SVG portrait
choices. They do not adopt the study-garden review as the production dashboard.
The wider page redesign and new popup rollout remain gated by visual approval.
See `docs/quality-audit/profile-polish/README.md` for scope and verification.
