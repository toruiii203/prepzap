const fs = require('fs');
let code = fs.readFileSync('src/lib/groq.ts', 'utf8');

code = code.replace(
  'if ((err as Error)?.name === "AbortError") {\n        throw new Error("Rex took too long to respond (request timed out). Please try again.");\n      }',
  `if ((err as Error)?.name === "AbortError") {\n        throw new Error("Rex took too long to respond (request timed out). Please try again.");\n      }\n      if (err instanceof TypeError && err.message === "Failed to fetch") {\n        throw new Error("Network error: Failed to reach the AI service (groq-proxy). If you are using Brave or an Ad-Blocker, please disable it for this site.");\n      }`
);

// We need to replace it twice, once for regular and once for vision
code = code.replace(
  'if ((err as Error)?.name === "AbortError") {\n        throw new Error("Rex took too long to respond (request timed out). Please try again.");\n      }',
  `if ((err as Error)?.name === "AbortError") {\n        throw new Error("Rex took too long to respond (request timed out). Please try again.");\n      }\n      if (err instanceof TypeError && err.message === "Failed to fetch") {\n        throw new Error("Network error: Failed to reach the AI service (groq-proxy). If you are using Brave or an Ad-Blocker, please disable it for this site.");\n      }`
);

fs.writeFileSync('src/lib/groq.ts', code);
