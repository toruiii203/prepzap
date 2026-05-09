const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/BlankMap.tsx', 'utf8');

const mapInput = `
          <div style={{ background: SURF, padding: 24, borderRadius: 16, border: \`0.5px solid \${BORDER}\`, marginBottom: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Main Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. The French Revolution"
                  style={{ width: "100%", padding: "16px 20px", background: "rgba(0,0,0,0.2)", border: \`0.5px solid \${BORDER}\`, color: TEXT, borderRadius: 8, fontSize: 18, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.currentTarget.style.borderColor = TEAL}
                  onBlur={e => e.currentTarget.style.borderColor = BORDER}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Starting Branches (Optional)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 8, border: \`0.5px solid \${BORDER}\` }}>
                  {branches.map((b, i) => (
                    <span key={i} style={{ background: SURF, border: \`1px solid \${BORDER}\`, color: TEXT, padding: "6px 12px", borderRadius: 20, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      {b}
                      <button onClick={() => setBranches(br => br.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: 0, fontSize: 16 }}>×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Add branch and hit Enter..."
                    onKeyDown={e => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        setBranches([...branches, e.currentTarget.value.trim()]);
                        e.currentTarget.value = "";
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: TEXT, fontSize: 14, outline: "none", flex: 1, minWidth: 200 }}
                  />
                </div>
              </div>
            </div>
          </div>
`;

code = code.replace(
  'const [topic, setTopic] = useState("")',
  'const [topic, setTopic] = useState("")\n  const [branches, setBranches] = useState<string[]>([])'
);

code = code.replace(
  /<textarea\s*value=\{topic\}[\s\S]*?<\/textarea>/,
  mapInput
);

code = code.replace(
  /const prompt = \`Generate a highly structured mind map for "\$\{topic\}"\.\`/,
  `const prompt = \`Generate a highly structured mind map for "\${topic}".\${branches.length > 0 ? \` Base the main nodes around these branches: \${branches.join(", ")}.\` : ""}\``
);

fs.writeFileSync('prepzap-clean/src/pages/BlankMap.tsx', code);
