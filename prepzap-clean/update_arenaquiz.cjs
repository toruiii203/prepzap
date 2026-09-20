const fs = require('fs');
let content = fs.readFileSync('src/pages/ArenaQuiz.tsx', 'utf8');

if (!content.includes('import { AppSkeleton }')) {
  content = content.replace('import { useNavigate, useParams } from "react-router-dom";', 'import { useNavigate, useParams } from "react-router-dom";\nimport { AppSkeleton } from "@/components/AppSkeleton";');
}

const regex = /if \(loading\) return \([\s\S]*?<div className="min-h-\[100dvh\] bg-\[#FAF7F2\] flex flex-col items-center justify-center gap-3">[\s\S]*?<span className="material-symbols-outlined animate-spin text-\[36px\]">progress_activity<\/span>[\s\S]*?<p className="font-bold text-\[14px\] text-black\/50">Loading quiz\.\.\.<\/p>[\s\S]*?<\/div>\s*\);/;

content = content.replace(regex, 'if (loading) return <AppSkeleton />;');

fs.writeFileSync('src/pages/ArenaQuiz.tsx', content, 'utf8');
