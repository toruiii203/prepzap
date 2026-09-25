const fs = require('fs');
let ai = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

const helpBtnDesktop = `<button onClick={() => tutorial.show()} className="flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none w-9 h-9 md:w-10 md:h-10 shrink-0 z-50 ml-2" title="Tutorial"><span className="material-symbols-outlined text-[18px] md:text-[20px]">help</span></button>`;
const helpBtnMobile = `<button onClick={() => tutorial.show()} className="flex items-center justify-center w-9 h-9 border-2 border-black bg-white rounded-full shadow-[2px_2px_0px_#000] hover:bg-[#ebe8e3] ml-2" title="Tutorial"><span className="material-symbols-outlined text-black text-[18px]">help</span></button>`;

// Desktop insertion: Find the first </header> and insert inside its right-most div.
const header1Idx = ai.indexOf('</header>');
if (header1Idx > -1) {
  const lastDivIdx = ai.lastIndexOf('</div>', header1Idx);
  if (lastDivIdx > -1) {
    ai = ai.substring(0, lastDivIdx) + helpBtnDesktop + '\n' + ai.substring(lastDivIdx);
  }
}

// Mobile insertion: Find the second </header> and insert inside its right-most div.
const header2Idx = ai.indexOf('</header>', header1Idx + 1);
if (header2Idx > -1) {
  const lastDivIdx2 = ai.lastIndexOf('</div>', header2Idx);
  if (lastDivIdx2 > -1) {
    ai = ai.substring(0, lastDivIdx2) + helpBtnMobile + '\n' + ai.substring(lastDivIdx2);
  }
}

fs.writeFileSync('src/pages/AITutor.tsx', ai, 'utf8');
