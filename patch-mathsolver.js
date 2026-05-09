const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/MathSolver.tsx', 'utf8');

// remove handleHistorySelect from global scope
code = code.replace(/const handleHistorySelect \= \(entry\: \{ prompt\: string\; output\: string\; \[key\: string\]\: any \}\) \=\> \{[\s\S]*?\}\n  \}/, '');

fs.writeFileSync('prepzap-clean/src/pages/MathSolver.tsx', code);
