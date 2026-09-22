const fs = require('fs');
let content = fs.readFileSync('src/lib/tutorialContent.ts', 'utf8');

const arcadeContent = `
  "/arcade": [
    { icon: "stadia_controller", title: "Mini-Games", desc: "Turn your study materials into playable games." },
    { icon: "memory", title: "AI Generated", desc: "Games are custom-built from your active source." },
    { icon: "emoji_events", title: "Quest Integration", desc: "Playing games counts towards your daily quests." }
  ],
};`;

content = content.replace('};', arcadeContent);
fs.writeFileSync('src/lib/tutorialContent.ts', content, 'utf8');
