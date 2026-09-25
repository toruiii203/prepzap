const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

const mobileSearch = `<button onClick={() => setShowMobileHistory(true)}
                className="relative flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
                <span className="material-symbols-outlined text-black text-[18px]">history</span>`;
                
const mobileReplace = `<button onClick={() => navigate("/call")}
                className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
                <span className="material-symbols-outlined text-black text-[18px]">call</span>
              </button>\n              ` + mobileSearch;

content = content.replace(mobileSearch, mobileReplace);

const desktopSearch = `<div onClick={() => navigate("/profile")}
                className="w-10 h-10 border-2 border-black bg-[#ae2925] text-white flex items-center justify-center font-black text-[14px] cursor-pointer hover:opacity-90">
                R
              </div>`;
              
const desktopReplace = `<button onClick={() => navigate("/call")} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-10 h-10 shrink-0 z-50 mr-2" title="Call with Rex">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </button>\n              ` + desktopSearch;

content = content.replace(desktopSearch, desktopReplace);

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
