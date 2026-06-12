# Studenius Bug Fixes — Deployment Guide

**18 files fixed.** Drop each into the path shown.

---

## File Map

| File | Destination |
|------|------------|
| `App.tsx` | `src/App.tsx` |
| `StudeniusLayout.tsx` | `src/components/StudeniusLayout.tsx` |
| `AITutor.tsx` | `src/pages/AITutor.tsx` |
| `MathSolver.tsx` | `src/pages/MathSolver.tsx` |
| `Settings.tsx` | `src/pages/Settings.tsx` |
| `StudentProfile.tsx` | `src/pages/StudentProfile.tsx` |
| `Analytics.tsx` | `src/pages/Analytics.tsx` |
| `Challenges.tsx` | `src/pages/Challenges.tsx` |
| `Flashcards.tsx` | `src/pages/Flashcards.tsx` |
| `FocusTimer.tsx` | `src/pages/FocusTimer.tsx` |
| `Leaderboard.tsx` | `src/pages/Leaderboard.tsx` |
| `MistakeJournal.tsx` | `src/pages/MistakeJournal.tsx` |
| `Practice.tsx` | `src/pages/Practice.tsx` |
| `QuickStudy.tsx` | `src/pages/QuickStudy.tsx` |
| `SourceLibrary.tsx` | `src/pages/SourceLibrary.tsx` |
| `StudyPlanner.tsx` | `src/pages/StudyPlanner.tsx` |
| `TeachIt.tsx` | `src/pages/TeachIt.tsx` |
| `ToolsHub.tsx` | `src/pages/ToolsHub.tsx` |

---

## What Was Fixed

### 1. Desktop Full-Screen Layout (`StudeniusLayout.tsx` — NEW)
**Problem:** App displayed as a narrow phone-frame on desktop instead of using the full screen.  
**Fix:** Rewrote `StudeniusLayout` with a proper desktop sidebar (224px, sticky, with active link highlighting + Go Pro link) and `<Outlet />` for React Router v6. Mobile keeps bottom nav. No phone frame on desktop.

### 2. Missing Routes (`App.tsx`)
**Problem:** `/mistakes` and `/high-yield` routes were accidentally removed, causing blank pages when clicking "Mistake Journal" from Dashboard/ToolsHub.  
**Fix:** Re-added imports for `HighYieldDetector` and `MistakeJournal`, re-added both routes inside the protected layout.

### 3. AI Tutor — Chat Footer Cut Off (`AITutor.tsx`)
**Problem:** The input box and attach button were hidden/clipped on desktop because `h-[100dvh]` conflicted with the parent shell layout height.  
**Fix:** Changed container to use `flex: 1` with `height: 100dvh` so it fills available space correctly. Increased footer bottom padding.

### 4. AI Tutor — Dead Header Link (`AITutor.tsx`)
**Problem:** The top-right achievement icon navigated to `/daily5` which doesn't exist → blank page.  
**Fix:** Replaced with a **Source Library** button (`library_books` icon → `/sources`). More useful, no dead link.

### 5. Math Solver — No Source Library Option (`MathSolver.tsx`)
**Problem:** No way to attach a source file from inside the Math Solver.  
**Fix:** Added an inline **active source chip** (shows file name + "Change ›" when a source is active) and an "Attach from Source Library" prompt button when no source is active. Source state now syncs on window focus. Header icon also styled consistently.

### 6. Dead Sign-Out Redirects (`Settings.tsx`, `StudentProfile.tsx`)
**Problem:** Logout navigated to `/login` which doesn't exist → error page after sign-out.  
**Fix:** Changed both to `navigate("/onboarding")`, which is the correct auth entry point.

### 7. Back Button — All Tool Pages (14 pages)
**Problem:** Every tool's back arrow hardcoded `navigate("/dashboard")`. If you came from `/tools` or `/planner`, the back button still went to Dashboard — breaking the natural nav flow.  
**Fix:** All header back arrows now use `navigate(-1)` (browser history back). "Go to Dashboard" buttons inside results screens are intentionally kept.  
**Affected:** Analytics, Challenges, FocusTimer, Flashcards, Leaderboard, MathSolver, MistakeJournal, Practice, QuickStudy, SourceLibrary, StudyPlanner, TeachIt, ToolsHub, AITutor.

### 8. Floating Active Source Chip Removed (`TeachIt.tsx`, `QuickStudy.tsx`, `Flashcards.tsx`)
**Problem:** A `fixed bottom-16` black pill appeared over the bottom nav bar when a source was active, making it impossible to tap nav items and looking broken on desktop.  
**Fix:** Removed the floating chip entirely. TeachIt and QuickStudy already have inline "Source Library" buttons in the main content. Flashcards loads the active source automatically on mount. MathSolver got a proper inline chip instead.

### 9. Flashcards — Source Library Header Button (`Flashcards.tsx`)
**Problem:** No way to navigate to Source Library from the Flashcards header (unlike other tools).  
**Fix:** Replaced the Shuffle button in the header with a Source Library (`library_books`) button consistent with other tool headers.
