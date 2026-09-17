const fs = require('fs');
let content = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// 1. Remove TESTIMONIALS array
content = content.replace(/const TESTIMONIALS = \[[\s\S]*?\];/g, '');

// 2. Remove Stats section
content = content.replace(/<section style=\{\{ background:"#CC0000"[\s\S]*?<\/section>/g, '');

// 3. Remove Testimonials section
content = content.replace(/\{\/\* TESTIMONIALS \*\/\}\s*<section style=\{\{ padding:"64px 48px"[\s\S]*?<\/section>/g, '');

// 4. Fix CTA section text (remove 150k)
content = content.replace('Join 150k+ students who are already dominating their exams with Studenius.', 'Join the Beta today and be among the first to dominate your exams with Studenius.');
content = content.replace('      const stats = [\n        { id: "stat-students", target: 150000, suffix: "" },\n        { id: "stat-cards", target: 2000000, suffix: "" },\n        { id: "stat-score", target: 98, suffix: "%" },\n      ];', '      const stats: any[] = [];');

// 5. Update Footer to include links
const footerTarget = `<footer style={{ background:"#f0eded", padding:"40px 48px", borderTop:"2.5px solid #111" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <span className="font-display" style={{ fontSize:20, fontWeight:800, color:"#111" }}>Studenius</span>
          <p style={{ color:"#5c403a", fontSize:14 }}>Empowering the next generation of legends through playful, efficient, AI-powered learning.</p>
          <p style={{ color:"#5c403a", fontSize:13 }}>© 2024 Studenius Education. All rights reserved.</p>
        </div>
      </footer>`;
const footerReplacement = `<footer style={{ background:"#f0eded", padding:"40px 48px", borderTop:"2.5px solid #111" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <span className="font-display" style={{ fontSize:20, fontWeight:800, color:"#111" }}>Studenius</span>
            <div style={{ display: "flex", gap: 24 }}>
              <a href="/privacy" style={{ color: "#111", fontSize: 14, fontWeight: "bold", textDecoration: "none" }} className="hover:underline">Privacy Policy</a>
              <a href="/terms" style={{ color: "#111", fontSize: 14, fontWeight: "bold", textDecoration: "none" }} className="hover:underline">Terms of Service</a>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <p style={{ color:"#5c403a", fontSize:14 }}>Empowering the next generation of legends through playful, efficient, AI-powered learning.</p>
            <p style={{ color:"#5c403a", fontSize:13 }}>© 2026 Studenius Education. All rights reserved.</p>
          </div>
        </div>
      </footer>`;
// It might be encoded differently or using Ac 2024. Let's do a more robust footer replacement.
content = content.replace(/<footer style=\{\{ background:"#f0eded"[\s\S]*?<\/footer>/, footerReplacement);

fs.writeFileSync('src/pages/Landing.tsx', content, 'utf8');
