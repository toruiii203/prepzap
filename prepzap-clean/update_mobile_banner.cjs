const fs = require('fs');
let file = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

const oldMobilePicker = `<div className="flex items-center bg-white border-2 border-black rounded-lg px-3 mb-2 shadow-[2px_2px_0px_#000]">
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Type</span>
                  <select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="flex-1 py-2 text-[12px] font-bold bg-transparent focus:outline-none appearance-none ml-2"
                    >
                      <option value="mixed">Mixed Types</option>
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="identification">Identification</option>
                      <option value="fill-in-the-blank">Fill-in-the-Blank</option>
                  </select>
                  </div>`;

const newMobilePicker = `<div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center bg-white border-2 border-black rounded-lg px-3 shadow-[2px_2px_0px_#000]">
                    <span className="material-symbols-outlined text-[14px]">tune</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Type</span>
                    <select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="flex-1 py-2 text-[12px] font-bold bg-transparent focus:outline-none appearance-none ml-2"
                    >
                      <option value="mixed">Mixed Types</option>
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="identification">Identification</option>
                      <option value="fill-in-the-blank">Fill-in-the-Blank</option>
                    </select>
                  </div>
                  <div className="flex items-center bg-white border-2 border-black rounded-lg px-3 shadow-[2px_2px_0px_#000]">
                    <span className="material-symbols-outlined text-[14px]">leaderboard</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/40 shrink-0 ml-2">Difficulty</span>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="flex-1 py-2 text-[12px] font-bold bg-transparent focus:outline-none appearance-none ml-2"
                    >
                      <option value="mixed">Mixed Difficulty</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>`;

if (file.includes('Type</span>')) {
  file = file.replace(oldMobilePicker, newMobilePicker);
  fs.writeFileSync('src/pages/Practice.tsx', file);
  console.log("Replaced Mobile Banner");
} else {
  console.log("Could not find mobile picker");
}
