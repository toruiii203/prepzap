const fs = require('fs');

let qs = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');
qs = qs.replace(
  'const [remainingUses, setRemainingUses] = useState<number | null>\n        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/quick-study"] || []} title="Quick Study" />(null);',
  'const [remainingUses, setRemainingUses] = useState<number | null>(null);'
);
// Now we need to properly put it inside the first fragment return (<>
const qsReturnIdx = qs.indexOf('return (');
const qsTagIdx = qs.indexOf('<', qsReturnIdx);
if (qs.substring(qsTagIdx, qsTagIdx+2) === '<>') {
  const modal = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/quick-study"] || []} title="Quick Study" />`;
  qs = qs.substring(0, qsTagIdx+2) + modal + qs.substring(qsTagIdx+2);
}
fs.writeFileSync('src/pages/QuickStudy.tsx', qs, 'utf8');

let sl = fs.readFileSync('src/pages/SourceLibrary.tsx', 'utf8');
sl = sl.replace(
  'const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>\n        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/sources"] || []} title="Source Library" />) => {',
  'const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {'
);
const slReturnIdx = sl.indexOf('return (', sl.indexOf('export default function'));
const slTagIdx = sl.indexOf('<', slReturnIdx);
if (sl.substring(slTagIdx, slTagIdx+2) === '<>') {
  const modal = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/sources"] || []} title="Source Library" />`;
  sl = sl.substring(0, slTagIdx+2) + modal + sl.substring(slTagIdx+2);
}
fs.writeFileSync('src/pages/SourceLibrary.tsx', sl, 'utf8');
