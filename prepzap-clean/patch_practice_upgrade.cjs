const fs = require('fs');
let code = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

code = code.replace(
  '<SharedSidebar active="/practice" />',
  '<SharedSidebar active="/practice" />\n      <UpgradePrompt isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />'
);

fs.writeFileSync('src/pages/Practice.tsx', code);
