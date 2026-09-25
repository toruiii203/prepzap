const fs = require('fs');
const path = require('path');

const mappings = [
  { file: 'Dashboard.tsx', route: '/dashboard', title: 'Dashboard' },
  { file: 'AITutor.tsx', route: '/ai-tutor', title: 'Rex Tutor' },
  { file: 'Flashcards.tsx', route: '/flashcards', title: 'Flashcards' },
  { file: 'Practice.tsx', route: '/practice', title: 'Practice' },
  { file: 'MathSolver.tsx', route: '/math', title: 'Math Solver' },
  { file: 'TeachIt.tsx', route: '/teach-it', title: 'Teach It' },
  { file: 'QuickStudy.tsx', route: '/quick-study', title: 'Quick Study' },
  { file: 'StudyPlanner.tsx', route: '/planner', title: 'Study Planner' },
  { file: 'Arena.tsx', route: '/arena', title: 'Arena' },
  { file: 'SourceLibrary.tsx', route: '/sources', title: 'Source Library' },
  { file: 'MistakeJournal.tsx', route: '/mistakes', title: 'Mistake Journal' },
  { file: 'Analytics.tsx', route: '/analytics', title: 'Analytics' },
];

mappings.forEach(({ file, route, title }) => {
  const filePath = path.join('src/pages', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has useTutorialModal
  if (content.includes('useTutorialModal')) {
    console.log(`Skipping ${file}, already has tutorial`);
    return;
  }

  // 1. Add imports
  const importBlock = `import { useTutorialModal } from "@/hooks/useTutorialModal";\nimport { TutorialModal } from "@/components/TutorialModal";\nimport { TUTORIAL_CONTENT } from "@/lib/tutorialContent";\n`;
  // find last import
  const lastImportIdx = content.lastIndexOf('import ');
  const nextNewline = content.indexOf('\n', lastImportIdx);
  content = content.substring(0, nextNewline + 1) + importBlock + content.substring(nextNewline + 1);

  // 2. Add hook inside component
  // We need to find export default function XYZ() {
  const compRegex = /export default function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/;
  const compMatch = compRegex.exec(content);
  if (compMatch) {
    const insertIdx = compMatch.index + compMatch[0].length;
    content = content.substring(0, insertIdx) + `\n  const tutorial = useTutorialModal("${route}");` + content.substring(insertIdx);
  } else {
    console.log(`Could not find component in ${file}`);
    return;
  }

  // 3. Add TutorialModal in the first return (<>)
  const returnRegex = /return\s*\(\s*<>/;
  const returnMatch = returnRegex.exec(content);
  if (returnMatch) {
    const modalJSX = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${route}"] || []} title="${title}" />`;
    const insertIdx = returnMatch.index + returnMatch[0].length;
    content = content.substring(0, insertIdx) + modalJSX + content.substring(insertIdx);
  } else {
    // If no fragment, replace return ( with return ( <> \n <TutorialModal /> ... </>)
    // This is riskier, let's just log it
    console.log(`Could not find return (<> in ${file}`);
    // fallback logic: find return (
    const fallbackRegex = /return\s*\(\s*</;
    const fallbackMatch = fallbackRegex.exec(content);
    if (fallbackMatch) {
      // Find the closing parenthesis of this return. Extremely hard with regex. 
      // We will manually fix these or write a better regex.
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Injected tutorial into ${file}`);
});
