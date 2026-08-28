const fs = require('fs');

// Patch Arena.tsx mapping
let arenaCode = fs.readFileSync('src/pages/Arena.tsx', 'utf8');
arenaCode = arenaCode.replace(
  /\.\.\.row,/g,
  '...row,\n            time_taken: row.time_taken_seconds,'
);
fs.writeFileSync('src/pages/Arena.tsx', arenaCode);

// Patch ArenaResults.tsx mapping
let resultsCode = fs.readFileSync('src/pages/ArenaResults.tsx', 'utf8');
resultsCode = resultsCode.replace(
  /\.\.\.row,/g,
  '...row,\n              time_taken: row.time_taken_seconds || row.time_taken,'
);
fs.writeFileSync('src/pages/ArenaResults.tsx', resultsCode);

