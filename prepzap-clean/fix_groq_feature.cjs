const fs = require('fs');
let c = fs.readFileSync('src/lib/groq.ts', 'utf8');
c = c.replace('...(feature ? { feature } : {}),', '// ...(feature ? { feature } : {}), // Removed: direct API does not support custom feature flag');
fs.writeFileSync('src/lib/groq.ts', c);
