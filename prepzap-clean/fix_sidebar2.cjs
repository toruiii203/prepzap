const fs = require('fs');
let content = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

content = content.replace(
    '<aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64 overflow-y-auto">',
    '<aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-[1.5px] border-black bg-[#FAF7F2] w-64 overflow-hidden">'
);

fs.writeFileSync('src/components/SharedSidebar.tsx', content, 'utf8');
