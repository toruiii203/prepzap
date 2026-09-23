const fs = require('fs');
let content = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

const target = `<button
          onClick={() => navigate("/pricing")}
          className="flex items-center justify-center gap-2 px-3 py-2.5 mx-3 mb-1 bg-[#ae2925] border-2 border-black text-white text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] hover:bg-black hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
          UPGRADE TO PRO
        </button>`;

const replacement = `{profile?.plan === 'pro' ? (
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center justify-center gap-2 px-3 py-2.5 mx-3 mb-1 bg-black border-2 border-black text-[#F5A623] text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#ae2925] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            PRO ACTIVE
          </button>
        ) : (
          <button
            onClick={() => navigate("/pricing")}
            className="flex items-center justify-center gap-2 px-3 py-2.5 mx-3 mb-1 bg-[#ae2925] border-2 border-black text-white text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] hover:bg-black hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
            UPGRADE TO PRO
          </button>
        )}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/SharedSidebar.tsx', content, 'utf8');
