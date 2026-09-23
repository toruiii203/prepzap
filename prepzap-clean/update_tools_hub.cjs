const fs = require('fs');
let content = fs.readFileSync('src/pages/ToolsHub.tsx', 'utf8');

const target = `    { route: "/teach-it", icon: "psychology", title: "Teach It", desc: "Feynman mode" },
    { route: "/quick-study", icon: "menu_book", title: "Quick Study", desc: "High yield" },
  ],
];`;

const replacement = `    { route: "/teach-it", icon: "psychology", title: "Teach It", desc: "Feynman mode" },
    { route: "/timer", icon: "timer", title: "Focus Timer", desc: "Pomodoro" },
  ],
  [
    { route: "/arcade", icon: "sports_esports", title: "Arcade", desc: "Mini-games" },
    { route: "/settings", icon: "settings", title: "Settings", desc: "Preferences" },
  ]
];`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/ToolsHub.tsx', content, 'utf8');
