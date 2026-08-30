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
    const res = await supabase.from("room_submissions").select("answers").limit(1);
    console.log(res);
}
run();
