const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// 1. Rename REX: AI TUTOR to Rex Tutor
content = content.replace(/>REX: AI TUTOR<\/span>/g, '>Rex Tutor</span>');
content = content.replace(/>Rex: AI Tutor<\/span>/g, '>Rex Tutor</span>');
content = content.replace(/Rex: AI Tutor/g, 'Rex Tutor');

// 2. Avatar
content = content.replace(
    '<div onClick={() => navigate("/profile")}\n                className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">\n                R\n              </div>',
    '<div onClick={() => navigate("/profile")}\n                className="w-10 h-10 border-2 border-black bg-[#ae2925] rounded-full overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 shrink-0">\n                <img src={FOX.neutral} className="w-full h-full object-cover scale-150 pt-3" alt="Rex" />\n              </div>'
);
content = content.replace(
    '<div onClick={() => navigate("/profile")}\n              className="w-8 h-8 border-[1.5px] border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[11px] cursor-pointer hover:opacity-90">\n              R\n            </div>',
    '<div onClick={() => navigate("/profile")}\n              className="w-8 h-8 border-[1.5px] border-black bg-[#ae2925] rounded-full overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 shrink-0">\n              <img src={FOX.neutral} className="w-full h-full object-cover scale-150 pt-2" alt="Rex" />\n            </div>'
);

// 3. Disclaimer
if (!content.includes('import { RexDisclaimer } from "@/components/RexDisclaimer"')) {
    content = content.replace('import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";', 'import UpgradePrompt, { SoftWarning } from "@/components/UpgradePrompt";\nimport { RexDisclaimer } from "@/components/RexDisclaimer";');
}
content = content.replace(
    '<div className="text-center py-4 px-6 border-t-2 border-black bg-[#FAF7F2]">\n                <p className="text-[10px] font-bold text-black/40 uppercase tracking-wide leading-relaxed max-w-md mx-auto">\n                  Studenius AI can make mistakes. Verify important academic concepts with your textbook.\n                </p>\n              </div>',
    '<div className="w-full max-w-2xl mx-auto pb-4"><RexDisclaimer /></div>'
);
content = content.replace(
    '<footer className="mt-auto border-t-2 border-black bg-white p-4 shrink-0 z-10 hidden md:block">\n            <p className="text-[10px] font-bold text-black/40 text-center uppercase tracking-widest">\n              AI can make mistakes. Verify important concepts with your textbook.\n            </p>\n          </footer>',
    '' // We don't need a right panel footer disclaimer anymore, or we can just leave it empty.
);

// 4. Group History
const renderHistoryTarget = `{sessions.map(s => (
            <div key={s.id}`;

const renderHistoryReplace = `
          {(() => {
            const today = new Date().setHours(0,0,0,0);
            const todaySessions = sessions.filter(s => new Date(s.timestamp).setHours(0,0,0,0) === today);
            const olderSessions = sessions.filter(s => new Date(s.timestamp).setHours(0,0,0,0) !== today);
            
            const renderSession = (s: any) => (
            <div key={s.id}
`;

content = content.replace(renderHistoryTarget, renderHistoryReplace);

// Adjust the end of mapping
const renderHistoryEndTarget = `            </div>
          ))}`;
const renderHistoryEndReplace = `            </div>
            );
            return (
              <div className="flex flex-col gap-6">
                {todaySessions.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50 px-1">Today</h3>
                    {todaySessions.map(renderSession)}
                  </div>
                )}
                {olderSessions.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-black/50 px-1">Previous</h3>
                    {olderSessions.map(renderSession)}
                  </div>
                )}
              </div>
            );
          })()}`;

content = content.replace(renderHistoryEndTarget, renderHistoryEndReplace);

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
