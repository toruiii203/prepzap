const fs = require('fs');
const path = require('path');

const mappings = [
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
  { file: 'Dashboard.tsx', route: '/dashboard', title: 'Dashboard' },
  { file: 'AITutor.tsx', route: '/ai-tutor', title: 'Rex Tutor' }
];

mappings.forEach(({ file, route, title }) => {
  const filePath = path.join('src/pages', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Inject TutorialModal inside the first main return element
  if (!content.includes('<TutorialModal')) {
    const tutorialDef = `const tutorial = useTutorialModal("${route}");`;
    const tutorialIdx = content.indexOf(tutorialDef);
    if (tutorialIdx !== -1) {
      // Find the next `return (` after this
      const returnIdx = content.indexOf('return (', tutorialIdx);
      if (returnIdx !== -1) {
        // Find the first `<` after return (
        const tagIdx = content.indexOf('<', returnIdx);
        if (tagIdx !== -1) {
          const tagNameMatch = content.substring(tagIdx).match(/^<([A-Za-z0-9_]+)/);
          if (tagNameMatch) {
            // we will inject right AFTER the opening of this tag.
            // Actually, safest is to inject right AFTER the first `>` of the root tag.
            const closeTagIdx = content.indexOf('>', tagIdx);
            if (closeTagIdx !== -1) {
              const modalJSX = `\n        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${route}"] || []} title="${title}" />`;
              content = content.substring(0, closeTagIdx + 1) + modalJSX + content.substring(closeTagIdx + 1);
            }
          } else if (content.substring(tagIdx, tagIdx+2) === '<>') {
            const modalJSX = `\n        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["${route}"] || []} title="${title}" />`;
            content = content.substring(0, tagIdx + 2) + modalJSX + content.substring(tagIdx + 2);
          }
        }
      }
    }
  }

  // 2. Inject help button into headers
  // we look for <header ...> and insert before the closing </header> or inside the flex container.
  // actually, let's just find the closing tag of the <header> and put it right before it?
  // A better way: replace `<h1 className="text-[18px] font-black">Title</h1>` with `<h1 ...>Title <span onClick=tutorial.show>help</span></h1>`
  // The user wants it exactly like Arcade. Arcade has it like:
  // <span className="material-symbols-outlined text-[24px] cursor-pointer" onClick={() => tutorial.show()}>help</span>
  
  // Let's just find all `<header` blocks, and inject it inside.
  // To avoid duplicate injections:
  if (!content.includes('tutorial.show()')) {
    // We'll replace all `<header` with `<header`, but wait, we need it in the right flex container.
    // Let's replace `</header>` with:
    // `<button onClick={() => tutorial.show()} className="absolute top-4 right-4 md:static md:w-10 md:h-10 md:flex md:items-center md:justify-center md:border-2 md:border-black md:bg-white md:hover:bg-black md:hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none z-50"><span className="material-symbols-outlined text-[24px] md:text-[20px] cursor-pointer">help</span></button></header>`
    // This is safe and will float nicely in the header.
    const helpBtn = `\n<button onClick={() => tutorial.show()} className="absolute top-4 right-4 md:static md:w-10 md:h-10 md:flex md:items-center md:justify-center md:border-2 md:border-black md:bg-white md:hover:bg-black md:hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none z-50"><span className="material-symbols-outlined text-[24px] md:text-[20px] cursor-pointer">help</span></button>\n`;
    
    // Instead of replacing all </header>, let's just add it to the first Desktop header and Mobile header.
    // Since some headers are flex, absolute top-4 right-4 might overlap.
    // Let's just use string replacement for common header titles.
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
});
