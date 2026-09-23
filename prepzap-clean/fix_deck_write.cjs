const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');

// The original code manually calls saveHistory (which adds to localStorage via useToolHistory hook)
// AND saves to Supabase tool_history AND saves to Dexie decks!
// Let's remove the saveHistory call since Dexie and Supabase cover it.
const target = `saveHistory({
        prompt: deckLabel2,
        preview: \`\${generatedCards.length} cards\`,
        output: deckLabel2,
        model: "rex-ai",
        meta: \`\${generatedCards.length} cards generated\`,
      });`;

content = content.replace(target, '');
fs.writeFileSync('src/pages/Flashcards.tsx', content, 'utf8');
