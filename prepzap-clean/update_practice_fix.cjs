const fs = require('fs');
let file = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

// 1. DesktopBanner
let desktopSourcePicker = `<select
                value={activeSourceObj ? activeSourceObj.id : "all"}
                onChange={(e) => {
                  if (e.target.value === "all") {
                    setActiveSourceObj(null);
                  } else {
                    const source = (libraryFiles || []).find((f: any) => f.id === e.target.value);
                    setActiveSourceObj(source);
                  }
                }}
                className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <option value="all">General Study (No Source)</option>
                {(libraryFiles || []).map((file: any) => (
                  <option key={file.id} value={file.id}>{file.name}</option>
                ))}
              </select>`;

let newDesktopPickers = `<select
                value={activeSourceObj ? activeSourceObj.id : "all"}
                onChange={(e) => {
                  if (e.target.value === "all") {
                    setActiveSourceObj(null);
                  } else {
                    const source = (libraryFiles || []).find((f: any) => f.id === e.target.value);
                    setActiveSourceObj(source);
                  }
                }}
                className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <option value="all">General Study (No Source)</option>
                {(libraryFiles || []).map((file: any) => (
                  <option key={file.id} value={file.id}>{file.name}</option>
                ))}
              </select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none">
                <option value="mixed">Mixed Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select value={quizType} onChange={(e) => setQuizType(e.target.value)} className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none">
                <option value="mixed">Mixed Types</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="identification">Identification</option>
                <option value="fill-in-the-blank">Fill-in-the-Blank</option>
              </select>`;

file = file.replace(desktopSourcePicker, newDesktopPickers);

// 2. DesktopBanner Props mapping
file = file.replace(
  `quizType={quizType}\n                setQuizType={setQuizType}\n              />`,
  `quizType={quizType}\n                setQuizType={setQuizType}\n                difficulty={difficulty}\n                setDifficulty={setDifficulty}\n              />`
);

// 3. MobileBanner
let mobileTypePicker = `<select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">Mixed Types</option>
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="identification">Identification</option>
                      <option value="fill-in-the-blank">Fill-in-the-Blank</option>
                    </select>`;

let newMobilePickers = `<select
                      value={quizType}
                      onChange={(e) => setQuizType(e.target.value)}
                      className="border-2 border-black rounded-lg px-2 py-1 bg-white text-[12px] font-extrabold focus:outline-none cursor-pointer"
                    >
                      <option value="mixed">Mixed Types</option>
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

file = file.replace(mobileTypePicker, newMobilePickers);

fs.writeFileSync('src/pages/Practice.tsx', file);
console.log("Updated both pickers");
