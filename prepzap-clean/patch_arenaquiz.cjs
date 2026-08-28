const fs = require('fs');
let code = fs.readFileSync('src/pages/ArenaQuiz.tsx', 'utf8');

code = code.replace(
  'await supabase.from("daily_submissions").insert({',
  'await supabase.from("daily_challenge_submissions").insert({'
);
code = code.replace(
  'quiz_date: todayPH(),',
  'challenge_date: todayPH(),'
);
code = code.replace(
  'time_taken: elapsed,',
  'time_taken_seconds: elapsed,'
);

fs.writeFileSync('src/pages/ArenaQuiz.tsx', code);
