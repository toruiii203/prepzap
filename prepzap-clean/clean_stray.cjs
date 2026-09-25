const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Find the stray tutorial.show() inside the task mapping
const stray = `<span className="material-symbols-outlined text-[24px] cursor-pointer hover:opacity-75" onClick={() => tutorial.show()}>help</span>`;
content = content.replace(stray, '');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
