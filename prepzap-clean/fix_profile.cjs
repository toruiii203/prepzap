const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf8');

// Remove the garbage from the line
content = content.replace(
  'const [sourceCount, setSourceCount] = useState(0); SharedSidebar } from "@/components/SharedSidebar";\nimport { useNavigate } from "react-router-dom";\nimport { ArrowLeft, LogOut } from "lucide-react";\nimport { supabase } from "@/lib/supabase";\nimport { loadLibrary } from "@/lib/sourceContext";\nimport { usePlan } from "@/hooks/usePlan";\nimport { useAuth } from "@/contexts/AuthContext";\nimport { useStudyStats } from "@/hooks/useStudyStats";',
  'const [sourceCount, setSourceCount] = useState(0);'
);

fs.writeFileSync('src/pages/StudentProfile.tsx', content, 'utf8');
