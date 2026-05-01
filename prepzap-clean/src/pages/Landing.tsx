import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FileText, Hash, Mic, Image as ImageIcon } from "lucide-react";

// ── brand ──────────────────────────────────────────────────────────────────
const TEAL = "#00C4B4";
const GOLD = "#E8B923";
const mono: React.CSSProperties = {
  fontFamily: "'Geist Mono', 'Courier New', monospace",
};

// ── data ───────────────────────────────────────────────────────────────────
const mockQuestion = {
  text: "Which of the following best describes the process of osmosis?",
  choices: [
    { id: "a", text: "Movement of solute from high to low concentration" },
    { id: "b", text: "Movement of water across a semipermeable membrane" },
    { id: "c", text: "Active transport requiring ATP energy" },
    { id: "d", text: "Diffusion of large molecules through cell walls" },
  ],
  correct: "b",
  explanation:
    "Osmosis is the passive movement of water molecules across a selectively permeable membrane from an area of lower solute concentration to higher.",
};

const features = [
  { n: "01", title: "AI Tutor (BrainBot)",   desc: "Ask anything — Explain, ELI5, Analogy, Quiz, Debate, Summary" },
  { n: "02", title: "Practice & Flashcards", desc: "AI-generated questions and spaced-repetition from your materials" },
  { n: "03", title: "Cram Mode",             desc: "Emergency timed session — AI breaks subjects into prioritised topics" },
  { n: "04", title: "High Yield Detector",   desc: "Identifies the most testable concepts and drills you instantly" },
  { n: "05", title: "Recall Mode",           desc: "Type from memory and get scored — the hardest way to study" },
  { n: "06", title: "Confidence Calibration",desc: "Sort every concept into Know / Shaky / No idea" },
  { n: "07", title: "Mistake Journal",       desc: "Log errors with spaced-repetition — overdue items resurface" },
  { n: "08", title: "Roadmap Generator",     desc: "Zero-to-mastery plan for any subject, broken into phases" },
  { n: "09", title: "Feynman Mode",          desc: "Teach the AI — it pokes holes until you truly understand" },
  { n: "10", title: "Source Library",        desc: "Upload PDFs, images, or notes — every tool reads them" },
  { n: "11", title: "Study DNA",             desc: "Your living learner profile — adapts and reveals your patterns" },
  { n: "12", title: "Focus Timer + Progress",desc: "Built-in Pomodoro with activity tracking and session analytics" },
];

const testimonials = [
  { name: "Maria S.",  role: "Nursing Student",      text: "Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try." },
  { name: "James W.",  role: "Medical Student",      text: "Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly." },
  { name: "Sarah C.",  role: "Teacher",              text: "Feynman Mode exposed every gap in my knowledge. Not just for exams — for any subject." },
  { name: "Ahmed R.",  role: "Engineering Student",  text: "High Yield Detector told me exactly what to study before finals. Went from C to A." },
];

// ── helpers ────────────────────────────────────────────────────────────────
const hairline: React.CSSProperties = {
  height: "0.5px", background: "#1a1a2e", margin: 0,
};
const sectionLabel: React.CSSProperties = {
  ...mono, fontSize: "10px", color: "#444", letterSpacing: "0.14em",
  textTransform: "uppercase", marginBottom: "40px",
  display: "flex", alignItems: "center", gap: "12px",
};

// ── Star canvas ────────────────────────────────────────────────────────────
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const stars: { x: number; y: number; r: number; o: number; speed: number }[] = [];

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 320; i++) {
      stars.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.2 + 0.2,
        o: Math.random() * 0.8 + 0.1,
        speed: Math.random() * 0.003 + 0.001,
      });
    }

    let t = 0;
    function draw() {
      t += 1;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        const pulse = s.o * (0.6 + 0.4 * Math.sin(t * s.speed * 60));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${pulse})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", opacity: 0.9,
      }}
    />
  );
}

