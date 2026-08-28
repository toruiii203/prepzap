const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf8');

// Ensure useAuth is imported
if (!code.includes('useAuth')) {
  code = code.replace(
    'import { usePlan } from "@/hooks/usePlan";',
    'import { usePlan } from "@/hooks/usePlan";\nimport { useAuth } from "@/contexts/AuthContext";'
  );
}

// Replace the inside of StudentProfile
const oldLogic = `  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("S");
  const [joinDate, setJoinDate] = useState("?"");
  const [stats, setStats] = useState({ sessions: 0, studyHrs: 0, avgScore: 0, streak: 0 });
  const [sourceCount, setSourceCount] = useState(0);

  useEffect(() => {
    // Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        const name =
          meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Student";
        setUserName(name);
        setUserEmail(session.user.email || "");
        setUserInitial(name.charAt(0).toUpperCase());
        setJoinDate(getJoinDate(session.user.created_at));
      }
    });`;

const newLogic = `  const { user, profile } = useAuth();
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("S");
  const [joinDate, setJoinDate] = useState("?"");
  const [stats, setStats] = useState({ sessions: 0, studyHrs: 0, avgScore: 0, streak: 0 });
  const [sourceCount, setSourceCount] = useState(0);

  useEffect(() => {
    // Auth
    if (user) {
      const name = profile?.full_name || (user as any)?.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
      setUserName(name);
      setUserEmail(user.email || "");
      setUserInitial(name.charAt(0).toUpperCase());
      setJoinDate(getJoinDate(user.created_at));
    }`;

code = code.replace(oldLogic, newLogic);
code = code.replace(
    `supabase.auth.getSession().then(({ data: { session } }) => {\n      if (session?.user) {`,
    `if (user) {`
); // in case my regex didn't perfectly match

fs.writeFileSync('src/pages/StudentProfile.tsx', code);
