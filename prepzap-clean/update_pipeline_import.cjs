const fs = require('fs');
let content = fs.readFileSync('src/lib/arcadePipeline.ts', 'utf8');

content = content.replace('import { callGroq } from "./groq";\nimport { safeParseJSON } from "./jsonParser";', 'import { callGroq, safeParseJSON } from "./groq";');

fs.writeFileSync('src/lib/arcadePipeline.ts', content, 'utf8');
