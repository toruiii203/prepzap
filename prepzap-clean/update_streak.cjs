const fs = require('fs');
let content = fs.readFileSync('src/lib/streak.ts', 'utf8');

if (!content.includes('"studenius:streak-updated"')) {
  content = content.replace('return { streakError: null, newStreak };', 'window.dispatchEvent(new CustomEvent("studenius:streak-updated", { detail: { newStreak } }));\n  return { streakError: null, newStreak };');
  fs.writeFileSync('src/lib/streak.ts', content, 'utf8');
}
