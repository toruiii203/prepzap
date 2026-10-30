import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const MASCOT_URL = "/mascot/seedling-mascot.png";

const FEATURES = [
  { bg: "#FFE566", icon: "edit_note", title: "AI Flashcards", desc: "Instantly turn your messy notes into structured, high-retention flashcards with spaced repetition built in." },
  { bg: "#baeaff", icon: "psychology", title: "Smart Tutor", desc: "Stuck on a concept? Your AI study companion explains complex topics like you're five. Truly legendary." },
  { bg: "#fafdff", icon: "timer", title: "Focus Timer", desc: "The most satisfying Pomodoro timer you've ever used. Ambient sounds keep you locked in." },
  { bg: "#ffdad3", icon: "military_tech", title: "Arena Battles", desc: "Challenge friends to real-time quiz battles. Climbing the ranks has never felt this good." },
  { bg: "#10B981", icon: "analytics", title: "Study Analytics", desc: "Track your study hours, streak, and session history. See exactly where you need to focus today.", dark: true },
  { bg: "#fce264", icon: "calculate", title: "Math Solver", desc: "Snap a photo or type an equation. Get step-by-step solutions with graphs and tables instantly." },
];



export default function Studenius() {
  const navigate = useNavigate();

  // Mobile apps shouldn't show a marketing landing page
  if (Capacitor.isNativePlatform() || window.innerWidth < 1024) {
    return <Navigate to="/onboarding" replace />;
  }

  // Count-up stats
  useEffect(() => {
    const stats = [
      { id: "stat-students", target: 150000, suffix: "" },
      { id: "stat-cards", target: 2000000, suffix: "" },
      { id: "stat-score", target: 98, suffix: "%" },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const stat = stats.find((s) => s.id === el.id);
          if (!stat) return;
          let current = 0;
          const inc = stat.target / 60;
          const tick = () => {
            current += inc;
            if (current < stat.target) {
              el.textContent = Math.floor(current).toLocaleString() + stat.suffix;
              requestAnimationFrame(tick);
            } else {
              el.textContent = stat.target.toLocaleString() + stat.suffix;
            }
          };
          tick();
          observer.unobserve(el);
        });
      },
      { threshold: 0.1 }
    );
    stats.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ fontFamily: "'Nunito', sans-serif", backgroundColor: "#FAF7F2", color: "#111111", overflowX: "hidden" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .font-display { font-family: 'Nunito', sans-serif; font-weight: 900; }
        .neo-card {
          border: 2.5px solid #111111;
          box-shadow: 4px 4px 0px #111111;
          border-radius: 16px;
        }
        .neo-btn-primary {
          background-color: #10B981;
          color: #ffffff;
          border: 2.5px solid #111111;
          box-shadow: 4px 4px 0px #111111;
          border-radius: 9999px;
          font-weight: 900;
          cursor: pointer;
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .neo-btn-primary:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px #111111;
        }
        .neo-btn-secondary {
          background-color: #FAF7F2;
          color: #111111;
          border: 2.5px solid #111111;
          box-shadow: 4px 4px 0px #111111;
          border-radius: 9999px;
          font-weight: 900;
          cursor: pointer;
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .neo-btn-secondary:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px #111111;
        }
        .ms {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          display: inline-block;
          line-height: 1;
          text-transform: none !important;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-bob {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* NAV */}
      <header
        style={{
          borderBottom: "2.5px solid #111111",
          backgroundColor: "#FAF7F2",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "16px 32px",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/mascot/seedling-logo.png" alt="Studenius Logo" style={{ width: 36, height: 36, borderRadius: 8, border: "2px solid #111" }} />
            <span className="font-display" style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5 }}>
              Studenius
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate("/login")}
              style={{ background: "none", border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer", color: "#111" }}
            >
              Sign In
            </button>
            <button
              className="neo-btn-primary"
              onClick={() => navigate("/onboarding")}
              style={{ padding: "10px 24px", fontSize: 16 }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "80px 32px 64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 48,
          }}
        >
          {/* Left - Copy */}
          <div style={{ flex: "1 1 480px", maxWidth: 620 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FFE566",
                border: "2px solid #111",
                borderRadius: 9999,
                padding: "6px 16px",
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 24,
                boxShadow: "2px 2px 0 #111",
              }}
            >
              <span className="ms" style={{ fontSize: 18, color: "#10B981" }}>bolt</span>
              The Next-Gen Study Ecosystem
            </div>
            <h1
              className="font-display"
              style={{ fontSize: "clamp(40px, 6vw, 68px)", lineHeight: 1.05, fontWeight: 900, marginBottom: 24 }}
            >
              Study Smarter.<br />Score Higher.<br />
              <span style={{ color: "#10B981" }}>Actually Enjoy It.</span>
            </h1>
            <p style={{ fontSize: 17, color: "#5c403a", marginBottom: 40, maxWidth: 480 }}>
              AI flashcards, a personal tutor, focus timer, and active recall workouts — everything you need to dominate your exams.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button className="neo-btn-primary" onClick={() => navigate("/onboarding")} style={{ padding: "14px 32px", fontSize: 18 }}>Start Your Journey</button>
              <button className="neo-btn-secondary" onClick={() => navigate("/onboarding")} style={{ padding: "14px 32px", fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="ms">play_circle</span> See How It Works
              </button>
            </div>
          </div>

          {/* Right — New Mascot Spotlight */}
          <div className="animate-bob" style={{ flex: "1 1 320px", maxWidth: 440, margin: "0 auto", position: "relative" }}>
            {/* Pip Speech Bubble */}
            <div
              style={{
                position: "absolute",
                top: -16,
                right: -8,
                zIndex: 10,
                backgroundColor: "#FFE566",
                border: "2.5px solid #111111",
                borderRadius: 16,
                padding: "8px 16px",
                boxShadow: "3px 3px 0 #111111",
                fontWeight: 900,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span className="ms" style={{ fontSize: 16, color: "#10B981" }}>chat_spark</span>
              Meet Pip, your AI Study Buddy!
            </div>

            <div
              className="neo-card"
              style={{
                background: "#FFFFFF",
                padding: 16,
                borderRadius: 32,
                border: "3px solid #111111",
                boxShadow: "8px 8px 0px #111111",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={MASCOT_URL}
                alt="Pip — Studenius Seedling Mascot"
                style={{ width: "100%", maxHeight: 400, objectFit: "contain", borderRadius: 20, display: "block" }}
              />
            </div>

            {/* Feature Pills */}
            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  background: "#10B981",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "2px solid #111111",
                  boxShadow: "2px 2px 0 #111111",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span className="ms" style={{ fontSize: 15 }}>record_voice_over</span>
                Live Voice with Pip
              </span>
              <span
                style={{
                  background: "#FFE566",
                  color: "#111111",
                  fontSize: 12,
                  fontWeight: 900,
                  padding: "6px 14px",
                  borderRadius: 9999,
                  border: "2px solid #111111",
                  boxShadow: "2px 2px 0 #111111",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span className="ms" style={{ fontSize: 15 }}>school</span>
                Feynman TeachIt
              </span>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ padding: "64px 48px", maxWidth: 1280, margin: "0 auto" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 900, textAlign: "center", marginBottom: 48 }}>Level Up Your Brain</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {FEATURES.map(({ bg, icon, title, desc, dark }) => (
              <div key={title} className="neo-card" style={{ background: bg, padding: 32, color: dark ? "#fff" : "#111" }}>
                <div style={{ width: 56, height: 56, background: "#fff", border: "2px solid #111", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: "4px 4px 0 #111" }}>
                  <span className="ms" style={{ fontSize: 28, color: "#111" }}>{icon}</span>
                </div>
                <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 15 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: "64px 48px", backgroundColor: "#FAF7F2", borderTop: "2.5px solid #111", borderBottom: "2.5px solid #111" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            <h2 className="font-display" style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 900, textAlign: "center", marginBottom: 56 }}>Three Steps to Mastery</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 32 }}>
              {[
                { num: 1, bg: "#10B981", color: "#fff", title: "Dump Your Content", desc: "Upload PDFs, paste lecture notes, or pick a study topic. Studenius handles the rest." },
                { num: 2, bg: "#baeaff", color: "#111", title: "Master with Active Recall", desc: "Engage with spaced-repetition flashcards, Visual Learner lessons, and personal AI tutoring." },
                { num: 3, bg: "#fce264", color: "#111", title: "Destroy the Exam", desc: "Walk into your classroom or board exam with absolute confidence and proven recall." },
              ].map(({ num, bg, color, title, desc }) => (
                <div key={num} className="neo-card" style={{ background: "#fff", padding: 32, position: "relative" }}>
                  <div style={{ width: 48, height: 48, background: bg, color, border: "2.5px solid #111", borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, marginBottom: 20, boxShadow: "3px 3px 0 #111" }}>
                    {num}
                  </div>
                  <h3 className="font-display" style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{title}</h3>
                  <p style={{ color: "#5c403a", fontSize: 15, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section style={{ padding: "80px 48px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 900, textAlign: "center", marginBottom: 12 }}>Simple Student Pricing</h2>
          <p style={{ textAlign: "center", color: "#5c403a", fontSize: 17, marginBottom: 48 }}>No surprises. Upgrade anytime, cancel whenever.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 32, alignItems: "center" }}>

            {/* FREE */}
            <div className="neo-card" style={{ background: "#fff", padding: 32, display: "flex", flexDirection: "column" }}>
              <h3 className="font-display" style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Free</h3>
              <p style={{ color: "#5c403a", marginBottom: 20, fontSize: 15 }}>Everything you need to start scoring higher.</p>
              <div className="font-display" style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>₱0<span style={{ fontSize: 16, fontWeight: 400, color: "#5c403a" }}>/month</span></div>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { ok: true, text: "Standard flashcard decks" },
                  { ok: true, text: "Focus timer with ambient sounds" },
                  { ok: true, text: "Daily AI Tutor queries" },
                  { ok: true, text: "Public Study Vault access" },
                ].map(({ ok, text }) => (
                  <li key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: ok ? "#111" : "#aaa" }}>
                    <span className="ms" style={{ color: ok ? "#10B981" : "#aaa", fontSize: 20 }}>{ok ? "check_circle" : "cancel"}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <button className="neo-btn-secondary" onClick={() => navigate("/onboarding")} style={{ padding: "14px", fontSize: 17, width: "100%" }}>Get Started</button>
            </div>

            {/* PRO */}
            <div className="neo-card" style={{ background: "#10B981", color: "#fff", padding: 32, display: "flex", flexDirection: "column", position: "relative" }}>
              <div className="neo-btn-secondary" style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", padding: "6px 20px", fontSize: 13, whiteSpace: "nowrap" }}>MOST POPULAR</div>
              <h3 className="font-display" style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Studenius VIP</h3>
              <p style={{ opacity: 0.9, marginBottom: 20, fontSize: 15 }}>Unlock the full active-recall study engine.</p>
              <div className="font-display" style={{ fontSize: 48, fontWeight: 900, marginBottom: 24 }}>₱199<span style={{ fontSize: 16, fontWeight: 400 }}>/month</span></div>
              <ul style={{ listStyle: "none", padding: 0, marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Everything in Free",
                  "Unlimited AI Tutor coaching",
                  "Unlimited Visual Learner lessons",
                  "Unlimited Cram Mode sessions",
                  "Large PDF/textbook uploads",
                  "Priority sync & verified vault badge",
                ].map((text) => (
                  <li key={text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
                    <span className="ms" style={{ color: "#fce264", fontSize: 20 }}>star</span>
                    {text}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate("/onboarding")} style={{ background: "#fff", color: "#111", border: "2.5px solid #111", boxShadow: "4px 4px 0 #111", borderRadius: 9999, padding: "14px", fontSize: 17, fontWeight: 900, cursor: "pointer", width: "100%" }}>Go VIP Now</button>
            </div>

          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ margin: "0 48px 64px" }}>
          <div className="neo-card" style={{ background: "#111", padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "relative", zIndex: 10 }}>
              <h2 className="font-display" style={{ fontSize: "clamp(36px,5vw,56px)", fontWeight: 900, color: "#fff", marginBottom: 16 }}>Ready to go Legendary?</h2>
              <p style={{ color: "rgba(255,255,255,.7)", fontSize: 17, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
                Join thousands of students and start dominating your exams with Studenius.
              </p>
              <button className="neo-btn-primary" onClick={() => navigate("/onboarding")} style={{ padding: "18px 40px", fontSize: 22 }}>Start for Free</button>
            </div>
            <img src={MASCOT_URL} alt="Pip Mascot" style={{ position: "absolute", bottom: -20, right: 10, width: "clamp(160px,25vw,300px)", opacity: 0.85, filter: "drop-shadow(0 0 16px rgba(0,0,0,0.8))", pointerEvents: "none" }} />
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{ background: "#f0eded", padding: "40px 48px", borderTop: "2.5px solid #111" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/mascot/seedling-logo.png" alt="Studenius Logo" style={{ width: 28, height: 28, borderRadius: 6, border: "2px solid #111" }} />
              <span className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>Studenius</span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <a href="/privacy" style={{ color: "#111", fontSize: 14, fontWeight: "bold", textDecoration: "none" }} className="hover:underline">Privacy Policy</a>
              <a href="/terms" style={{ color: "#111", fontSize: 14, fontWeight: "bold", textDecoration: "none" }} className="hover:underline">Terms of Service</a>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <p style={{ color: "#5c403a", fontSize: 14 }}>Empowering students through playful, active recall and AI-powered learning.</p>
            <p style={{ color: "#5c403a", fontSize: 13 }}>© 2026 Studenius Education. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
