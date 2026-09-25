const fs = require('fs');
let content = fs.readFileSync('src/pages/arcade/WhackAMole.tsx', 'utf8');

const target = `    // Simple staggered show logic
    const timeouts: NodeJS.Timeout[] = [];
    answers.forEach((_, i) => {
      const delay = 500 + Math.random() * 2000; // pop up between 0.5s and 2.5s
      const t = setTimeout(() => {
        setMoles(prev => prev.map((m, idx) => idx === i ? { ...m, visible: true } : m));
      }, delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);`;

const replacement = `    // Simple staggered show logic
    const timeouts: NodeJS.Timeout[] = [];
    answers.forEach((ans, i) => {
      const delay = 500 + Math.random() * 1500; // pop up
      
      const tShow = setTimeout(() => {
        setMoles(prev => prev.map((m, idx) => idx === i ? { ...m, visible: true } : m));
        
        // Disappear after 2-3 seconds
        const tHide = setTimeout(() => {
          setMoles(prev => {
            const isStillVisible = prev[i].visible;
            if (isStillVisible) {
              if (ans.isCorrect) {
                // If correct mole hides without being whacked, it's a miss and we move to next question
                setMisses(m => m + 1);
                setTimeout(() => {
                  setCurrentIndex(curr => curr + 1);
                }, 500);
              }
              return prev.map((m, idx) => idx === i ? { ...m, visible: false } : m);
            }
            return prev;
          });
        }, 2000 + Math.random() * 1000);
        timeouts.push(tHide);
      }, delay);
      timeouts.push(tShow);
    });

    return () => timeouts.forEach(clearTimeout);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/arcade/WhackAMole.tsx', content, 'utf8');
