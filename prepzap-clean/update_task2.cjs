const fs = require('fs');
let task = fs.readFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', 'utf8');
task = task.replace('- `[ ]` Phase 2: Database Schema\n  - `[ ]` Create `notes` table migration\n  - `[ ]` Create `note_links` table migration with cascade deletes', '- `[x]` Phase 2: Database Schema\n  - `[x]` Create `notes` table migration\n  - `[x]` Create `note_links` table migration with cascade deletes');
task = task.replace('- `[ ]` Phase 3: Editor Core\n  - `[ ]` Install Tiptap dependencies', '- `[/]` Phase 3: Editor Core\n  - `[x]` Install Tiptap dependencies');
fs.writeFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', task);
console.log("Updated task.md");
