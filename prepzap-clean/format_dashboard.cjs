const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

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

const injectPoint = content.indexOf('function Dashboard() {');
if (injectPoint !== -1) {
  content = content.substring(0, injectPoint) + formatDurationFn + '\n' + content.substring(injectPoint);
}

// Replace in Dashboard.tsx
content = content.replace(/\{Number\(session\.duration_minutes\) > 0 && Number\(session\.duration_minutes\) < 1 \? "<1" : Math\.round\(Number\(session\.duration_minutes\) \|\| 0\)\}m/g, '{formatDuration(Number(session.duration_minutes))}');

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
