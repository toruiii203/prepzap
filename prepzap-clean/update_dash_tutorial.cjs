const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Imports
content = content.replace('import { Skeleton } from "@/components/ui/skeleton";', 'import { Skeleton } from "@/components/ui/skeleton";\nimport { useTutorialModal } from "@/hooks/useTutorialModal";\nimport { TutorialModal } from "@/components/TutorialModal";\nimport { TUTORIAL_CONTENT } from "@/lib/tutorialContent";');

// Hook
content = content.replace('export default function Dashboard() {\n  const navigate = useNavigate();', 'export default function Dashboard() {\n  const navigate = useNavigate();\n  const tutorial = useTutorialModal("/dashboard");');

// Mobile trigger
content = content.replace('<div className="flex items-center gap-3">', '<div className="flex items-center gap-3">\n            <span className="material-symbols-outlined text-[24px] cursor-pointer hover:opacity-75" onClick={() => tutorial.show()}>help</span>');

// Desktop trigger
content = content.replace('<div className="flex gap-3">', '<div className="flex gap-3">\n              <button onClick={() => tutorial.show()} className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"><span className="material-symbols-outlined text-[20px]">help</span></button>');

// Render Modal
content = content.replace('return (\n    <div className="w-full min-h-[100dvh]', 'return (\n    <>\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/dashboard"]} title="Dashboard" />\n      <div className="w-full min-h-[100dvh]');
content = content.replace(/      <\/div>\n    <\/div>\n  \);\n}/, '      </div>\n    </div>\n    </>\n  );\n}');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
