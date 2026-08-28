const fs = require('fs');
let c = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

c = c.replace(
  '      } catch (firstErr) {\n        console.warn("[QuickStudy] first generation attempt failed, retrying once:", firstErr);\n        try {\n          result = await attemptGenerate(true);',
  '      } catch (firstErr: any) {\n        if (firstErr?.message?.includes("API error")) throw firstErr;\n        console.warn("[QuickStudy] first generation attempt failed, retrying once:", firstErr);\n        try {\n          result = await attemptGenerate(true);'
);

fs.writeFileSync('src/pages/QuickStudy.tsx', c);
