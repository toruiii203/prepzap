const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// 1. Fix Mobile Header
const mobileSearch = `<button onClick={() => navigate("/sources")}
                className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
                <span className="material-symbols-outlined text-black text-[18px]">library_books</span>
              </button>`;
const mobileReplace = `<button onClick={() => tutorial.show()}
                className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
                <span className="material-symbols-outlined text-black text-[18px]">help</span>
              </button>
              <button onClick={() => navigate("/sources")}
                className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3]">
                <span className="material-symbols-outlined text-black text-[18px]">library_books</span>
              </button>`;

content = content.replace(mobileSearch, mobileReplace);

// 2. Fix Desktop Duplicate Tutorial Button
const desktopSearch = `<button onClick={() => tutorial.show()} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-9 h-9 md:w-10 md:h-10 shrink-0 z-50 ml-2" title="Tutorial"><span className="material-symbols-outlined text-[18px] md:text-[20px]">help</span></button>
<button onClick={() => tutorial.show()} className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3] ml-2" title="Tutorial"><span className="material-symbols-outlined text-black text-[18px]">help</span></button>`;

const desktopReplace = `<button onClick={() => tutorial.show()} className="flex items-center justify-center w-10 h-10 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3] ml-2" title="Tutorial">
                <span className="material-symbols-outlined text-black text-[18px]">help</span>
              </button>`;

content = content.replace(desktopSearch, desktopReplace);

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
