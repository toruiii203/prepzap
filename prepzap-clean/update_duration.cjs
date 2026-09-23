const fs = require('fs');
let content = fs.readFileSync('src/pages/Analytics.tsx', 'utf8');

const formatDurationFn = `
  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return "0m";
    if (mins < 1) return "<1m";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return \`\${h}h \${m}m\`;
    return \`\${m}m\`;
  };
`;

// Insert it after formatDateHelper
const injectPoint = content.indexOf('const formatDateHelper');
if (injectPoint !== -1) {
  content = content.substring(0, injectPoint) + formatDurationFn + '\n  ' + content.substring(injectPoint);
}

// Replace the {ses.duration_minutes || ses.duration || 0} mins
content = content.replace(/\{ses\.duration_minutes\s*\|\|\s*ses\.duration\s*\|\|\s*0\}\s*mins/g, '{formatDuration(Number(ses.duration_minutes || ses.duration || 0))}');

fs.writeFileSync('src/pages/Analytics.tsx', content, 'utf8');
