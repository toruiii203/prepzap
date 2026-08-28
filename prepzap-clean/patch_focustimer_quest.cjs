const fs = require('fs');
let code = fs.readFileSync('src/pages/FocusTimer.tsx', 'utf8');

code = code.replace(
  'import { useAuth } from "@/contexts/AuthContext";',
  'import { useAuth } from "@/contexts/AuthContext";\nimport { logQuestCompletion } from "@/lib/quests";'
);

code = code.replace(
  '      if (phase === "focus") {\n        setCompletedToday(d => d + 1);\n        awardStudyRewards(settings.focusDuration);\n        triggerCompletionFeedback();',
  `      if (phase === "focus") {
        setCompletedToday(d => {
          const newCompleted = d + 1;
          const totalFocusMinutes = newCompleted * settings.focusDuration;
          if (totalFocusMinutes >= 120 && user) {
            logQuestCompletion(user.id, "deep-work-titan").catch(console.error);
          }
          return newCompleted;
        });
        awardStudyRewards(settings.focusDuration);
        triggerCompletionFeedback();`
);

fs.writeFileSync('src/pages/FocusTimer.tsx', code);
