const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace(/stats\.totalSessions/g, 'stats.sessions');
content = content.replace(/stats\.studyTimeHours/g, 'stats.studyHrs');
fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
