const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/CramMode.tsx', 'utf8');

// Replace CramMode subject textarea with structured form
const newCramInput = `
          <div style={{ background: SURF, padding: 24, borderRadius: 16, border: \`0.5px solid \${BORDER}\`, marginBottom: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Subject / Topic</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Molecular Biology, WWII History, React Hooks..."
                  style={{ width: "100%", padding: "14px 16px", background: "rgba(0,0,0,0.2)", border: \`0.5px solid \${BORDER}\`, color: TEXT, borderRadius: 8, fontSize: 16, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.currentTarget.style.borderColor = TEAL}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER}
                />
              </div>

              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Time Available: {timeHours} hour{timeHours > 1 ? "s" : ""}</label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={timeHours}
                    onChange={e => setTimeHours(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: TEAL }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4 }}>
                    <span>1 hr</span><span>8 hrs</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: panicMode ? "#ef4444" : TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Urgency</label>
                  <button
                    onClick={() => setPanicMode(!panicMode)}
                    style={{ padding: "10px 16px", background: panicMode ? "rgba(239, 68, 68, 0.1)" : "rgba(0,0,0,0.2)", border: \`1px solid \${panicMode ? "#ef4444" : BORDER}\`, color: panicMode ? "#ef4444" : TEXT, borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {panicMode ? "🚨 Panic Mode" : "😌 Normal Mode"}
                  </button>
                </div>
              </div>
            </div>
          </div>
`;

// Add states at the top of CramMode
code = code.replace(
  'const [subject, setSubject] = useState("")',
  'const [subject, setSubject] = useState("")\n  const [timeHours, setTimeHours] = useState(2)\n  const [panicMode, setPanicMode] = useState(false)'
);

// Replace textarea rendering
code = code.replace(
  /<textarea\s*value=\{subject\}[\s\S]*?<\/textarea>/,
  newCramInput
);

// Update prompt generation in generateCramPlan
code = code.replace(
  /const prompt \= \`Generate an emergency cram plan for "\$\{subject\}"\.[\s\S]*?\`/,
  `const prompt = \`Generate a cram plan for "\${subject}". Time available: \${timeHours} hours. Urgency: \${panicMode ? "PANIC MODE (Focus ONLY on absolute essentials)" : "Normal"}.
Return JSON:
{
  "phases": [
    { "phaseTitle": "...", "durationMinutes": 30, "tasks": ["..."], "focusTip": "..." }
  ],
  "survivalGuide": ["..."]
}\``
);

fs.writeFileSync('prepzap-clean/src/pages/CramMode.tsx', code);
