const fs = require('fs');
let file = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const oldErr = `      if (!shortTopic && !sourceContext && !rawPastedMaterial) {
        setGenError("Enter a topic, paste your notes, or add a file to your Source Library first.");
        return;
      }`;

const newErr = `      if (!shortTopic && !sourceContext && !rawPastedMaterial) {
        alert("Cannot generate: Please enter a topic or text. (If you have a file selected, it may not have readable text).");
        setGenError("Enter a topic, paste your notes, or add a readable file to your Source Library first.");
        return;
      }`;

file = file.replace(oldErr, newErr);
fs.writeFileSync('src/pages/QuickStudy.tsx', file);
console.log("Added alert to handleGenerate");
