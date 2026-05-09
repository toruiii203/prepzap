const fs = require('fs');
const file = 'prepzap-clean/src/pages/MathSolver.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'const SYMBOLS = [',
  `const handleHistorySelect = (entry: { prompt: string; output: string; [key: string]: any }) => {
    try {
      const parsed = JSON.parse(entry.output)
      setResult(parsed)
      setProblem(entry.prompt)
      setPhase("result")
    } catch {
      setProblem(entry.prompt)
      setPhase("input")
    }
  }

const SYMBOLS = [`
);
fs.writeFileSync(file, content);
