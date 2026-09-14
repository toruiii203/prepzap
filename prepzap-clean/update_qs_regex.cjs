const fs = require('fs');
let file = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

file = file.replace(/const \[genError, setGenError\] = useState<string \| null>\(null\);/, match => {
  return match + `\n  useEffect(() => {
    const exportedData = localStorage.getItem("qs_practice_export");
    if (exportedData) {
      try {
        const text = JSON.parse(exportedData);
        if (text) setTopic(text);
        localStorage.removeItem("qs_practice_export");
      } catch (e) {
        console.error("Failed to parse exported data", e);
      }
    }
  }, []);\n`;
});

file = file.replace(/setGenError\("Enter a topic, paste your notes, or add a file to your Source Library first."\);/, match => {
  return `alert("Cannot generate: Please enter a topic or text. (If you have a file selected, it may not have readable text).");\n        setGenError("Enter a topic, paste your notes, or add a readable file to your Source Library first.");`;
});

fs.writeFileSync('src/pages/QuickStudy.tsx', file);
console.log("Updated via Regex!");
