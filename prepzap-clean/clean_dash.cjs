const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Find the start of the first Dashboard
const firstDash = content.indexOf('function Dashboard() {');
// Find the start of the second Dashboard
const secondDash = content.indexOf('export default function Dashboard() {');

if (firstDash !== -1 && secondDash !== -1 && firstDash < secondDash) {
  content = content.substring(0, firstDash) + content.substring(secondDash);
  
  // Fix the UTC bug in the (now only) Dashboard component
  const buggyWindowDays = `const d = new Date(today);
      d.setDate(today.getDate() - i);
      windowDays.push(d.toISOString().split("T")[0]);`;
      
  const fixedWindowDays = `const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      windowDays.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'));`;
      
  content = content.replace(buggyWindowDays, fixedWindowDays);
  
  fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
}
