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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let found = false;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Check for duplicate export default function [Name]
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
  
  // Check for ANY duplicated function declarations that are exactly identical?
  // Let's just stick to `export default function` or `export function`
});

if (!found) console.log("No duplicate exports found in other files.");
