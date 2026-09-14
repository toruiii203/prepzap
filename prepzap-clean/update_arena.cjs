const fs = require('fs');

let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

// Insert SharedSidebar import if missing
if (!content.includes('SharedSidebar')) {
    content = content.replace('import { supabase } from "@/lib/supabase";', 'import { supabase } from "@/lib/supabase";\nimport { SharedSidebar } from "@/components/SharedSidebar";');
}

// Modify Arena.tsx layout
content = content.replace(
    '<div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8]">' + '\n' + '      {/* 📱 Mobile header 📱 */}',
    '<SharedSidebar active="/arena" />\n    <div className="flex flex-col min-h-[100dvh] bg-[#f5f0e8] md:ml-64">\n      {/* 📱 Mobile header 📱 */}'
);

// We need to remove the standalone "Back to dashboard" desktop header in Arena if it exists.
// Wait, is there a desktop header in Arena? Let's check.
fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
console.log("Updated Arena layout");
