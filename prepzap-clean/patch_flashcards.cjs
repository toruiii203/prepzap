const fs = require('fs');
let code = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');

const effectCode = `  useEffect(() => {
    remaining("flashcard_gen").then(setRemainingUses);
  }, [remaining]);

  // Handle export from Quick Study
  useEffect(() => {
    const exportedData = localStorage.getItem("qs_flashcards_export");
    if (exportedData) {
      try {
        const deck = JSON.parse(exportedData);
        setTopic(deck.title);
        setCards(deck.cards);
        setView("study");
        localStorage.removeItem("qs_flashcards_export");
      } catch (err) {
        console.error("Failed to parse QS flashcards", err);
      }
    }
  }, []);`;

code = code.replace(
  '  useEffect(() => {\n    remaining("flashcard_gen").then(setRemainingUses);\n  }, [remaining]);',
  effectCode
);

fs.writeFileSync('src/pages/Flashcards.tsx', code);
