const fs = require('fs');

let content = fs.readFileSync('src/pages/OnboardingFlow.tsx', 'utf8');

// Replace the array of objects to include the img property
content = content.replace(
    `{ stars: "★\★\★\★\★", quote: '"Finally an app that actually helps me study."', name: "Mia R." },`,
    `{ stars: "★★★★★", quote: '"Finally an app that actually helps me study."', name: "Mia R.", img: "/reviewers/mia.jpg" },`
).replace(
    `{ stars: "★\★\★\★\★", quote: '"My grades went up in just 2 weeks!"', name: "Carlo T." },`,
    `{ stars: "★★★★★", quote: '"My grades went up in just 2 weeks!"', name: "Carlo T.", img: "/reviewers/carlo.jpg" },`
);

// Add the image inside the mapping
content = content.replace(
    '<span style={{ fontSize: 12, color: BLACK, opacity: 0.65, fontWeight: 600 }}>{r.name}</span>',
    `<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={r.img} alt={r.name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', border: \`1.5px solid \${BLACK}\` }} />
                          <span style={{ fontSize: 12, color: BLACK, opacity: 0.65, fontWeight: 600 }}>{r.name}</span>
                        </div>`
);

fs.writeFileSync('src/pages/OnboardingFlow.tsx', content, 'utf8');
console.log("Updated reviewers");
