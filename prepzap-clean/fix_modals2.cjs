const fs = require('fs');

const files = [
  { path: 'src/pages/SourceLibrary.tsx', key: '/sources' },
  { path: 'src/pages/QuickStudy.tsx', key: '/quick-study' },
  { path: 'src/pages/MathSolver.tsx', key: '/math' },
  { path: 'src/pages/Flashcards.tsx', key: '/flashcards' },
  { path: 'src/pages/Dashboard.tsx', key: '/dashboard' }
];

files.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');
  
  // They usually have: return (\n    <>\n or return (\n      <div\n
  // Let's use a regex to match the main return of the component.
  // We know the main return is usually near the end of the file or follows specific indentation.
  // Actually, we can just replace the first `return (\n    <>` or `return (\n    <div`
  
  const modalCode = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${f.key}"] || []} title="Tutorial" />`;

  if (content.match(/return \(\s*<>/)) {
    content = content.replace(/return \(\s*<>/, 'return (\n    <>' + modalCode);
  } else if (content.match(/return \(\s*<div/)) {
    content = content.replace(/return \(\s*<div/, 'return (\n    <div' + modalCode);
  } else if (content.match(/return \(\n\s*<div/)) {
    content = content.replace(/return \(\n\s*<div/, 'return (\n    <div' + modalCode);
  }
  
  fs.writeFileSync(f.path, content, 'utf8');
});
