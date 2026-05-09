const fs = require('fs');
const file = 'src/pages/CramMode.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the hour buttons with a slider
const hoursHtml = `<div>
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Time Available: {hoursAvailable} hour{parseFloat(hoursAvailable) !== 1 ? 's' : ''}</label>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={hoursAvailable}
                onChange={(e) => setHoursAvailable(e.target.value)}
                className="w-full accent-[var(--pz-gold)]"
              />
            </div>`;

content = content.replace(/<div>\s*<label[^>]*>Time Available<\/label>\s*<div[^>]*>[\s\S]*?<\/div>\s*<\/div>/, hoursHtml);

// Add urgency toggle
const urgencyHtml = `<div className="mt-4">
              <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Urgency Level</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUrgency('normal')}
                  className="flex-1 py-2 text-sm font-semibold transition-colors"
                  style={{
                    border: \`1px solid \${urgency === 'normal' ? 'var(--pz-gold)' : 'var(--pz-border)'}\`,
                    background: urgency === 'normal' ? 'var(--pz-surface3)' : 'var(--pz-surface2)',
                    color: urgency === 'normal' ? 'var(--pz-text)' : 'var(--pz-text-muted)'
                  }}
                >
                  Normal
                </button>
                <button
                  onClick={() => setUrgency('panic')}
                  className="flex-1 py-2 text-sm font-semibold transition-colors"
                  style={{
                    border: \`1px solid \${urgency === 'panic' ? 'var(--pz-rose)' : 'var(--pz-border)'}\`,
                    background: urgency === 'panic' ? 'rgba(232,64,64,0.1)' : 'var(--pz-surface2)',
                    color: urgency === 'panic' ? 'var(--pz-rose)' : 'var(--pz-text-muted)'
                  }}
                >
                  Panic Mode 🚨
                </button>
              </div>
            </div>`;

// Add urgency state variable
content = content.replace(/const \[hoursAvailable, setHoursAvailable\] = useState\("1"\);/, `const [hoursAvailable, setHoursAvailable] = useState("1");\n  const [urgency, setUrgency] = useState("normal");`);

content = content.replace(/<ConceptChipSelector/, urgencyHtml + '\n            <ConceptChipSelector');

// Add urgency to the prompt
content = content.replace(/Total time: \$\{totalMins\} minutes\./, `Total time: \${totalMins} minutes. Urgency level: \${urgency.toUpperCase()}. \${urgency === 'panic' ? 'FOCUS ONLY ON HIGH-YIELD MUST-KNOW FACTS.' : 'Provide a balanced overview.'}`);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed CramMode');
