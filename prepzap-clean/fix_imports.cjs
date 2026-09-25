const fs = require('fs');

const files = ['AnagramSprint.tsx', 'WhackAMole.tsx', 'OddOneOut.tsx'];
files.forEach(file => {
  let content = fs.readFileSync('src/pages/arcade/' + file, 'utf8');
  content = content.replace('import { useSourceContext } from "@/contexts/SourceContext";', 'import { getActiveSource } from "@/lib/sourceContext";');
  content = content.replace('const { activeSource } = useSourceContext();', 'const activeSource = getActiveSource();\n  const activeSourceId = activeSource?.id || "";');
  
  // Update useEffect dependencies to use activeSourceId instead of activeSource since getActiveSource is synchronous
  content = content.replace('}, [activeSource, user]);', '}, [activeSourceId, user]);');
  content = content.replace('}, [activeSource]);', '}, [activeSourceId]);');
  
  fs.writeFileSync('src/pages/arcade/' + file, content, 'utf8');
});
