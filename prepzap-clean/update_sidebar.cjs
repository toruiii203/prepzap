const fs = require('fs');
let content = fs.readFileSync('src/components/SharedSidebar.tsx', 'utf8');

// Add Arcade to Tools
content = content.replace('{ icon: "sports_esports", label: "Arena",          route: "/arena" },', 
  '{ icon: "sports_esports", label: "Arena",          route: "/arena" },\n        { icon: "stadia_controller", label: "Arcade",         route: "/arcade" },');

// Fix scrollbar styling for neobrutalist look
content = content.replace('style={{ scrollbarWidth: "thin" }}', '');
content = content.replace('className="h-full flex flex-col gap-4 overflow-y-auto pb-4"', 'className="h-full flex flex-col gap-4 overflow-y-auto pb-4 custom-scrollbar"');

const styleInjection = `
        <style>{\`
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #FAF7F2;
            border-left: 1.5px solid black;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: black;
            border: 1.5px solid black;
          }
        \`}</style>
        {/* Nav */}
`;

content = content.replace('{/* Nav */}', styleInjection);

fs.writeFileSync('src/components/SharedSidebar.tsx', content, 'utf8');
