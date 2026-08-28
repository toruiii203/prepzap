const fs = require('fs');
let code = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

code = code.replace(
  'import { useAuth } from "@/contexts/AuthContext";',
  'import { useAuth } from "@/contexts/AuthContext";\nimport { logQuestCompletion } from "@/lib/quests";'
);

code = code.replace(
  '        if (!generationFailed) {\n          saveHistory({\n            toolName: "quick-study",',
  `        if (!generationFailed) {
          if (user) await logQuestCompletion(user.id, "quick-study-champ");
          saveHistory({
            toolName: "quick-study",`
);

fs.writeFileSync('src/pages/QuickStudy.tsx', code);
