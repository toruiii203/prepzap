const fs = require('fs');

const files = [
  { 
    path: 'src/pages/SourceLibrary.tsx', 
    key: '/sources', 
    title: 'Source Library',
    search: '<div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>'
  },
  { 
    path: 'src/pages/QuickStudy.tsx', 
    key: '/quick-study', 
    title: 'Quick Study',
    search: '<div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>'
  },
  { 
    path: 'src/pages/MathSolver.tsx', 
    key: '/math', 
    title: 'Math Solver',
    search: '<div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>'
  },
  { 
    path: 'src/pages/Flashcards.tsx', 
    key: '/flashcards', 
    title: 'Flashcards',
    search: '<div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>'
  },
  { 
    path: 'src/pages/Dashboard.tsx', 
    key: '/dashboard', 
    title: 'Dashboard',
    search: '<div className="w-full bg-[#FAF7F2] min-h-full flex flex-col font-body-md text-black flex-1">'
  }
];

files.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');
  
  const modalCode = `\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${f.key}"] || []} title="${f.title}" />`;
  
  // Find the LAST occurrence of the search string to avoid hitting earlier helper functions if any
  const idx = content.lastIndexOf(f.search);
  if (idx !== -1) {
    content = content.substring(0, idx + f.search.length) + modalCode + content.substring(idx + f.search.length);
    fs.writeFileSync(f.path, content, 'utf8');
    console.log("Fixed " + f.path);
  } else {
    console.log("Failed to find in " + f.path);
  }
});
