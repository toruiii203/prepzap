const fs = require('fs');
let content = fs.readFileSync('src/pages/arcade/Termle.tsx', 'utf8');

// Replace import to remove generateGameContent, add FALLBACKS
content = content.replace(
  'import { generateGameContent, TermleWord } from "@/lib/arcadePipeline";',
  'import { TermleWord, FALLBACKS } from "@/lib/arcadePipeline";'
);

const termleExtractionCode = `
const STOPWORDS = new Set(["THEIR", "THERE", "ABOUT", "WHICH", "WOULD", "THESE", "OTHER", "COULD", "FIRST", "AFTER", "THOSE", "WHERE", "BEING", "UNDER", "YEARS", "GREAT", "STATE", "WORLD", "THREE", "FOUND", "MIGHT", "STILL", "SINCE", "NEVER", "SHOULD", "BECAUSE", "THROUGH", "BETWEEN", "ANOTHER", "HOWEVER", "WITHOUT", "DURING", "ALWAYS"]);

function extractTermleWords(sourceText: string): TermleWord[] {
  const sentences = sourceText.match(/[^.!?]+[.!?]+/g) || [];
  const results: TermleWord[] = [];
  const seenWords = new Set<string>();

  for (const sentence of sentences) {
    const words = sentence.match(/\\b[A-Za-z]{5,10}\\b/g) || [];
    for (const word of words) {
      const upperWord = word.toUpperCase();
      if (!STOPWORDS.has(upperWord) && !seenWords.has(upperWord)) {
        seenWords.add(upperWord);
        const regex = new RegExp(\`\\\\b\${word}\\\\b\`, 'i');
        const hint = sentence.replace(regex, '_____').trim();
        results.push({ word: upperWord, hint });
      }
    }
  }

  if (results.length < 5) {
    return FALLBACKS.general.termle;
  }
  return results;
}
`;

// Insert the extraction function before the component
content = content.replace(
  'export default function Termle() {',
  termleExtractionCode + '\nexport default function Termle() {'
);

// Replace loadGame inside useEffect
content = content.replace(
  /const data = await generateGameContent[^;]+;/,
  `const data = extractTermleWords(sourceText);`
);

// Remove the try/catch around generation since it's local and synchronous now, but we can leave it to avoid big diff.
// Let's just do a clean replace for the generation logic.
fs.writeFileSync('src/pages/arcade/Termle.tsx', content, 'utf8');
