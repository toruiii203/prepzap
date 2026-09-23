const fs = require('fs');
let content = fs.readFileSync('src/hooks/useStudyTimeTracker.ts', 'utf8');

if (!content.includes('"beforeunload"')) {
  content = content.replace('window.addEventListener("pagehide", flush);', 'window.addEventListener("pagehide", flush);\n    window.addEventListener("beforeunload", flush);');
  content = content.replace('window.removeEventListener("pagehide", flush);', 'window.removeEventListener("pagehide", flush);\n      window.removeEventListener("beforeunload", flush);');
  fs.writeFileSync('src/hooks/useStudyTimeTracker.ts', content, 'utf8');
}
