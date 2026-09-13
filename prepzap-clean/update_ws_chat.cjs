const fs = require('fs');
let ws = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

if (!ws.includes('import KnowledgeBaseChat')) {
  ws = ws.replace(
    'import KnowledgeGraph from "@/components/KnowledgeGraph";',
    'import KnowledgeGraph from "@/components/KnowledgeGraph";\nimport KnowledgeBaseChat from "@/components/KnowledgeBaseChat";'
  );
}

ws = ws.replace(
  '</div>\n    </div>\n  );\n}',
  '</div>\n      <KnowledgeBaseChat />\n    </div>\n  );\n}'
);

fs.writeFileSync('src/pages/NotesWorkspace.tsx', ws);
