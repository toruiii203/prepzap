const fs = require('fs');
let task = fs.readFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', 'utf8');
task = task.replace('- `[x]` Phase 4: Knowledge Graph\n  - `[x]` Install `react-force-graph-2d`\n  - `[x]` Implement `[[` linking auto-complete trigger\n  - `[x]` Build `KnowledgeGraph.tsx` visualizer', '- `[x]` Phase 4: Knowledge Graph\n  - `[x]` Install `react-force-graph-2d`\n  - `[x]` Implement `[[` linking auto-complete trigger\n  - `[x]` Build `KnowledgeGraph.tsx` visualizer');
fs.writeFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', task);
