const fs = require('fs');
const file = 'prepzap-clean/src/pages/HighYieldDetector.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  '<ConceptChipSelector',
  `<div>
            <label className="text-xs font-medium mb-1.5 block uppercase tracking-widest" style={{ color: "var(--pz-text-muted)" }}>Paste Material</label>
            <div style={{ position: "relative" }}>
              <textarea
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Paste notes or text here..."
                rows={6}
                className="w-full px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: "var(--pz-surface2)", border: "1px solid var(--pz-border)", color: "var(--pz-text)" }}
              />
              <div style={{ position: "absolute", bottom: 12, right: 12, fontSize: 10, color: "var(--pz-text-muted)", background: "var(--pz-surface)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--pz-border)" }}>
                {subject.trim().split(/\\s+/).filter(Boolean).length} words
              </div>
            </div>
            <div className="mt-2 text-xs text-right text-gray-500">
                <button onClick={() => handleGenerate()} className="px-4 py-2 font-semibold" style={{ background: "var(--pz-gold)", color: "#000", border: "none" }}>Generate Focus Areas</button>
            </div>
          </div>
          <ConceptChipSelector`
);
content = content.replace('onSelect={(concept) => { setSubject(concept); setTimeout(() => handleGenerate(), 0); }}', 'onSelect={(concept) => { setSubject(prev => prev ? prev + "\\n\\n" + concept : concept); }}');
content = content.replace('label="Subject"', 'label="Add Topic Tag (optional)"');
fs.writeFileSync(file, content);
