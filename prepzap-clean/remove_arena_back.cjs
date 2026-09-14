const fs = require('fs');

let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

content = content.replace(
    `<button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-[13px] 
shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all mb-1"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Dashboard
          </button>`,
    ''
);
// Also remove it if formatting differs
content = content.replace(
    /\<button[\s\S]*?onClick=\{\(\) => navigate\("\/dashboard"\)\}[\s\S]*?Dashboard[\s\S]*?\<\/button\>/,
    ''
);

fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
console.log("Removed Arena back button");
