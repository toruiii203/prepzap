const fs = require('fs');
let content = fs.readFileSync('src/pages/MathSolver.tsx', 'utf8');

content = content.replace('source_id: activeSourceObj ? activeSourceObj.id : null,', 'source_id: null,');

fs.writeFileSync('src/pages/MathSolver.tsx', content, 'utf8');
