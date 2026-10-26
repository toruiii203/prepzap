# Entry and progress feedback — architecture and first slice

Mascot decision: user approved option A, the seedling without a ground shadow.
The user also approved the tiny device-only display ledger. The daily entry
streak slice is implemented; other event adapters remain proposals. See
`docs/ENTRY_STREAK_SLICE.md` for the implementation and validation.

## One presentation owner

Add one provider beside the persistent app shell, with a pure typed queue reducer
and one popup family based on the existing Radix dialog and streak presentation.
Events carry a type, user scope, stable event ID, local date, verified values,
priority and origin (entry or in-session). Adapters consume already-loaded data
and already-emitted results. They must not initiate requests or award rewards.
No component opens an unrelated celebration modal independently.

Only enqueue after authenticated data is ready. Ignore initial data hydration
as evidence of newly earned XP or a level increase. Discard stale, duplicate,
superseded and previous-account events. Never replay a backlog on login.

## Priority and source audit

Highest priority first; use event time for ties. Combine related achievements
into one presentation (level-up already includes XP; a streak milestone replaces
an ordinary streak). Low-priority events should usually be inline feedback.

| Priority | Type | Existing source / eligibility | Mood |
| --- | --- | --- | --- |
| 1 | Streak milestone: 3, 7, 14, 30, 100 | `profile.streak_days` plus verified study today, or existing `studenius:streak-updated` event. Show once at the actual milestone, never infer a past achievement from a higher count. | celebrate |
| 2 | Level up | Existing `levelFromXp` and a verified before/after earned-XP result, as used by VictoryScreen. No new level formula. | celebrate |
| 3 | Daily goal reached | Existing `daily_goal_minutes` plus already-loaded completed minutes for today. Defer if reliable dated progress is unavailable. | happy |
| 4 | New unlock | An existing authoritative unlock result. No generic unlock event was established in this audit; defer until a reliable source exists. | happy |
| 5 | Daily streak | Existing profile count and evidence of studying today. Entry copy describes the actual count, never awards a day for opening the app. | encourage |
| 6 | Welcome back after absence | Existing dated session history when already available. Threshold proposal: at least 3 days, with no invented "last visit" field. | encourage |
| 7 | Streak at risk | Existing `isStreakAtRisk` (20:00 or later, active streak, not studied today). Requires verified today status. Never assume missing data means no study. | encourage |
| 8 | Exam countdown milestone | Existing `ExamTarget` already loaded by study context. Proposed 7/3/1 day milestones, local calendar dates, no fabricated readiness. | thinking |
| 9 | XP earned | Existing actual earned-XP result. In-session only; usually an inline chip, never inferred from a total or replayed at entry. | happy |

`StudyStatus` supplies profile totals for display. `useStudyStats` has dated
sessions, but mounting it just for a popup would add a request: reuse the owning
screen's already-loaded result instead. `AuthContext`'s selected profile fields
do **not** include `last_study_date`; do not quietly extend its query. The
`studenius:streak-updated` event carries `newStreak`, not a dated calendar history.
`useQuests.weeklyActivity` describes quest completions, so it cannot be presented
as a complete study-day calendar.

For the first entry slice, suppress the popup unless existing loaded state can
verify both count and today's status. A prototype can use labeled fixture data;
production must never replace missing evidence with sample values. A calendar
row should mark only known days, leaving others neutral.

## Caps, dismissal and navigation

- Maximum one entry popup and two total popups per app session, including entry.
- Each type at most once per local calendar day per user on this device.
- One active popup; no stacked portals. Consume the cap when shown, not enqueued.
- Suppress during active lessons/quizzes, onboarding, permission prompts and an
  existing modal. Drop transient pending celebrations after five minutes rather
  than interrupt the next task. Consume safe completion events after the recap.
- Gate on actual active-session state from the owning flow, not route names
  alone. Do not change route definitions or reward/session rules.
- X, Escape and the primary action dismiss in one step. Restore focus to the
  invoker or current heading if it has gone away. Navigation always wins and
  clears the presentation; no exit-animation wait or disabled navigation.
- Quiet hour changes and midnight do not create a background notification.
  Evaluate eligibility only at an existing safe entry/completion boundary.

## Approved storage exception for display caps

The requested once-per-day guarantee across reloads cannot be implemented using
an in-memory queue alone. Existing interface preferences store theme, sound and
vibration, but have no popup-seen history. The brief also says not to change
storage. The user separately approved the tiny presentation-metadata exception;
no reward or study storage is changed.

Approved scope: a tiny device-only, per-user presentation
ledger (local date, shown types, schema version; no rewards, content or identity
details) using the existing lightweight preference convention. Keep session caps
in memory, synchronize daily caps across tabs, prune old entries, clear queues
on account change. The first adapter uses a Web Lock for cross-tab check/write
and fails quiet if locking or persistence is unavailable. This exception does
not authorize changing auth/profile queries or storing study/reward data.

## Presentation and first slice

Ordinary streak: approved seedling in encourage pose, actual AnimatedNumber,
one line such as "A little practice, day after day.", and a clear Continue action.
Use a sprout growing beside the count; only confirmed today activity fills today
in the calendar. Milestones get the celebrate pose. Reuse SpringButton, motion
tokens and Radix focus behavior. Reduced motion holds a static pose and final
counter; no confetti or flying XP. Reserve art dimensions and pause when hidden.
Keep sound/haptics behind existing preferences; iOS Safari uses visual feedback.

Mascot and ledger decisions are approved; only the daily entry streak slice is
implemented. Remaining adapters and broad rollout still need a later review. Tests:
real-value rendering, missing-data suppression, entry/session/daily caps, same-day
reload (if approved), user change, navigation dismissal, active-quiz suppression,
Escape/focus restore, reduced motion and no extra network requests. Verify with
fixtures first, then a real account on a physical phone before broader rollout.
