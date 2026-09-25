const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importSearch = `import AITutor from "@/pages/AITutor";`;
if (content.includes(importSearch)) {
  content = content.replace(importSearch, `${importSearch}\nimport CallWithRex from "@/pages/CallWithRex";`);
} else {
  // If lazy loaded or something else
  content = content.replace(`import AITutor from "./pages/AITutor";`, `import AITutor from "./pages/AITutor";\nimport CallWithRex from "./pages/CallWithRex";`);
  // Or just prepend it if neither matches
  if (!content.includes('CallWithRex')) {
    content = `import CallWithRex from "@/pages/CallWithRex";\n` + content;
  }
}

content = content.replace(`<Route path="/ai-tutor" element={<AITutor />} />`, `<Route path="/ai-tutor" element={<AITutor />} />\n          <Route path="/call" element={<CallWithRex />} />`);

fs.writeFileSync('src/App.tsx', content, 'utf8');
