const fs = require('fs');
const content = `# QA Bug Fix Implementation Plan

This document outlines the proposed technical fixes for the QA issues reported, grouped by priority.

## User Review Required

Please review the proposed solutions, especially the data source consolidation strategy for the Dashboard/Analytics. Once approved, I will begin implementing them sequentially.

## Open Questions

- **P0.3 Arcade/Arena 0 duration**: For Arcade and Arena, sessions might end abruptly (e.g., user closing tab or navigating away) without triggering a \`stopTracking()\` call. I will ensure we flush study time on route changes.
- **P4.19 Exam Room name filtering**: Should I just delete the specific test rooms mentioned, or also implement a basic frontend profanity filter for room creation? (The plan currently covers both).

## Proposed Changes

### P0 — Data Integrity

#### [MODIFY] \`src/pages/Dashboard.tsx\` & \`src/pages/Analytics.tsx\` & \`src/pages/StudentProfile.tsx\`
- **Root Cause**: \`Dashboard\` and \`Analytics\` fetch from \`supabase.from("study_sessions")\`, but \`Dashboard\` stalls because \`setSessions\` is blocked behind the \`supabase\` await. \`StudentProfile\` reads statically from \`localStorage.getItem('study_sessions')\`.
- **Fix**: 
  - Consolidate to fetch from the actual source of truth (the \`usage_logs\` table, which is updated centrally by the \`StudyTimeTracker\`). We will read from \`usage_logs\` to get total time studied and sessions.
  - Or, if \`study_sessions\` is the intended source of truth, ensure all three pages use a shared hook (e.g., \`useStudyStats()\`) that unifies the cache and network fetch.
  - Fix the infinite loading block by setting cached data *before* the \`await\` so the UI hydrates instantly.

#### [MODIFY] \`src/components/SharedSidebar.tsx\` (or where duration is rendered)
- **Root Cause**: Unrounded floats like \`1.283333333 mins\` are rendered directly.
- **Fix**: Create/update a formatting utility (e.g., \`formatDuration(minutes)\`) to display \`Xm Ys\` or rounded values and apply it to \`RecentSessionsRows\` and \`Analytics\`.

#### [MODIFY] Arcade/Arena Time Tracking
- **Root Cause**: \`0 mins\` indicates the timer started but the stop event missed the duration update.
- **Fix**: Hook into \`beforeunload\` and route unmounts to guarantee pending study time is flushed to \`usage_logs\`.

### P1 — Broken/Stuck Functionality

#### [MODIFY] \`src/pages/Dashboard.tsx\` & \`src/pages/NotesWorkspace.tsx\`
- **Root Cause**: Supabase \`fetch\` calls are hanging indefinitely with no network request. This is the classic \`supabase-js\` internal queue stall if \`auth.getSession()\` gets stuck or if the table is missing and a websocket is blocking. 
- **Fix**: Wrap these on-mount fetches in \`withTimeout(..., 5000)\` so they fail gracefully instead of spinning forever, and ensure the fallback logic renders the cached UI.

#### [MODIFY] \`src/pages/AITutor.tsx\`
- **Root Cause**: Rex Tutor's quick-action button row overflows.
- **Fix**: Add \`flex-wrap\` and/or an \`overflow-x-auto\` container with hidden scrollbars for the action pill row.

#### [MODIFY] \`src/components/SharedSidebar.tsx\`
- **Root Cause**: "UPGRADE TO PRO" shows for Pro users.
- **Fix**: Wrap the button in a check: \`if (profile?.plan === 'pro') return <ManagePlanButton />\`.

### P2 — Duplicated / Redundant UI

#### [MODIFY] \`src/pages/AITutor.tsx\`
- **Root Cause**: Two identical \`<p>\` elements for the AI disclaimer.
- **Fix**: Remove the duplicate disclaimer in the JSX layout.

#### [MODIFY] \`src/pages/Flashcards.tsx\`
- **Root Cause**: Deck list duplicated back-to-back.
- **Fix**: Ensure the deck merging logic (cache vs db) checks for duplicate IDs.

#### [MODIFY] \`src/pages/QuickStudy.tsx\`
- **Root Cause**: Cram Mode / High Yield toggle shown twice; "Coverage Score" shown twice.
- **Fix**: Consolidate UI elements to a single control point.

### P3 — Inconsistent / Confusing Data and Copy

#### [MODIFY] \`src/components/GlobalHeader.tsx\` / \`Avatar.tsx\`
- **Root Cause**: Header avatar initial falls back to inconsistent defaults.
- **Fix**: Force it to derive from \`profile?.full_name\` or \`user?.email\`.

#### [MODIFY] Daily Goal Sync
- **Root Cause**: Hardcoded \`5\` vs \`8\` sessions.
- **Fix**: Connect them to \`profile?.daily_goal\` (if it exists) or a centralized constant.

#### [MODIFY] \`src/pages/ArenaRoom.tsx\`
- **Root Cause**: Rooms show "LIVE" + "WAITING".
- **Fix**: Make status badges mutually exclusive.

#### [MODIFY] \`src/components/SharedSidebar.tsx\`
- **Root Cause**: Username truncated with no tooltip.
- **Fix**: Add \`title={profile.full_name}\` and potentially \`text-ellipsis\`.

#### [MODIFY] \`src/pages/AITutor.tsx\`
- **Root Cause**: "1 msgs" pluralization.
- **Fix**: \`count === 1 ? '1 msg' : count + ' msgs'\`.

#### [MODIFY] \`src/pages/MathSolver.tsx\`
- **Root Cause**: "No plottable function detected" overlaps the y-axis label.
- **Fix**: Add conditional rendering/opacity to axis ticks when empty.

#### [MODIFY] \`src/pages/Analytics.tsx\`
- **Root Cause**: Knowledge distribution radar chart is a static placeholder.
- **Fix**: Replace with a functioning \`recharts\` Radar chart or hide it conditionally if unimplemented.

#### [MODIFY] \`src/pages/NotFound.tsx\`
- **Root Cause**: 404 page uses dark theme.
- **Fix**: Apply standard light/cream neobrutalist theme.

### P4 — Content/Moderation

#### [MODIFY] DB / \`src/pages/Arena.tsx\`
- **Root Cause**: Test data and slurs visible in public rooms.
- **Fix**: Delete the problematic rooms via SQL, and add a basic blocklist/filter to the "Create Room" input.

### P5 — Mobile-specific

#### [MODIFY] \`src/components/MobileNav.tsx\` & \`src/pages/ToolsHub.tsx\`
- **Fix**: Add Settings, Focus Timer, and Arcade to the "All Tools" view, and surface a dedicated "Account" button.

#### [MODIFY] \`src/components/MobileCalendar.tsx\`
- **Fix**: Standardize empty vs completed day rendering.

#### [MODIFY] \`src/pages/StudentProfile.tsx\`
- **Fix**: Wrap long text descriptions in nav cards; link the stats to the unified data source (resolving the \`---\` issue).

## Verification Plan

### Automated Tests
- Run \`npm run build\` to ensure no typing or compilation regressions.

### Manual Verification
- Request the user to view \`/dashboard\`, \`/analytics\`, and \`/profile\` to confirm stats match exactly.
- Request the user to view AITutor and QuickStudy to confirm UI duplications are gone.
`;
fs.writeFileSync('C:\\Users\\Migs\\.gemini\\antigravity\\brain\\da4ad1ea-0915-4e61-9968-7951e91aba65\\implementation_plan.md', content, 'utf8');
