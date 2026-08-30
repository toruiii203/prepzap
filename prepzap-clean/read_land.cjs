const fs = require('fs');
const lines = fs.readFileSync('src/pages/Landing.tsx', 'utf8').split('\n');
for (let i = 0; i < 20; i++) {
  console.log(i + 1, lines[i]);
}
