const fs = require('fs');
let code = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

// Fix the infinite re-render by inlining DailyCard, LeaderboardCard, etc.
// In React, defining a component inside another component causes it to unmount/remount on every render.
// Since Arena.tsx has a 1-second countdown interval, these components were unmounting every second!
code = code.replace(
  'const DailyCard = () => (',
  'const renderDailyCard = () => ('
);
code = code.replace(
  'const LeaderboardCard = () => (',
  'const renderLeaderboardCard = () => ('
);
code = code.replace(
  'const ExamRoomsCard = () => (',
  'const renderExamRoomsCard = () => ('
);

// Replace the JSX tags with function calls
code = code.replace(/<DailyCard \/>/g, '{renderDailyCard()}');
code = code.replace(/<LeaderboardCard \/>/g, '{renderLeaderboardCard()}');
code = code.replace(/<ExamRoomsCard \/>/g, '{renderExamRoomsCard()}');

// Switch daily_quiz to daily_challenges
code = code.replace(
  /supabase\.from\("daily_quiz"\)\.select\("\*"\)\.eq\("date", today\)/g,
  'supabase.from("daily_challenges").select("*").eq("challenge_date", today)'
);

// Switch daily_submissions to daily_challenge_submissions
code = code.replace(
  /supabase\.from\("daily_submissions"\)\.select\("id"\)\.eq\("quiz_date", today\)/g,
  'supabase.from("daily_challenge_submissions").select("id").eq("challenge_date", today)'
);

// Update Leaderboard query
code = code.replace(
  /supabase\.from\("daily_submissions"\)\.select\("user_id, score, time_taken, display_name"\)/g,
  'supabase.from("daily_challenge_submissions").select("user_id, score, time_taken_seconds, auth.users(raw_user_meta_data)")'
);
code = code.replace(
  /query\.eq\("quiz_date", todayPH\(\)\)/g,
  'query.eq("challenge_date", todayPH())'
);
code = code.replace(
  /order\("time_taken"/g,
  'order("time_taken_seconds"'
);

fs.writeFileSync('src/pages/Arena.tsx', code);
