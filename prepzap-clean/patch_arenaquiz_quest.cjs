const fs = require('fs');
let code = fs.readFileSync('src/pages/ArenaQuiz.tsx', 'utf8');

code = code.replace(
  'import { useAuth } from "@/contexts/AuthContext";',
  'import { useAuth } from "@/contexts/AuthContext";\nimport { logQuestCompletion } from "@/lib/quests";'
);

code = code.replace(
  '      const score = calcScore(correctCount, elapsed, totalTime);',
  `      const score = calcScore(correctCount, elapsed, totalTime);
      
      // Hook daily quiz quest completion
      if (isDaily && user) {
        await logQuestCompletion(user.id, "morning-sprint").catch(console.error);
      }`
);

fs.writeFileSync('src/pages/ArenaQuiz.tsx', code);
