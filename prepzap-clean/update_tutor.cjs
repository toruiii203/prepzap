const fs = require('fs');
let file = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// Replace the mobile main padding and footer classes
file = file.replace(
  '<main className="flex-1 overflow-y-auto px-4 py-4 bg-[#FAF7F2]">',
  '<main className="flex-1 overflow-y-auto px-4 pt-4 pb-36 bg-[#FAF7F2]">'
);

file = file.replace(
  '<footer className="shrink-0 w-full bg-white border-t-2 border-black px-4 pt-3 z-20"\n          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>',
  '<footer className="fixed bottom-0 left-0 right-0 w-full bg-white border-t-2 border-black px-4 pt-3 z-50"\n          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>'
);

fs.writeFileSync('src/pages/AITutor.tsx', file);
console.log("Updated AITutor mobile layout to use fixed footer");
