const fs = require('fs');
let file = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

// Find the <select value={quizType} ... </select> blocks and insert the difficulty block right after them.
const diffBlock = `
          <span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"
          >
            <option value="mixed">Mixed</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>`;

file = file.replace(/<option value="fill-in-the-blank">Fill-in-the-Blank<\/option>\s*<\/select>/g, match => {
  return match + diffBlock;
});

fs.writeFileSync('src/pages/Practice.tsx', file);
