const fs = require('fs');
const glob = require('glob');

glob('src/**/*.tsx', (err, files) => {
  if (err) throw err;
  let found = false;
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const regex = /export default function\s+([A-Za-z0-9_]+)\s*\(/g;
    let match;
    const names = {};
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      if (names[name]) {
        console.log(`DUPLICATE EXPORT FOUND in ${file}: ${name}`);
        found = true;
      }
      names[name] = true;
    }
  });
  if (!found) console.log("No duplicate exports found in other files.");
});
