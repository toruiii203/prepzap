const fs = require('fs');

let content = fs.readFileSync('src/pages/AITutor.tsx', 'utf8');

const effectToStrip = `  // Lock body scroll so the mobile chat interface doesn't bounce/scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, []);`;

content = content.replace(effectToStrip, "");
fs.writeFileSync('src/pages/AITutor.tsx', content, 'utf8');
