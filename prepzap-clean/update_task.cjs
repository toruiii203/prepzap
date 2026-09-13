const fs = require('fs');
let task = fs.readFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', 'utf8');
task = task.replace('- `[/]` Phase 1: Clean up Study Pets\n  - `[ ]` Delete pet source files & hooks\n  - `[ ]` Delete heavy 3D assets from `public/models`\n  - `[ ]` Remove routes & nav references\n  - `[ ]` Verify build & grep for lingering imports', '- `[x]` Phase 1: Clean up Study Pets\n  - `[x]` Delete pet source files & hooks\n  - `[x]` Delete heavy 3D assets from `public/models`\n  - `[x]` Remove routes & nav references\n  - `[x]` Verify build & grep for lingering imports');
fs.writeFileSync('C:/Users/Migs/.gemini/antigravity/brain/da4ad1ea-0915-4e61-9968-7951e91aba65/task.md', task);
console.log("Updated task.md");
