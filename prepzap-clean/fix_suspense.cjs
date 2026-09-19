const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<Suspense\s*fallback=\{\s*<div style=\{\{ minHeight: "100vh", background: "#1a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba\(245,237,232,0\.75\)", fontSize: 14 \}\}>\s*Loading page\.\.\.\s*<\/div>\s*\}/;

content = content.replace(regex, '<Suspense fallback={<AppSkeleton />}');

fs.writeFileSync('src/App.tsx', content, 'utf8');
