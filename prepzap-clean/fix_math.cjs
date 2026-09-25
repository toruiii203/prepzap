const fs = require('fs');
let content = fs.readFileSync('src/pages/MathSolver.tsx', 'utf8');

const target = `const parsed = safeParseJSON<any[]>
        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/math"] || []} title="Math Solver" />(aiResponse);`;

const replacement = `const parsed = safeParseJSON<any[]>(aiResponse);`;

content = content.replace(target, replacement);

// Re-inject the modal correctly inside the main return
const returnIdx = content.indexOf('return (', content.indexOf('export default function MathSolver'));
const tagIdx = content.indexOf('<', returnIdx);
if (content.substring(tagIdx, tagIdx+2) === '<>') {
  const modal = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/math"] || []} title="Math Solver" />`;
  content = content.substring(0, tagIdx+2) + modal + content.substring(tagIdx+2);
}

fs.writeFileSync('src/pages/MathSolver.tsx', content, 'utf8');
