const fs = require('fs');
let content = fs.readFileSync('src/pages/Challenges.tsx', 'utf8');

const newQuest = `
    {
      id: "arcade-play",
      tag: "Daily 5",
      tagStyle: "bg-black text-white",
      icon: "stadia_controller",
      iconStyle: "text-purple-600",
      title: "Gamer",
      desc: "Play an Arcade game.",
      cta: "PLAY ARCADE",
      ctaAction: () => navigate("/arcade"),
    },`;

if (!content.includes('"arcade-play"')) {
  const insertIdx = content.indexOf('const allChallenges = [') + 'const allChallenges = ['.length;
  content = content.slice(0, insertIdx) + newQuest + content.slice(insertIdx);
  fs.writeFileSync('src/pages/Challenges.tsx', content, 'utf8');
  console.log("Added arcade-play quest to Challenges.tsx");
}
