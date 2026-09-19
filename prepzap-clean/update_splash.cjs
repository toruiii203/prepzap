const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const splashTarget = `  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--pz-bg, #160810)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <img src="/icon-512.png" alt="PrepZap" style={{ width: 120, height: 120, opacity: 0.95 }} />
    </div>
  );`;

const splashReplace = `  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <AppSkeleton />
    </div>
  );`;

content = content.replace(splashTarget, splashReplace);

fs.writeFileSync('src/App.tsx', content, 'utf8');
