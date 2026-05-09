const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/MathSolver.tsx', 'utf8');

// Replace textarea with math input panel
const mathInput = `
          <div style={{ background: SURF, padding: 24, borderRadius: 16, border: \`0.5px solid \${BORDER}\`, marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Enter Math Problem</label>

            <div style={{ background: "#111", padding: 12, borderRadius: 8, border: \`0.5px solid \${BORDER}\`, marginBottom: 12 }}>
              <input
                type="text"
                value={problem}
                onChange={e => setProblem(e.target.value)}
                placeholder="e.g. ∫(x^2 + 3x)dx or 2x + y = 10"
                style={{ width: "100%", background: "transparent", border: "none", color: TEXT, fontSize: 24, fontFamily: MONO, outline: "none" }}
              />
            </div>

            {/* Quick insert buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {["+", "-", "×", "÷", "=", "≠", "<", ">", "≤", "≥", "√", "π", "∫", "Σ", "θ", "∞", "^", "()", "[]"].map(sym => (
                <button
                  key={sym}
                  onClick={() => setProblem(p => p + sym)}
                  style={{ background: SURF2, border: \`0.5px solid \${BORDER}\`, color: TEXT, padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontFamily: MONO }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = TEAL}
                  onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
                >
                  {sym}
                </button>
              ))}
            </div>

            {problem && (
              <div style={{ background: "rgba(0,196,180,0.05)", borderLeft: \`3px solid \${TEAL}\`, padding: "12px 16px", borderRadius: "0 8px 8px 0" }}>
                <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Live Preview (LaTeX)</div>
                <div style={{ color: TEXT, fontSize: 18 }}>
                  <BlockMath math={problem} />
                </div>
              </div>
            )}
          </div>
`;

code = code.replace(
  /<textarea\s*value=\{problem\}[\s\S]*?<\/textarea>/,
  mathInput
);

if (!code.includes('import { BlockMath } from "react-katex"')) {
    code = 'import { BlockMath } from "react-katex"\n' + code;
}

fs.writeFileSync('prepzap-clean/src/pages/MathSolver.tsx', code);
