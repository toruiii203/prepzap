import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FileText, Hash, Mic, Image as ImageIcon } from "lucide-react";

// ── brand ──────────────────────────────────────────────────────────────────
const TEAL = "#00C4B4";
const GOLD = "#E8B923";
const PURPLE = "#7B5EA7";
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
  { n: "01", title: "AI Tutor (BrainBot)", desc: "Ask anything — Explain, ELI5, Analogy, Quiz, Debate, Summary" },
  { n: "02", title: "Practice & Flashcards", desc: "AI-generated questions and spaced-repetition from your materials" },
  { n: "03", title: "Cram Mode", desc: "Emergency timed session — AI breaks subjects into prioritised topics" },
  { n: "04", title: "High Yield Detector", desc: "Identifies the most testable concepts and drills you instantly" },
  { n: "05", title: "Recall Mode", desc: "Type from memory and get scored — the hardest way to study" },
  { n: "06", title: "Confidence Calibration", desc: "Sort every concept into Know / Shaky / No idea" },
  { n: "07", title: "Mistake Journal", desc: "Log errors with spaced-repetition — overdue items resurface" },
  { n: "08", title: "Roadmap Generator", desc: "Zero-to-mastery plan for any subject, broken into phases" },
  { n: "09", title: "Feynman Mode", desc: "Teach the AI — it pokes holes until you truly understand" },
  { n: "10", title: "Source Library", desc: "Upload PDFs, images, or notes — every tool reads them" },
  { n: "11", title: "Study DNA", desc: "Your living learner profile — adapts and reveals your patterns" },
  { n: "12", title: "Focus Timer + Progress", desc: "Built-in Pomodoro with activity tracking and session analytics" },
];

const testimonials = [
  { name: "Maria S.", role: "Nursing Student", text: "Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try." },
  { name: "James W.", role: "Medical Student", text: "Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly." },
  { name: "Sarah C.", role: "Teacher", text: "Feynman Mode exposed every gap in my knowledge. Not just for exams — for any subject." },
  { name: "Ahmed R.", role: "Engineering Student", text: "High Yield Detector told me exactly what to study before finals. Went from C to A." },
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

// ── useScrollY hook ────────────────────────────────────────────────────────
function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrollY;
}

// ── useInView hook ─────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Star canvas ────────────────────────────────────────────────────────────
function StarField({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const stars: { x: number; y: number; r: number; o: number; speed: number; layer: number }[] = [];

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 400; i++) {
      stars.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.4 + 0.2,
        o: Math.random() * 0.8 + 0.1,
        speed: Math.random() * 0.003 + 0.001,
        layer: Math.floor(Math.random() * 3), // 0=far, 1=mid, 2=near
      });
    }

    let t = 0;
    function draw() {
      t += 1;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of stars) {
        const parallaxOffset = [0.02, 0.06, 0.12][s.layer] * scrollY;
        const pulse = s.o * (0.6 + 0.4 * Math.sin(t * s.speed * 60));
        const colors = [
          `rgba(200,220,255,${pulse})`,
          `rgba(180,240,230,${pulse * 0.7})`,
          `rgba(232,185,35,${pulse * 0.4})`,
        ];
        ctx.beginPath();
        ctx.arc(s.x, (s.y - parallaxOffset) % c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = colors[s.layer];
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [scrollY]);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.9 }}
    />
  );
}

