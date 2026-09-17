const fs = require('fs');
let content = fs.readFileSync('src/pages/OnboardingFlow.tsx', 'utf8');

const targetStr = `<span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: \`1.5px solid \${BLACK}\`, marginBottom: 14 }}>Beta Tester Access</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { icon: "rocket_launch", quote: "You're one of the first to try Studenius. We're actively building new features based on your feedback.", title: "Early Access" },
                      { icon: "bug_report", quote: "Help us shape the platform. Found an issue? Let us know so we can fix it instantly.", title: "Shape the Future" },
                    ]`;

const replaceStr = `<span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: \`1.5px solid \${BLACK}\`, marginBottom: 14 }}>Your Ultimate Study Toolkit</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { icon: "psychology", quote: "Stuck on a concept? Rex explains complex topics instantly so you never fall behind.", title: "Smart Tutor" },
                      { icon: "edit_note", quote: "Turn messy notes into structured, high-retention flashcards with spaced repetition.", title: "AI Flashcards" },
                    ]`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/pages/OnboardingFlow.tsx', content, 'utf8');
