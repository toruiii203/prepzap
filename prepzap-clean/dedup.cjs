const fs = require('fs');
['src/pages/StudentProfile.tsx', 'src/pages/Analytics.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const name = file.includes('StudentProfile') ? 'StudentProfile' : 'Analytics';
  
  const first = content.indexOf(`export default function ${name}() {`);
  const second = content.indexOf(`export default function ${name}() {`, first + 1);
  
  if (first !== -1 && second !== -1) {
    console.log(`Deduplicating ${file}`);
    content = content.substring(0, first) + content.substring(second);
    fs.writeFileSync(file, content, 'utf8');
  }
});
