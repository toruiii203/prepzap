const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

code = code.replace(
  /const handleSignOut = async \(\) => \{\s*await supabase\.auth\.signOut\(\)\s*navigate\("\/"\)\s*\}/,
  `const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/")
    toast.info("Signed out", { description: "You have been successfully signed out." })
  }`
);

code = code.replace(
  /const handleDeleteAccount = async \(\) => \{\s*if \(!user\) return\s*\/\/ Sign out first, then delete via edge function or RPC\s*await supabase\.auth\.signOut\(\)\s*navigate\("\/"\)\s*\/\/ Note:/,
  `const handleDeleteAccount = async () => {
    if (!user) return
    await supabase.auth.signOut()
    navigate("/")
    toast.error("Account Deleted", { description: "Your account data has been queued for deletion." })
    // Note:`
);

fs.writeFileSync('src/pages/Settings.tsx', code);