// ── Floating astronaut SVG ─────────────────────────────────────────────────
function AstronautScene({ progress }: { progress: number }) {
  // progress: 0 = top of cinematic, 1 = bottom
  const y = -60 + progress * 160;
  const rotate = -8 + progress * 20;
  const opacity = progress < 0.05 ? progress / 0.05 : progress > 0.85 ? (1 - progress) / 0.15 : 1;

  // book / planet orbit radius pulse
  const orbitScale = 1 + 0.04 * Math.sin(Date.now() / 800);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, calc(-50% + ${y}px)) rotate(${rotate}deg)`,
        opacity,
        transition: "opacity 0.3s",
        pointerEvents: "none",
        userSelect: "none",
        width: "min(520px, 80vw)",
      }}
    >
      <svg
        viewBox="0 0 520 480"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", filter: "drop-shadow(0 0 40px rgba(0,196,180,0.18))" }}
      >
        {/* glow ring */}
        <ellipse cx="260" cy="440" rx="160" ry="18" fill="rgba(0,196,180,0.06)" />

        {/* planet behind */}
        <circle cx="390" cy="80" r="54" fill="#0d1b3e" stroke="rgba(0,196,180,0.25)" strokeWidth="1" />
        <circle cx="390" cy="80" r="54" fill="url(#pgrad)" />
        <ellipse cx="390" cy="80" rx="74" ry="16" fill="none" stroke="rgba(0,196,180,0.4)" strokeWidth="1.2" />
        <defs>
          <radialGradient id="pgrad" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#1a3a6e" />
            <stop offset="100%" stopColor="#060d1f" />
          </radialGradient>
        </defs>

        {/* astronaut body */}
        <g transform="translate(140,120)">
          {/* helmet */}
          <ellipse cx="120" cy="68" rx="56" ry="60" fill="#0e1628" stroke="rgba(200,220,255,0.18)" strokeWidth="1.5" />
          <ellipse cx="120" cy="64" rx="38" ry="40" fill="rgba(0,196,180,0.08)" stroke="rgba(0,196,180,0.3)" strokeWidth="1" />
          {/* visor glare */}
          <ellipse cx="108" cy="50" rx="10" ry="6" fill="rgba(255,255,255,0.07)" transform="rotate(-15,108,50)" />

          {/* stars inside visor */}
          <circle cx="118" cy="60" r="1.2" fill="rgba(200,220,255,0.6)" />
          <circle cx="130" cy="52" r="0.8" fill="rgba(200,220,255,0.5)" />
          <circle cx="112" cy="75" r="0.8" fill="rgba(200,220,255,0.4)" />

          {/* suit torso */}
          <rect x="78" y="122" width="84" height="90" rx="20" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" />
          {/* chest detail */}
          <rect x="98" y="142" width="44" height="28" rx="5" fill="rgba(0,196,180,0.1)" stroke="rgba(0,196,180,0.3)" strokeWidth="0.8" />
          <line x1="120" y1="148" x2="120" y2="164" stroke="rgba(0,196,180,0.5)" strokeWidth="0.8" />
          <line x1="108" y1="156" x2="132" y2="156" stroke="rgba(0,196,180,0.5)" strokeWidth="0.8" />
          {/* STUDENIUS badge */}
          <text x="120" y="181" textAnchor="middle" fill="rgba(0,196,180,0.6)"
            style={{ fontFamily: "monospace", fontSize: "6px", letterSpacing: "0.15em" }}>
            STUDENIUS
          </text>

          {/* left arm — holding book */}
          <path d="M78 140 Q40 160 30 195" stroke="rgba(200,220,255,0.15)" strokeWidth="1" fill="none" />
          <rect x="60" y="135" width="22" height="90" rx="11" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-30,71,180)" />
          {/* book */}
          <g transform="translate(-2,190) rotate(10)">
            <rect x="0" y="0" width="48" height="36" rx="3" fill="#00C4B4" opacity="0.85" />
            <rect x="4" y="4" width="40" height="28" rx="2" fill="#0a1a2e" />
            <line x1="8" y1="12" x2="36" y2="12" stroke="rgba(0,196,180,0.5)" strokeWidth="1" />
            <line x1="8" y1="18" x2="30" y2="18" stroke="rgba(0,196,180,0.3)" strokeWidth="1" />
            <line x1="8" y1="24" x2="26" y2="24" stroke="rgba(0,196,180,0.2)" strokeWidth="1" />
            <text x="24" y="10" textAnchor="middle" fill="rgba(0,196,180,0.8)"
              style={{ fontFamily: "monospace", fontSize: "5px", letterSpacing: "0.1em" }}>AI</text>
          </g>

          {/* right arm — pointing up */}
          <rect x="162" y="130" width="22" height="80" rx="11" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(20,173,170)" />

          {/* legs */}
          <rect x="86" y="206" width="30" height="70" rx="15" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-5,101,241)" />
          <rect x="124" y="206" width="30" height="70" rx="15" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(8,139,241)" />

          {/* thruster glow */}
          <ellipse cx="120" cy="280" rx="18" ry="6" fill="rgba(0,196,180,0.15)" />
          <ellipse cx="120" cy="284" rx="10" ry="4" fill="rgba(0,196,180,0.25)" />
        </g>

        {/* floating equations */}
        {[
          { x: 60, y: 200, label: "E=mc²", o: 0.3 },
          { x: 400, y: 260, label: "∫f(x)dx", o: 0.25 },
          { x: 70, y: 370, label: "PV=nRT", o: 0.2 },
          { x: 380, y: 380, label: "F=ma", o: 0.25 },
        ].map((eq) => (
          <text key={eq.label} x={eq.x} y={eq.y}
            fill={`rgba(0,196,180,${eq.o})`}
            style={{ fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.05em" }}>
            {eq.label}
          </text>
        ))}

        {/* data stream lines */}
        <line x1="48" y1="240" x2="150" y2="240" stroke="rgba(0,196,180,0.12)" strokeWidth="0.8" strokeDasharray="4 6" />
        <line x1="370" y1="300" x2="470" y2="300" stroke="rgba(0,196,180,0.12)" strokeWidth="0.8" strokeDasharray="4 6" />
      </svg>
    </div>
  );
}

// ── Cinematic scroll section ───────────────────────────────────────────────
function CinematicSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [, forceRender] = useState(0);

  // force re-render for animation
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onScroll() {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setProgress(p);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // parallax layers
  const bgY = progress * 40;
  const midY = progress * 80;

  return (
    <div ref={sectionRef} style={{ position: "relative", height: "300vh" }}>
      <div
        style={{
          position: "sticky", top: 0, height: "100vh", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {/* nebula gradient bg */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: `
              radial-gradient(ellipse 70% 60% at ${30 + progress * 20}% ${40 + bgY * 0.3}%, rgba(0,196,180,0.06) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at ${70 - progress * 15}% ${60 + bgY * 0.2}%, rgba(232,185,35,0.04) 0%, transparent 60%)
            `,
            transition: "background 0.1s",
          }}
        />

        {/* parallax grid */}
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `
              linear-gradient(rgba(0,196,180,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,196,180,1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            transform: `translateY(${midY}px)`,
          }}
        />

        {/* horizon glow */}
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "200px",
            background: "linear-gradient(transparent, rgba(0,196,180,0.04))",
          }}
        />

        {/* astronaut */}
        <AstronautScene progress={progress} />

        {/* center text — fades in at start, fades out midway */}
        <div
          style={{
            position: "absolute", bottom: "14%", left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            opacity: progress < 0.15 ? progress / 0.15 : progress > 0.55 ? Math.max(0, 1 - (progress - 0.55) / 0.2) : 1,
            transition: "opacity 0.2s",
          }}
        >
          <p style={{ ...mono, fontSize: "10px", color: "rgba(0,196,180,0.6)", letterSpacing: "0.2em", marginBottom: "8px" }}>
            SCROLL TO EXPLORE
          </p>
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(rgba(0,196,180,0.6), transparent)", margin: "0 auto" }} />
        </div>

        {/* headline that reveals as you scroll */}
        <div
          style={{
            position: "absolute", top: "14%", left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            opacity: progress < 0.1 ? 0 : progress < 0.3 ? (progress - 0.1) / 0.2 : progress > 0.75 ? Math.max(0, 1 - (progress - 0.75) / 0.15) : 1,
            width: "min(600px, 90vw)",
          }}
        >
          {progress < 0.5 ? (
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300,
                letterSpacing: "-0.03em", color: "#F0F0F0", lineHeight: 1.15,
              }}
            >
              Knowledge travels<br />
              <span style={{ color: TEAL }}>at the speed of curiosity.</span>
            </h2>
          ) : (
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300,
                letterSpacing: "-0.03em", color: "#F0F0F0", lineHeight: 1.15,
              }}
            >
              AI-powered tools.<br />
              <span style={{ color: GOLD }}>Built for students who demand results.</span>
            </h2>
          )}
        </div>

        {/* progress indicator */}
        <div style={{ position: "absolute", right: "32px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "1px", height: "80px", background: "#1a1a2e" }}>
            <div style={{ width: "1px", height: `${progress * 80}px`, background: TEAL, transition: "height 0.1s" }} />
          </div>
          <span style={{ ...mono, fontSize: "8px", color: "#333", letterSpacing: "0.1em", writingMode: "vertical-rl" }}>
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Practice demo ──────────────────────────────────────────────────────────
function PracticeDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const reset = () => { setSelected(null); setShowAnswer(false); };

  return (
    <div style={{ background: "#080d1a", border: "0.5px solid #1a1a2e" }}>
      <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #1a1a2e", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...mono, fontSize: "10px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Practice · Biology · Medium
        </span>
      </div>
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: "13px", color: "#E0E8F0", lineHeight: 1.65, marginBottom: "16px", fontWeight: 300 }}>
          {mockQuestion.text}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {mockQuestion.choices.map((choice) => {
            const isSelected = selected === choice.id;
            const isCorrect = choice.id === mockQuestion.correct;
            let borderColor = "#1a1a2e";
            let color = "#666";
            if (!showAnswer && isSelected) { borderColor = "rgba(0,196,180,0.5)"; color = TEAL; }
            if (showAnswer && isCorrect)   { borderColor = TEAL; color = TEAL; }
            if (showAnswer && isSelected && !isCorrect) { borderColor = "#1a1a2e"; color = "#444"; }
            return (
              <button
                key={choice.id}
                onClick={() => !showAnswer && setSelected(choice.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  border: `0.5px solid ${borderColor}`, background: "transparent",
                  color, fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: 300, cursor: showAnswer ? "default" : "pointer",
                  transition: "border-color 0.1s, color 0.1s",
                  display: "flex", alignItems: "flex-start", gap: "10px", lineHeight: 1.5,
                }}
              >
                <span style={{ ...mono, fontSize: "10px", color: showAnswer && isCorrect ? TEAL : "#444", minWidth: "14px", marginTop: "1px", flexShrink: 0 }}>
                  {showAnswer && isCorrect ? "✓" : showAnswer && isSelected && !isCorrect ? "✗" : choice.id.toUpperCase()}
                </span>
                {choice.text}
              </button>
            );
          })}
        </div>
        {showAnswer && (
          <div style={{ marginTop: "14px", padding: "14px", borderTop: "0.5px solid #1a1a2e" }}>
            <p style={{ fontSize: "11px", ...mono, color: "#444", letterSpacing: "0.06em", marginBottom: "6px", textTransform: "uppercase" }}>
              Explanation
            </p>
            <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.65, fontWeight: 300 }}>
              {mockQuestion.explanation}
            </p>
          </div>
        )}
        <div style={{ marginTop: "14px" }}>
          {!showAnswer ? (
            <button
              onClick={() => { if (selected) setShowAnswer(true); }}
              style={{
                width: "100%", padding: "9px", fontSize: "11px", ...mono,
                letterSpacing: "0.08em", textTransform: "uppercase",
                border: `0.5px solid ${selected ? TEAL : "#1a1a2e"}`,
                background: "transparent", color: selected ? TEAL : "#444",
                cursor: selected ? "pointer" : "not-allowed", transition: "color 0.15s, border-color 0.15s",
              }}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={reset}
              style={{
                width: "100%", padding: "9px", fontSize: "11px", ...mono,
                letterSpacing: "0.08em", textTransform: "uppercase",
                border: "0.5px solid #1a1a2e", background: "transparent", color: "#666", cursor: "pointer",
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat demo ──────────────────────────────────────────────────────────────
function ChatDemo() {
  return (
    <div style={{ background: "#080d1a", border: "0.5px solid #1a1a2e" }}>
      <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #1a1a2e", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ ...mono, fontSize: "10px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase" }}>BrainBot AI Tutor</span>
        <span style={{ fontSize: "8px", padding: "1px 5px", background: "rgba(0,196,180,0.1)", color: TEAL, border: `0.5px solid rgba(0,196,180,0.3)`, ...mono, fontWeight: 700 }}>FAST</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div style={{ textAlign: "right", marginBottom: "16px" }}>
          <span style={{ fontSize: "13px", color: "#E0E8F0", fontWeight: 300, borderRight: `1.5px solid rgba(0,196,180,0.3)`, paddingRight: "12px" }}>
            How do I remember the Krebs cycle?
          </span>
        </div>
        <div style={{ borderLeft: `0.5px solid ${TEAL}`, paddingLeft: "14px", marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.65, fontWeight: 300 }}>
            Try the acronym <strong style={{ color: "#E0E8F0", fontWeight: 500 }}>PCISSFM</strong>: Pyruvate → Citrate → Isocitrate → Succinate → Succinyl → Fumarate → Malate. Make a silly sentence and it'll stick. Want practice questions?
          </p>
        </div>
        <div style={{ borderTop: "0.5px solid #1a1a2e", paddingTop: "14px", display: "flex", gap: "8px" }}>
          <div style={{ flex: 1, padding: "8px 12px", border: "0.5px solid #1a1a2e", fontSize: "12px", color: "#444", background: "transparent" }}>
            Ask about any topic...
          </div>
          <button style={{ padding: "8px 14px", border: `0.5px solid ${TEAL}`, background: "transparent", color: TEAL, cursor: "pointer", fontSize: "14px" }}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main landing ───────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        background: "#05080f", color: "#E0E8F0",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Stars */}
      <StarField />

      {/* Nav */}
      <nav
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", height: 48,
          borderBottom: "0.5px solid #1a1a2e",
          background: "rgba(5,8,15,0.85)", backdropFilter: "blur(16px)",
          position: "sticky", top: 0, zIndex: 50,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "#E0E8F0", ...mono }}>
          STUDENIUS
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[["Pricing", "/pricing"], ["Login", "/login"]].map(([label, href]) => (
            <Link
              key={href} to={href}
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#444", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#E0E8F0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
            >
              {label}
            </Link>
          ))}
          <Link to="/signup">
            <button
              style={{
                fontSize: 11, fontWeight: 600, color: "#05080f", background: TEAL,
                border: "none", padding: "6px 16px", cursor: "pointer",
                letterSpacing: "0.06em", transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          padding: "100px 32px 80px", maxWidth: "720px",
          margin: "0 auto", width: "100%", position: "relative", zIndex: 1,
        }}
      >
        <p style={{ ...mono, fontSize: "10px", color: TEAL, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "32px" }}>
          AI-Powered Study Platform
        </p>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 300,
            letterSpacing: "-0.035em", lineHeight: 1.06, marginBottom: "20px", color: "#E0E8F0",
          }}
        >
          Study smarter.<br />
          <span style={{ color: "#2a3a5a" }}>Master it faster.</span>
        </h1>
        <p
          style={{
            fontSize: "15px", color: "#555", maxWidth: "480px",
            marginBottom: "36px", lineHeight: 1.75, fontWeight: 300,
          }}
        >
          12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall, confidence tracking and more. Built for students who demand results.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <Link to="/signup">
            <button
              style={{
                fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600, color: "#05080f", background: TEAL, border: "none",
                padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.82")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Start for free →
            </button>
          </Link>
          <Link to="/dashboard">
            <button
              style={{
                fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 300, color: "#444", background: "transparent",
                border: "none", cursor: "pointer", transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#E0E8F0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
            >
              See Dashboard
            </button>
          </Link>
        </div>
        <p style={{ ...mono, fontSize: "10px", color: "#2a3a5a", marginTop: "18px", letterSpacing: "0.06em" }}>
          No credit card required · Free plan always available
        </p>
      </section>

      {/* Stats */}
      <div style={hairline} />
      <div style={{ background: "rgba(8,13,26,0.9)", borderBottom: "0.5px solid #1a1a2e", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", gap: "48px", flexWrap: "wrap" }}>
          {[
            { value: "12+",  label: "AI Study Tools" },
            { value: "50k+", label: "Students" },
            { value: "2M+",  label: "Questions Generated" },
            { value: "94%",  label: "Pass Rate" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ ...mono, fontSize: "20px", fontWeight: 500, color: TEAL, letterSpacing: "-0.01em" }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "#444", textTransform: "uppercase", letterSpacing: "0.10em", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CINEMATIC scroll section ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <CinematicSection />
      </div>

      {/* ── Content sections ── */}
      <div style={{ position: "relative", zIndex: 1, background: "#05080f" }}>

        {/* Demo */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <div style={sectionLabel}>
            <span>See it in action</span>
            <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1a1a2e" }}>
            <PracticeDemo />
            <ChatDemo />
          </div>
        </div>

        <div style={hairline} />

        {/* Upload */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <div style={sectionLabel}>
            <span>Upload anything</span>
            <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
          </div>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>
            Upload anything, learn everything
          </h2>
          <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px", fontWeight: 300 }}>
            Every tool reads from your uploaded materials automatically — upload once, use everywhere.
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { icon: FileText,  label: "PDF Notes" },
              { icon: ImageIcon, label: "Images" },
              { icon: Mic,       label: "Voice Notes" },
              { icon: Hash,      label: "Topic Name" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 14px", border: "0.5px solid #1a1a2e",
                  cursor: "default", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = TEAL)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#1a1a2e")}
              >
                <item.icon style={{ width: 13, height: 13, color: "#444" }} />
                <span style={{ ...mono, fontSize: "11px", color: "#666", letterSpacing: "0.04em" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* Features */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <div style={sectionLabel}>
            <span>Tools</span>
            <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1a1a2e" }}>
            {features.map((f) => (
              <div
                key={f.n}
                style={{ background: "#080d1a", padding: "20px 24px", transition: "background 0.15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0d1525")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#080d1a")}
              >
                <div style={{ ...mono, fontSize: "10px", color: "#222", marginBottom: "10px", letterSpacing: "0.06em" }}>{f.n}</div>
                <div style={{ fontSize: "13px", color: "#E0E8F0", fontWeight: 500, marginBottom: "4px", letterSpacing: "-0.01em" }}>{f.title}</div>
                <div style={{ fontSize: "12px", color: "#444", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* Testimonials */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <div style={sectionLabel}>
            <span>Testimonials</span>
            <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1a1a2e" }}>
            {testimonials.map((t) => (
              <div key={t.name} style={{ background: "#080d1a", padding: "20px 24px" }}>
                <div style={{ ...mono, fontSize: "10px", color: "#444", letterSpacing: "0.06em", marginBottom: "10px" }}>
                  {t.name} — {t.role}
                </div>
                <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.65, fontWeight: 300 }}>"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* CTA */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "72px 32px" }}>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>
            Ready to study smarter?
          </h2>
          <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px", fontWeight: 300 }}>
            Start free. No credit card required.
          </p>
          <Link to="/signup">
            <button
              style={{
                fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600, color: "#05080f", background: TEAL, border: "none",
                padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.82")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Get started free →
            </button>
          </Link>
        </div>

        {/* Footer */}
        <footer style={{ borderTop: "0.5px solid #1a1a2e" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...mono, fontSize: "10px", color: "#222", letterSpacing: "0.06em" }}>
              STUDENIUS © {new Date().getFullYear()}
            </span>
            <div style={{ display: "flex", gap: "20px" }}>
              {[["Pricing", "/pricing"], ["Login", "/login"], ["Sign Up", "/signup"]].map(([label, href]) => (
                <Link
                  key={href} to={href}
                  style={{ fontSize: "11px", color: "#444", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#666")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#444")}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
