const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(/const dStr = session\.created_at\.split\("T"\)\[0\];/g, `const dateObj = new Date(session.created_at);
        const dStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');`);

content = content.replace(/\/\/ Parse date reliably without timezone shifting/g, '// Parse date reliably converting from UTC to Local timezone');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
