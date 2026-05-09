const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/BuildDef.tsx', 'utf8');

const buildDefInput = `
          <div style={{ background: SURF, padding: 24, borderRadius: 16, border: \`0.5px solid \${BORDER}\`, marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 16, flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Target Term</label>
                  <input
                    type="text"
                    value={term}
                    onChange={e => setTerm(e.target.value)}
                    placeholder="e.g. Action Potential"
                    style={{ width: "100%", padding: "14px 16px", background: "rgba(0,0,0,0.2)", border: \`0.5px solid \${BORDER}\`, color: TEXT, borderRadius: 8, fontSize: 16, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Optional Context</label>
                  <input
                    type="text"
                    value={context}
                    onChange={e => setContext(e.target.value)}
                    placeholder="e.g. In the context of neuroscience"
                    style={{ width: "100%", padding: "14px 16px", background: "rgba(0,0,0,0.2)", border: \`0.5px solid \${BORDER}\`, color: TEXT, borderRadius: 8, fontSize: 16, fontFamily: FONT, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Related Terms (Optional)</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {relatedTerms.map((t, i) => (
                    <span key={i} style={{ background: "rgba(0,196,180,0.1)", border: \`0.5px solid \${TEAL}\`, color: TEAL, padding: "4px 10px", borderRadius: 16, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      {t}
                      <button onClick={() => setRelatedTerms(rt => rt.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: TEAL, cursor: "pointer", padding: 0, fontSize: 14 }}>×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ Add term and press Enter"
                    onKeyDown={e => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        setRelatedTerms([...relatedTerms, e.currentTarget.value.trim()]);
                        e.currentTarget.value = "";
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: TEXT, fontSize: 13, outline: "none", width: 180, padding: "6px 0" }}
                  />
                </div>
              </div>
            </div>
          </div>
`;

code = code.replace(
  'const [term, setTerm] = useState("")',
  'const [term, setTerm] = useState("")\n  const [context, setContext] = useState("")\n  const [relatedTerms, setRelatedTerms] = useState<string[]>([])'
);

code = code.replace(
  /<textarea\s*value=\{term\}[\s\S]*?<\/textarea>/,
  buildDefInput
);

code = code.replace(
  /const prompt = \`Provide a structured concept breakdown for "\$\{term\}"\.\`/,
  `const prompt = \`Provide a structured concept breakdown for "\${term}".\${context ? \` Context: \${context}.\` : ""} \${relatedTerms.length > 0 ? \` Also touch on how it relates to: \${relatedTerms.join(", ")}.\` : ""}\``
);

fs.writeFileSync('prepzap-clean/src/pages/BuildDef.tsx', code);
