import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Check, BookOpen, Brain, Target, Clock,
  Trophy, BarChart3, Zap, Star, Sparkles, Upload, Mic,
  FileText, Calendar, Layers, MessageSquare, XCircle, Image as ImageIcon, Hash,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

const mono: React.CSSProperties = { fontFamily: "'Geist Mono', monospace" };

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
  { n: "01", title: "Upload Anything",       desc: "PDFs, images, notes — the AI learns from your materials"    },
  { n: "02", title: "AI Question Generator", desc: "Instantly generates practice questions from any content"     },
  { n: "03", title: "Weak Spot Detector",    desc: "AI identifies exactly what you need to study more"          },
  { n: "04", title: "Focus Timer",           desc: "Built-in pomodoro with ambient sounds and YouTube music"    },
  { n: "05", title: "Smart Flashcards",      desc: "Spaced repetition that adapts to your memory patterns"     },
  { n: "06", title: "Deep Analytics",        desc: "Track accuracy, speed, and improvement over time"          },
  { n: "07", title: "Study Planner",         desc: "Plan your week with AI-generated sessions"                 },
  { n: "08", title: "Knowledge Synthesis",   desc: "Upload multiple docs — AI connects the dots across them"   },
];

const testimonials = [
  { name: "Maria S.", role: "Nursing Student",  text: "Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try." },
  { name: "James W.", role: "AI Tools Learner", text: "Learning NotebookLM was overwhelming until PrepZap broke it into steps. Game changer." },
  { name: "Sarah C.", role: "Teacher",          text: "Not just for exams — I use this for any subject. The focus timer with lo-fi music is perfect." },
  { name: "Ahmed R.", role: "CAD Student",      text: "Went from confused to proficient in SolidWorks in weeks thanks to PrepZap." },
];

const hairline: React.CSSProperties = { height: "0.5px", background: "var(--pz-border)", margin: "0" };
const sectionLabel: React.CSSProperties = {
  ...mono, fontSize: "10px", color: "var(--pz-text-muted)",
  letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "40px",
  display: "flex", alignItems: "center", gap: "12px",
};

function PracticeDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const reset = () => { setSelected(null); setShowAnswer(false); };

  return (
    <div style={{ background: "var(--pz-surface)", border: "0.5px solid var(--pz-border)" }}>
      <div style={{ padding: "12px 20px", borderBottom: "0.5px solid var(--pz-border)", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Practice · Biology · Medium</span>
      </div>
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: "13px", color: "var(--pz-text)", lineHeight: 1.65, marginBottom: "16px", fontWeight: 300 }}>{mockQuestion.text}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {mockQuestion.choices.map(choice => {
            const isSelected = selected === choice.id;
            const isCorrect = choice.id === mockQuestion.correct;
            let borderColor = "var(--pz-border)";
            let color = "var(--pz-text-2)";
            if (!showAnswer && isSelected) { borderColor = "rgba(245,245,245,0.30)"; color = "var(--pz-text)"; }
            if (showAnswer && isCorrect) { borderColor = "rgba(245,245,245,0.50)"; color = "var(--pz-text)"; }
            if (showAnswer && isSelected && !isCorrect) { borderColor = "rgba(245,245,245,0.14)"; color = "var(--pz-text-muted)"; }
            return (
              <button key={choice.id}
                onClick={() => !showAnswer && setSelected(choice.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  border: `0.5px solid ${borderColor}`,
                  background: "transparent", color, fontSize: "12px",
                  fontFamily: "'Geist', sans-serif", fontWeight: 300,
                  cursor: showAnswer ? "default" : "pointer", transition: "border-color 0.1s, color 0.1s",
                  display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: 1.5,
                }}>
                <span style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", minWidth: "14px", marginTop: "1px", flexShrink: 0 }}>
                  {showAnswer && isCorrect ? "✓" : showAnswer && isSelected && !isCorrect ? "✗" : choice.id.toUpperCase()}
                </span>
                {choice.text}
              </button>
            );
          })}
        </div>

        {showAnswer && (
          <div style={{ marginTop: "14px", padding: "14px", borderTop: "0.5px solid var(--pz-border)" }}>
            <p style={{ fontSize: "11px", ...mono, color: "var(--pz-text-muted)", letterSpacing: "0.06em", marginBottom: "6px", textTransform: "uppercase" }}>Explanation</p>
            <p style={{ fontSize: "12px", color: "var(--pz-text-2)", lineHeight: 1.65, fontWeight: 300 }}>{mockQuestion.explanation}</p>
          </div>
        )}

        <div style={{ marginTop: "14px" }}>
          {!showAnswer
            ? <button onClick={() => { if (selected) setShowAnswer(true); }}
                style={{
                  width: "100%", padding: "9px", fontSize: "11px",
                  ...mono, letterSpacing: "0.08em", textTransform: "uppercase",
                  border: `0.5px solid ${selected ? "rgba(245,245,245,0.25)" : "var(--pz-border)"}`,
                  background: "transparent",
                  color: selected ? "var(--pz-text)" : "var(--pz-text-muted)",
                  cursor: selected ? "pointer" : "not-allowed",
                  transition: "color 0.15s, border-color 0.15s",
                }}>
                Check Answer
              </button>
            : <button onClick={reset} style={{ width: "100%", padding: "9px", fontSize: "11px", ...mono, letterSpacing: "0.08em", textTransform: "uppercase", border: "0.5px solid var(--pz-border)", background: "transparent", color: "var(--pz-text-2)", cursor: "pointer" }}>
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
    <div style={{ background: "var(--pz-surface)", border: "0.5px solid var(--pz-border)" }}>
      <div style={{ padding: "12px 20px", borderBottom: "0.5px solid var(--pz-border)" }}>
        <span style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Tutor</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ textAlign: "right", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", color: "var(--pz-text)", fontWeight: 300, borderRight: "1.5px solid rgba(245,245,245,0.2)", paddingRight: "12px" }}>
            How do I remember the Krebs cycle?
          </span>
        </div>
        <div style={{ borderLeft: "0.5px solid var(--pz-border)", paddingLeft: "14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", color: "var(--pz-text-2)", lineHeight: 1.65, fontWeight: 300 }}>
            Try the acronym <strong style={{ color: "var(--pz-text)", fontWeight: 500 }}>PCISSFM</strong>: Pyruvate → Citrate → Isocitrate → Succinate → Succinyl → Fumarate → Malate. Make a silly sentence and it'll stick. Want practice questions?
          </p>
        </div>
        <div style={{ borderTop: "0.5px solid var(--pz-border)", paddingTop: "14px", display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, padding: "8px 12px", border: "0.5px solid var(--pz-border)", fontSize: "12px", color: "var(--pz-text-muted)", background: "transparent" }}>
            Ask about any topic...
          </div>
          <button style={{ padding: "8px 14px", border: "0.5px solid var(--pz-border)", background: "transparent", color: "var(--pz-text-2)", cursor: "pointer", fontSize: "14px" }}>→</button>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--pz-bg)", color: "var(--pz-text)" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: "88px 32px 72px", maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        <p style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "32px" }}>
          AI-Powered Learning Platform
        </p>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: "20px", color: "var(--pz-text)" }}>
          Learn anything.<br />
          <span style={{ color: "var(--pz-text-2)" }}>Master it faster.</span>
        </h1>
        <p style={{ fontSize: "15px", color: "var(--pz-text-2)", maxWidth: "480px", marginBottom: "36px", lineHeight: 1.7, fontWeight: 300 }}>
          AI-generated practice questions, smart flashcards, and deep analytics — built for students who demand more than average.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link to="/signup">
            <button style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", fontWeight: 400, color: "#000", background: "var(--pz-text)", border: "none", padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em", transition: "opacity 0.15s" }}
              onMouseEnter={e => ((e.currentTarget).style.opacity = "0.82")}
              onMouseLeave={e => ((e.currentTarget).style.opacity = "1")}>
              Start for free →
            </button>
          </Link>
          <Link to="/dashboard">
            <button style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", fontWeight: 300, color: "var(--pz-text-2)", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.15s" }}
              onMouseEnter={e => ((e.currentTarget).style.color = "var(--pz-text)")}
              onMouseLeave={e => ((e.currentTarget).style.color = "var(--pz-text-2)")}>
              See Dashboard
            </button>
          </Link>
        </div>
        <p style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", marginTop: "18px", letterSpacing: "0.06em" }}>No credit card required · Free plan always available</p>
      </section>

      {/* Stats */}
      <div style={hairline} />
      <div style={{ background: "var(--pz-surface)", borderBottom: "0.5px solid var(--pz-border)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", gap: "48px", flexWrap: "wrap" }}>
          {[
            { value: "50,000+", label: "Students" },
            { value: "2M+",     label: "Questions Generated" },
            { value: "94%",     label: "Pass Rate" },
            { value: "4.9",     label: "Average Rating" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ ...mono, fontSize: "20px", fontWeight: 500, color: "var(--pz-text)", letterSpacing: "-0.01em" }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "var(--pz-text-muted)", textTransform: "uppercase", letterSpacing: "0.10em", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>See it in action</span>
          <span style={{ flex: 1, height: "0.5px", background: "var(--pz-border)", display: "block" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--pz-border)" }}>
          <PracticeDemo />
          <ChatDemo />
        </div>
      </div>

      <div style={hairline} />

      {/* Upload */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>Upload anything</span>
          <span style={{ flex: 1, height: "0.5px", background: "var(--pz-border)", display: "block" }} />
        </div>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>Upload anything, learn everything</h2>
        <p style={{ fontSize: "14px", color: "var(--pz-text-2)", marginBottom: "28px", fontWeight: 300 }}>The AI synthesizes your materials and turns them into study tools.</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { icon: FileText,  label: "PDF Notes"   },
            { icon: ImageIcon, label: "Images"       },
            { icon: Mic,       label: "Voice Notes"  },
            { icon: Hash,      label: "Topic Name"   },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 14px", border: "0.5px solid var(--pz-border)",
              cursor: "default", transition: "border-color 0.15s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--pz-border-hv)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--pz-border)")}>
              <item.icon style={{ width: 13, height: 13, color: "var(--pz-text-muted)" }} />
              <span style={{ ...mono, fontSize: "11px", color: "var(--pz-text-2)", letterSpacing: "0.04em" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={hairline} />

      {/* Features */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>Features</span>
          <span style={{ flex: 1, height: "0.5px", background: "var(--pz-border)", display: "block" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--pz-border)" }}>
          {features.map(f => (
            <div key={f.n} style={{ background: "var(--pz-surface)", padding: "20px 24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", marginBottom: "10px", letterSpacing: "0.06em" }}>{f.n}</div>
              <div style={{ fontSize: "13px", color: "var(--pz-text)", fontWeight: 400, marginBottom: "4px", letterSpacing: "-0.01em" }}>{f.title}</div>
              <div style={{ fontSize: "12px", color: "var(--pz-text-muted)", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={hairline} />

      {/* Testimonials */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
        <div style={sectionLabel}>
          <span>Testimonials</span>
          <span style={{ flex: 1, height: "0.5px", background: "var(--pz-border)", display: "block" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--pz-border)" }}>
          {testimonials.map(t => (
            <div key={t.name} style={{ background: "var(--pz-surface)", padding: "20px 24px" }}>
              <div style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.06em", marginBottom: "10px" }}>
                {t.name} — {t.role}
              </div>
              <p style={{ fontSize: "13px", color: "var(--pz-text-2)", lineHeight: 1.65, fontWeight: 300 }}>"{t.text}"</p>
            </div>
          ))}
        </div>
      </div>

      <div style={hairline} />

      {/* CTA */}
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "72px 32px" }}>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>Ready to study smarter?</h2>
        <p style={{ fontSize: "14px", color: "var(--pz-text-2)", marginBottom: "28px", fontWeight: 300 }}>Start free. No credit card required.</p>
        <Link to="/signup">
          <button style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", fontWeight: 400, color: "#000", background: "var(--pz-text)", border: "none", padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em", transition: "opacity 0.15s" }}
            onMouseEnter={e => ((e.currentTarget).style.opacity = "0.82")}
            onMouseLeave={e => ((e.currentTarget).style.opacity = "1")}>
            Get started free →
          </button>
        </Link>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "0.5px solid var(--pz-border)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.06em" }}>PREPZAP © {new Date().getFullYear()}</span>
          <div style={{ display: "flex", gap: "20px" }}>
            {[["Pricing", "/pricing"], ["Suggestions", "/suggestions"], ["Login", "/login"]].map(([label, href]) => (
              <Link key={href} to={href} style={{ fontSize: "11px", color: "var(--pz-text-muted)", textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--pz-text-2)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--pz-text-muted)")}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
