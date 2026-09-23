const fs = require('fs');
let content = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

// The mobile duplicate Coverage Score
content = content.replace(/<div className="h-1\.5 w-full bg-\[#E8E4DC\] border border-black overflow-hidden mb-1">\s*<div className="h-full bg-black transition-all duration-700" style=\{\{ width: \`\$\{generatedSheet\.coverageScore\}%\` \}\} \/>\s*<\/div>\s*<p\s*className="text-\[10px\] font-black uppercase tracking-widest text-black\/40"\s*title="[^"]+"\s*>\s*Coverage Score: \{generatedSheet\.coverageScore\}%\s*<\/p>/g, '');

// The desktop duplicate Coverage Score in Concept Generator header
content = content.replace(/<span\s*className="text-\[11px\] font-black uppercase tracking-widest bg-black text-white px-3 py-1"\s*title="[^"]+"\s*>\s*Coverage Score: \{generatedSheet \? \`\$\{generatedSheet\.coverageScore\}%\` : "\u2014"\}\s*<\/span>/g, '');
// Wait, the long dash might be a different unicode character. I'll use a broader regex.
content = content.replace(/<span[^>]*?>\s*Coverage Score: \{generatedSheet \? [^}]*\} : "[^"]*"\s*\}\s*<\/span>/g, '');
// Actually just replace the whole span block using string split
const parts = content.split('<h3 className="text-[20px] font-black">Concept Generator</h3>');
if (parts.length > 1) {
  content = parts[0] + '<h3 className="text-[20px] font-black">Concept Generator</h3>\n                  </div>' + parts[1].split('</div>')[1] + parts[1].split('</div>').slice(2).join('</div>');
}

// The duplicate Tab bar above OutputCard
content = content.replace(/\{\/\* Tab bar \*\/\}\s*<div className="flex gap-px border-b-\[3px\] border-black">[\s\S]*?<\/div>/, '');

fs.writeFileSync('src/pages/QuickStudy.tsx', content, 'utf8');
