const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf8');

if (!content.includes('import { useStudyStats }')) {
  content = content.replace('import { useAuth } from "@/contexts/AuthContext";', 'import { useAuth } from "@/contexts/AuthContext";\nimport { useStudyStats } from "@/hooks/useStudyStats";');
}

const startStats = 'const [stats, setStats] = useState({ sessions: 0, studyHrs: 0, avgScore: 0, streak: 0 });';
const endStats = '};\n  const [sourceCount, setSourceCount] = useState(0);';

const sI = content.indexOf(startStats);
const eI = content.indexOf(endStats) + endStats.length;

if (sI !== -1 && eI !== -1) {
  content = content.substring(0, sI) + 'const { stats } = useStudyStats();\n  const [sourceCount, setSourceCount] = useState(0);' + content.substring(eI);
}

// Remove setStats(deriveStats()); inside useEffect
content = content.replace(/\/\/ Stats from localStorage\s*setStats\(deriveStats\(\)\);/g, '');

fs.writeFileSync('src/pages/StudentProfile.tsx', content, 'utf8');
