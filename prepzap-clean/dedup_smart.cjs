const fs = require('fs');

['src/pages/StudentProfile.tsx', 'src/pages/Analytics.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const name = file.includes('StudentProfile') ? 'StudentProfile' : 'Analytics';
  
  const first = content.indexOf(`export default function ${name}() {`);
  const second = content.indexOf(`export default function ${name}() {`, first + 1);
  
  if (first !== -1 && second !== -1) {
    const firstComp = content.substring(first, second);
    const secondComp = content.substring(second);
    
    // Check which one has useStudyStats
    let goodComp;
    if (firstComp.includes('useStudyStats')) {
      content = content.substring(0, first) + firstComp;
      console.log(`${file}: kept first`);
    } else {
      content = content.substring(0, first) + secondComp;
      console.log(`${file}: kept second`);
    }
    
    fs.writeFileSync(file, content, 'utf8');
  } else {
    console.log(`${file}: no duplicates`);
  }
});
