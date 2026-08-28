const fs = require('fs');
let code = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

code = code.replace(
  '{/* Footer */}\n      <div className="mt-auto border-t-[1.5px] border-black pt-4 flex flex-col gap-2">',
  `{/* Footer */}
      <div className="mt-auto border-t-[1.5px] border-black pt-4 flex flex-col gap-2">
        <button
          onClick={() => navigate("/pricing")}
          className="flex items-center justify-center gap-2 px-3 py-2.5 mx-3 mb-1 bg-[#ae2925] border-2 border-black text-white text-[12px] font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] hover:bg-black hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
          UPGRADE TO PRO
        </button>`
);

fs.writeFileSync('src/components/SharedSidebar.tsx', code);
