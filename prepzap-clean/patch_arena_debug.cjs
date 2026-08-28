const fs = require('fs');
let code = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

code = code.replace(
  'const questions = await generateQuestions(effectiveTopic, questionCount, difficulty);',
  `let questions;
        try {
          questions = await generateQuestions(effectiveTopic, questionCount, difficulty);
        } catch (err: any) {
          console.error("AI Generation failed:", err);
          throw new Error("AI Generation failed: " + (err.message || "Unknown error"));
        }`
);

code = code.replace(
  'const { data: ex } = await supabase.from("exam_rooms").select("id").eq("code", code).single();',
  `const { data: ex, error: checkErr } = await supabase.from("exam_rooms").select("id").eq("code", code).single();
          if (checkErr && checkErr.code !== "PGRST116") {
            console.error("Supabase code check failed:", checkErr);
            throw new Error("Database error during code check: " + checkErr.message);
          }`
);

code = code.replace(
  'const { error: insertError } = await supabase.from("exam_rooms").insert({',
  `const { error: insertError } = await supabase.from("exam_rooms").insert({`
);
code = code.replace(
  'if (insertError) throw insertError;',
  `if (insertError) {
          console.error("Supabase insert failed:", insertError);
          throw new Error("Database error during room creation: " + insertError.message);
        }`
);

fs.writeFileSync('src/pages/Arena.tsx', code);
