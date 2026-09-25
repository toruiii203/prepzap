const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf8');

const regex = /const \[sourceCount, setSourceCount\] = useState\(0\); SharedSidebar \} from "@\/components\/SharedSidebar";[\s\S]*?import \{ useStudyStats \} from "@\/hooks\/useStudyStats";/m;
content = content.replace(regex, 'const [sourceCount, setSourceCount] = useState(0);');

fs.writeFileSync('src/pages/StudentProfile.tsx', content, 'utf8');
