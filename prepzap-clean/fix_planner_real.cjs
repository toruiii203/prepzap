const fs = require('fs');
let content = fs.readFileSync('src/pages/StudyPlanner.tsx', 'utf8');

// Ensure SkillGoals is imported
if (!content.includes('SkillGoals')) {
    content = content.replace('import { SharedSidebar } from "@/components/SharedSidebar";', 'import { SharedSidebar } from "@/components/SharedSidebar";\nimport { SkillGoals } from "@/components/SkillGoals";');
}

// 1. Replace ProductivityCard Component Definition
const pcDefStart = `interface ProductivityCardProps {
  productivityScore: number;
}`;
const pcDefReplace = `interface ProductivityCardProps {
  productivityScore: number;
  sessions?: PlannerSession[];
}

function ProductivityCard({ productivityScore, sessions = [] }: ProductivityCardProps) {
  // Compute weekly donuts (Mon-Sun relative to today)
  const today = new Date();
  const dayOfWeek = today.getDay() || 7; // 1-7 (Mon-Sun)
  
  const currentWeekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + 1 + i);
    return d;
  });

  const donuts = currentWeekDays.map(date => {
    const daySessions = sessions.filter(s => 
      s.dayNum === date.getDate() && 
      s.month === date.getMonth() && 
      s.year === date.getFullYear()
    );
    const target = daySessions.length;
    const completed = daySessions.filter(s => s.completed).length;
    const pct = target > 0 ? (completed / target) * 100 : 0;
    const label = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    return { label, target, completed, pct, isToday: date.getDate() === today.getDate() };
  });

  return (
    <div className="border-2 border-black bg-[#F0EDE0] shadow-[3px_3px_0px_#000] p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[#F5A623] text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
        <h4 className="text-[11px] font-black uppercase tracking-widest">Productivity Score</h4>
      </div>
      
      <div className="flex items-end justify-between mb-4">
        <div className="text-[48px] font-black leading-none">{productivityScore}%</div>
      </div>
      
      <div className="flex items-center justify-between gap-1 mt-2 pt-4 border-t-2 border-black/10">
        {donuts.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="black" strokeWidth="2" strokeOpacity="0.1" />
                {d.target > 0 && (
                  <circle cx="18" cy="18" r="14" fill="none" stroke={d.pct === 100 ? "#ae2925" : "#f0a040"} strokeWidth="4" 
                    strokeDasharray="87.96" strokeDashoffset={87.96 - (87.96 * d.pct) / 100}
                    className="transition-all duration-700"
                  />
                )}
                {d.target === 0 && (
                  <circle cx="18" cy="18" r="14" fill="none" stroke="black" strokeWidth="2" strokeOpacity="0.05" />
                )}
              </svg>
              {/* Inner check if 100% */}
              {d.target > 0 && d.pct === 100 && (
                <span className="material-symbols-outlined text-[12px] absolute text-[#ae2925] font-black">check</span>
              )}
            </div>
            <span className={\`text-[9px] font-black \${d.isToday ? 'text-black' : 'text-black/40'}\`}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`;

let splitArr = content.split('interface ProductivityCardProps {\n  productivityScore: number;\n}\n\nfunction ProductivityCard({ productivityScore }: ProductivityCardProps) {\n  return (\n    <div className="border-2 border-black bg-[#F0EDE0] shadow-[3px_3px_0px_#000] p-5">\n      <div className="flex items-center gap-2 mb-2">\n        <span className="material-symbols-outlined text-[#F5A623] text-[22px]" style={{ fontVariationSettings: "\'FILL\' 1" }}>stars</span>\n        <h4 className="text-[11px] font-black uppercase tracking-widest">Productivity Score</h4>\n      </div>\n      <div className="text-[48px] font-black leading-none mb-1">{productivityScore}%</div>\n      <p className="text-[11px] font-bold text-black/50">\n        {productivityScore >= 80\n          ? "You\'re in the top 5% of Studenius users this week!"\n          : productivityScore >= 50\n          ? "Good progress \\u2014 keep completing your sessions!"\n          : "Start completing sessions to boost your score."}\n      </p>\n    </div>\n  );\n}');

// Fallback in case of subtle spacing differences
if (splitArr.length === 1) {
    // Regex replace
    content = content.replace(/interface ProductivityCardProps \{[\s\S]*?\}\s*function ProductivityCard[^}]+?\}[\s\S]*?<\/div>\s*\);\s*\}/, pcDefReplace);
} else {
    content = splitArr[0] + pcDefReplace + splitArr[1];
}

// 2. Insert SkillGoals component
const weeklyGoalsSearch = '<WeeklyGoalsPanel completedHours={completedHours} doneQuizzes={doneQuizzes} totalQuizzes={totalQuizzes} libCitations={libCitations} />';
content = content.replace(new RegExp(weeklyGoalsSearch, 'g'), weeklyGoalsSearch + '\n<SkillGoals />');

fs.writeFileSync('src/pages/StudyPlanner.tsx', content, 'utf8');
