const fs = require('fs');
let code = fs.readFileSync('src/pages/SourceLibrary.tsx', 'utf8');

// replace className="hidden" with style={{ display: 'none' }} is the same.
// Let's replace the hidden input with an opacity:0 input.
code = code.replace(
  'className="hidden"\n          onChange={handleFileSelected}',
  'style={{ opacity: 0, position: "absolute", zIndex: -1, width: 1, height: 1 }}\n          onChange={handleFileSelected}'
);
code = code.replace(
  'className="hidden"\n        onChange={handleFileSelected}',
  'style={{ opacity: 0, position: "absolute", zIndex: -1, width: 1, height: 1 }}\n        onChange={handleFileSelected}'
);

fs.writeFileSync('src/pages/SourceLibrary.tsx', code);
