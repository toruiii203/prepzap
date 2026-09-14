const fs = require('fs');
let content = fs.readFileSync('src/components/SkillGoals.tsx', 'utf8');

content = content.replace('Track ->', 'Track &rarr;');

fs.writeFileSync('src/components/SkillGoals.tsx', content, 'utf8');
