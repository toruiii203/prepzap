const fs = require('fs');
let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

// Fix P2 - Duplicate disclaimer
content = content.replace(/<RexDisclaimer \/>\s*<RexDisclaimer \/>/g, '<RexDisclaimer />');

// Fix P3 - 1 msgs grammar bug
content = content.replace(/\{s\.messageCount\} msgs/g, '{s.messageCount === 1 ? "1 msg" : s.messageCount + " msgs"}');

// Fix P1 - Rex Tutor's quick-action button row overflows
content = content.replace(/className="flex gap-2 overflow-hidden px-1 py-2"/g, 'className="flex gap-2 overflow-x-auto px-1 py-2 hide-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}');

fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
