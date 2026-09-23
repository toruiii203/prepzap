const fs = require('fs');
let content = fs.readFileSync('src/pages/NotFound.tsx', 'utf8');

content = content.replace('bg-muted', 'bg-[#F0EDE0]');
content = content.replace('className="mb-4 text-4xl font-bold"', 'className="mb-4 text-[48px] font-black"');
content = content.replace('text-muted-foreground', 'text-black/60 font-bold');
content = content.replace('text-primary underline hover:text-primary/90', 'border-2 border-black bg-[#FF4D2E] text-white px-6 py-3 font-extrabold shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 transition-all block w-max mx-auto mt-6');

fs.writeFileSync('src/pages/NotFound.tsx', content, 'utf8');
