const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// 1. Hook and tutorial imports
content = content.replace('import { RexDisclaimer } from "@/components/RexDisclaimer";', 'import { RexDisclaimer } from "@/components/RexDisclaimer";\nimport { useTutorialModal } from "@/hooks/useTutorialModal";\nimport { TutorialModal } from "@/components/TutorialModal";\nimport { TUTORIAL_CONTENT } from "@/lib/tutorialContent";');

content = content.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n  const tutorial = useTutorialModal("/ai-tutor");');

content = content.replace('return (\n    <div className="w-full min-h-[100dvh] flex flex-col md:flex-row bg-[#FAF7F2]">', 'return (\n    <>\n      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/ai-tutor"] || []} title="Rex Chat" />\n      <div className="w-full min-h-[100dvh] flex flex-col md:flex-row bg-[#FAF7F2]">');
content = content.replace(/    <\/div>\n  \);\n}/, '    </div>\n    </>\n  );\n}');

// 2. Avatar
const oldAvatarMobile = `<div className="w-8 h-8 rounded bg-gradient-to-br from-[#ae2925] to-[#fca623] flex items-center justify-center font-bold text-white shadow-[2px_2px_0px_#000] border-2 border-black">R</div>`;
const newAvatar = `<div className="w-8 h-8 border-2 border-black bg-[#f0a040] shadow-[2px_2px_0px_#000] flex items-center justify-center font-black text-black text-[14px]">REX</div>`;
content = content.replace(oldAvatarMobile, newAvatar);

const oldAvatarDesktop = `<div className="w-10 h-10 rounded bg-gradient-to-br from-[#ae2925] to-[#fca623] flex items-center justify-center font-bold text-white text-lg shadow-[3px_3px_0px_#000] border-2 border-black">R</div>`;
const newAvatarDesktop = `<div className="w-10 h-10 border-2 border-black bg-[#f0a040] shadow-[4px_4px_0px_#000] flex items-center justify-center font-black text-black text-[16px]">REX</div>`;
content = content.replace(oldAvatarDesktop, newAvatarDesktop);

// 3. Mobile Header Help Icon
const mobileHeader = `<div className="h-[60px] border-b-2 border-black bg-white flex items-center justify-between px-4 sticky top-0 z-30">`;
content = content.replace(mobileHeader, mobileHeader + `\n            <span className="material-symbols-outlined text-[24px] cursor-pointer hover:opacity-75" onClick={() => tutorial.show()} style={{ position: "absolute", right: "60px" }}>help</span>`);

// 4. Learning Modes
const inputArea = `<div className="shrink-0 px-8 pb-6 pt-4 border-t-2 border-black bg-[#FAF7F2]">`;
const modesRow = `
              <div className="shrink-0 px-8 pt-4 bg-[#FAF7F2]">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {STUDY_ACTIONS.map(mode => (
                    <button key={mode.id} onClick={() => setActiveMode(mode.id)} className={\`shrink-0 px-3 py-1.5 border-2 border-black font-black text-[12px] uppercase tracking-wider shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all \${activeMode === mode.id ? 'bg-[#FF4D2E] text-white' : 'bg-white text-black hover:bg-[#E2E2E2]'}\`}>
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
`;
content = content.replace(inputArea, modesRow + inputArea);

const mobileInputArea = `<div className="shrink-0 px-4 pt-3 bg-[#FAF7F2] border-t-2 border-black z-10"`;
const mobileModesRow = `
            <div className="shrink-0 px-4 pt-2 bg-[#FAF7F2]">
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {STUDY_ACTIONS.map(mode => (
                  <button key={mode.id} onClick={() => setActiveMode(mode.id)} className={\`shrink-0 px-3 py-1.5 border-2 border-black font-black text-[11px] uppercase tracking-wider shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all \${activeMode === mode.id ? 'bg-[#FF4D2E] text-white' : 'bg-white text-black'}\`}>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
`;
content = content.replace(mobileInputArea, mobileModesRow + mobileInputArea);

// 5. Disclaimer & Composer styling (Desktop)
const desktopInput = `<textarea
                  ref={desktopTextareaRef}`;
const newDesktopInput = `<textarea
                  ref={desktopTextareaRef}
                  style={{ maxHeight: 120, overflowY: "auto", backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #e5e5e5 27px, #e5e5e5 28px)", lineHeight: "28px", paddingTop: "4px" }}`;
content = content.replace(desktopInput, newDesktopInput);
const desktopIconBtn = `<span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>`;
content = content.replace(desktopIconBtn, `<span className="font-black text-[12px] uppercase tracking-widest">SEND</span>`);

const warningDesktop = `{!isPro && remainingUses <= 2 && remainingUses > 0 && (`;
content = content.replace(warningDesktop, `<RexDisclaimer />\n              ` + warningDesktop);

// 6. Mobile composer
const mobileInput = `<textarea
              ref={textareaRef}`;
const newMobileInput = `<textarea
              ref={textareaRef}
              style={{ overflowY: "auto", backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #e5e5e5 27px, #e5e5e5 28px)", lineHeight: "28px", paddingTop: "4px", borderRadius: 0 }}`;
content = content.replace(mobileInput, newMobileInput);
const mobileIconBtn = `<span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>`;
content = content.replace(mobileIconBtn, `<span className="font-black text-[12px] uppercase tracking-widest text-white">SEND</span>`);

const warningMobile = `{!isPro && remainingUses <= 2 && remainingUses > 0 && (`;
content = content.replace(warningMobile, `<RexDisclaimer />\n            ` + warningMobile);

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
