const fs = require('fs');
let content = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

content = content.replace(
    'Join the Beta today and be among the first to dominate your exams with Studenius.',
    'Join today and start dominating your exams with Studenius.'
);

fs.writeFileSync('src/pages/Landing.tsx', content, 'utf8');
