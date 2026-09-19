const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const prRegex = /if \(loading\) \{\s*return \(\s*<div style=\{\{ minHeight: "100vh", background: "#1a0a0a"[\s\S]*?<\/div>\s*\);\s*\}/;
content = content.replace(prRegex, 'if (loading) return <AppSkeleton />;');

const mrRegex = /if \(loading\) return \(\s*<div style=\{\{ minHeight: "100vh", background: "#FAF7F2"[\s\S]*?<\/div>\s*\);/;
content = content.replace(mrRegex, 'if (loading) return <AppSkeleton />;');

fs.writeFileSync('src/App.tsx', content, 'utf8');
