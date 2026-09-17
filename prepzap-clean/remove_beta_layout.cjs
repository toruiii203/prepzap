const fs = require('fs');
let content = fs.readFileSync('src/pages/StudeniusLayout.tsx', 'utf8');

const targetStr = `          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-tight text-black">
              Studenius
            </span>
            <span
              className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#ae2925] text-white tracking-wider"
            >
              BETA
            </span>
          </div>`;

const replaceStr = `          <div className="flex items-center gap-2">
            <span className="font-display font-black text-xl tracking-tight text-black">
              Studenius
            </span>
          </div>`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/pages/StudeniusLayout.tsx', content, 'utf8');
