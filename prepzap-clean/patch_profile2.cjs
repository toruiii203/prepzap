const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf8');

if (!code.includes('useAuth')) {
  code = code.replace(
    'import { usePlan } from "@/hooks/usePlan";',
    'import { usePlan } from "@/hooks/usePlan";\nimport { useAuth } from "@/contexts/AuthContext";'
  );
}

// Find export default function StudentProfile() {
const exportIndex = code.indexOf('export default function StudentProfile() {');
if (exportIndex !== -1) {
  code = code.replace(
    'export default function StudentProfile() {\n  const navigate = useNavigate();\n  const { isPro } = usePlan();',
    'export default function StudentProfile() {\n  const navigate = useNavigate();\n  const { isPro } = usePlan();\n  const { user, profile } = useAuth();'
  );
}

// Replace the session.user part
code = code.replace(
  'supabase.auth.getSession().then(({ data: { session } }) => {\n      if (session?.user) {\n        const meta = session.user.user_metadata;\n        const name =\n          meta?.full_name || meta?.name || session.user.email?.split("@")[0] || "Student";\n        setUserName(name);\n        setUserEmail(session.user.email || "");\n        setUserInitial(name.charAt(0).toUpperCase());\n        setJoinDate(getJoinDate(session.user.created_at));\n      }\n    });',
  `if (user) {
      const name = profile?.full_name || (user as any)?.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
      setUserName(name);
      setUserEmail(user.email || "");
      setUserInitial(name.charAt(0).toUpperCase());
      setJoinDate(getJoinDate(user.created_at));
    }`
);

fs.writeFileSync('src/pages/StudentProfile.tsx', code);
