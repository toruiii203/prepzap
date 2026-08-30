const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
let url = "", key = "";
for (let line of env.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL=")) url = line.split("=")[1].trim();
    if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) key = line.split("=")[1].trim();
}
const supabase = createClient(url, key);
async function run() {
    // We cannot easily mock a user session via anon key for INSERT if RLS requires auth.uid()
    // Let's just try to insert without auth and see what error we get.
    const res = await supabase.from("daily_challenge_submissions").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        challenge_date: "2026-08-30",
        answers: {},
        score: 100,
        time_taken_seconds: 10,
        display_name: "Test"
    });
    console.log(res);
}
run();
