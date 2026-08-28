const fs = require('fs');
let code = fs.readFileSync('src/pages/Practice.tsx', 'utf8');

const regex = /setView\("results"\);/;
const replaceStr = `
        const mistakesLog = questions.filter((q, i) => nextAnswers[i] !== q.correct);
        if (mistakesLog.length > 0) {
          const key = user?.id ? \`studenius_mistakes_\${user.id}\` : "studenius_mistakes_anon";
          try {
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const newMistakes = mistakesLog.map(q => ({
              id: crypto.randomUUID(),
              subject: q.subject || "Practice Quiz",
              date: new Date().toISOString(),
              overdue: true, // Mark as overdue to encourage immediate review
              title: q.q.slice(0, 50) + (q.q.length > 50 ? "..." : ""),
              desc: "Logged automatically from your recent Practice Quiz.",
              tags: [q.difficulty || "medium", "quiz-mistake"],
              quiz: {
                q: q.q,
                options: q.options,
                correct: q.correct,
                explanation: "You missed this during a practice quiz. Review the concept!"
              }
            }));
            localStorage.setItem(key, JSON.stringify([...newMistakes, ...existing]));
          } catch (e) {}
        }
        setView("results");`;

code = code.replace(regex, replaceStr);
fs.writeFileSync('src/pages/Practice.tsx', code);
