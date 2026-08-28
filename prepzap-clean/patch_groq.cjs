const fs = require('fs');
let c = fs.readFileSync('src/lib/groq.ts', 'utf8');

c = c.replace(
  'const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";\nconst GROQ_API_KEY = "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";',
  'const GROQ_API_URL = import.meta.env.VITE_GROQ_PROXY_URL || "https://groq-proxy.alfonsomigs03.workers.dev";\n// API key removed for security; requests are routed through Cloudflare Worker'
);

c = c.replace(
  '"Authorization": `Bearer ${GROQ_API_KEY}`',
  '"Authorization": `Bearer ${await getAccessTokenSafely()}`'
);
c = c.replace(
  '"Authorization": `Bearer ${GROQ_API_KEY}`',
  '"Authorization": `Bearer ${await getAccessTokenSafely()}`'
);

// We also need to restore `feature` because the Cloudflare Worker DOES support it for logging!
c = c.replace(
  '// ...(feature ? { feature } : {}), // Removed: direct API does not support custom feature flag',
  '...(feature ? { feature } : {}),'
);
// And model logic
c = c.replace(
  'model: resolvedModel.includes("3.3") || resolvedModel.includes("llama") || resolvedModel.startsWith("gemini") ? "openai/gpt-oss-20b" : resolvedModel,',
  'model: resolvedModel,'
);

fs.writeFileSync('src/lib/groq.ts', c);
