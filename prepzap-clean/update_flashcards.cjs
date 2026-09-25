const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');

// Replace the handleResponse with a native SM-2 handler
const handleResponseSearch = `    const handleResponse = (type: "gotIt" | "unsure" | "forgot") => {
      const nextScores = { ...scores, [type]: scores[type] + 1 };
      setScores(nextScores);
      setIsFlipped(false);
  
      setTimeout(async () => {
        // SRS: Update card scheduling in Dexie
        const currentCardData = cards[currentCardIndex];
        if (currentCardData?.dexieId) {
          const gradeMap: Record<string, Grade> = { forgot: 0, unsure: 1, gotIt: 3 };
          const grade = gradeMap[type];
          const existing = await db.cards.get(currentCardData.dexieId);
          if (existing) {
            const result = calculateSM2(grade, {
              interval: existing.interval,
              repetitions: existing.repetitions,
              easeFactor: existing.easeFactor,
            });
            await db.cards.update(currentCardData.dexieId, {
              interval: result.interval,
              repetitions: result.repetitions,
              easeFactor: result.easeFactor,
              nextReviewDate: Date.now() + result.interval * 24 * 60 * 60 * 1000,
            });
          }
        }`;

const handleResponseReplace = `    const handleResponse = (gradeName: "again" | "hard" | "good" | "easy") => {
      const isCorrect = gradeName === "good" || gradeName === "easy";
      const nextScores = { ...scores };
      if (isCorrect) nextScores.gotIt++;
      else if (gradeName === "hard") nextScores.unsure++;
      else nextScores.forgot++;

      setScores(nextScores);
      setIsFlipped(false);
  
      setTimeout(async () => {
        // True Adaptive SM-2 Update
        const currentCardData = cards[currentCardIndex];
        if (currentCardData?.dexieId) {
          const gradeMap: Record<string, Grade> = { again: 0, hard: 2, good: 4, easy: 5 };
          const grade = gradeMap[gradeName];
          const existing = await db.cards.get(currentCardData.dexieId);
          if (existing) {
            const result = calculateSM2(grade, {
              interval: existing.interval,
              repetitions: existing.repetitions,
              easeFactor: existing.easeFactor,
            });
            await db.cards.update(currentCardData.dexieId, {
              interval: result.interval,
              repetitions: result.repetitions,
              easeFactor: result.easeFactor,
              nextReviewDate: Date.now() + result.interval * 24 * 60 * 60 * 1000,
            });
          }
        }`;

content = content.replace(handleResponseSearch, handleResponseReplace);

// Now replace the buttons UI (desktop)
const desktopButtonsSearch = `<div className="grid grid-cols-4 gap-4">
                    <button
                      onClick={() => handleResponse("forgot")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-red-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[#FF4D2E] text-[28px]">sentiment_very_dissatisfied</span>
                      <span className="text-[13px] font-extrabold uppercase">Forgot</span>
                    </button>
                    <button
                      onClick={() => handleResponse("unsure")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-yellow-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[#F5A623] text-[28px]">sentiment_neutral</span>
                      <span className="text-[13px] font-extrabold uppercase">Unsure</span>
                    </button>
                    <button
                      onClick={() => handleResponse("gotIt")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-green-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-green-600 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>sentiment_very_satisfied</span>
                      <span className="text-[13px] font-extrabold uppercase">Got It</span>
                    </button>
                  </div>`;

const desktopButtonsReplace = `<div className="grid grid-cols-4 gap-4">
                    <button
                      onClick={() => handleResponse("again")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-red-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[#FF4D2E] text-[28px]">sentiment_very_dissatisfied</span>
                      <span className="text-[13px] font-extrabold uppercase text-[#FF4D2E]">Again</span>
                    </button>
                    <button
                      onClick={() => handleResponse("hard")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-orange-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[#d97706] text-[28px]">sentiment_dissatisfied</span>
                      <span className="text-[13px] font-extrabold uppercase text-[#d97706]">Hard</span>
                    </button>
                    <button
                      onClick={() => handleResponse("good")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-green-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-green-600 text-[28px]">sentiment_satisfied</span>
                      <span className="text-[13px] font-extrabold uppercase text-green-600">Good</span>
                    </button>
                    <button
                      onClick={() => handleResponse("easy")}
                      className="py-5 border-2 border-black bg-white shadow-[4px_4px_0px_#000] hover:bg-blue-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-blue-600 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>sentiment_very_satisfied</span>
                      <span className="text-[13px] font-extrabold uppercase text-blue-600">Easy</span>
                    </button>
                  </div>`;
