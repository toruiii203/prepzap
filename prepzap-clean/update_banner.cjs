const fs = require('fs');
let file = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

const oldSourcePicker = `<select
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

const newPickers = `<div className="flex gap-2"><select
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
              
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <option value="mixed">Mixed Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              
              <select
                value={quizType}
                onChange={(e) => setQuizType(e.target.value)}
                className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <option value="mixed">Mixed Types</option>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="identification">Identification</option>
                <option value="fill-in-the-blank">Fill in the Blank</option>
              </select>
              
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                className="border-[1.5px] border-black px-3 py-1.5 bg-[#F0EDE0] text-[12px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                {QUESTION_COUNT_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt} Questions</option>
                ))}
              </select></div>`;

file = file.replace(oldSourcePicker, newPickers);

// Find the <DesktopBanner> usage in the main component and make sure the props are passed:
// It looks like difficulty and setDifficulty are missing in the usage!
const oldBannerUsage = `<DesktopBanner
                isGenerating={isGenerating}
                topicInput={topicInput}
                setTopicInput={setTopicInput}
                onGenerate={handleGenerateQuiz}
                onNavigate={navigate}
                libraryFiles={libraryFiles}
                questionCount={questionCount}
                setQuestionCount={setQuestionCount}
                activeSourceObj={activeSourceObj}
                setActiveSourceObj={setActiveSourceObj}
                quizType={quizType}
                setQuizType={setQuizType}
              />`;

const newBannerUsage = `<DesktopBanner
                isGenerating={isGenerating}
                topicInput={topicInput}
                setTopicInput={setTopicInput}
                onGenerate={handleGenerateQuiz}
                onNavigate={navigate}
                libraryFiles={libraryFiles}
                questionCount={questionCount}
                setQuestionCount={setQuestionCount}
                activeSourceObj={activeSourceObj}
                setActiveSourceObj={setActiveSourceObj}
                quizType={quizType}
                setQuizType={setQuizType}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
              />`;
file = file.replace(oldBannerUsage, newBannerUsage);

fs.writeFileSync('src/pages/Practice.tsx', file);
console.log("Updated DesktopBanner pickers in Practice.tsx");
