const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace the invalid character line:
const badLinePattern = /<div className="text-\[11px\] font-bold text-black\/50">\{Math\.round\(Number\(session\.duration_minutes\)\s*\|\|\s*0\)\}m [^<]+ \{formattedDate\}<\/div>/;
content = content.replace(badLinePattern, '<div className="text-[11px] font-bold text-black/50">{Math.round(Number(session.duration_minutes) || 0)}m &bull; {formattedDate}</div>');

// Replace the calendar logic
const calendarOld = /const calculateStatsAndCalendar = \([\s\S]*?setDayMinutes\(dayMins\);\s*\};/;

const calendarNew = `const calculateStatsAndCalendar = (loadedSessions: any[]) => {
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

content = content.replace(calendarOld, calendarNew);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