content = content.replace(desktopButtonsSearch, desktopButtonsReplace);

// Fix handleRate keyboard mapping
const handleRateSearch = `    const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
      if (rating === "again") handleResponse("forgot");
      else if (rating === "hard") handleResponse("unsure");
      else if (rating === "good") handleResponse("gotIt");
      else if (rating === "easy") handleResponse("gotIt");
    };`;
const handleRateReplace = `    const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
      handleResponse(rating);
    };`;
content = content.replace(handleRateSearch, handleRateReplace);

// Also replace the mobile UI
const mobileButtonsSearch = `<div className="mt-auto w-full flex justify-between gap-3 pt-6 pb-2">
                  <button
                    onClick={() => handleResponse("forgot")}
                    className="flex-1 h-[76px] rounded-xl border-2 border-error bg-white text-error font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-red-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
                  >
                    <span className="material-symbols-outlined mb-1 text-[24px]">close</span>
                    Forgot
                  </button>
                  <button
                    onClick={() => handleResponse("unsure")}
                    className="flex-1 h-[76px] rounded-xl border-2 border-outline bg-white text-outline font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-neutral-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
                  >
                    <span className="material-symbols-outlined mb-1 text-[24px]">question_mark</span>
                    Unsure
                  </button>
                  <button
                    onClick={() => handleResponse("gotIt")}
                    className="flex-1 h-[76px] rounded-xl border-2 border-tertiary bg-white text-tertiary font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:bg-teal-50 hover:translate-y-0.5 active:scale-95 transition-all text-[13px]"
                  >
                    <span className="material-symbols-outlined mb-1 text-[24px]">check</span>
                    Got It
                  </button>
                </div>`;
const mobileButtonsReplace = `<div className="mt-auto w-full flex justify-between gap-2 pt-6 pb-2">
                  <button onClick={() => handleResponse("again")} className="flex-1 h-[68px] rounded-xl border-2 border-error bg-white text-error flex flex-col items-center justify-center shadow-ink-sm hover:bg-red-50 active:translate-y-0.5 transition-all text-[11px] font-black uppercase">
                    <span className="material-symbols-outlined mb-1 text-[20px]">close</span> Again
                  </button>
                  <button onClick={() => handleResponse("hard")} className="flex-1 h-[68px] rounded-xl border-2 border-[#d97706] bg-white text-[#d97706] flex flex-col items-center justify-center shadow-ink-sm hover:bg-orange-50 active:translate-y-0.5 transition-all text-[11px] font-black uppercase">
                    <span className="material-symbols-outlined mb-1 text-[20px]">fitness_center</span> Hard
                  </button>
                  <button onClick={() => handleResponse("good")} className="flex-1 h-[68px] rounded-xl border-2 border-green-600 bg-white text-green-600 flex flex-col items-center justify-center shadow-ink-sm hover:bg-green-50 active:translate-y-0.5 transition-all text-[11px] font-black uppercase">
                    <span className="material-symbols-outlined mb-1 text-[20px]">check</span> Good
                  </button>
                  <button onClick={() => handleResponse("easy")} className="flex-1 h-[68px] rounded-xl border-2 border-blue-600 bg-white text-blue-600 flex flex-col items-center justify-center shadow-ink-sm hover:bg-blue-50 active:translate-y-0.5 transition-all text-[11px] font-black uppercase">
                    <span className="material-symbols-outlined mb-1 text-[20px]">done_all</span> Easy
                  </button>
                </div>`;
content = content.replace(mobileButtonsSearch, mobileButtonsReplace);

fs.writeFileSync('src/pages/Flashcards.tsx', content, 'utf8');
