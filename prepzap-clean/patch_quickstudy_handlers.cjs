const fs = require('fs');
let code = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const handlers = `
  const handleExportFlashcards = () => {
    if (!generatedSheet) return;
    const deck = {
      title: generatedSheet.title,
      cards: generatedSheet.points.map(p => ({
        id: crypto.randomUUID(),
        front: p.question || p.label,
        back: p.value,
        interval: 0, repetition: 0, efactor: 2.5, dueDate: new Date().toISOString()
      }))
    };
    localStorage.setItem("qs_flashcards_export", JSON.stringify(deck));
    navigate("/flashcards");
  };

  const handleTestRecall = () => {
    if (!generatedSheet) return;
    const material = generatedSheet.title + "\\n\\n" + generatedSheet.points.map(p => p.label + " " + p.value).join("\\n\\n");
    localStorage.setItem("qs_practice_export", JSON.stringify(material));
    navigate("/practice");
  };

  const handleCopySheet = async () => {`;

code = code.replace("  const handleCopySheet = async () => {", handlers);

// Replace the coverage score circle and add the buttons.
const oldButtons = `<div className="flex flex-col items-center justify-center p-4 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_#000]">
              <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-[#FAF7F2] border-4 border-[#E8534A] text-[18px] font-extrabold text-black mb-1">
                {generatedSheet.coverageScore}%
              </div>
              <span className="text-[10px] font-extrabold tracking-wider text-black/60 uppercase text-center">
                Coverage<br/>Score
              </span>
            </div>
          </div>
        </div>
      );
    };`;

const newButtons = `<div className="flex flex-col items-center justify-center p-4 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_#000] gap-3">
              <button onClick={handleExportFlashcards} className="w-full text-[12.5px] font-bold border-2 border-black bg-[#FAF7F2] text-black rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-black hover:text-[#FAF7F2] transition-colors shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none">
                <span className="material-symbols-outlined text-[16px]">style</span>
                Save to Flashcards
              </button>
              <button onClick={handleTestRecall} className="w-full text-[12.5px] font-bold border-2 border-black bg-[#E8534A] text-white rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-[2px_2px_0px_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none">
                <span className="material-symbols-outlined text-[16px]">quiz</span>
                Test My Recall
              </button>
            </div>
          </div>
        </div>
      );
    };`;

code = code.replace(oldButtons, newButtons);
fs.writeFileSync('src/pages/QuickStudy.tsx', code);