// ── Nebula background layers ───────────────────────────────────────────────
function NebulaLayer({ scrollY }: { scrollY: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      {/* Deep nebula 1 */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 80% 60% at 20% ${30 - scrollY * 0.008}%, rgba(123,94,167,0.12) 0%, transparent 65%)`,
      }} />
      {/* Deep nebula 2 */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 60% 50% at 80% ${60 + scrollY * 0.005}%, rgba(0,196,180,0.07) 0%, transparent 60%)`,
      }} />
      {/* Warm glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 40% 30% at 55% ${80 - scrollY * 0.003}%, rgba(232,185,35,0.04) 0%, transparent 50%)`,
      }} />
    </div>
  );
}

// ── Floating Planets ───────────────────────────────────────────────────────
function FloatingPlanets({ scrollY }: { scrollY: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Large distant planet - top right */}
      <div style={{
        position: "absolute",
        right: "-40px",
        top: `${-80 + scrollY * 0.15}px`,
        width: "280px",
        height: "280px",
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #1a2a5a, #060d1f)",
        boxShadow: "inset -20px -20px 60px rgba(0,0,0,0.8), 0 0 60px rgba(123,94,167,0.15)",
        border: "0.5px solid rgba(123,94,167,0.2)",
        opacity: 0.6,
      }}>
        {/* Planet rings */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%) rotateX(75deg)",
          width: "380px", height: "380px",
          borderRadius: "50%",
          border: "8px solid rgba(123,94,167,0.15)",
          boxShadow: "0 0 0 12px rgba(123,94,167,0.08)",
        }} />
      </div>

      {/* Small planet - left mid */}
      <div style={{
        position: "absolute",
        left: "-20px",
        top: `${400 + scrollY * 0.08}px`,
        width: "120px",
        height: "120px",
        borderRadius: "50%",
        background: "radial-gradient(circle at 40% 30%, #1a3a2a, #040c0c)",
        boxShadow: "inset -10px -10px 30px rgba(0,0,0,0.8), 0 0 30px rgba(0,196,180,0.1)",
        border: "0.5px solid rgba(0,196,180,0.15)",
        opacity: 0.5,
      }} />

      {/* Tiny asteroid - bottom right */}
      <div style={{
        position: "absolute",
        right: "8%",
        top: `${900 + scrollY * 0.2}px`,
        width: "40px",
        height: "40px",
        borderRadius: "40% 60% 55% 45%",
        background: "#1a1a2e",
        boxShadow: "0 0 20px rgba(232,185,35,0.08)",
        opacity: 0.4,
        transform: `rotate(${scrollY * 0.05}deg)`,
      }} />
    </div>
  );
}

