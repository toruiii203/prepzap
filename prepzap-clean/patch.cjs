const fs = require('fs');
let content = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

// 1. Add import
content = content.replace('import { useToolHistory } from "@/pages/ToolHistory";', 'import { useToolHistory } from "@/pages/ToolHistory";\nimport { logQuestCompletion } from "@/lib/quests";');

// 2. Add logQuestCompletion
const searchStr = `          if (typeof refreshProfile === "function") refreshProfile();
        });
      }`;

const replaceStr = `          if (typeof refreshProfile === "function") refreshProfile();
        });
        
        if (nextScore / questions.length >= 0.8) {
          logQuestCompletion(user.id, "grandmaster");
        }
      }`;

content = content.replace(searchStr, replaceStr);
fs.writeFileSync('src/pages/Practice.tsx', content);
console.log('Success');
