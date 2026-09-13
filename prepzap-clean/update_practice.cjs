const fs = require('fs');
let content = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

// 1. Add difficulty to BannerProps
content = content.replace(
  'quizType: string;\n  setQuizType: (v: string) => void;',
  'quizType: string;\n  setQuizType: (v: string) => void;\n  difficulty: string;\n  setDifficulty: (v: string) => void;'
);

// 2. Add difficulty to DesktopBanner function signature
content = content.replace(
  'quizType, setQuizType }: BannerProps)',
  'quizType, setQuizType, difficulty, setDifficulty }: BannerProps)'
);

// 3. Add difficulty dropdown to DesktopBanner
content = content.replace(
  '<option value="fill-in-the-blank">Fill-in-the-Blank</option>\n        </select>',
  '<option value="fill-in-the-blank">Fill-in-the-Blank</option>\n        </select>\n        <span className="text-[11px] font-black uppercase tracking-widest text-black/40 ml-4">Difficulty</span>\n        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="border-[1.5px] border-black rounded-lg px-3 py-1.5 bg-white text-[13px] font-extrabold focus:outline-none cursor-pointer"><option value="mixed">Mixed</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>'
);

// 4. Add difficulty state to Practice()
content = content.replace(
  'const [quizType, setQuizType]             = useState<string>("mixed");',
  'const [quizType, setQuizType]             = useState<string>("mixed");\n  const [difficulty, setDifficulty] = useState<string>("mixed");'
);

// 5. Pass difficulty to DesktopBanner in Practice()
content = content.replace(
  'setQuizType={setQuizType}\n            />',
  'setQuizType={setQuizType}\n              difficulty={difficulty}\n              setDifficulty={setDifficulty}\n            />'
);

// 6. Add difficulty dropdown to mobile banner
content = content.replace(
  '<option value="fill-in-the-blank">Fill-in-the-Blank</option>\n                  </select>\n                </div>\n              </section>',
  '<option value="fill-in-the-blank">Fill-in-the-Blank</option>\n                  </select>\n                </div>\n                <div className="flex flex-col gap-1">\n                  <label className="text-[10px] font-black uppercase text-black/40">Difficulty</label>\n                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full border-2 border-black rounded-lg p-2.5 bg-white text-[13px] font-bold outline-none cursor-pointer">\n                    <option value="mixed">Mixed</option>\n                    <option value="Easy">Easy</option>\n                    <option value="Medium">Medium</option>\n                    <option value="Hard">Hard</option>\n                  </select>\n                </div>\n              </section>'
);

// 7. Update handleGenerateQuiz prompt to use difficulty
content = content.replace(
  'const typeInstruct = quizType === "mixed" \n        ? \'any combination of "multiple-choice", "identification", and "fill-in-the-blank" questions\'\n        : `only "${quizType}" questions`;',
  'const typeInstruct = quizType === "mixed" \n        ? \'any combination of "multiple-choice", "identification", and "fill-in-the-blank" questions\'\n        : `only "${quizType}" questions`;\n      const diffInstruct = difficulty === "mixed" ? "mixed difficulty levels" : `difficulty level: ${difficulty}`;'
);

content = content.replace(
  'Generate a set of ${questionCount || 3} interesting, high-quality quiz questions (${typeInstruct}) based on',
  'Generate a set of ${questionCount || 3} interesting, high-quality quiz questions (${typeInstruct}, ${diffInstruct}) based on'
);

content = content.replace(
  'educational quiz questions (${typeInstruct}) about:',
  'educational quiz questions (${typeInstruct}, ${diffInstruct}) about:'
);

content = content.replace(
  'educational quiz questions (${typeInstruct}) across',
  'educational quiz questions (${typeInstruct}, ${diffInstruct}) across'
);

content = content.replace(
  'For this request, you must generate ${typeInstruct}.',
  'For this request, you must generate ${typeInstruct} with ${diffInstruct}.'
);

// 8. Fix validation logic checking
content = content.replace(
  'isCorrect = validateText(textInput, question.answerText || "");',
  'isCorrect = validateText(textInput, question.answerText || (question as any).answer || "");'
);
content = content.replace(
  'isCorrect = validateText(textAnswers[actualQIndex] || "", question.answerText || "");',
  'isCorrect = validateText(textAnswers[actualQIndex] || "", question.answerText || (question as any).answer || "");'
);

// 9. Add summary logic to results view
const resultsReplace = `</div>
            <div className="flex gap-3 w-full">`;
const resultsReplacement = `</div>
            <div className="w-full mb-8 flex flex-col gap-3 text-left">
              <h3 className="font-extrabold text-[16px] mb-2 border-b-2 border-black pb-2">Question Breakdown</h3>
              {questions.map((q, i) => {
                const isMulti = q.type === 'multiple-choice' || !q.type;
                const expected = isMulti ? (q.options ? q.options[q.correct || 0] : '') : (q.answerText || (q as any).answer || '');
                const userA = isMulti ? (q.options ? q.options[answers[i]] || 'No answer' : 'No answer') : (textAnswers[i] || 'No answer');
                const isC = isMulti ? answers[i] === q.correct : validateText(textAnswers[i] || '', expected);
                return (
                  <div key={i} className={\`p-4 border-2 border-black rounded-xl \${isC ? "bg-[#dcfce7]" : "bg-[#ffdad6]"}\`}>
                    <p className="font-bold text-[14px] mb-2">{i + 1}. {q.q}</p>
                    <div className="flex flex-col gap-1 text-[13px]">
                      <p><span className="font-extrabold opacity-60">Your Answer:</span> <span className="font-bold">{userA}</span></p>
                      {!isC && <p><span className="font-extrabold opacity-60">Correct Answer:</span> <span className="font-bold text-[#16a34a]">{expected}</span></p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 w-full">`;
            
content = content.replace(resultsReplace, resultsReplacement);

fs.writeFileSync('src/pages/Practice.tsx', content);
console.log("Done");
