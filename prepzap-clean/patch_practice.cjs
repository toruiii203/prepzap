const fs = require('fs');
let code = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

const anchor = 'const [reviewEntry, setReviewEntry] = useState<HistoryEntry | null>(null);';
const patch = `
  // Handle export from Quick Study
  useEffect(() => {
    const exportedData = localStorage.getItem("qs_practice_export");
    if (exportedData) {
      try {
        const material = JSON.parse(exportedData);
        setTopicInput(material);
        setQuestionCount(5);
        localStorage.removeItem("qs_practice_export");
      } catch (err) {
        console.error("Failed to parse QS practice export", err);
      }
    }
  }, []);
`;

code = code.replace(anchor, anchor + "\n" + patch);
fs.writeFileSync('src/pages/Practice.tsx', code);
