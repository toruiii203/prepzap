# Topic and single-file learning roadmaps

This supersedes the previous fixed Guidebook and generic dashboard tool path. No cloud schema, auth flow, reward policy or existing practice scoring was changed. The user approved account-scoped, device-only persistence for these new roadmaps.

## Student journey

1. Dashboard → **Your learning roadmaps** → **New roadmap**.
2. Enter a topic and optional focus, or select exactly one uploaded/existing file. Broad subjects require a focus. Choose a starting level.
3. Preview 3–8 ordered chapters, objectives and prerequisites. Rename chapters, or return to adjust input and generate again. The final chapter connects earlier concepts.
4. Save the outline locally. Open a chapter to prepare its lesson once; saved lessons and progress remain available offline.
5. Follow Understand → Guided practice → Try it yourself → Written recall → Checkpoint → Later review. Students can revisit stages and open chapters without artificial locks.
6. Resume from the next unfinished stage, export a JSON backup, restore it to the current account, or delete a roadmap with confirmation.

Lessons contain a substantive explanation, a reasoned worked example, a specific misconception, two guided questions, two independent-practice questions, two written recall prompts, three checkpoint questions and two different delayed-review questions. Incorrect answers explain the reasoning and show a simpler example. A failed checkpoint can generate different questions, preserving progress in the other stages.

Written recall is explicitly self-assessed against a model answer and key ideas; it is not automatic essay grading. Reading alone never marks mastery. Ready for review requires reading, both practice sets, both positive recall self-checks, all checkpoint attempts and at least two of three checkpoint answers correct on their first attempt for that question set. Later review opens after 24 hours and uses fresh questions; answering both correctly records Reviewed. No universal mastery percentage or guarantee is displayed.

## File and generation boundaries

- Text-based PDF, TXT and Markdown; exactly one file, up to 5 MB.
- PDF extraction uses the installed PDF.js with its worker loaded only when needed. Up to 40 pages and 32,000 characters are included. Coverage/truncation is shown before generation and retained with the roadmap. Empty/image-only PDFs and raw image data are rejected rather than treated as meaningful text.
- For an existing Source Library item, only available extracted text/preview is used, with that limitation stated. The global selected-source list is not changed.
- Only the selected file's extracted text, or the entered topic/focus, is sent to the existing authenticated generation proxy. The optional `includeActiveImages: false` argument prevents unrelated active images from being injected. Existing callers retain their previous default behavior, covered by a regression test.
- File-based outlines and lessons require short supporting quotations found exactly in the provided text; invented quotations are rejected. This validates provenance, not the factual truth of every generated sentence. Topic mode forbids fabricated source quotations.
- New chapters are generated on demand instead of requesting an entire course in one large response. Every preview, new lesson or fresh question set uses the existing `quick_study` generation feature/allowance. Existing auth, provider fallbacks and server-side limits are reused. No new endpoint or app dependency was added.
- Structured response validation rejects incomplete lessons, invalid answer indices, duplicate options/prompts and unsupported citations. Errors preserve the current input or earlier saved work. There are no fake scan stages or invented progress counters.

## Storage and safety

A separate IndexedDB database, `StudeniusLearningRoadmaps`, uses compound `[ownerId+id]` keys. Existing deck/source/progress stores are not migrated or modified. Source snapshots are extracted text, not uploaded binaries. Persistent-storage permission is requested when available; the UI explains device-only storage and the need for export.

Writes complete before the UI claims a save. Failed saves keep a generated preview available for retry. Account changes discard in-flight generation results. Closing a generating modal stops waiting for its result; the already-sent request may still count toward the allowance, as explained in the UI. Restored backups receive a new ID and the current account scope. Exports contain lessons, written answers and extracted source text, so the UI advises keeping them private.

The original generic StudyPathMap, fixed TopicGuidebook, catalog and superseded tests were removed. Existing standalone Page guide remains separate from learning content; its dashboard targets now point to the new roadmap controls. Existing practice launch/storage modules are retained for their other callers.

## Files

- `src/components/roadmaps/`: dashboard cards, creation/preview/path modal, learning stages, semantic theme styling, responsive layout and shared motion tokens.
- `src/lib/learningRoadmap.ts`: typed content validation, learning stages and readiness rules.
- `src/lib/roadmapGeneration.ts`: scoped outline, lesson and fresh-question requests.
- `src/lib/roadmapSource.ts`: bounded text/PDF extraction and honest coverage.
- `src/lib/roadmapStore.ts`: account-scoped IndexedDB, backup validation, export and deletion.
- `src/lib/groq.ts`: optional active-image isolation; original call defaults preserved; existing touched lint errors fixed.
- `src/pages/Dashboard.tsx`, `src/lib/tutorialContent.ts`: replace the old path and update separate contextual help.
- Four new unit-test files, `scripts/fixtures/roadmap.json`, `scripts/testLearningGuides.mjs`, and a backward-compatible generation callback in `scripts/uiFixtures.mjs`.

## Verification and limits

- Production build passed using fixture Supabase environment values; existing chunk-size warning remains.
- Unit suite: 193 tests across 36 files after adding the legacy-image-data regression. Covers malformed output, source evidence, readiness vs retries, delayed review, source limits, backup ownership, default/isolation proxy behavior, wrong-answer explanations, written recall, failed-save retry and account-switch cancellation.
- Eight real-browser journeys passed at 320×844, 390×700, 1280×800 and 844×390 in light and dark themes. Actual IndexedDB and actual TXT/PDF extraction were used; generated responses and accounts were fixtures. Tests cover save/reload/resume, failed checkpoint → fresh set, delayed review with a simulated earlier readiness timestamp, account separation, one-file input, malformed responses, offline errors and viewport bounds. The 320px light case also reads a real text PDF, rejects a real empty PDF, restores a backup and tests cancel/confirm deletion. See `browser-results.json`.
- 57/57 route smoke patterns passed with fixture auth/HTTP/realtime responses.
- New roadmap files and the changed proxy helper have zero lint errors. Existing Dashboard and repository debt remains: full lint reported 314 errors / 71 warnings; type check reported 67 existing errors with none in new roadmap code or the proxy helper. Global checks are not clean.
- Browser captures are Chromium, not physical iOS Safari. Live Google auth, production proxy/provider generation quality, actual quota exhaustion and Cloudflare deployment status were not verified. Fixture lessons test behavior and validation, not production teaching quality.
- Initial release uses multiple-choice practice/checkpoints and self-assessed text recall. It does not add voice tutoring, automatic essay grading, generated scientific diagrams, cloud sync or new XP rewards.

## Phone review

1. Create a focused topic, inspect the chapter scope, save, open a lesson and reload to check resumption.
2. Upload a text PDF; verify filename and coverage. Try an image-only PDF and confirm the useful error.
3. Attempt a wrong answer; inspect the explanation and simpler example. Compare written recall against the model answer without treating it as automatic grading.
4. Finish a checkpoint and verify review is scheduled, rather than a fake mastery badge appearing.
5. Export/restore a backup and test deletion. Keep exported source text private.
6. Check dark mode, reduced motion, keyboard scrolling, text wrapping and safe-area spacing in Safari/PWA.

## Captures

- [Phone roadmap](phone-roadmap.png)
- [Dark lesson](phone-lesson-dark.png)
- [Wrong-answer recovery](phone-recovery.png)
- [PDF preview](phone-pdf-preview.png)
