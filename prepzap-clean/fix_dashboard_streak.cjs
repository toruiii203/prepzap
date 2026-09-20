const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// The streak section:
const streakOld = /\{\/\* FIX: your profiles table[\s\S]*?dead\. \*\/\}\s*<span className="text-\[64px\] font-black leading-none">\{profile\?\.streak_days \?\? profile\?\.streak \?\? 0\}<\/span>\s*<span className="text-\[24px\] font-black uppercase">Days<\/span>\s*<\/div>\s*<p className="text-\[12px\] font-bold opacity-90">\{\(\(profile\?\.streak_days \?\? profile\?\.streak\) \?\? 0\) > 0 \? `\$\{profile\?\.streak_days \?\? profile\?\.streak\} day streak — keep it going!` : "Start your first session to build your streak\."\}<\/p>/;

const streakNew = `<span className="text-[64px] font-black leading-none">{profile?.streak_days ?? 0}</span>
              <span className="text-[24px] font-black uppercase">Days</span>
            </div>
            <p className="text-[12px] font-bold opacity-90">{(profile?.streak_days ?? 0) > 0 ? \`\${profile?.streak_days} day streak — keep it going!\` : "Start your first session to build your streak."}</p>`;

content = content.replace(streakOld, streakNew);

fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
