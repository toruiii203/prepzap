const fs = require('fs');
let c = fs.readFileSync('src/lib/groq.ts', 'utf8');

c = c.replace('const GROQ_API_URL = "https://groq-proxy.alfonsomigs03.workers.dev";', 'const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";\nconst GROQ_API_KEY = "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";');
c = c.replace('...(token ? { "Authorization": `Bearer ${token}` } : {}),', '"Authorization": `Bearer ${GROQ_API_KEY}`,');
c = c.replace('...(visionToken ? { "Authorization": `Bearer ${visionToken}` } : {}),', '"Authorization": `Bearer ${GROQ_API_KEY}`,');
c = c.replace('model: resolvedModel.includes("3.3") || resolvedModel.includes("llama") || resolvedModel.startsWith("gemini") ? "openai/gpt-oss-20b" : resolvedModel,', 'model: resolvedModel,');
c = c.replace('...(isOpenRouterModel ? { route: "openrouter" } : {}),', '');
c = c.replace('const DEFAULT_MODEL = "gemini-2.0-flash";', 'const DEFAULT_MODEL = "llama-3.3-70b-versatile";');
c = c.replace('const VISION_MODEL = "gemini-2.0-flash";', 'const VISION_MODEL = "llama-3.2-90b-vision-preview";');

fs.writeFileSync('src/lib/groq.ts', c);
