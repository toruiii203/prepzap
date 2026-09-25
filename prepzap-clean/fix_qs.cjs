const fs = require('fs');
let content = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

// Insert a </div> before the last </div>
const pos = content.lastIndexOf('</div>');
content = content.substring(0, pos) + '</div>\n    ' + content.substring(pos);

fs.writeFileSync('src/pages/QuickStudy.tsx', content, 'utf8');
