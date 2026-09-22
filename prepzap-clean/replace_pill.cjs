const fs = require('fs');

const files = [
  'src/pages/Arcade.tsx',
  'src/pages/arcade/MemoryMatch.tsx',
  'src/pages/arcade/TrueFalseBlitz.tsx',
  'src/pages/arcade/Termle.tsx'
];

files.forEach(path => {
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace import
  content = content.replace(
    'import { GlobalContextBar } from "@/components/GlobalContextBar";',
    'import { AttachSourcePill } from "@/components/AttachSourcePill";'
  );

  // Replace usage
  content = content.replace(/<GlobalContextBar compact \/>/g, '<AttachSourcePill />');
  content = content.replace(/<GlobalContextBar \/>/g, '<AttachSourcePill />');

  fs.writeFileSync(path, content, 'utf8');
});
