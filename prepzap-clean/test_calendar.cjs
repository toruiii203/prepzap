const sessions = [
  { created_at: new Date().toISOString(), duration_minutes: 0.33, tool: 'arcade' }, // today
];

// simulate Dashboard.tsx
const today = new Date();
const windowDays = [];
for (let i = 6; i >= 0; i--) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
  windowDays.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'));
}

const dayMins = new Array(7).fill(0);
const daysStudied = new Array(7).fill(false);

sessions.forEach((session) => {
  const dStr = session.created_at.split("T")[0]; 
  const idx = windowDays.indexOf(dStr);
  if (idx !== -1) {
    daysStudied[idx] = true;
    dayMins[idx] += Number(session.duration_minutes) || 0;
  }
});

console.log("calendar window:", windowDays);
console.log("daysStudied:", daysStudied);
console.log("dayMins:", dayMins);

// Desktop WeeklyBars rendering
const renderDesktopBars = dayMins.map(m => m > 0 ? (m < 1 ? "<1m" : Math.round(m) + "m") : "");
console.log("Desktop WeeklyBars Labels:", renderDesktopBars);
