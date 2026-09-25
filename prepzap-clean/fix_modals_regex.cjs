const fs = require('fs');

const files = [
  { 
    path: 'src/pages/SourceLibrary.tsx', 
    key: '/sources', 
    title: 'Source Library',
    matchRegex: /return \(\s*<div className="w-full bg\[#FAF7F2\] flex flex-col" style=\{\{ minHeight: "100dvh" \}\}>/
  },
  { 
    path: 'src/pages/QuickStudy.tsx', 
    key: '/quick-study', 
    title: 'Quick Study',
    matchRegex: /return \(\s*<div className="w-full bg\[#FAF7F2\] flex flex-col" style=\{\{ minHeight: "100dvh" \}\}>/
  },
  { 
    path: 'src/pages/MathSolver.tsx', 
    key: '/math', 
    title: 'Math Solver',
    matchRegex: /return \(\s*<div className="w-full bg\[#FAF7F2\] flex flex-col" style=\{\{ minHeight: "100dvh" \}\}>/
  },
  { 
    path: 'src/pages/Flashcards.tsx', 
    key: '/flashcards', 
    title: 'Flashcards',
    matchRegex: /return \(\s*<div className="w-full bg\[#FAF7F2\] flex flex-col" style=\{\{ minHeight: "100dvh" \}\}>/
  },
  { 
    path: 'src/pages/Dashboard.tsx', 
    key: '/dashboard', 
    title: 'Dashboard',
    matchRegex: /return \(\s*<div className="w-full bg\[#FAF7F2\] min-h-full flex flex-col font-body-md text-black flex-1">/
  }
];

files.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');
  
  const modalCode = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${f.key}"] || []} title="${f.title}" />`;
  
  content = content.replace(f.matchRegex, match => match + modalCode);
  fs.writeFileSync(f.path, content, 'utf8');
});
