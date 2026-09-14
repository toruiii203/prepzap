const fs = require('fs');
let file = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const hookStr = `
  useEffect(() => {
    remaining("quick_study").then(setRemainingUses).catch((err) => {
      console.error("[QuickStudy] failed to load remaining uses:", err);
    });
  }, [remaining]);`;

const newHookStr = `
  useEffect(() => {
    remaining("quick_study").then(setRemainingUses).catch((err) => {
      console.error("[QuickStudy] failed to load remaining uses:", err);
    });
  }, [remaining]);

  // Read AI Bubble export from notes
  useEffect(() => {
    const exportedData = localStorage.getItem("qs_practice_export");
    if (exportedData) {
      try {
        const text = JSON.parse(exportedData);
        if (text) {
          setTopic(text);
        }
        // Clear it so it doesn't keep populating
        localStorage.removeItem("qs_practice_export");
      } catch (e) {
        console.error("Failed to parse exported data", e);
      }
    }
  }, []);
`;

file = file.replace(hookStr, newHookStr);
fs.writeFileSync('src/pages/QuickStudy.tsx', file);
console.log("Wired up QuickStudy to read exported text");
