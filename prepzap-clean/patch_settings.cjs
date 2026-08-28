const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

code = code.replace(
  '<Toggle on={notifs[key]} onChange={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))} />',
  `<Toggle on={notifs[key]} onChange={() => {
                    const willBeOn = !notifs[key];
                    setNotifs(prev => ({ ...prev, [key]: willBeOn }));
                    toast.success(\`\${willBeOn ? "Enabled" : "Disabled"} \${label.toLowerCase()}\`, {
                      description: willBeOn ? sub : \`You will no longer receive \${label.toLowerCase()}.\`,
                    });
                  }} />`
);

fs.writeFileSync('src/pages/Settings.tsx', code);
