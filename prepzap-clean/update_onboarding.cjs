const fs = require('fs');
let content = fs.readFileSync('src/pages/OnboardingFlow.tsx', 'utf8');

const targetStr = `                  <span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: \`1.5px solid \${BLACK}\`, marginBottom: 14 }}>Students Love It</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { stars: "★★★★★", quote: '"Finally an app that actually helps me study."', name: "Mia R.", img: "/reviewers/mia.jpg" },
                      { stars: "★★★★★", quote: '"My grades went up in just 2 weeks!"', name: "Carlo T.", img: "/reviewers/carlo.jpg" },
                    ].map((r, i) => (
                      <div key={i} style={{ background: WHITE, border: \`1.5px solid \${BLACK}\`, borderRadius: 14, padding: 12 }}>
                        <div style={{ color: CTA, fontSize: 14, letterSpacing: 2, marginBottom: 4 }}>{r.stars}</div>
                        <p style={{ fontSize: 14, fontStyle: "italic", color: BLACK, opacity: 0.75, margin: "0 0 8px" }}>{r.quote}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={r.img} alt={r.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: \`1.5px solid \${BLACK}\` }} />
                            <span style={{ fontSize: 12, color: BLACK, opacity: 0.65, fontWeight: 600 }}>{r.name}</span>
                          </div>
                      </div>
                    ))}
                  </div>`;

// Wait, the stars might be encoded differently. Let's do a regex replacement for the entire slide 3 content.
const slide3Target = /<span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: `1.5px solid \${BLACK}`, marginBottom: 14 }}>Students Love It<\/span>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*{\/\* Dots \*\/}/;
const slide3Replacement = `<span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: \`1.5px solid \${BLACK}\`, marginBottom: 14 }}>Beta Tester Access</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { icon: "rocket_launch", quote: "You're one of the first to try Studenius. We're actively building new features based on your feedback.", title: "Early Access" },
                      { icon: "bug_report", quote: "Help us shape the platform. Found an issue? Let us know so we can fix it instantly.", title: "Shape the Future" },
                    ].map((r, i) => (
                      <div key={i} style={{ background: WHITE, border: \`1.5px solid \${BLACK}\`, borderRadius: 14, padding: 12 }}>
                        <div style={{ color: CTA, fontSize: 24, marginBottom: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                        </div>
                        <p style={{ fontSize: 13, color: BLACK, opacity: 0.75, margin: "0 0 8px", lineHeight: 1.4 }}>{r.quote}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: BLACK, opacity: 1, fontWeight: 800 }}>{r.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Dots */}`;

content = content.replace(slide3Target, slide3Replacement);
fs.writeFileSync('src/pages/OnboardingFlow.tsx', content, 'utf8');
