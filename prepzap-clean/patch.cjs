const fs = require('fs');

let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf-8');

// 1. Add state for totalDue and isReviewMode
const stateInsert = `
  const [totalDue, setTotalDue] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    if (view === 'setup') {
      setTotalDue(getSRDueCount());
    }
  }, [view]);

  const handleStartReview = async () => {
    const dueSRCards = loadSRData().filter(c => new Date(c.nextReview) <= new Date());
    if (dueSRCards.length === 0) return;
    
    // load actual card contents from dexie
    const loadedCards = [];
    for (const src of dueSRCards) {
      const dbCard = await db.cards.get(src.cardId);
      if (dbCard) {
        loadedCards.push({ front: dbCard.front, back: dbCard.back, explanation: dbCard.explanation || '', deckId: dbCard.deckId, dexieId: dbCard.id });
      }
    }
    
    if (loadedCards.length > 0) {
      setCards(loadedCards);
      setCurrentCardIndex(0);
      setScores({ gotIt: 0, unsure: 0, forgot: 0 });
      setIsFlipped(false);
      setIsReviewMode(true);
      setView('study');
    } else {
      alert("No valid cards found for review.");
    }
  };
`;

content = content.replace('const [libraryFiles, setLibraryFiles] = useState<any[]>([]);', 'const [libraryFiles, setLibraryFiles] = useState<any[]>([]);\n' + stateInsert);


// 2. Desktop Setup View - Due for review button
const desktopSetupTarget = `{/* Setup view */}
            {view === "setup" && !isLoading && (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="max-w-md w-full text-center flex flex-col items-center gap-6">`;

const desktopSetupInsert = `{/* Setup view */}
            {view === "setup" && !isLoading && (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
                  {totalDue > 0 && (
                    <button onClick={handleStartReview} className="w-full py-4 bg-[#FF4D2E] text-white border-2 border-black font-extrabold text-[16px] shadow-[4px_4px_0px_#000] hover:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 mb-4">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                      Review ({totalDue} due)
                    </button>
                  )}`;

content = content.replace(desktopSetupTarget, desktopSetupInsert);

// 3. Mobile Setup View - Due for review button
const mobileSetupTarget = `{/* Hero Graphic / Design Banner */}`;
const mobileSetupInsert = `{totalDue > 0 && (
                <button onClick={handleStartReview} className="w-full rounded-[12px] border-2 border-[#1A1A1A] bg-[#FF4D2E] text-white font-headline text-headline-md h-16 shadow-[3px_3px_0px_#000] hover:translate-y-0.5 active:scale-95 duration-100 active:shadow-none transition-all flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined">schedule</span>
                  Review ({totalDue} due)
                </button>
              )}
              {/* Hero Graphic / Design Banner */}`;

content = content.replace(mobileSetupTarget, mobileSetupInsert);

// 4. handleRate to call SR
const handleRateTarget = `const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
    if (rating === "again") handleResponse("forgot");
    else if (rating === "hard") handleResponse("unsure");
    else if (rating === "good") handleResponse("gotIt");
    else if (rating === "easy") handleResponse("gotIt");
  };`;

const handleRateInsert = `const handleRate = (rating: "again" | "hard" | "good" | "easy") => {
    const currentCardData = cards[currentCardIndex];
    if (currentCardData?.dexieId && currentCardData?.deckId) {
      const srCard = getOrCreateSRCard(currentCardData.dexieId, currentCardData.deckId);
      reviewCard(srCard, rating);
    }
    
    if (rating === "again") handleResponse("forgot");
    else if (rating === "hard") handleResponse("unsure");
    else if (rating === "good") handleResponse("gotIt");
    else if (rating === "easy") handleResponse("gotIt");
  };`;

content = content.replace(handleRateTarget, handleRateInsert);

