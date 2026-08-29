const fs = require('fs');
let code = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

const oldToday = `function todayPH(): string {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    .toISOString().split("T")[0];
}`;

const newToday = `function todayPH(): string {
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Manila', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date());
}`;

code = code.replace(oldToday, newToday);
fs.writeFileSync('src/pages/Arena.tsx', code);
