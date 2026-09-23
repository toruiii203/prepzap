const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Insert useStudyStats import
if (!content.includes('import { useStudyStats }')) {
  content = content.replace('import { useAuth } from "@/contexts/AuthContext";', 'import { useAuth } from "@/contexts/AuthContext";\nimport { useStudyStats } from "@/hooks/useStudyStats";');
}

// Replace the block
const startPattern = 'const [sessions, setSessions] = useState';
const endPattern = 'setDayMinutes(dayMins);\n  };';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern) + endPattern.length;

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `const { sessions, stats, loading: loadingSessions } = useStudyStats();
  
  const [studiedDays, setStudiedDays] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [dayMinutes, setDayMinutes] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    // Calculate calendar days
    const today = new Date();
    const windowDays: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      windowDays.push(d.toISOString().split("T")[0]);
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

    setStudiedDays(daysStudied);
    setDayMinutes(dayMins);
  }, [sessions]);

  const fetchTasks = () => {
    setLoadingTasks(true);
    try {
      const stored = localStorage.getItem("pz_checklist");
      const parsed = stored ? JSON.parse(stored) : [];
      setTasks(parsed);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
  console.log("Dashboard updated successfully");
} else {
  console.log("Could not find start or end pattern");
}
