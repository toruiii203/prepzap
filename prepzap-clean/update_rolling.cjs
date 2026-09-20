const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Update the format time to use <1m
content = content.replace(/\{Math\.round\(Number\(session\.duration_minutes\)\s*\|\|\s*0\)\}m/g, 
  '{Number(session.duration_minutes) > 0 && Number(session.duration_minutes) < 1 ? "<1" : Math.round(Number(session.duration_minutes) || 0)}m');

// 2. Replace hardcoded daysOfWeek with dynamic rolling window
const oldDaysOfWeek = 'const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];';
const newDaysOfWeek = `const daysOfWeek = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      days.push(d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase());
    }
    return days;
  }, []);`;

content = content.replace(oldDaysOfWeek, newDaysOfWeek);

// Remember to import useMemo if not already imported
if (!content.includes('useMemo')) {
  content = content.replace('import { useState, useEffect } from "react";', 'import { useState, useEffect, useMemo } from "react";');
}

// 3. Replace calculateStatsAndCalendar logic with rolling window mapping
const calendarOld = /const calculateStatsAndCalendar = \([\s\S]*?setDayMinutes\(dayMins\);\s*\};/;

const calendarNew = `const calculateStatsAndCalendar = (loadedSessions: any[]) => {
      const totalSess = loadedSessions.length;
      const totalMins = loadedSessions.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);
      const hours = Math.round((totalMins / 60) * 10) / 10;
      setStats({ totalSessions: totalSess, studyTimeHours: hours, avgScore: 0 });

      // Rolling 7-day window
      const today = new Date();
      const windowDays: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        windowDays.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0'));
      }

      const dayMins = new Array(7).fill(0);
      const daysStudied = new Array(7).fill(false);

      loadedSessions.forEach((session) => {
        // Parse date reliably without timezone shifting
        const dStr = session.created_at.split("T")[0]; 
        const idx = windowDays.indexOf(dStr);
        if (idx !== -1) {
          daysStudied[idx] = true;
          dayMins[idx] += Number(session.duration_minutes) || 0;
        }
      });
      setStudiedDays(daysStudied);
      setDayMinutes(dayMins);
    };`;

content = content.replace(calendarOld, calendarNew);

// 4. Mobile calendar isToday highlight logic
// Since it's a 7-day rolling window, "Today" is always the LAST item (idx === 6)
content = content.replace(/const isToday = idx === new Date\(\)\.getDay\(\) - 1 \|\| \(new Date\(\)\.getDay\(\) === 0 && idx === 6\);/g, 
  'const isToday = idx === 6;');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
