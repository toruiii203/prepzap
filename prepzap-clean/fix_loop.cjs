const fs = require('fs');

const files = ['MemoryMatch.tsx', 'TrueFalseBlitz.tsx', 'Termle.tsx'];

files.forEach(file => {
  const path = 'src/pages/arcade/' + file;
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace `const activeSource = getActiveSource();` with `const activeSourceForDep = getActiveSource(); const activeSourceId = activeSourceForDep?.id || "";`
  content = content.replace(
    'const activeSource = getActiveSource();',
    'const activeSourceForDep = getActiveSource();\n  const activeSourceId = activeSourceForDep?.id || "";'
  );

  // Replace `[activeSource]` with `[activeSourceId]` in useEffect
  content = content.replace(
    /}, \[activeSource\]\);/g,
    '}, [activeSourceId]);'
  );

  // Re-declare activeSource inside loadGame()
  content = content.replace(
    'async function loadGame() {\n',
    'async function loadGame() {\n      const activeSource = getActiveSource();\n'
  );

  // In MemoryMatch and TrueFalseBlitz, handleGameOver uses activeSource too. Let's make sure it gets it fresh or uses a ref, 
  // or just `const activeSource = getActiveSource();` inside handleGameOver.
  content = content.replace(
    'const sourceId = activeSource?.id || null;',
    'const currentSource = getActiveSource();\n    const sourceId = currentSource?.id || null;'
  );
  
  // Some places might still use activeSource directly outside. Let's see if there are any.
  
  fs.writeFileSync(path, content, 'utf8');
});
