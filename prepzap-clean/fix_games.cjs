const fs = require('fs');
['MemoryMatch.tsx', 'TrueFalseBlitz.tsx', 'Termle.tsx'].forEach(file => {
  const path = 'src/pages/arcade/' + file;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace('import { useSourceContext } from "@/lib/sourceContext";', 'import { getActiveSource } from "@/lib/sourceContext";');
  content = content.replace('const { state: ctx } = useSourceContext();', 'const activeSource = getActiveSource();');
  content = content.replace(/ctx\.activeSourceObj\?/g, 'activeSource?');
  content = content.replace(/ctx\.activeSourceObj/g, 'activeSource');
  fs.writeFileSync(path, content, 'utf8');
});
