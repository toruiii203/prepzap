const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const target = `loadedSessions.forEach((session) => {
          // Parse date reliably without timezone shifting
          const dStr = session.created_at.split("T")[0]; 
          const idx = windowDays.indexOf(dStr);`;

const replacement = `loadedSessions.forEach((session) => {
          // Parse date reliably converting from UTC to Local timezone
          const dateObj = new Date(session.created_at);
          const dStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
          const idx = windowDays.indexOf(dStr);`;

content = content.replace(target, replacement);

const target2 = `sessions.forEach((session) => {
        const dStr = session.created_at.split("T")[0]; 
        const idx = windowDays.indexOf(dStr);`;

const replacement2 = `sessions.forEach((session) => {
        const dateObj = new Date(session.created_at);
        const dStr = dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
        const idx = windowDays.indexOf(dStr);`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
