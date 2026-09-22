const fs = require('fs');
let content = fs.readFileSync('setup_arcade.sql', 'utf8');

// The SQL already has:
// DROP POLICY IF EXISTS "Users can read own study activity" ON public.study_activity;
// DROP POLICY IF EXISTS "Users can insert own study activity" ON public.study_activity;
// Wait, I DID add them in the previous execution! Let me check setup_arcade.sql.