// 5. Desktop Study View - Rating buttons
const desktopStudyButtonsOld = `<div className="grid grid-cols-4 gap-4">
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

const desktopStudyButtonsInsert = `<div className="grid grid-cols-4 gap-4">
                  <button
                    onClick={() => handleRate("again")}
                    className="py-5 border-2 border-black bg-[#FF4D2E] text-white shadow-[4px_4px_0px_#000] hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                  >
                    <span className="text-[13px] font-extrabold uppercase">Again</span>
                  </button>
                  <button
                    onClick={() => handleRate("hard")}
                    className="py-5 border-2 border-black bg-[#F5A623] text-white shadow-[4px_4px_0px_#000] hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                  >
                    <span className="text-[13px] font-extrabold uppercase">Hard</span>
                  </button>
                  <button
                    onClick={() => handleRate("good")}
                    className="py-6 border-2 border-black bg-green-600 text-white shadow-[4px_4px_0px_#000] hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2 col-span-1 transform scale-105"
                  >
                    <span className="text-[15px] font-extrabold uppercase">Good</span>
                  </button>
                  <button
                    onClick={() => handleRate("easy")}
                    className="py-5 border-2 border-black bg-blue-500 text-white shadow-[4px_4px_0px_#000] hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex flex-col items-center gap-2"
                  >
                    <span className="text-[13px] font-extrabold uppercase">Easy</span>
                  </button>
                </div>`;

content = content.replace(desktopStudyButtonsOld, desktopStudyButtonsInsert);


// 6. Mobile Study View - Action Buttons
const mobileStudyButtonsOld = `<div className="mt-auto w-full flex justify-between gap-3 pt-6 pb-2">
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

const mobileStudyButtonsInsert = `<div className="mt-auto w-full grid grid-cols-4 gap-2 pt-6 pb-2">
                <button
                  onClick={() => handleRate("again")}
                  className="flex-1 h-[68px] rounded-xl border-2 border-black bg-[#FF4D2E] text-white font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:translate-y-0.5 active:scale-95 transition-all text-[12px] font-bold"
                >
                  Again
                </button>
                <button
                  onClick={() => handleRate("hard")}
                  className="flex-1 h-[68px] rounded-xl border-2 border-black bg-[#F5A623] text-white font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:translate-y-0.5 active:scale-95 transition-all text-[12px] font-bold"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleRate("good")}
                  className="flex-1 h-[76px] rounded-xl border-2 border-black bg-green-600 text-white font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:translate-y-0.5 active:scale-95 transition-all text-[14px] font-extrabold transform -translate-y-1"
                >
                  Good
                </button>
                <button
                  onClick={() => handleRate("easy")}
                  className="flex-1 h-[68px] rounded-xl border-2 border-black bg-blue-500 text-white font-label-md text-label-md flex flex-col items-center justify-center shadow-ink-sm hover:translate-y-0.5 active:scale-95 transition-all text-[12px] font-bold"
                >
                  Easy
                </button>
              </div>`;
              
content = content.replace(mobileStudyButtonsOld, mobileStudyButtonsInsert);


// 7. Results view - Review completion screen
const resultsViewTarget = `<h2 className="font-headline text-headline-xl text-ink font-extrabold mb-2 text-[24px]">Deck Completed!</h2>`;
const resultsViewInsert = `<h2 className="font-headline text-headline-xl text-ink font-extrabold mb-2 text-[24px]">{isReviewMode ? "All caught up! 🎉" : "Deck Completed!"}</h2>`;
content = content.replace(resultsViewTarget, resultsViewInsert);

const desktopResultsViewTarget = `<h2 className="text-[32px] font-black mb-2">Deck Completed!</h2>`;
const desktopResultsViewInsert = `<h2 className="text-[32px] font-black mb-2">{isReviewMode ? "All caught up! 🎉" : "Deck Completed!"}</h2>`;
content = content.replace(desktopResultsViewTarget, desktopResultsViewInsert);

content = content.replace(/setView\("setup"\)/g, `(() => { setView("setup"); setIsReviewMode(false); })()`);

fs.writeFileSync('src/pages/Flashcards.tsx', content);
console.log('Patched');
