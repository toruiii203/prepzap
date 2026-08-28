const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// 1. handleSave
code = code.replace(
  'setSaveStatus("saved")',
  'setSaveStatus("saved");\n      toast.success("Preferences saved", { description: "Your study preferences have been updated." })'
);

// 2. handleSignOut
code = code.replace(
  'await supabase.auth.signOut()\n    navigate("/")',
  'await supabase.auth.signOut()\n    navigate("/")\n    toast.info("Signed out", { description: "You have been successfully signed out." })'
);

// 3. handleChangePassword
code = code.replace(
  'setPwResetSent(true)',
  'setPwResetSent(true)\n      toast.success("Reset link sent!", { description: "Check your email for instructions to reset your password." })'
);

// 4. handleRequestNotifPermission
code = code.replace(
  'return alert("Notifications not supported on this device.")',
  'return toast.error("Not supported", { description: "Push notifications are not supported on this device/browser." })'
);
code = code.replace(
  'if (perm === "granted") {',
  'if (perm === "granted") {\n        toast.success("Notifications Enabled", { description: "We will send you reminders to keep your streak alive!" });'
);
code = code.replace(
  'if (perm !== "granted") {',
  'if (perm !== "granted") {\n        toast.error("Permission denied", { description: "Please enable notifications in your browser settings." });'
);

// 5. handleDeleteAccount
code = code.replace(
  'await supabase.auth.signOut()\n    navigate("/")\n    // Note:',
  'await supabase.auth.signOut()\n    navigate("/")\n    toast.error("Account Deleted", { description: "Your account data has been queued for deletion." });\n    // Note:'
);

fs.writeFileSync('src/pages/Settings.tsx', code);
