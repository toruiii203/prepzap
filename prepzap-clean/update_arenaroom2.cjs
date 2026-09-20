const fs = require('fs');
let content = fs.readFileSync('src/pages/ArenaRoom.tsx', 'utf8');

const regex = /if \(loading\) return \([\s\S]*?<div className="min-h-\[100dvh\] bg-\[#FAF7F2\] flex items-center justify-center">[\s\S]*?<span className="material-symbols-outlined animate-spin text-\[32px\]">progress_activity<\/span>[\s\S]*?<\/div>\s*\);/;

content = content.replace(regex, 'if (loading) return <AppSkeleton />;');

fs.writeFileSync('src/pages/ArenaRoom.tsx', content, 'utf8');
