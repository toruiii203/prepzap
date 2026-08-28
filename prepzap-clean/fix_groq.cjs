const fs = require('fs');
let c = fs.readFileSync('src/lib/groq.ts', 'utf8');
c = c.replace('model: resolvedModel,', 'model: resolvedModel.includes("3.3") || resolvedModel.includes("llama") || resolvedModel.startsWith("gemini") ? "openai/gpt-oss-20b" : resolvedModel,');
fs.writeFileSync('src/lib/groq.ts', c);
