const fs = require('fs');
let code = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

const oldName = `  const displayName =
    (user as any)?.user_metadata?.full_name ||
    profile?.full_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Student";`;

const newName = `  const displayName =
    profile?.full_name ||
    (user as any)?.user_metadata?.full_name ||
    profile?.username ||
    user?.email?.split("@")[0] ||
    "Student";`;

code = code.replace(oldName, newName);
fs.writeFileSync('src/components/SharedSidebar.tsx', code);
