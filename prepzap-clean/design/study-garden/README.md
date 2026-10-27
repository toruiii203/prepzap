# Fresh visual review — study garden

Open `/design-review/study-garden.html` after deployment, or the standalone
`review/prototype.html`. This is a new visual proposal in response to rejection
of the earlier dashboard concept. **It does not change the production dashboard.**

The original SVG study icons remain, with green accents. This direction uses a
calmer header, one primary study action, a compact illustrated hero, clear tool
choices, desktop sidebar and safe-area-aware mobile bottom navigation. Today,
Practice and Library are clickable. Dark mode is in the header.

Try the sample question with either answer to see the supportive mascot feedback;
try adding a note or opening guidance to see contextual dialogs. These are sample
interactions, not real study data, achievements, storage operations or account
calls. No automatic retention popup appears. Escape/dismiss/return focus work;
all motion respects Reduce Motion. No new dependency or raster art was added.

```sh
npm run build:garden
npm run test:garden
npx tsc --noEmit -p design/study-garden/tsconfig.json
```

Review before implementation: overall hierarchy, the smaller mobile hero, how much
mascot presence feels right, green/cream contrast and the dialog tone. Approval of
this direction is the next gate before changing the live dashboard or extending
these patterns to the other app pages. The existing event-driven feedback and
queued celebration infrastructure should be reused in that phase.
