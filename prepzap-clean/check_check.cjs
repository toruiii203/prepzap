const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const match = content.match(/\{studied \? "[^"]*" : idx \+ 1\}/);
console.log("CHECKMARK MATCH:", match[0]);
