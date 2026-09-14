const fs = require('fs');
let content = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

// The nav is:
// <nav className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4">
// Let's add a scroll indicator mask.

content = content.replace(
    '<nav className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4">',
    '<div className="flex-1 relative min-h-0">\n        <nav className="h-full flex flex-col gap-4 overflow-y-auto pb-4" style={{ scrollbarWidth: "thin" }}>'
);
content = content.replace(
    '</nav>',
    '</nav>\n        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#FAF7F2] to-transparent pointer-events-none" />\n      </div>'
);

fs.writeFileSync('src/components/SharedSidebar.tsx', content, 'utf8');
