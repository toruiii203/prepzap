const fs = require('fs');
let content = fs.readFileSync('src/pages/Analytics.tsx', 'utf8');

if (!content.includes('import { useStudyStats }')) {
  content = content.replace('import { useAuth } from "@/contexts/AuthContext";', 'import { useAuth } from "@/contexts/AuthContext";\nimport { useStudyStats } from "@/hooks/useStudyStats";');
}

const sI = content.indexOf('const [sessions, setSessions] = useState<any[]>([]);');
const eI = content.indexOf('const fetchAnalytics = async () => {');

if (sI !== -1) {
  content = content.replace('const [sessions, setSessions] = useState<any[]>([]);', 'const { sessions, loading } = useStudyStats();');
  content = content.replace('const [loading, setLoading] = useState(true);', '');
}

// Remove fetchAnalytics logic but KEEP task completion rate
const fetchAnalyticsStart = content.indexOf('const fetchAnalytics = async () => {');
const fetchAnalyticsEnd = content.indexOf('fetchAnalytics();\n  }, [user?.id]);') + 'fetchAnalytics();\n  }, [user?.id]);'.length;

const replacement = `useEffect(() => {
    // Derive task completion rate from localStorage (same source as Dashboard)
    try {
      const stored = localStorage.getItem("pz_checklist");
      const tasks = stored ? JSON.parse(stored) : [];
      if (tasks.length > 0) {
        const completedCount = tasks.filter((t: any) => t.completed).length;
        setTasksCompletedPct(Math.round((completedCount / tasks.length) * 100));
      }
    } catch {}

    // Mock subject accuracy for now
    setSubjectAccuracy([
      { subject: "Biology", correct: 45, total: 50, pct: 90 },
      { subject: "History", correct: 30, total: 40, pct: 75 },
      { subject: "Math", correct: 15, total: 25, pct: 60 }
    ]);
  }, [user?.id]);`;

if (fetchAnalyticsStart !== -1) {
  content = content.substring(0, fetchAnalyticsStart) + replacement + content.substring(fetchAnalyticsEnd);
}

fs.writeFileSync('src/pages/Analytics.tsx', content, 'utf8');
