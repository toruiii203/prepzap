const fs = require('fs');
let code = fs.readFileSync('src/lib/groq.ts', 'utf8');

const regex1 = /if \(\(err as Error\)\?.name === "AbortError"\) \{\s*throw new Error\("Rex took too long to respond \\(request timed out\\). Please try again."\);\s*\}/g;

const replacement1 = `if ((err as Error)?.name === "AbortError") {
        throw new Error("Rex took too long to respond (request timed out). Please try again.");
      }
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        throw new Error("Network error: Failed to reach the AI service. Please disable your ad-blocker or check your internet connection.");
      }`;

code = code.replace(regex1, replacement1);
fs.writeFileSync('src/lib/groq.ts', code);
