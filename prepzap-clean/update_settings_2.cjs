const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');
const target = `<div style={{ padding: 16, background: "#FAF7F2" }}>`; // Inside the General section

const newInputs = `
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#1c1c19", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Display Name</label>
                  <input type="text" value={profileDisplayName} onChange={(e) => setProfileDisplayName(e.target.value)} placeholder="How you appear in games" style={{ width: "100%", padding: "8px 12px", border: "2px solid #1c1c19", borderRadius: 4, fontFamily: "'Quicksand', sans-serif", fontSize: 13 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#1c1c19", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>@Username</label>
                  <input type="text" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="Unique handle" style={{ width: "100%", padding: "8px 12px", border: "2px solid #1c1c19", borderRadius: 4, fontFamily: "'Quicksand', sans-serif", fontSize: 13 }} />
                </div>
`;

content = content.replace(target, target + newInputs);
fs.writeFileSync('src/pages/Settings.tsx', content, 'utf8');
