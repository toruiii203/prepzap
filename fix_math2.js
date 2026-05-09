const fs = require('fs');
const file = 'prepzap-clean/src/pages/MathSolver.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /const handleHistorySelect = \(entry: \{ prompt: string; output: string; \[key: string\]: any \}\) => \{\s+try \{\s+const parsed = JSON\.parse\(entry\.output\)\s+setResult\(parsed\)\s+setProblem\(entry\.prompt\)\s+setPhase\("result"\)\s+\} catch \{\s+setProblem\(entry\.prompt\)\s+setPhase\("input"\)\s+\}\s+\}\s+const handleHistorySelect = \(entry: \{ prompt: string; output: string; \[key: string\]: any \}\) => \{    try \{/,
  'const handleHistorySelect = (entry: { prompt: string; output: string; [key: string]: any }) => {    try {'
);
fs.writeFileSync(file, content);
