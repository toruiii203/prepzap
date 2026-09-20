const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(/m  \{formattedDate\}/g, 'm • {formattedDate}');
// Check if it got mangled as "?" too
content = content.replace(/\?/g, '—');
content = content.replace(/\+/g, '→');
content = content.replace(/o\"/g, '✓');
content = content.replace(/\?\?/g, '—');
content = content.replace(/\?/g, '—');

// Fix calendar logic
const calendarOld = `    const calculateStatsAndCalendar = (loadedSessions: any[]) => {
      const totalSess = loadedSessions.length;
      // FIX: was reading curr.duration (doesn't exist on the row \u2192 always 0).
      // Real column is duration_minutes.
      const totalMins = loadedSessions.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);
      const hours = Math.round((totalMins / 60) * 10) / 10;
      setStats({ totalSessions: totalSess, studyTimeHours: hours, avgScore: 0 });

      // Build a map: dayIndex (Mon=0\u2026Sun=6) \u2192 total minutes studied that day
      const dayMins = new Array(7).fill(0);
      const daysStudied = new Array(7).fill(false);
      loadedSessions.forEach((session) => {
        let dayIdx = new Date(session.created_at).getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        if (dayIdx >= 0 && dayIdx < 7) {
          daysStudied[dayIdx] = true;
          // FIX: same duration \u2192 duration_minutes correction as above.
          dayMins[dayIdx] += Number(session.duration_minutes) || 0;
        }
      });
      setStudiedDays(daysStudied);
      setDayMinutes(dayMins);
    };`;

const calendarNew = `    const calculateStatsAndCalendar = (loadedSessions: any[]) => {
      const totalSess = loadedSessions.length;
      const totalMins = loadedSessions.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);
      const hours = Math.round((totalMins / 60) * 10) / 10;
      setStats({ totalSessions: totalSess, studyTimeHours: hours, avgScore: 0 });

      // Build a map: dayIndex (Mon=0 to Sun=6) -> total minutes studied that day, ONLY for current week
      const dayMins = new Array(7).fill(0);
      const daysStudied = new Array(7).fill(false);
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = (startOfToday.getDay() + 6) % 7; // Monday=0, Sunday=6
      const startOfWeek = new Date(startOfToday.getTime() - dayOfWeek * 86400000);

      loadedSessions.forEach((session) => {
        const d = new Date(session.created_at);
        if (d.getTime() >= startOfWeek.getTime()) {
          const idx = (d.getDay() + 6) % 7;
          daysStudied[idx] = true;
          dayMins[idx] += Number(session.duration_minutes) || 0;
        }
      });
      setStudiedDays(daysStudied);
      setDayMinutes(dayMins);
    };`;

content = content.replace(/const calculateStatsAndCalendar = \([\s\S]*?setDayMinutes\(dayMins\);\s*\};/, calendarNew);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
