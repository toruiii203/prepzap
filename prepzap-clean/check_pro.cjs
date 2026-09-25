const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const match = content.match(/PRO [^<]*/);
console.log("PRO MATCH:", match[0]);
