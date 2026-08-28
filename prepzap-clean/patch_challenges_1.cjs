const fs = require('fs');
let code = fs.readFileSync('src/pages/Challenges.tsx', 'utf8');

// Insert the useQuests hook import
code = code.replace(
  'import { useAuth } from "@/contexts/AuthContext";',
  'import { useAuth } from "@/contexts/AuthContext";\nimport { useQuests } from "@/hooks/useQuests";'
);

code = code.replace(
  '  const { profile } = useAuth();\n  const [shareModalOpen, setShareModalOpen] = useState(false);',
  '  const { profile } = useAuth();\n  const { completedQuestIds, weeklyActivity, loading } = useQuests();\n  const [shareModalOpen, setShareModalOpen] = useState(false);'
);

// We need to inject the Progress Indicator and modify the LockedCard component.
code = code.replace(
  'function LockedCard({ title, hint }: { title: string; hint: string }) {',
  'function LockedCard({ title, hint, progress, threshold }: { title: string; hint: string, progress: number, threshold: number }) {\n  const isUnlocked = progress >= threshold;\n  if (isUnlocked) {\n    return (\n      <div className="bg-[#FAF7F2] border-2 border-black flex flex-col overflow-hidden shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] transition-all">\n        <div className="px-5 py-3 border-b-2 border-black flex justify-between items-center bg-black">\n          <span className="text-[12px] font-black px-2 py-1 bg-[#F5A623] text-black uppercase">Mystery Unlocked</span>\n          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: `''FILL'' 1` }}>diamond</span>\n        </div>\n        <div className="p-5 flex-1">\n          <p className="font-black text-[18px] mb-2">{title}</p>\n          <p className="text-[14px] text-black/60 font-bold mb-4 leading-relaxed">You unlocked this mystery quest. Check back tomorrow for a new one!</p>\n        </div>\n      </div>\n    );\n  }\n'
);

fs.writeFileSync('src/pages/Challenges.tsx', code);
