const fs = require('fs');

// 1. App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
const imports = `import AnagramSprint from "./pages/arcade/AnagramSprint";
import WhackAMole from "./pages/arcade/WhackAMole";
import OddOneOut from "./pages/arcade/OddOneOut";\n`;
if (!appContent.includes('AnagramSprint')) {
  appContent = appContent.replace('import Termle from "./pages/arcade/Termle";', 'import Termle from "./pages/arcade/Termle";\n' + imports);
  const routes = `          <Route path="/arcade/anagram-sprint" element={<AnagramSprint />} />
          <Route path="/arcade/whack-a-mole" element={<WhackAMole />} />
          <Route path="/arcade/odd-one-out" element={<OddOneOut />} />\n`;
  appContent = appContent.replace('<Route path="/arcade/termle" element={<Termle />} />', '<Route path="/arcade/termle" element={<Termle />} />\n' + routes);
  fs.writeFileSync('src/App.tsx', appContent, 'utf8');
}

// 2. Arcade.tsx
let arcadeContent = fs.readFileSync('src/pages/Arcade.tsx', 'utf8');
if (!arcadeContent.includes('anagram-sprint')) {
  const gamesReplace = `{ id: "termle", title: "Termle", icon: "spellcheck", desc: "Wordle-style vocabulary game", color: "bg-[#EC4899]" },
    { id: "anagram-sprint", title: "Anagram Sprint", icon: "sprint", desc: "Unscramble the letters against the clock", color: "bg-[#FF4D2E]" },
    { id: "whack-a-mole", title: "Whack-a-Mole", icon: "pest_control", desc: "Whack the correct answer", color: "bg-[#10B981]" },
    { id: "odd-one-out", title: "Odd One Out", icon: "pageview", desc: "Find the item that doesn't belong", color: "bg-[#EAB308]" }`;
  arcadeContent = arcadeContent.replace('{ id: "termle", title: "Termle", icon: "spellcheck", desc: "Wordle-style vocabulary game", color: "bg-[#EC4899]" }', gamesReplace);
  fs.writeFileSync('src/pages/Arcade.tsx', arcadeContent, 'utf8');
}
