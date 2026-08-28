const fs = require('fs');
let code = fs.readFileSync('src/components/ToolShell.tsx', 'utf8');

code = code.replace(
  'className="hidden" onChange={handleFileSelect}',
  'style={{ opacity: 0, position: "absolute", zIndex: -1, width: 1, height: 1 }} onChange={handleFileSelect}'
);

fs.writeFileSync('src/components/ToolShell.tsx', code);
