const fs = require('fs');
let content = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

// Remove extra Cram Mode toggle buttons
// In Mobile layout
content = content.replace(/<div className="flex bg-\[#FAF7F2\] p-1 rounded-lg border-2 border-black mb-4">[\s\S]*?<\/div>/, '');

// Coverage Score duplicates - they were embedded in OutputCard and mobile view
// Actually, it's easier to just strip the mobile Coverage Score.
content = content.replace(/<p className="text-\[10px\] font-black uppercase tracking-widest text-black\/40"[\s\S]*?>[\s\S]*?Coverage Score:.*?[\s\S]*?<\/p>/g, '');
content = content.replace(/<span className="text-\[11px\] font-black uppercase tracking-widest bg-black text-white px-3 py-1"[\s\S]*?>[\s\S]*?Coverage Score:.*?[\s\S]*?<\/span>/g, '');

fs.writeFileSync('src/pages/QuickStudy.tsx', content, 'utf8');
