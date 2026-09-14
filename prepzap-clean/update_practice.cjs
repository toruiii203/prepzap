const fs = require('fs');
let content = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

const targetStr = `      const quizSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
      const historyTitle = topicInput.trim() || quizSubjects.join(", ") || "Practice Quiz";
      saveHistory({`;

const replaceStr = `      const scorePct = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
      if (user) {
        supabase.from("study_activity").insert({
          user_id: user.id,
          tool: "practice",
          source_id: activeSourceObj ? activeSourceObj.id : null,
          score: scorePct
        }).then(({ error }) => { if (error) console.error("Study activity save failed:", error); });
      }

      const quizSubjects = Array.from(new Set(questions.map(q => q.subject).filter(Boolean)));
      const historyTitle = topicInput.trim() || quizSubjects.join(", ") || "Practice Quiz";
      saveHistory({`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/pages/Practice.tsx', content, 'utf8');
