const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const oldNameLogic = `    const toTitleCase = (s: string) =>
      s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    const rawName =
      user?.avatarConfig?.full_name ||
      (user as any)?.user_metadata?.full_name ||
      user?.name ||
      user?.email?.split("@")[0] ||
      "Master";
    const displayName = toTitleCase(rawName);`;

const newNameLogic = `    const toTitleCase = (s: string) =>
      s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    const rawName =
      profile?.full_name ||
      (user as any)?.user_metadata?.full_name ||
      user?.name ||
      user?.email?.split("@")[0] ||
      "Master";
    const displayName = toTitleCase(rawName);`;

code = code.replace(oldNameLogic, newNameLogic);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
