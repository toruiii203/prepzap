const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const newTools = `    { route: "/mistakes",   icon: "auto_stories",     title: "Mistake Journal", desc: "Learn from errors", color: "text-[#ba1a1a]" },
    { route: "/analytics",  icon: "bar_chart",        title: "Analytics",       desc: "Track progress",    color: "text-[#14B8A6]" },
    { route: "/challenges", icon: "emoji_events",     title: "Challenges",      desc: "Compete & win",     color: "text-[#F5A623]" },
    { route: "/arena",      icon: "sports_esports",   title: "Arena",           desc: "Multiplayer exams", color: "text-[#E11D48]" },
    { route: "/arcade",     icon: "stadia_controller",title: "Arcade",          desc: "Mini-games",        color: "text-[#D946EF]" },`;

content = content.replace(/\{ route: "\/mistakes".*\n.*\{ route: "\/analytics".*\n.*\{ route: "\/challenges".*,/, newTools);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