// ── Tilt card wrapper ──────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current!;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -6, y: dx * 6 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false); }}
      style={{
        ...style,
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? "translateZ(8px)" : "translateZ(0)"}`,
        transition: hovered ? "transform 0.1s ease-out" : "transform 0.4s ease-out",
      }}
    >
      {children}
    </div>
  );
}

// ── Reveal on scroll ───────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── Glitch text effect ─────────────────────────────────────────────────────
function GlitchText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const [glitching, setGlitching] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      setTimeout(() => setGlitching(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span style={{ position: "relative", display: "inline-block", ...style }}>
      {text}
      {glitching && (
        <>
          <span style={{
            position: "absolute", left: "2px", top: 0,
            color: TEAL, opacity: 0.7, clipPath: "inset(30% 0 50% 0)",
          }}>{text}</span>
          <span style={{
            position: "absolute", left: "-2px", top: 0,
            color: GOLD, opacity: 0.5, clipPath: "inset(60% 0 20% 0)",
          }}>{text}</span>
        </>
      )}
    </span>
  );
}

// ── Orbital ring animation ─────────────────────────────────────────────────
function OrbitalRings() {
  return (
    <div style={{
      position: "absolute", right: "-100px", top: "50%",
      transform: "translateY(-50%)",
      width: "500px", height: "500px",
      pointerEvents: "none", opacity: 0.15,
    }}>
      <style>{`
        @keyframes orbit1 { from { transform: rotateX(75deg) rotateZ(0deg); } to { transform: rotateX(75deg) rotateZ(360deg); } }
        @keyframes orbit2 { from { transform: rotateX(65deg) rotateZ(120deg); } to { transform: rotateX(65deg) rotateZ(480deg); } }
        @keyframes orbit3 { from { transform: rotateX(80deg) rotateZ(240deg); } to { transform: rotateX(80deg) rotateZ(600deg); } }
        @keyframes float-astronaut { 0%,100% { transform: translateY(0px) rotate(-5deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes data-flow { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        @keyframes nebula-drift { 0%,100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.05) rotate(2deg); } }
        @keyframes text-reveal { from { clip-path: inset(0 100% 0 0); opacity:0; } to { clip-path: inset(0 0% 0 0); opacity:1; } }
        @keyframes star-twinkle { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes scanline { from{top:0} to{top:100%} }
      `}</style>
      {[
        { size: 300, duration: "12s", color: TEAL },
        { size: 400, duration: "18s", color: PURPLE },
        { size: 200, duration: "8s", color: GOLD },
      ].map((ring, i) => (
        <div key={i} style={{
          position: "absolute",
          left: "50%", top: "50%",
          marginLeft: `-${ring.size / 2}px`,
          marginTop: `-${ring.size / 2}px`,
          width: ring.size, height: ring.size,
          borderRadius: "50%",
          border: `1px solid ${ring.color}`,
          animation: `orbit${i + 1} ${ring.duration} linear infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Astronaut (upgraded with float animation) ──────────────────────────────
function AstronautScene({ progress }: { progress: number }) {
  const y = -60 + progress * 160;
  const rotate = -8 + progress * 20;
  const opacity = progress < 0.05 ? progress / 0.05 : progress > 0.85 ? (1 - progress) / 0.15 : 1;

  return (
    <div style={{
      position: "absolute", left: "50%", top: "50%",
      transform: `translate(-50%, calc(-50% + ${y}px)) rotate(${rotate}deg)`,
      opacity,
      transition: "opacity 0.3s",
      pointerEvents: "none", userSelect: "none",
      width: "min(520px, 80vw)",
      animation: "float-astronaut 6s ease-in-out infinite",
    }}>
      <svg viewBox="0 0 520 480" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", filter: "drop-shadow(0 0 40px rgba(0,196,180,0.25)) drop-shadow(0 0 80px rgba(123,94,167,0.15))" }}>
        <ellipse cx="260" cy="440" rx="160" ry="18" fill="rgba(0,196,180,0.06)" />
        <circle cx="390" cy="80" r="54" fill="#0d1b3e" stroke="rgba(0,196,180,0.25)" strokeWidth="1" />
        <circle cx="390" cy="80" r="54" fill="url(#pgrad)" />
        <ellipse cx="390" cy="80" rx="74" ry="16" fill="none" stroke="rgba(0,196,180,0.4)" strokeWidth="1.2" />
        <defs>
          <radialGradient id="pgrad" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#1a3a6e" />
            <stop offset="100%" stopColor="#060d1f" />
          </radialGradient>
        </defs>
        <g transform="translate(140,120)">
          <ellipse cx="120" cy="68" rx="56" ry="60" fill="#0e1628" stroke="rgba(200,220,255,0.18)" strokeWidth="1.5" />
          <ellipse cx="120" cy="64" rx="38" ry="40" fill="rgba(0,196,180,0.08)" stroke="rgba(0,196,180,0.3)" strokeWidth="1" />
          <ellipse cx="108" cy="50" rx="10" ry="6" fill="rgba(255,255,255,0.07)" transform="rotate(-15,108,50)" />
          <circle cx="118" cy="60" r="1.2" fill="rgba(200,220,255,0.6)" style={{ animation: "star-twinkle 2s ease-in-out infinite" }} />
          <circle cx="130" cy="52" r="0.8" fill="rgba(200,220,255,0.5)" style={{ animation: "star-twinkle 3s ease-in-out infinite 0.5s" }} />
          <circle cx="112" cy="75" r="0.8" fill="rgba(200,220,255,0.4)" style={{ animation: "star-twinkle 2.5s ease-in-out infinite 1s" }} />
          <rect x="78" y="122" width="84" height="90" rx="20" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" />
          <rect x="98" y="142" width="44" height="28" rx="5" fill="rgba(0,196,180,0.1)" stroke="rgba(0,196,180,0.3)" strokeWidth="0.8" />
          <line x1="120" y1="148" x2="120" y2="164" stroke="rgba(0,196,180,0.5)" strokeWidth="0.8" />
          <line x1="108" y1="156" x2="132" y2="156" stroke="rgba(0,196,180,0.5)" strokeWidth="0.8" />
          <text x="120" y="181" textAnchor="middle" fill="rgba(0,196,180,0.6)"
            style={{ fontFamily: "monospace", fontSize: "6px", letterSpacing: "0.15em" }}>STUDENIUS</text>
          <path d="M78 140 Q40 160 30 195" stroke="rgba(200,220,255,0.15)" strokeWidth="1" fill="none" />
          <rect x="60" y="135" width="22" height="90" rx="11" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-30,71,180)" />
          <g transform="translate(-2,190) rotate(10)">
            <rect x="0" y="0" width="48" height="36" rx="3" fill="#00C4B4" opacity="0.85" />
            <rect x="4" y="4" width="40" height="28" rx="2" fill="#0a1a2e" />
            <line x1="8" y1="12" x2="36" y2="12" stroke="rgba(0,196,180,0.5)" strokeWidth="1" />
            <line x1="8" y1="18" x2="30" y2="18" stroke="rgba(0,196,180,0.3)" strokeWidth="1" />
            <line x1="8" y1="24" x2="26" y2="24" stroke="rgba(0,196,180,0.2)" strokeWidth="1" />
            <text x="24" y="10" textAnchor="middle" fill="rgba(0,196,180,0.8)"
              style={{ fontFamily: "monospace", fontSize: "5px", letterSpacing: "0.1em" }}>AI</text>
          </g>
          <rect x="162" y="130" width="22" height="80" rx="11" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(20,173,170)" />
          <rect x="86" y="206" width="30" height="70" rx="15" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-5,101,241)" />
          <rect x="124" y="206" width="30" height="70" rx="15" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(8,139,241)" />
          <ellipse cx="120" cy="280" rx="18" ry="6" fill="rgba(0,196,180,0.15)" />
          <ellipse cx="120" cy="284" rx="10" ry="4" fill="rgba(0,196,180,0.25)" />
        </g>
        {[
          { x: 60, y: 200, label: "E=mc²", o: 0.3 },
          { x: 400, y: 260, label: "∫f(x)dx", o: 0.25 },
          { x: 70, y: 370, label: "PV=nRT", o: 0.2 },
          { x: 380, y: 380, label: "F=ma", o: 0.25 },
        ].map((eq) => (
          <text key={eq.label} x={eq.x} y={eq.y} fill={`rgba(0,196,180,${eq.o})`}
            style={{ fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.05em" }}>
            {eq.label}
          </text>
        ))}
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

  const bgY = progress * 40;
  const midY = progress * 80;

  return (
    <div ref={sectionRef} style={{ position: "relative", height: "300vh" }}>
      <div style={{
        position: "sticky", top: 0, height: "100vh", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Nebula bg */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(ellipse 70% 60% at ${30 + progress * 20}% ${40 + bgY * 0.3}%, rgba(0,196,180,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at ${70 - progress * 15}% ${60 + bgY * 0.2}%, rgba(232,185,35,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(123,94,167,0.06) 0%, transparent 60%)
          `,
        }} />

        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(rgba(0,196,180,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,196,180,1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          transform: `translateY(${midY}px)`,
        }} />

        {/* Horizon glow */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "200px",
          background: "linear-gradient(transparent, rgba(0,196,180,0.04))",
        }} />

        {/* Astronaut */}
        <AstronautScene progress={progress} />

        {/* Scroll hint */}
        <div style={{
          position: "absolute", bottom: "14%", left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: progress < 0.15 ? progress / 0.15 : progress > 0.55 ? Math.max(0, 1 - (progress - 0.55) / 0.2) : 1,
        }}>
          <p style={{ ...mono, fontSize: "10px", color: "rgba(0,196,180,0.6)", letterSpacing: "0.2em", marginBottom: "8px" }}>
            SCROLL TO EXPLORE
          </p>
          <div style={{ width: "1px", height: "40px", background: "linear-gradient(rgba(0,196,180,0.6), transparent)", margin: "0 auto" }} />
        </div>

        {/* Headline reveal */}
        <div style={{
          position: "absolute", top: "14%", left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: progress < 0.1 ? 0 : progress < 0.3 ? (progress - 0.1) / 0.2 : progress > 0.75 ? Math.max(0, 1 - (progress - 0.75) / 0.15) : 1,
          width: "min(600px, 90vw)",
        }}>
          {progress < 0.5 ? (
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: "-0.03em", color: "#F0F0F0", lineHeight: 1.15 }}>
              Knowledge travels<br />
              <span style={{ color: TEAL }}>at the speed of curiosity.</span>
            </h2>
          ) : (
            <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 300, letterSpacing: "-0.03em", color: "#F0F0F0", lineHeight: 1.15 }}>
              AI-powered tools.<br />
              <span style={{ color: GOLD }}>Built for students who demand results.</span>
            </h2>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ position: "absolute", right: "32px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "1px", height: "80px", background: "#1a1a2e", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${progress * 100}%`, background: `linear-gradient(${TEAL}, ${GOLD})`, transition: "height 0.1s" }} />
          </div>
          <span style={{ ...mono, fontSize: "9px", color: "#333", letterSpacing: "0.1em", writingMode: "vertical-lr" }}>
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
  function reset() { setSelected(null); setShowAnswer(false); }

  return (
    <div style={{ background: "#080d1a", border: "0.5px solid #1a1a2e", padding: "20px" }}>
      <div style={{ ...mono, fontSize: "10px", color: "#444", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
        Practice Question
      </div>
      <p style={{ fontSize: "13px", color: "#C0CCD8", lineHeight: 1.6, fontWeight: 300, marginBottom: "16px" }}>
        {mockQuestion.text}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px" }}>
        {mockQuestion.choices.map((c) => {
          const isCorrect = showAnswer && c.id === mockQuestion.correct;
          const isWrong = showAnswer && c.id === selected && c.id !== mockQuestion.correct;
          return (
            <div
              key={c.id}
              onClick={() => !showAnswer && setSelected(c.id)}
              style={{
                padding: "9px 12px", border: `0.5px solid ${isCorrect ? TEAL : isWrong ? "#ff4444" : c.id === selected ? TEAL : "#1a1a2e"}`,
                cursor: showAnswer ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: "10px",
                background: isCorrect ? "rgba(0,196,180,0.06)" : isWrong ? "rgba(255,68,68,0.04)" : "transparent",
                transition: "all 0.2s",
              }}
            >
              <span style={{ ...mono, fontSize: "9px", color: c.id === selected || isCorrect ? TEAL : "#333", minWidth: "14px" }}>{c.id}</span>
              <span style={{ fontSize: "12px", color: "#666", fontWeight: 300, lineHeight: 1.5 }}>{c.text}</span>
            </div>
          );
        })}
      </div>
      {showAnswer && (
        <div style={{ borderTop: "0.5px solid #1a1a2e", paddingTop: "12px", marginBottom: "12px" }}>
          <p style={{ ...mono, fontSize: "11px", color: "#444", letterSpacing: "0.06em", marginBottom: "6px", textTransform: "uppercase" }}>Explanation</p>
          <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.65, fontWeight: 300 }}>{mockQuestion.explanation}</p>
        </div>
      )}
      <div style={{ marginTop: "14px" }}>
        {!showAnswer ? (
          <button onClick={() => { if (selected) setShowAnswer(true); }} style={{
            width: "100%", padding: "9px", fontSize: "11px", ...mono,
            letterSpacing: "0.08em", textTransform: "uppercase",
            border: `0.5px solid ${selected ? TEAL : "#1a1a2e"}`,
            background: "transparent", color: selected ? TEAL : "#444",
            cursor: selected ? "pointer" : "not-allowed", transition: "color 0.15s, border-color 0.15s",
          }}>Check Answer</button>
        ) : (
          <button onClick={reset} style={{
            width: "100%", padding: "9px", fontSize: "11px", ...mono,
            letterSpacing: "0.08em", textTransform: "uppercase",
            border: "0.5px solid #1a1a2e", background: "transparent", color: "#666", cursor: "pointer",
          }}>Try Again</button>
        )}
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
        <span style={{ fontSize: "8px", padding: "1px 5px", background: "rgba(0,196,180,0.1)", color: TEAL, border: `0.5px solid rgba(0,196,180,0.3)`, ...mono, fontWeight: 700 }}>LIVE</span>
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
          <button style={{ padding: "8px 14px", border: `0.5px solid ${TEAL}`, background: "transparent", color: TEAL, cursor: "pointer", fontSize: "14px" }}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Stats counter ──────────────────────────────────────────────────────────
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const { ref, inView } = useInView(0.5);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(16px)", transition: "all 0.6s ease" }}>
      <div style={{ ...mono, fontSize: "20px", fontWeight: 500, color: TEAL, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: "10px", color: "#444", textTransform: "uppercase", letterSpacing: "0.10em", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

// ── Main landing ───────────────────────────────────────────────────────────
export default function Landing() {
  const scrollY = useScrollY();
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    setNavScrolled(scrollY > 20);
  }, [scrollY]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "#05080f", color: "#E0E8F0",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Background layers */}
      <StarField scrollY={scrollY} />
      <NebulaLayer scrollY={scrollY} />
      <FloatingPlanets scrollY={scrollY} />

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 48,
        borderBottom: navScrolled ? "0.5px solid rgba(0,196,180,0.15)" : "0.5px solid #1a1a2e",
        background: navScrolled ? "rgba(5,8,15,0.95)" : "rgba(5,8,15,0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
        transition: "background 0.3s, border-color 0.3s",
        boxShadow: navScrolled ? `0 1px 30px rgba(0,196,180,0.06)` : "none",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "#E0E8F0", ...mono }}>
          STUDENIUS
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {[["Pricing", "/pricing"], ["Login", "/login"]].map(([label, href]) => (
            <Link key={href} to={href}
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#444", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#E0E8F0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}>
              {label}
            </Link>
          ))}
          <Link to="/signup">
            <button style={{
              fontSize: 11, fontWeight: 600, color: "#05080f", background: TEAL,
              border: "none", padding: "6px 16px", cursor: "pointer",
              letterSpacing: "0.06em", transition: "opacity 0.15s, box-shadow 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; e.currentTarget.style.boxShadow = `0 0 20px rgba(0,196,180,0.4)`; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "none"; }}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: "100px 32px 80px", maxWidth: "720px",
        margin: "0 auto", width: "100%", position: "relative", zIndex: 1,
      }}>
        {/* Orbital rings in hero */}
        <OrbitalRings />

        <Reveal delay={0}>
          <p style={{ ...mono, fontSize: "10px", color: TEAL, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "32px", animation: "pulse-glow 3s ease-in-out infinite" }}>
            AI-Powered Study Platform
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 300,
            letterSpacing: "-0.035em", lineHeight: 1.06, marginBottom: "20px", color: "#E0E8F0",
          }}>
            <GlitchText text="Study smarter." /><br />
            <span style={{
              background: `linear-gradient(135deg, ${TEAL}, ${PURPLE})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Master it faster.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{
            fontSize: "15px", color: "#555", maxWidth: "480px",
            marginBottom: "36px", lineHeight: 1.75, fontWeight: 300,
          }}>
            12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall, confidence tracking and more. Built for students who demand results.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link to="/signup">
              <button style={{
                fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600, color: "#05080f", background: TEAL, border: "none",
                padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em",
                transition: "opacity 0.15s, box-shadow 0.2s, transform 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.boxShadow = `0 0 32px rgba(0,196,180,0.5)`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                Start for free →
              </button>
            </Link>
            <Link to="/dashboard">
              <button style={{
                fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 300, color: "#444", background: "transparent",
                border: "none", cursor: "pointer", transition: "color 0.15s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#E0E8F0")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}>
                See Dashboard
              </button>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p style={{ ...mono, fontSize: "10px", color: "#2a3a5a", marginTop: "18px", letterSpacing: "0.06em" }}>
            No credit card required · Free plan always available
          </p>
        </Reveal>
      </section>

      {/* Stats */}
      <div style={hairline} />
      <div style={{ background: "rgba(8,13,26,0.9)", borderBottom: "0.5px solid #1a1a2e", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", gap: "48px", flexWrap: "wrap" }}>
          {[
            { value: "12+", label: "AI Study Tools" },
            { value: "50k+", label: "Students" },
            { value: "2M+", label: "Questions Generated" },
            { value: "94%", label: "Pass Rate" },
          ].map((s) => <AnimatedStat key={s.label} value={s.value} label={s.label} />)}
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
          <Reveal>
            <div style={sectionLabel}>
              <span>See it in action</span>
              <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1a1a2e" }}>
              <PracticeDemo />
              <ChatDemo />
            </div>
          </Reveal>
        </div>

        <div style={hairline} />

        {/* Upload */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <Reveal>
            <div style={sectionLabel}>
              <span>Upload anything</span>
              <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Upload anything, learn everything
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px", fontWeight: 300 }}>
              Every tool reads from your uploaded materials automatically — upload once, use everywhere.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { icon: FileText, label: "PDF Notes" },
                { icon: ImageIcon, label: "Images" },
                { icon: Mic, label: "Voice Notes" },
                { icon: Hash, label: "Topic Name" },
              ].map((item) => (
                <TiltCard key={item.label}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 14px", border: "0.5px solid #1a1a2e",
                    cursor: "default", transition: "border-color 0.15s, box-shadow 0.2s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = TEAL; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px rgba(0,196,180,0.1)`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1a1a2e"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    <item.icon style={{ width: 13, height: 13, color: "#444" }} />
                    <span style={{ ...mono, fontSize: "11px", color: "#666", letterSpacing: "0.04em" }}>{item.label}</span>
                  </div>
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>

        <div style={hairline} />

        {/* Features */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <Reveal>
            <div style={sectionLabel}>
              <span>Tools</span>
              <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1a1a2e" }}>
            {features.map((f, i) => (
              <Reveal key={f.n} delay={i * 0.04}>
                <TiltCard style={{ height: "100%" }}>
                  <div style={{
                    background: "#080d1a", padding: "20px 24px",
                    transition: "background 0.2s, box-shadow 0.2s",
                    height: "100%", boxSizing: "border-box",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#0d1525"; (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 0 30px rgba(0,196,180,0.04)`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#080d1a"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    <div style={{ ...mono, fontSize: "10px", color: "#222", marginBottom: "10px", letterSpacing: "0.06em" }}>{f.n}</div>
                    <div style={{ fontSize: "13px", color: "#E0E8F0", fontWeight: 500, marginBottom: "4px", letterSpacing: "-0.01em" }}>{f.title}</div>
                    <div style={{ fontSize: "12px", color: "#444", lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* Testimonials */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "64px 32px" }}>
          <Reveal>
            <div style={sectionLabel}>
              <span>Testimonials</span>
              <span style={{ flex: 1, height: "0.5px", background: "#1a1a2e", display: "block" }} />
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "#1a1a2e" }}>
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <div style={{ background: "#080d1a", padding: "20px 24px", transition: "background 0.2s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0d1525")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#080d1a")}>
                  <div style={{ ...mono, fontSize: "10px", color: "#444", letterSpacing: "0.06em", marginBottom: "10px" }}>
                    {t.name} — {t.role}
                  </div>
                  <p style={{ fontSize: "13px", color: "#555", lineHeight: 1.65, fontWeight: 300 }}>"{t.text}"</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* CTA */}
        <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%", padding: "72px 32px", position: "relative" }}>
          {/* CTA glow */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,196,180,0.04) 0%, transparent 70%)`,
          }} />
          <Reveal>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 300, letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Ready to study smarter?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontSize: "14px", color: "#555", marginBottom: "28px", fontWeight: 300 }}>
              Start free. No credit card required.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link to="/signup">
              <button style={{
                fontSize: "12px", fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600, color: "#05080f", background: TEAL, border: "none",
                padding: "10px 24px", cursor: "pointer", letterSpacing: "0.03em",
                transition: "opacity 0.15s, box-shadow 0.2s, transform 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.boxShadow = `0 0 40px rgba(0,196,180,0.5)`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                Get started free →
              </button>
            </Link>
          </Reveal>
        </div>

        {/* Footer */}
        <footer style={{ borderTop: "0.5px solid #1a1a2e" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...mono, fontSize: "10px", color: "#222", letterSpacing: "0.06em" }}>
              STUDENIUS © {new Date().getFullYear()}
            </span>
            <div style={{ display: "flex", gap: "20px" }}>
              {[["Pricing", "/pricing"], ["Login", "/login"], ["Sign Up", "/signup"]].map(([label, href]) => (
                <Link key={href} to={href}
                  style={{ fontSize: "11px", color: "#444", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#666")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#444")}>
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
