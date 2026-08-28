const fs = require('fs');
let code = fs.readFileSync('src/pages/QuickStudy.tsx', 'utf8');

const regex = /\{generatedSheet\.points\.map\(\(pt, idx\) => \([\s\S]*?<\/li>\s*\)\)\}/;

const newUI = `{generatedSheet.points.map((pt, idx) => (
                <li key={idx} className="leading-relaxed text-[14.5px] text-black/80 mb-3">
                  <span className="font-extrabold text-black mr-1">{pt.label}</span>
                  <span dangerouslySetInnerHTML={{ __html: pt.value.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>') }} />
                  {pt.question && (
                    <details className="mt-2 bg-yellow-500/10 rounded-md border border-yellow-500/30 p-2 cursor-pointer group">
                      <summary className="font-semibold text-yellow-900 text-[13px] list-none select-none flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] transition-transform group-open:rotate-90">chevron_right</span>
                        Quick check: {pt.question}
                      </summary>
                      <div className="mt-1.5 pl-5 text-[13.5px] text-yellow-950 font-medium border-l-2 border-yellow-500/30 ml-1">
                        <span dangerouslySetInnerHTML={{ __html: pt.value.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>') }} />
                      </div>
                    </details>
                  )}
                </li>
              ))}`;

code = code.replace(regex, newUI);
fs.writeFileSync('src/pages/QuickStudy.tsx', code);
