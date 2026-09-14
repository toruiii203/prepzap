const fs = require('fs');
let content = fs.readFileSync('src/pages/MathSolver.tsx', 'utf8');

const targetStr = `        if (Array.isArray(parsed) && parsed.length > 0) {
          setSteps(parsed);
          setSolved(true);
          saveHistory({`;

const replaceStr = `        if (Array.isArray(parsed) && parsed.length > 0) {
          setSteps(parsed);
          setSolved(true);
          
          if (user) {
            supabase.from("study_activity").insert({
              user_id: user.id,
              tool: "math_solver",
              source_id: activeSourceObj ? activeSourceObj.id : null,
              score: 100
            }).then(({ error }) => { if (error) console.error("Study activity save failed:", error); });
          }
          
          saveHistory({`;

content = content.replace(targetStr, replaceStr);

// Ensure supabase is imported if not already.
if (!content.includes('import { supabase } from "@/lib/supabase"')) {
    content = content.replace('import { useStudySession } from "@/hooks/useStudySession";', 'import { useStudySession } from "@/hooks/useStudySession";\nimport { supabase } from "@/lib/supabase";');
}

fs.writeFileSync('src/pages/MathSolver.tsx', content, 'utf8');
