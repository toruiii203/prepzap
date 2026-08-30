const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.match(/import.*useEffect.*useEffect/)) {
        console.log("DOUBLE IMPORT:", file);
      }
      if (content.match(/const\s+useEffect\s*=/)) {
        console.log("CONST EFFECT:", file);
      }
      // Check if it's declared anywhere
      const count = (content.match(/\buseEffect\b/g) || []).length;
      if (count > 0 && content.includes('import {') && content.includes('useEffect')) {
         const lines = content.split('\n');
         let importCount = 0;
         lines.forEach(l => {
           if (l.includes('import ') && l.includes('useEffect') && l.includes('react')) {
             importCount++;
             const occurrencesInLine = (l.match(/useEffect/g) || []).length;
             if (occurrencesInLine > 1) {
               console.log("MULTIPLE IN ONE LINE:", file, l);
             }
           }
         });
         if (importCount > 1) {
           console.log("MULTIPLE IMPORTS OF REACT USEEFFECT:", file);
         }
      }
    }
  });
  return results;
}

walk('src');
console.log("Done checking");
