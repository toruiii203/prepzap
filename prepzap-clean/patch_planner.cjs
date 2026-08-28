const fs = require('fs');
let code = fs.readFileSync('src/pages/StudyPlanner.tsx', 'utf8');

// Imports
code = code.replace(
  'import { useAuth } from "@/contexts/AuthContext";',
  'import { useAuth } from "@/contexts/AuthContext";\nimport { useToolHistory } from "@/pages/ToolHistory";\nimport { loadLibrary } from "@/lib/sourceContext";'
);

// State hooks
code = code.replace(
  'const { user, profile } = useAuth() as any;',
  'const { user, profile } = useAuth() as any;\n  const { entries: practiceHistory } = useToolHistory("practice");\n  const [libraryCount, setLibraryCount] = useState(0);\n  useEffect(() => {\n    setLibraryCount(loadLibrary()?.length || 0);\n  }, []);'
);

// Derived stats
const oldStats = `  const completedHours = nonDue.filter(s => s.completed).reduce((acc, s) => acc + (s.estimatedHours ?? 1.5), 0);
  const quizSessions   = nonDue.filter(s => s.topic?.toLowerCase().includes("quiz") || s.subject.toLowerCase().includes("quiz"));
  const doneQuizzes    = quizSessions.filter(s => s.completed).length;
  const totalQuizzes   = Math.max(quizSessions.length, 6);
  const libCitations   = sessions.filter(s => s.topic?.toLowerCase().includes("library") || s.topic?.toLowerCase().includes("source")).length;`;

const newStats = `  const completedHours = nonDue.filter(s => s.completed).reduce((acc, s) => acc + (s.estimatedHours ?? 1.5), 0);
  const doneQuizzes    = practiceHistory.length;
  const totalQuizzes   = Math.max(practiceHistory.length, 6);
  const libCitations   = libraryCount;`;

code = code.replace(oldStats, newStats);

fs.writeFileSync('src/pages/StudyPlanner.tsx', code);
