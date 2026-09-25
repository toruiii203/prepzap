const fs = require('fs');
const path = require('path');

const files = ['Dashboard.tsx', 'AITutor.tsx', 'Flashcards.tsx', 'Practice.tsx', 'MathSolver.tsx', 'TeachIt.tsx', 'QuickStudy.tsx', 'StudyPlanner.tsx', 'Arena.tsx', 'SourceLibrary.tsx', 'MistakeJournal.tsx', 'Analytics.tsx'];

files.forEach(file => {
  const filePath = path.join('src/pages', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('tutorial.show()')) {
    const helpBtn = `\n          <button onClick={() => tutorial.show()} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-9 h-9 md:w-10 md:h-10 shrink-0 z-50 ml-2" title="Tutorial"><span className="material-symbols-outlined text-[18px] md:text-[20px]">help</span></button>\n        `;
    
    // We want to insert this inside the flex container at the end of the header.
    // If we just insert it before </header>, it will be a flex child of the header.
    content = content.replace(/<\/header>/g, helpBtn + '</header>');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added button to ${file}`);
  }
});
