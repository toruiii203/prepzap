const fs = require('fs');
let content = fs.readFileSync('src/components/SkillGoals.tsx', 'utf8');

content = content.replace('Skill tracking starts today ?" progress builds as you keep studying.', 'Skill tracking starts today — progress builds as you keep studying.');

fs.writeFileSync('src/components/SkillGoals.tsx', content, 'utf8');
