const fs = require('fs');
let code = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const oldExport = `    const deck = {
      title: generatedSheet.title,
      cards: generatedSheet.points.map(p => ({
        id: crypto.randomUUID(),
        front: p.question || p.label,
        back: p.value,
        interval: 0, repetition: 0, efactor: 2.5, dueDate: new Date().toISOString()
      }))
    };`;

const newExport = `    const deck = {
      title: generatedSheet.title,
      cards: generatedSheet.points.map(p => ({
        front: p.question || p.label,
        back: p.label.replace(":", ""),
        explanation: p.value
      }))
    };`;

code = code.replace(oldExport, newExport);
fs.writeFileSync('src/pages/QuickStudy.tsx', code);
