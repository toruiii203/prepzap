const fs = require('fs');
let content = fs.readFileSync('src/pages/Flashcards.tsx', 'utf8');

const targetStr = `            if (nextScores.forgot === 0 && nextScores.unsure === 0) {`;

const replaceStr = `            const scorePct = cards.length > 0 ? Math.round((nextScores.gotIt / cards.length) * 100) : 0;
            const targetSourceId = cards[0]?.deckId || (activeSourceObj ? activeSourceObj.id : null);
            await supabase.from("study_activity").insert({
              user_id: user.id,
              tool: "flashcards",
              source_id: targetSourceId,
              score: scorePct
            });

            if (nextScores.forgot === 0 && nextScores.unsure === 0) {`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/pages/Flashcards.tsx', content, 'utf8');
