const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(
  '{dayMinutes[idx] > 0 ? `${Math.round(dayMinutes[idx])}m` : ""}',
  '{dayMinutes[idx] > 0 ? (dayMinutes[idx] < 1 ? "<1m" : `${Math.round(dayMinutes[idx])}m`) : ""}'
);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
