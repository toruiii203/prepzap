const fs = require('fs');
let file = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

const desktopSelect = `<span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Type</span>
          <select
            value={quizType}
            onChange={(e) => setQuizType(e.target.value)}
            className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"
          >
            <option value="mixed">Mixed</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="identification">Identification</option>
            <option value="fill-in-the-blank">Fill-in-the-Blank</option>
          </select>`;

const newDesktopSelect = `<span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Type</span>
          <select
            value={quizType}
            onChange={(e) => setQuizType(e.target.value)}
            className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"
          >
            <option value="mixed">Mixed</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="identification">Identification</option>
            <option value="fill-in-the-blank">Fill-in-the-Blank</option>
          </select>
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

const mobileSelect = `<span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Type</span>
                    <select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="identification">Identification</option>
                      <option value="fill-in-the-blank">Fill-in-the-Blank</option>
                    </select>`;

const newMobileSelect = `<span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Type</span>
                    <select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="identification">Identification</option>
                      <option value="fill-in-the-blank">Fill-in-the-Blank</option>
                    </select>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Diff</span>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">Mixed</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>`;

file = file.replace(desktopSelect, newDesktopSelect);
file = file.replace(mobileSelect, newMobileSelect);

// DesktopBanner Props mapping
file = file.replace(
  `quizType={quizType}\n                setQuizType={setQuizType}\n              />`,
  `quizType={quizType}\n                setQuizType={setQuizType}\n                difficulty={difficulty}\n                setDifficulty={setDifficulty}\n              />`
);

fs.writeFileSync('src/pages/Practice.tsx', file);
console.log("Updated both pickers via exact string match");
