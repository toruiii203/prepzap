const fs = require('fs');
let code = fs.readFileSync('src/pages/ArenaResults.tsx', 'utf8');

code = code.replace(
  /supabase\.from\("daily_submissions"\)\.select\("user_id, score, time_taken, display_name"\)/g,
  'supabase.from("daily_challenge_submissions").select("user_id, score, time_taken_seconds, auth.users(raw_user_meta_data)")'
);
code = code.replace(
  /\.eq\("quiz_date", today\)/g,
  '.eq("challenge_date", today)'
);
code = code.replace(
  /\.order\("time_taken"/g,
  '.order("time_taken_seconds"'
);

fs.writeFileSync('src/pages/ArenaResults.tsx', code);
