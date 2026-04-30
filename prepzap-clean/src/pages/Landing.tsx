import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Hash, Mic, Image as ImageIcon } from "lucide-react";

const TEAL = "#00C4B4";
const GOLD = "#E8B923";
const mono: React.CSSProperties = { fontFamily: "'Geist Mono', 'Courier New', monospace" };

const mockQuestion = {
  text: "Which of the following best describes the process of osmosis?",
  choices: [
    { id: "a", text: "Movement of solute from high to low concentration" },
    { id: "b", text: "Movement of water across a semipermeable membrane" },
    { id: "c", text: "Active transport requiring ATP energy" },
    { id: "d", text: "Diffusion of large molecules through cell walls" },
  ],
  correct: "b",
  explanation: "Osmosis is the passive movement of water molecules across a selectively permeable membrane from an area of lower solute concentration to higher.",
};

const features = [
  { n: "01", title: "AI Tutor (BrainBot)",    desc: "Ask anything, get multi-mode explanations — Explain, ELI5, Analogy, Quiz, Debate, Summary" },
  { n: "02", title: "Practice & Flashcards",  desc: "AI-generated question sets and spaced-repetition flashcards from your own materials" },
  { n: "03", title: "Cram Mode",               desc: "Emergency timed session — AI breaks your subject into prioritised topics with live timers" },
  { n: "04", title: "High Yield Detector",     desc: "Identifies the most testable concepts from your source, then drills you on them instantly" },
  { n: "05", title: "Recall Mode",             desc: "Type from memory and get scored by keyword matching — the hardest way to study" },
  { n: "06", title: "Confidence Calibration",  desc: "Sort every concept into Know / Shaky / No idea — weak ones automatically resurface" },
  { n: "07", title: "Mistake Journal",         desc: "Log errors with spaced-repetition review — overdue items rise to the top automatically" },
  { n: "08", title: "Roadmap Generator",       desc: "Zero-to-mastery structured plan for any subject, broken into phases and milestones" },
  { n: "09", title: "Feynman Mode",            desc: "Teach the AI to learn — it pokes holes in your explanation until you truly understand" },
  { n: "10", title: "Source Library",          desc: "Upload PDFs, images, or notes — every tool reads from your material automatically" },
  { n: "11", title: "Study DNA",               desc: "Your living learner profile — adapts as you use the app and reveals your patterns" },
  { n: "12", title: "Focus Timer + Progress",  desc: "Built-in Pomodoro with activity tracking and real session analytics over time" },
];

const testimonials = [
  { name: "Maria S.", role: "Nursing Student",  text: "Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try." },
  { name: "James W.", role: "Medical Student",  text: "Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly." },
  { name: "Sarah C.", role: "Teacher",          text: "Not just for exams — I use this for any subject. The Feynman mode exposed every gap in my knowledge." },
  { name: "Ahmed R.", role: "Engineering Student", text: "High Yield Detector told me exactly what to study before my finals. Went from a C to an A." },
];

const hairline: React.CSSProperties = { height: "0.5px", background: "#1E1E1E", margin: "0" };
const sectionLabel: React.CSSProperties = {
  ...mono, fontSize: "10px", color: "#555",
  letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "40px",
  display: "flex", alignItems: "center", gap: "12px",
};

function PracticeDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const reset = () => { setSelected(null); setShowAnswer(false); };

  return (
    <div style={{ background: "#0E0E0E", border: "0.5px solid #1E1E1E" }}>
      <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #1E1E1E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...mono, fontSize: "10px", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>Practice · Biology · Medium</span>
      </div>
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: "13px", color: "#F0F0F0", lineHeight: 1.65, marginBottom: "16px", fontWeight: 300 }}>{mockQuestion.text}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {mockQuestion.choices.map(choice => {
            const isSelected = selected === choice.id;
            const isCorrect = choice.id === mockQuestion.correct;
            let borderColor = "#252525";
            let color = "#888";
            if (!showAnswer && isSelected) { borderColor = "rgba(0,196,180,0.5)"; color = TEAL; }
            if (showAnswer && isCorrect) { borderColor = TEAL; color = TEAL; }
            if (showAnswer && isSelected && !isCorrect) { borderColor = "#333"; color = "#555"; }
            return (
              <button key={choice.id}
                onClick={() => !showAnswer && setSelected(choice.id)}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: `0.5px solid ${borderColor}`, background: "transparent", color, fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 300, cursor: showAnswer ? "default" : "pointer", transition: "border-color 0.1s, color 0.1s", display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: 1.5 }}>
                <span style={{ ...mono, fontSize: "10px", color: showAnswer && isCorrect ? TEAL : "#555", minWidth: "14px", marginTop: "1px", flexShrink: 0 }}>
                  {showAnswer && isCorrect ? "✓" : showAnswer && isSelected && !isCorrect ? "✗" : choice.id.toUpperCase()}
                </span>
                {choice.text}
              </button>
            );
          })}
        </div>
        {showAnswer && (
          <div style={{ marginTop: "14px", padding: "14px", borderTop: "0.5px solid #1E1E1E" }}>
            <p style={{ fontSize: "11px", ...mono, color: "#555", letterSpacing: "0.06em", marginBottom: "6px", textTransform: "uppercase" }}>Explanation</p>
            <p style={{ fontSize: "12px", color: "#888", lineHeight: 1.65, fontWeight: 300 }}>{mockQuestion.explanation}</p>
          </div>
        )}
        <div style={{ marginTop: "14px" }}>
          {!showAnswer
            ? <button onClick={() => { if (selected) setShowAnswer(true); }}
                style={{ width: "100%", padding: "9px", fontSize: "11px", ...mono, letterSpacing: "0.08em", textTransform: "uppercase", border: `0.5px solid ${selected ? TEAL : "#252525"}`, background: "transparent", color: selected ? TEAL : "#555", cursor: selected ? "pointer" : "not-allowed", transition: "color 0.15s, border-color 0.15s" }}>
                Check Answer
              </button>
            : <button onClick={reset} style={{ width: "100%", padding: "9px", fontSize: "11px", ...mono, letterSpacing: "0.08em", textTransform: "uppercase", border: "0.5px solid #252525", background: "transparent", color: "#888", cursor: "pointer" }}>
                Try Again
              </button>
          }
        </div>
      </div>
    </div>
  );
}

