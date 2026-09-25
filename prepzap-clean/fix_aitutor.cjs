const fs = require('fs');

let ai = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');
ai = ai.replace(
  'const [currentSessionId, setCurrentSessionId] = useState<string | null>\n          <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/ai-tutor"] \n|| []} title="Rex Tutor" />(null);',
  'const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);'
);

// If it has weird linebreaks:
ai = ai.replace(/const \[currentSessionId, setCurrentSessionId\] = useState<string \| null>[\s\S]*?<TutorialModal[^>]+>\(null\);/m, 'const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);');

// Now re-inject TutorialModal inside the first main return (<>
const returnIdx = ai.indexOf('return (', ai.indexOf('export default function AITutor'));
const tagIdx = ai.indexOf('<', returnIdx);
if (ai.substring(tagIdx, tagIdx+2) === '<>') {
  const modal = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/ai-tutor"] || []} title="Rex Tutor" />`;
  ai = ai.substring(0, tagIdx+2) + modal + ai.substring(tagIdx+2);
} else {
  // if it's not <>, let's just insert it after the first div
  const divIdx = ai.indexOf('<div', tagIdx);
  const divCloseIdx = ai.indexOf('>', divIdx);
  const modal = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/ai-tutor"] || []} title="Rex Tutor" />`;
  ai = ai.substring(0, divCloseIdx+1) + modal + ai.substring(divCloseIdx+1);
}

fs.writeFileSync('src/pages/AITutor.tsx', ai, 'utf8');
