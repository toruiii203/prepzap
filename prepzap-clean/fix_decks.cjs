const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');

const target = 'const deckHistory = [...historyEntries, ...decks.map(d => ({ id: d.id, prompt: d.title, timestamp: d.createdAt, meta: "SRS Deck" }))].sort((a, b) => b.timestamp - a.timestamp);';
const replacement = `const mergedDecks = [...historyEntries, ...decks.map(d => ({ id: d.id, prompt: d.title, timestamp: d.createdAt, meta: "SRS Deck" }))].sort((a, b) => b.timestamp - a.timestamp);
  // Deduplicate by title to prevent showing the exact same deck twice
  const deckHistory = mergedDecks.filter((item, index, self) =>
    index === self.findIndex((t) => (
      (t.prompt || t.output) === (item.prompt || item.output)
    ))
  );`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/Flashcards.tsx', content, 'utf8');
