const fs = require('fs');

const files = [
  { path: 'src/pages/SourceLibrary.tsx', key: '/sources', tag: '<>', exportFn: 'export default function SourceLibrary() {' },
  { path: 'src/pages/QuickStudy.tsx', key: '/quick-study', tag: '<>', exportFn: 'export default function QuickStudy() {' },
  { path: 'src/pages/MathSolver.tsx', key: '/math', tag: '<>', exportFn: 'export default function MathSolver() {' },
  { path: 'src/pages/Flashcards.tsx', key: '/flashcards', tag: '<>', exportFn: 'export default function Flashcards() {' },
  { path: 'src/pages/Dashboard.tsx', key: '/dashboard', tag: '<>', exportFn: 'export default function Dashboard() {' }
];

files.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');
  
  // First, completely remove any corrupted Modal injections
  const corruptedRegex = /<TutorialModal isOpen=\{tutorial\.isOpen\} onDismiss=\{tutorial\.dismiss\} features=\{TUTORIAL_CONTENT\["[^"]+"\] \|\| \[\]\} title="Tutorial" \/>/g;
  content = content.replace(corruptedRegex, '');
  
  const exportIdx = content.indexOf(f.exportFn);
  if (exportIdx === -1) { console.log('not found ' + f.path); return; }
  
  const returnIdx = content.indexOf('return (', exportIdx);
  const tagIdx = content.indexOf(f.tag, returnIdx);
  
  const modalCode = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${f.key}"] || []} title="Tutorial" />`;
  
  if (f.tag === '<>') {
    content = content.substring(0, tagIdx+2) + modalCode + content.substring(tagIdx+2);
  }
  
  fs.writeFileSync(f.path, content, 'utf8');
});
