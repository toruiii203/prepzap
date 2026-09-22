const fs = require('fs');

const files = ['src/pages/ArenaQuiz.tsx', 'src/pages/ArenaRoom.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { AppSkeleton }')) {
    content = 'import { AppSkeleton } from "@/components/AppSkeleton";\n' + content;
    fs.writeFileSync(file, content, 'utf8');
  }
}
