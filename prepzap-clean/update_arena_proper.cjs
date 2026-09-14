const fs = require('fs');
let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

// Insert SharedSidebar import
content = content.replace('import { supabase } from "@/lib/supabase";', 'import { supabase } from "@/lib/supabase";\nimport { SharedSidebar } from "@/components/SharedSidebar";');

// Replace bolt with edit_document
content = content.split('bolt').join('edit_document');

// Modify Arena.tsx layout
content = content.replace(
    '<div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">' + '\n' + '      {/* 📱 Mobile header 📱 */}',
    '<SharedSidebar active="/arena" />\n    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8] md:ml-64">\n      {/* 📱 Mobile header 📱 */}'
);

// Specifically remove the back button from the desktop header
content = content.replace(
    '<button\n            onClick={() => navigate("/dashboard")}\n            className="flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-white font-bold text-[13px] \nshadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all mb-1"\n          >\n            <span className="material-symbols-outlined text-[18px]">arrow_back</span>Dashboard\n          </button>',
    ''
);

fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
console.log("Updated Arena layout properly");
