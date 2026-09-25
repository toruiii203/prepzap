const fs = require('fs');
let ai = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// The button was injected directly before </header>. Let's move it into the 'flex items-center gap-4' or 'gap-2' div.
const helpBtn = `<button onClick={() => tutorial.show()} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-9 h-9 md:w-10 md:h-10 shrink-0 z-50 ml-2" title="Tutorial"><span className="material-symbols-outlined text-[18px] md:text-[20px]">help</span></button>`;

ai = ai.replace(helpBtn, '');
ai = ai.replace(helpBtn, ''); // In case it was injected twice (mobile and desktop)

// Now insert it cleanly into desktop
ai = ai.replace(
  '<div className="flex items-center gap-4">\n              \n              \n  \n        {/*',
  '<div className="flex items-center gap-4">\n              ' + helpBtn + '\n            </div>\n  \n        {/*'
);

// Insert into mobile
ai = ai.replace(
  '<span className="material-symbols-outlined text-black text-[18px]">library_books</span>\n              </button>\n            </div>\n          </header>',
  '<span className="material-symbols-outlined text-black text-[18px]">library_books</span>\n              </button>\n              ' + helpBtn + '\n            </div>\n          </header>'
);

fs.writeFileSync('src/pages/AITutor.tsx', ai, 'utf8');
