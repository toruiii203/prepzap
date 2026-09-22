const fs = require('fs');
['src/pages/arcade/MemoryMatch.tsx', 'src/pages/arcade/TrueFalseBlitz.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /await generateGameContent\(([^,]+), ([^,]+), ("[^"]+")\);/g,
    'await generateGameContent($1, $2, $3, user?.id || "");'
  );
  fs.writeFileSync(file, content, 'utf8');
});
