const fs = require('fs');
let content = fs.readFileSync('src/pages/ToolsHub.tsx', 'utf8');

// The original second group:
// { route: "/planner", icon: "calendar_month", title: "Study Planner", desc: "Schedule sessions" },
// { route: "/math", icon: "calculate", title: "Math Solver", desc: "Step-by-step" },
// { route: "/teach-it", icon: "psychology", title: "Teach It", desc: "Feynman mode" },
// { route: "/quick-study", icon: "menu_book", title: "Quick Study", desc: "High yield" },

// Quick Study is duplicated as "Cram Mode" in the first group, so it IS safe to replace it, BUT we need to add Arcade, Settings, Timer.
const target = `    { route: "/teach-it", icon: "psychology", title: "Teach It", desc: "Feynman mode" },
    { route: "/quick-study", icon: "menu_book", title: "Quick Study", desc: "High yield" },
  ],
  [
    { route: "/sources"`;

const replacement = `    { route: "/teach-it", icon: "psychology", title: "Teach It", desc: "Feynman mode" },
    { route: "/timer", icon: "timer", title: "Focus Timer", desc: "Pomodoro" },
  ],
  [
    { route: "/quick-study", icon: "menu_book", title: "Quick Study", desc: "High yield" },
    { route: "/arcade", icon: "sports_esports", title: "Arcade", desc: "Mini-games" },
    { route: "/settings", icon: "settings", title: "Settings", desc: "Preferences" },
  ],
  [
    { route: "/sources"`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/ToolsHub.tsx', content, 'utf8');
