const fs = require('fs');
let content = fs.readFileSync('src/pages/ArenaRoom.tsx', 'utf8');

if (!content.includes('import { AppSkeleton }')) {
  content = content.replace('import { useNavigate, useParams } from "react-router-dom";', 'import { useNavigate, useParams } from "react-router-dom";\nimport { AppSkeleton } from "@/components/AppSkeleton";');
}

const target = `    if (loading) return (
      <div className="min-h-[100dvh] bg-[#FAF7F2] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
      </div>
    );`;

content = content.replace(target, '    if (loading) return <AppSkeleton />;');

fs.writeFileSync('src/pages/ArenaRoom.tsx', content, 'utf8');
