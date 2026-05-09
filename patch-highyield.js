const fs = require('fs');
let code = fs.readFileSync('prepzap-clean/src/pages/HighYieldDetector.tsx', 'utf8');

const highYieldInput = `
        <div className="space-y-3 mt-6">
          <div style={{ background: "var(--pz-surface)", padding: 20, borderRadius: 12, border: "0.5px solid var(--pz-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--pz-teal)" }}>Document Zone</label>
              <div style={{ fontSize: 10, color: "var(--pz-text-muted)", background: "var(--pz-surface2)", padding: "4px 8px", borderRadius: 12, border: "0.5px solid var(--pz-border)" }}>
                {subject.trim().split(/\\s+/).filter(Boolean).length} words
              </div>
            </div>

            <textarea
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Paste your syllabus, study guide, or lecture notes here..."
              className="w-full text-sm outline-none resize-none"
              style={{ minHeight: 200, maxHeight: 400, background: "rgba(0,0,0,0.2)", border: "none", color: "var(--pz-text)", fontFamily: "var(--pz-font)", padding: 16, borderRadius: 8 }}
            />
          </div>

          <ConceptChipSelector
            onSelect={(concept) => { setSubject(prev => prev ? prev + "\\n\\n" + concept : concept); }}
            placeholder="e.g. Biochemistry, Calculus, WW2…"
            label="Add Topic Tags (optional)"
          />

          <div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Exam Type (optional)</label>
            <input value={examType} onChange={e => setExamType(e.target.value)} placeholder="e.g. USMLE, SAT…"
              className="w-full px-3 py-2.5 text-sm outline-none" style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)", borderRadius: 8 }} />
          </div>

          <div className="mt-4 text-right">
              <button onClick={() => handleGenerate()} className="px-6 py-3 font-semibold text-sm" style={{ background: "var(--pz-gold)", color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}>Generate Focus Areas</button>
          </div>
        </div>
`;

// It looks like `var(--pz-border)` variables are not standard to our tokens, but wait—HighYieldDetector had old inline styles we need to replace completely if the goal states:
// "HighYieldDetector.tsx: Replace textarea with a chunked paste interface — user pastes content into a scrollable "document zone" with a word count badge and topic tag chips they can add above it."

// Actually, I'll replace the existing input block using string replace.
code = code.replace(
  /<div className="space-y-3 mt-6">[\s\S]*?(?=\{\s*concepts\.length > 0 && \()/,
  highYieldInput + '\n\n        '
);

fs.writeFileSync('prepzap-clean/src/pages/HighYieldDetector.tsx', code);
