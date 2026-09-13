const fs = require('fs');
let task = fs.readFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', 'utf8');

task = task.replace('- `[/]` Phase 3: Editor Core\n  - `[x]` Install Tiptap dependencies\n  - `[ ]` Build `NotesWorkspace.tsx` and `TiptapEditor.tsx`\n  - `[ ]` Implement `/` slash commands menu\n  - `[ ]` Implement AI subcommands (`/ai summarize`, `/ai explain`, `/ai flashcards`)', '- `[x]` Phase 3: Editor Core\n  - `[x]` Install Tiptap dependencies\n  - `[x]` Build `NotesWorkspace.tsx` and `TiptapEditor.tsx`\n  - `[x]` Implement `/` slash commands menu\n  - `[x]` Implement AI subcommands (`/ai summarize`, `/ai explain`, `/ai flashcards`)');

task = task.replace('- `[ ]` Phase 4: Knowledge Graph\n  - `[ ]` Install `react-force-graph-2d`\n  - `[ ]` Implement `[[` linking auto-complete trigger\n  - `[ ]` Build `KnowledgeGraph.tsx` visualizer', '- `[x]` Phase 4: Knowledge Graph\n  - `[x]` Install `react-force-graph-2d`\n  - `[x]` Implement `[[` linking auto-complete trigger\n  - `[x]` Build `KnowledgeGraph.tsx` visualizer');

task = task.replace('- `[ ]` Phase 5: RAG Knowledge Base Chat\n  - `[ ]` Build `KnowledgeBaseChat.tsx`\n  - `[ ]` Implement chat context retrieval across the graph', '- `[x]` Phase 5: RAG Knowledge Base Chat\n  - `[x]` Build `KnowledgeBaseChat.tsx`\n  - `[x]` Implement chat context retrieval across the graph');

fs.writeFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', task);
console.log("Updated task.md");