function ChatDemo() {
  return (
    <div style={{ background: "#0E0E0E", border: "0.5px solid #1E1E1E" }}>
      <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #1E1E1E", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...mono, fontSize: "10px", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>BrainBot AI Tutor</span>
        <span style={{ fontSize: "8px", padding: "1px 5px", background: "rgba(0,196,180,0.1)", color: TEAL, border: `0.5px solid rgba(0,196,180,0.3)`, ...mono, fontWeight: 700 }}>FAST</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ textAlign: "right", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", color: "#F0F0F0", fontWeight: 300, borderRight: `1.5px solid rgba(0,196,180,0.3)`, paddingRight: "12px" }}>
            How do I remember the Krebs cycle?
          </span>
        </div>
        <div style={{ borderLeft: `0.5px solid ${TEAL}`, paddingLeft: "14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", color: "#888", lineHeight: 1.65, fontWeight: 300 }}>
            Try the acronym <strong style={{ color: "#F0F0F0", fontWeight: 500 }}>PCISSFM</strong>: Pyruvate → Citrate → Isocitrate → Succinate → Succinyl → Fumarate → Malate. Make a silly sentence and it'll stick. Want practice questions?
          </p>
        </div>
        <div style={{ borderTop: "0.5px solid #1E1E1E", paddingTop: "14px", display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, padding: "8px 12px", border: "0.5px solid #252525", fontSize: "12px", color: "#555", background: "transparent" }}>
            Ask about any topic...
          </div>
          <button style={{ padding: "8px 14px", border: `0.5px solid ${TEAL}`, background: "transparent", color: TEAL, cursor: "pointer", fontSize: "14px" }}>→</button>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0A0A0A", color: "#F0F0F0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 48, borderBottom: "0.5px solid #1E1E1E", background: "rgba(8,8,8,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", color: "#F0F0F0", ...mono }}>STUDENIUS</span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/pricing" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>Pricing</Link>
          <Link to="/login" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>Login</Link>
          <Link to="/signup">
            <button style={{ fontSize: 11, fontWeight: 600, color: "#0A0A0A", background: TEAL, border: "none", padding: "6px 16px", cursor: "pointer", letterSpacing: "0.06em", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "88px 32px 72px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        <p style={{ ...mono, fontSize: "10px", color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "32px" }}>
          AI-Powered Study Platform
        </p>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: "20px", color: "#F0F0F0" }}>
          Study smarter.<br />
          <span style={{ color: "#555" }}>Master it faster.</span>
        </h1>
        <p style={{ fontSize: "15px", color: "#888", maxWidth: "480px", marginBottom: "36px", lineHeight: 1.7, fontWeight: 300 }}>
          12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall, confidence tracking and more. Built for students who demand results.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link to="/signup">
            <button style={{ fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, color: "#0A0A0A", background: TEAL, border: "none", padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em", transition: "opacity 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              Start for free →
            </button>
          </Link>
          <Link to="/dashboard">
            <button style={{ fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 300, color: "#555", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#F0F0F0")} onMouseLeave={e => (e.currentTarget.style.color = "#555")}>
              See Dashboard
            </button>
          </Link>
        </div>
        <p style={{ ...mono, fontSize: "10px", color: "#333", marginTop: "18px", letterSpacing: "0.06em" }}>No credit card required · Free plan always available</p>
      </section>

      {/* Stats */}
      <div style={hairline} />
      <div style={{ background: "#0E0E0E", borderBottom: "0.5px solid #1E1E1E" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", gap: "48px", flexWrap: "wrap" }}>
          {[
            { value: "12+",    label: "AI Study Tools" },
            { value: "50k+",   label: "Students" },
            { value: "2M+",    label: "Questions Generated" },
            { value: "94%",    label: "Pass Rate" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ ...mono, fontSize: "20px", fontWeight: 500, color: TEAL, letterSpacing: "-0.01em" }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.10em", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>See it in action</span>
          <span style={{ flex: 1, height: "0.5px", background: "#1E1E1E", display: "block" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1E1E1E" }}>
          <PracticeDemo />
          <ChatDemo />
        </div>
      </div>

      <div style={hairline} />

      {/* Upload */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>Upload anything</span>
          <span style={{ flex: 1, height: "0.5px", background: "#1E1E1E", display: "block" }} />
        </div>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>Upload anything, learn everything</h2>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px", fontWeight: 300 }}>Every tool reads from your uploaded materials automatically — upload once, use everywhere.</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { icon: FileText,  label: "PDF Notes"  },
            { icon: ImageIcon, label: "Images"      },
            { icon: Mic,       label: "Voice Notes" },
            { icon: Hash,      label: "Topic Name"  },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", border: "0.5px solid #252525", cursor: "default", transition: "border-color 0.15s" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = TEAL)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#252525")}>
              <item.icon style={{ width: 13, height: 13, color: "#555" }} />
              <span style={{ ...mono, fontSize: "11px", color: "#888", letterSpacing: "0.04em" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={hairline} />

      {/* Features */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>Tools</span>
          <span style={{ flex: 1, height: "0.5px", background: "#1E1E1E", display: "block" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1E1E1E" }}>
          {features.map(f => (
            <div key={f.n} style={{ background: "#0E0E0E", padding: "20px 24px" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#111")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#0E0E0E")}>
              <div style={{ ...mono, fontSize: "10px", color: "#333", marginBottom: "10px", letterSpacing: "0.06em" }}>{f.n}</div>
              <div style={{ fontSize: "13px", color: "#F0F0F0", fontWeight: 500, marginBottom: "4px", letterSpacing: "-0.01em" }}>{f.title}</div>
              <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={hairline} />

      {/* Testimonials */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>Testimonials</span>
          <span style={{ flex: 1, height: "0.5px", background: "#1E1E1E", display: "block" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1E1E1E" }}>
          {testimonials.map(t => (
            <div key={t.name} style={{ background: "#0E0E0E", padding: "20px 24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "#555", letterSpacing: "0.06em", marginBottom: "10px" }}>
                {t.name} — {t.role}
              </div>
              <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.65, fontWeight: 300 }}>"{t.text}"</p>
            </div>
          ))}
        </div>
      </div>

      <div style={hairline} />

      {/* CTA */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "72px 32px" }}>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>Ready to study smarter?</h2>
        <p style={{ fontSize: "14px", color: "#888", marginBottom: "28px", fontWeight: 300 }}>Start free. No credit card required.</p>
        <Link to="/signup">
          <button style={{ fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, color: "#0A0A0A", background: TEAL, border: "none", padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em", transition: "opacity 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Get started free →
          </button>
        </Link>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "0.5px solid #1E1E1E" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...mono, fontSize: "10px", color: "#333", letterSpacing: "0.06em" }}>STUDENIUS © {new Date().getFullYear()}</span>
          <div style={{ display: "flex", gap: "20px" }}>
            {[["Pricing", "/pricing"], ["Login", "/login"], ["Sign Up", "/signup"]].map(([label, href]) => (
              <Link key={href} to={href} style={{ fontSize: "11px", color: "#555", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#888")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#555")}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
