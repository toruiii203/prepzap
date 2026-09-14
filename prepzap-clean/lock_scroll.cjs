const fs = require('fs');
let file = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

file = file.replace(
  'const [sessions, setSessions] = useState<ChatSession[]>([]);',
  `const [sessions, setSessions] = useState<ChatSession[]>([]);

  // Lock body scroll so the mobile chat interface doesn't bounce/scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, []);`
);

fs.writeFileSync('src/pages/AITutor.tsx', file);
console.log("Locked body scroll in AITutor");
