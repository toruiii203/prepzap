# Global XP Leaderboard Implementation

## Goal
Switch the app's Leaderboard from ONLY tracking Daily Challenges to a true "Global XP League" where every action (Practice Quizzes, Flashcards, Daily Arena) adds up to a `total_xp` score.

## Proposed Changes

### `src/contexts/AuthContext.tsx`
- Add a new helper function `addXP(amount: number)` to the context. This will safely fetch the user's current `total_xp` from the `profiles` table and add the new amount to it, then update the state.

### `src/pages/Practice.tsx`
- When the user finishes a practice quiz (in `finalizeQuiz`), calculate their XP (e.g. 10 XP per correct answer) and call `addXP()`.

### `src/pages/ArenaQuiz.tsx`
- When the user finishes an Arena quiz, calculate their XP and call `addXP()`.

### `src/pages/Arena.tsx`
- Rewrite the `loadLeaderboard` function. Instead of querying `daily_challenge_submissions`, query the `profiles` table:
  `supabase.from("profiles").select("id, full_name, total_xp").order("total_xp", { ascending: false }).limit(20)`
- Update the UI to show `Global Rank` instead of `Today's Submissions`.

## Verification
- Take a Practice Quiz and see XP go up.
- Check the Leaderboard to confirm it shows the highest Total XP earners.
