const fs = require('fs');
let file = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

file = file.replace(
  'const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());',
  `const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());

  // Lock body scroll so the mobile chat interface doesn't bounce/scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, []);`
);

fs.writeFileSync('src/pages/AITutor.tsx', file);
console.log("Locked body scroll in AITutor correctly");
