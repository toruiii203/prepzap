const fs = require('fs');
let content = fs.readFileSync('src/pages/NotesWorkspace.tsx', 'utf8');

if (!content.includes('import { withTimeout }')) {
  content = content.replace('import { supabase } from "@/lib/supabase";', 'import { supabase } from "@/lib/supabase";\nimport { withTimeout } from "@/lib/withTimeout";');
}

const target = 'const { data, error } = await supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });';
const replacement = 'const { data, error } = await withTimeout(supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }), 5000, "fetch notes");';

content = content.replace(target, replacement);

fs.writeFileSync('src/pages/NotesWorkspace.tsx', content, 'utf8');
