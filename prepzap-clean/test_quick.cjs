const fs = require('fs');
let content = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const t1 = content.includes('Coverage Score: {generatedSheet.coverageScore}%');
const t2 = content.includes('Coverage Score: {generatedSheet ? `${generatedSheet.coverageScore}%` : "—"}');
const t3 = content.includes('Cram Mode" : "High Yield"}');

console.log(t1, t2, t3);
