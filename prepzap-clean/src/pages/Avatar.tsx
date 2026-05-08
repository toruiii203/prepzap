import { Link } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";

const GOLD = "#f0a040";
const BORDER = "rgba(139,26,42,0.35)";
const BG = "#160810";
const SURF = "#1f0b13";
const TEXT = "#f5ede8";
const TEXT2 = "rgba(245,237,232,0.55)";

export default function Avatar() {
  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 16px 120px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontFamily: "'Fredoka One', cursive", fontSize: 30, color: GOLD }}>Avatar Studio</h1>
          <Link to="/dashboard" style={{ color: GOLD, fontWeight: 700, textDecoration: "none" }}>Back to Dashboard</Link>
        </div>

        <section style={{ background: SURF, border: `2px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
          <p style={{ margin: 0, color: TEXT2, fontSize: 14, lineHeight: 1.6 }}>
            This page is now connected in routing and ready for the fox avatar editor. Next pass: body, outfit, hat, and accessory
            layer selectors with live preview and save to Supabase profile.
          </p>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
