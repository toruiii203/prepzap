const fs = require('fs');
let code = fs.readFileSync('src/pages/Challenges.tsx', 'utf8');

// Replace streakDays hardcoded array with dynamic generator
code = code.replace(
  /const streakDays = \[\s*\{ day: "M", completed: true \},[\s\S]*?\{ day: "S", completed: false \},\s*\];/,
  `// Dynamic streak days (last 7 days ending today)
  const streakDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    
    // Manually format to 'YYYY-MM-DD' in Asia/Manila 
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
    
    const count = weeklyActivity[dateStr] || 0;
    const isToday = i === 6;
    
    return {
      day: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      completed: count >= 2,
      activeToday: isToday && count < 2
    };
  });`
);

// Replace StaticCard with QuestCard
const newCardCode = `
  const QuestCard = ({ ch }: { ch: any }) => {
    const isCompleted = completedQuestIds.has(ch.id);
    
    return (
      <div className="group bg-[#FAF7F2] border-2 border-black flex flex-col h-[200px]" style={{ boxShadow: "5px 5px 0px #000" }}>
        <div className={\`px-4 py-3 border-b-2 border-black flex justify-between items-center \${isCompleted ? 'bg-black' : ''}\`}>
          <span className={\`text-[12px] font-black px-2 py-1 uppercase \${isCompleted ? 'bg-white text-black' : ch.tagStyle}\`}>
            {isCompleted ? '? DONE' : ch.tag}
          </span>
          <span className={\`material-symbols-outlined \${isCompleted ? 'text-[#F5A623]' : ch.iconStyle}\`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {ch.icon}
          </span>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-center">
          <p className="font-black text-[18px] mb-2">{ch.title}</p>
          <p className="text-[14px] text-black/60 font-bold mb-4 leading-relaxed">{ch.desc}</p>
        </div>
        <button
          disabled={isCompleted}
          onClick={ch.isShare ? () => setShareModalOpen(true) : ch.ctaAction}
          className={\`w-full py-4 border-t-2 border-black text-[14px] font-black transition-colors \${isCompleted ? 'bg-[#ebe8e3] text-black/50 cursor-not-allowed' : 'bg-white hover:bg-black hover:text-white cursor-pointer'}\`}>
          {isCompleted ? "COMPLETED" : ch.cta}
        </button>
      </div>
    );
  };
`;

code = code.replace(
  /const StaticCard = \(\{ ch \}: \{ ch: any \}\) => \([\s\S]*?\n  \);\n/m,
  newCardCode
);

// Replace LockedCard to handle unlocks
const newLockedCard = `
  const LockedCard = ({ title, hint, index }: { title: string; hint: string, index: number }) => {
    const threshold = index === 0 ? 2 : 4;
    const progress = completedQuestIds.size;
    const isUnlocked = progress >= threshold;
    
    if (isUnlocked) {
      return (
        <div className="group bg-white border-2 border-black flex flex-col h-[200px]" style={{ boxShadow: "5px 5px 0px #000" }}>
          <div className="px-4 py-3 border-b-2 border-black flex justify-between items-center bg-black">
            <span className="text-[12px] font-black px-2 py-1 uppercase bg-[#F5A623] text-black">Mystery Unlocked</span>
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center">
            <p className="font-black text-[18px] mb-2">{title}</p>
            <p className="text-[14px] text-black/60 font-bold mb-4 leading-relaxed">You successfully unlocked this reward by completing quests!</p>
          </div>
          <button
            className="w-full py-4 border-t-2 border-black text-[14px] font-black transition-colors bg-[#F5A623] hover:bg-black hover:text-[#F5A623] cursor-pointer">
            CLAIM REWARD
          </button>
        </div>
      );
    }
    
    return (
      <div className="relative bg-[#f3f3f3] border-2 border-black opacity-60 select-none overflow-hidden h-[200px] flex items-center justify-center shadow-[3px_3px_0px_#000]">
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2">
          <div className="bg-black text-white p-3 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <span className="text-black font-black bg-white px-2 py-1 text-[11px] border-2 border-black">
            Unlocks at {threshold} quests
          </span>
        </div>
        <div className="blur-sm p-4 w-full h-full flex flex-col justify-center">
          <p className="font-black text-[16px]">{title}</p>
          <p className="text-[13px] text-black/60">{hint}</p>
        </div>
      </div>
    );
  };
`;

code = code.replace(
  /function LockedCard\(\{ title, hint \}: \{ title: string; hint: string \}\) \{[\s\S]*?\n  \}\n/m,
  newLockedCard
);

// Inject progress indicator text and swap StaticCard to QuestCard
code = code.replace(
  /<div className="grid grid-cols-3 gap-6">\s*\{dailyChallenges.map\(\(ch\) => <StaticCard key=\{ch.id\} ch=\{ch\} \/>\)\}\s*<LockedCard title="The Archivist" hint="Unlocked after 14-day streak. Keep pushing to reveal." \/>\s*<LockedCard title="Grandmaster" hint="Complete all monthly challenges to unlock the vault." \/>\s*<\/div>/,
  `
    <div className="flex items-center gap-2 mb-6">
      <span className="font-black text-[14px] uppercase">Today's Progress: {completedQuestIds.size}/5 completed</span>
      <div className="flex gap-1 ml-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={\`w-3 h-3 rounded-full border-2 border-black \${i < completedQuestIds.size ? 'bg-black' : 'bg-transparent'}\`} />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-6">
      {dailyChallenges.map((ch) => <QuestCard key={ch.id} ch={ch} />)}
      <LockedCard title="The Archivist" hint="Mystery Card" index={0} />
      <LockedCard title="Grandmaster" hint="Mystery Card" index={1} />
    </div>
  `
);

// Mobile updates
code = code.replace(
  /\{dailyChallenges.map\(\(ch\) => \([\s\S]*?<\/button>\s*<\/div>\s*\)\)\}/,
  `{dailyChallenges.map((ch) => <QuestCard key={ch.id} ch={ch} />)}`
);

code = code.replace(
  /\{\[\s*\{ title: "The Archivist", hint: "Unlocked after 14-day streak." \},[\s\S]*?<\/div>\s*\)\)\}/,
  `<LockedCard title="The Archivist" hint="Mystery Card" index={0} />\n            <LockedCard title="Grandmaster" hint="Mystery Card" index={1} />`
);


fs.writeFileSync('src/pages/Challenges.tsx', code);
