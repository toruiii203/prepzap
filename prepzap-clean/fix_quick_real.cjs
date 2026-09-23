const fs = require('fs');
let content = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const toggleTarget = `{/* Tab bar */}
                <div className="flex gap-px border-b-[3px] border-black">
                  {(["Cram", "HighYield"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setGeneratedSheet(null); }}
                      className={\`px-8 py-3 text-[12px] font-black uppercase tracking-widest border-t-[3px] border-x-[3px] border-black -mb-[3px] z-10 transition-colors \${
                        activeTab === tab ? "bg-black text-white" : "bg-[#FAF7F2] text-black hover:bg-[#E2E2E2]"
                      }\`}
                    >
                      {tab === "Cram" ? "Cram Mode" : "High Yield"}
                    </button>
                  ))}
                </div>`;

content = content.replace(toggleTarget, '');

const coverageTargetDesktop = `<span
                      className="text-[11px] font-black uppercase tracking-widest bg-black text-white px-3 py-1"
                      title="AI estimate of how well this sheet covers the topic \\u2014 specific to this generation, not tracked over time"
                    >
                      Coverage Score: {generatedSheet ? \`\${generatedSheet.coverageScore}%\` : "—"}
                    </span>`;

content = content.replace(coverageTargetDesktop, '');

const coverageTargetMobile = `<div className="h-1.5 w-full bg-[#E8E4DC] border border-black overflow-hidden mb-1">
                      <div className="h-full bg-black transition-all duration-700" style={{ width: \`\${generatedSheet.coverageScore}%\` }} />
                    </div>
                    <p
                      className="text-[10px] font-black uppercase tracking-widest text-black/40"
                      title="AI estimate for this generation only, not tracked over time"
                    >
                      Coverage Score: {generatedSheet.coverageScore}%
                    </p>`;

content = content.replace(coverageTargetMobile, '');

fs.writeFileSync('src/pages/QuickStudy.tsx', content, 'utf8');
