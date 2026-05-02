import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { FileText, Hash, Mic, Image as ImageIcon } from "lucide-react";

// ── Brand palette ──────────────────────────────────────────────────────────
const TEAL   = "#00C4B4";
const GOLD   = "#E8B923";
const PURPLE = "#7B5EA7";
const VOID   = "#03050F";
const mono: React.CSSProperties = {
  fontFamily: "'Geist Mono', 'Courier New', monospace",
};

// ── CSS injected once ──────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  ::selection { background: rgba(0,196,180,0.25); }

  @keyframes float-astronaut {
    0%,100% { transform: translateY(0px) rotate(-4deg); }
    50%      { transform: translateY(-22px) rotate(5deg); }
  }
  @keyframes pulse-glow {
    0%,100% { opacity:0.55; }
    50%      { opacity:1; }
  }
  @keyframes orbit1 { from { transform:rotateX(75deg) rotateZ(0deg); }   to { transform:rotateX(75deg) rotateZ(360deg); } }
  @keyframes orbit2 { from { transform:rotateX(65deg) rotateZ(120deg); } to { transform:rotateX(65deg) rotateZ(480deg); } }
  @keyframes orbit3 { from { transform:rotateX(80deg) rotateZ(240deg); } to { transform:rotateX(80deg) rotateZ(600deg); } }
  @keyframes star-twinkle { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
  @keyframes scanline { from{top:-2px} to{top:100%} }
  @keyframes drift-eq {
    0%   { transform: translateY(0px) translateX(0px) rotate(0deg);   opacity: var(--o); }
    33%  { transform: translateY(-8px) translateX(5px) rotate(2deg);  opacity: calc(var(--o)*0.7); }
    66%  { transform: translateY(4px)  translateX(-3px) rotate(-1deg); opacity: var(--o); }
    100% { transform: translateY(0px)  translateX(0px) rotate(0deg);  opacity: var(--o); }
  }
  @keyframes binary-fall {
    from { transform: translateY(-40px); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    to   { transform: translateY(120vh); opacity: 0; }
  }
  @keyframes rim-pulse {
    0%,100% { box-shadow: 0 0 60px rgba(0,196,180,0.12); }
    50%      { box-shadow: 0 0 100px rgba(0,196,180,0.22); }
  }
  @keyframes god-ray-pulse {
    0%,100% { opacity:0.03; }
    50%      { opacity:0.07; }
  }
  @keyframes glitch-clip1 {
    0%,100% { clip-path: inset(20% 0 55% 0); transform: translate(-2px,0); }
    50%     { clip-path: inset(35% 0 15% 0); transform: translate(3px,0); }
  }
  @keyframes glitch-clip2 {
    0%,100% { clip-path: inset(65% 0 8% 0); transform: translate(2px,0); }
    50%     { clip-path: inset(5% 0 70% 0);  transform: translate(-1px,0); }
  }
  @keyframes cinematic-zoom {
    0% { transform: scale(1); filter: blur(0px); }
    50% { transform: scale(1.08); filter: blur(0.3px); }
    100% { transform: scale(1); filter: blur(0px); }
  }
  @keyframes text-reveal {
    0% { clip-path: inset(0 100% 0 0); opacity: 0; }
    100% { clip-path: inset(0 0 0 0); opacity: 1; }
  }
  @keyframes fade-up {
    0% { opacity: 0; transform: translateY(60px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes vortex-spin {
    0% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(360deg) scale(1.5); }
  }
  @keyframes chromatic-shift {
    0%,100% { text-shadow: -2px 0 rgba(0,196,180,0.5), 2px 0 rgba(232,185,35,0.5); }
    50% { text-shadow: -4px 0 rgba(0,196,180,0.8), 4px 0 rgba(232,185,35,0.8); }
  }
  @keyframes grain-move {
    0% { transform: translate(0, 0); }
    25% { transform: translate(-5%, -5%); }
    50% { transform: translate(-10%, 5%); }
    75% { transform: translate(5%, -10%); }
    100% { transform: translate(0, 0); }
  }
`;

// ── Data ───────────────────────────────────────────────────────────────────
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
  { n:"01", title:"AI Tutor (BrainBot)",     desc:"Ask anything — Explain, ELI5, Analogy, Quiz, Debate, Summary" },
  { n:"02", title:"Practice & Flashcards",   desc:"AI-generated questions and spaced-repetition from your materials" },
  { n:"03", title:"Cram Mode",               desc:"Emergency timed session — AI breaks subjects into prioritised topics" },
  { n:"04", title:"High Yield Detector",     desc:"Identifies the most testable concepts and drills you instantly" },
  { n:"05", title:"Recall Mode",             desc:"Type from memory and get scored — the hardest way to study" },
  { n:"06", title:"Confidence Calibration",  desc:"Sort every concept into Know / Shaky / No idea" },
  { n:"07", title:"Mistake Journal",         desc:"Log errors with spaced-repetition — overdue items resurface" },
  { n:"08", title:"Roadmap Generator",       desc:"Zero-to-mastery plan for any subject, broken into phases" },
  { n:"09", title:"Feynman Mode",            desc:"Teach the AI — it pokes holes until you truly understand" },
  { n:"10", title:"Source Library",          desc:"Upload PDFs, images, or notes — every tool reads them" },
  { n:"11", title:"Study DNA",               desc:"Your living learner profile — adapts and reveals your patterns" },
  { n:"12", title:"Focus Timer + Progress",  desc:"Built-in Pomodoro with activity tracking and session analytics" },
];

const testimonials = [
  { name:"Maria S.",  role:"Nursing Student",      text:"Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try." },
  { name:"James W.",  role:"Medical Student",       text:"Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly." },
  { name:"Sarah C.",  role:"Teacher",              text:"Feynman Mode exposed every gap in my knowledge. Not just for exams — for any subject." },
  { name:"Ahmed R.",  role:"Engineering Student",  text:"High Yield Detector told me exactly what to study before finals. Went from C to A." },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const hairline: React.CSSProperties = { height:"0.5px", background:"#0d1220", margin:0 };
const sectionLabel: React.CSSProperties = {
  ...mono, fontSize:"10px", color:"#444", letterSpacing:"0.14em",
  textTransform:"uppercase", marginBottom:"40px",
  display:"flex", alignItems:"center", gap:"12px",
};

function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);
  return scrollY;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── ★ Layer A+B+C Star field with parallax ─────────────────────────────────
function StarField({ scrollY }: { scrollY: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<{
    x:number; y:number; r:number; o:number; sp:number; layer:number;
    phase:number; freq:number; warm:boolean; spike:boolean;
  }[]>([]);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf: number;

    function resize() { c.width=window.innerWidth; c.height=window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    const stars = starsRef.current;
    stars.length = 0;

    // Layer A — 1800 micro-stars (far)
    for (let i=0;i<1800;i++) {
      const gx = (Math.random()*2-1)*0.8;
      const x = Math.random()*c.width + gx*(c.width*0.2);
      stars.push({
        x: Math.max(0,Math.min(c.width,x)),
        y: Math.random()*c.height*3,
        r: Math.random()*0.5+0.15, o:Math.random()*0.7+0.1,
        sp:Math.random()*0.004+0.001, layer:0,
        phase:Math.random()*Math.PI*2, freq:Math.random()*0.003+0.001,
        warm:Math.random()<0.05, spike:false,
      });
    }
    // Layer B — 400 mid stars
    for (let i=0;i<400;i++) {
      stars.push({
        x:Math.random()*c.width, y:Math.random()*c.height*3,
        r:Math.random()*0.8+0.6, o:Math.random()*0.7+0.15,
        sp:Math.random()*0.005+0.002, layer:1,
        phase:Math.random()*Math.PI*2, freq:Math.random()*0.006+0.002,
        warm:Math.random()<0.05, spike:false,
      });
    }
    // Layer C — 80 near bright stars, 3 with spikes
    for (let i=0;i<80;i++) {
      stars.push({
        x:Math.random()*c.width, y:Math.random()*c.height*3,
        r:Math.random()*1.6+1.4, o:Math.random()*0.5+0.4,
        sp:Math.random()*0.008+0.003, layer:2,
        phase:Math.random()*Math.PI*2, freq:Math.random()*0.008+0.003,
        warm:Math.random()<0.12, spike:i<3,
      });
    }

    let t = 0;
    const parallaxSpeeds = [0.02, 0.06, 0.14];

    function draw() {
      t++;
      ctx.clearRect(0,0,c.width,c.height);
      for (const s of stars) {
        const parallax = parallaxSpeeds[s.layer] * scrollY;
        const ry = ((s.y - parallax) % (c.height*3) + c.height*3) % (c.height*3);
        if (ry < 0 || ry > c.height) continue;

        const pulse = s.o * (0.6 + 0.4 * Math.sin(t * s.freq * 60 + s.phase));
        const col = s.warm ? `rgba(232,185,35,${pulse*0.7})` :
          s.layer===2 ? `rgba(120,180,255,${pulse})` :
          s.layer===1 ? `rgba(180,240,235,${pulse*0.8})` :
                        `rgba(200,220,255,${pulse})`;

        ctx.beginPath();
        ctx.arc(s.x, ry, s.r, 0, Math.PI*2);
        ctx.fillStyle = col;
        ctx.fill();

        // Glow halo for near stars
        if (s.layer===2) {
          ctx.beginPath();
          ctx.arc(s.x, ry, s.r*3, 0, Math.PI*2);
          const g = ctx.createRadialGradient(s.x,ry,0,s.x,ry,s.r*3);
          g.addColorStop(0, s.warm ? `rgba(232,185,35,${pulse*0.3})` : `rgba(120,180,255,${pulse*0.3})`);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.fill();
        }

        // 4-point diffraction spike
        if (s.spike) {
          const spikeLen = s.r * 12;
          ctx.save();
          ctx.globalAlpha = pulse * 0.6;
          ctx.strokeStyle = `rgba(120,180,255,0.5)`;
          ctx.lineWidth = 0.5;
          for (const angle of [0, Math.PI/2]) {
            ctx.beginPath();
            ctx.moveTo(s.x - Math.cos(angle)*spikeLen, ry - Math.sin(angle)*spikeLen);
            ctx.lineTo(s.x + Math.cos(angle)*spikeLen, ry + Math.sin(angle)*spikeLen);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  }, [scrollY]);

  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ── Nebula — 4 gas cloud layers ────────────────────────────────────────────
function NebulaLayer({ scrollY }: { scrollY: number }) {
  const p = scrollY * 0.001;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
      {/* Layer 1 — magenta-violet deep */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse 80% 60% at 20% ${30 - scrollY*0.007}%, rgba(180,40,160,0.1) 0%, transparent 65%)`,
        animation:"nebula-drift 40s ease-in-out infinite",
      }} />
      {/* Layer 2 — electric teal column */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse 50% 70% at ${15+p*5}% ${65+scrollY*0.005}%, rgba(0,196,180,0.08) 0%, transparent 60%)`,
      }} />
      {/* Layer 3 — warm amber near planet */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse 40% 30% at 80% ${30+p*8}%, rgba(232,185,35,0.06) 0%, transparent 50%)`,
      }} />
      {/* Layer 4 — ice blue wisps */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse 60% 20% at 60% ${50+p*4}%, rgba(120,180,255,0.05) 0%, transparent 55%)`,
      }} />
      {/* God rays */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:`linear-gradient(112deg, transparent 30%, rgba(232,185,35,0.04) 45%, transparent 48%, rgba(232,185,35,0.03) 52%, transparent 58%, rgba(120,180,255,0.03) 65%, transparent 70%)`,
        animation:"god-ray-pulse 8s ease-in-out infinite",
      }} />
    </div>
  );
}

// ── Cobalt Giant planet ────────────────────────────────────────────────────
function FloatingPlanets({ scrollY }: { scrollY: number }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>

      {/* ── COBALT GIANT — upper right ── */}
      <div style={{
        position:"absolute", right:"-60px",
        top:`${-60 + scrollY*0.12}px`,
        width:"340px", height:"340px",
        borderRadius:"50%",
        background:`radial-gradient(circle at 32% 32%,
          #1d3a7e 0%,
          #0d1b6e 35%,
          #080f40 60%,
          #04081a 100%)`,
        boxShadow:`
          inset -30px -30px 80px rgba(0,0,0,0.85),
          inset 20px 20px 60px rgba(13,27,110,0.3),
          0 0 80px rgba(123,94,167,0.18),
          0 0 200px rgba(13,27,110,0.08)`,
        border:"0.5px solid rgba(123,94,167,0.2)",
        animation:"rim-pulse 8s ease-in-out infinite",
        overflow:"hidden",
      }}>
        {/* Atmospheric bands */}
        {[18,38,52,68,80].map((pct,i) => (
          <div key={i} style={{
            position:"absolute", left:0, right:0,
            top:`${pct}%`, height:`${[8,6,10,5,7][i]}%`,
            background: i%2===0
              ? "rgba(10,20,80,0.35)"
              : "rgba(40,80,160,0.12)",
            borderRadius:"0",
          }} />
        ))}
        {/* Storm oval */}
        <div style={{
          position:"absolute", left:"30%", top:"62%",
          width:"28%", height:"14%", borderRadius:"50%",
          background:"rgba(6,10,50,0.6)",
          transform:"rotate(-8deg)",
        }} />
        {/* Limb glow */}
        <div style={{
          position:"absolute", inset:0, borderRadius:"50%",
          background:"radial-gradient(circle at 100% 50%, rgba(80,120,255,0.15) 0%, transparent 45%)",
        }} />
      </div>

      {/* Cobalt Giant rings — 3 rings */}
      {[
        { w:480, h:480, bw:"10px", col:"rgba(200,220,255,0.18)", top:"-6px", blur:"1px" },
        { w:560, h:560, bw:"5px",  col:"rgba(232,185,35,0.10)",  top:"-50px", blur:"0px" },
        { w:620, h:620, bw:"2px",  col:"rgba(120,180,255,0.06)", top:"-80px", blur:"0px" },
      ].map((r,i) => (
        <div key={i} style={{
          position:"absolute",
          right:`${-60 - (r.w-340)/2}px`,
          top:`${-60 + scrollY*0.12 + parseFloat(r.top) + (340-r.h)/2}px`,
          width:`${r.w}px`, height:`${r.h}px`,
          borderRadius:"50%",
          border:`${r.bw} solid ${r.col}`,
          transform:"rotateX(72deg)",
          filter: r.blur!=="0px" ? `blur(${r.blur})` : undefined,
          pointerEvents:"none",
        }} />
      ))}

      {/* ── EMERALD ICE GIANT — left edge ── */}
      <div style={{
        position:"absolute", left:"-100px",
        top:`${320 + scrollY*0.07}px`,
        width:"220px", height:"220px",
        borderRadius:"50%",
        background:`radial-gradient(circle at 45% 35%,
          #1e4a30 0%, #1a3a2a 40%, #040c0c 100%)`,
        boxShadow:`
          inset -15px -15px 40px rgba(0,0,0,0.85),
          0 0 40px rgba(0,196,180,0.12)`,
        border:"0.5px solid rgba(0,196,180,0.15)",
        overflow:"hidden",
      }}>
        {/* Magnetic field arcs — SVG overlay */}
        <svg viewBox="0 0 220 220" style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.5 }}>
          {[0,1,2].map(i => (
            <ellipse key={i} cx={110+i*8} cy={110} rx={130+i*20} ry={80+i*12}
              fill="none" stroke="rgba(0,196,180,0.25)" strokeWidth="0.5"
              strokeDasharray={`${4+i*2} ${6+i}`} />
          ))}
        </svg>
      </div>

      {/* ── Asteroid ── */}
      <div style={{
        position:"absolute", right:"7%",
        top:`${820 + scrollY*0.18}px`,
        width:"48px", height:"32px",
        borderRadius:"40% 60% 55% 45%",
        background:"#111828",
        boxShadow:"0 0 24px rgba(232,185,35,0.1)",
        opacity:0.45,
        transform:`rotate(${scrollY*0.06}deg)`,
      }} />

      {/* ── Small debris ── */}
      <div style={{
        position:"absolute", right:"18%",
        top:`${1400 + scrollY*0.1}px`,
        width:"18px", height:"14px",
        borderRadius:"50%",
        background:"#0e1628",
        boxShadow:"0 0 12px rgba(0,196,180,0.08)",
        opacity:0.3,
        transform:`rotate(${scrollY*0.03}deg)`,
      }} />
    </div>
  );
}

// ── Foreground particle bokeh ──────────────────────────────────────────────
function ParticleBokeh() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf: number;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const motes: { x:number; y:number; r:number; vx:number; vy:number; col:string; t:number }[] = [];
    const cols = [
      "rgba(120,180,255,VAL)","rgba(0,196,180,VAL)","rgba(232,185,35,VAL)"
    ];
    const weights = [0.6, 0.25, 0.15];

    for (let i=0;i<200;i++) {
      const pick = Math.random();
      const ci = pick < weights[0] ? 0 : pick < weights[0]+weights[1] ? 1 : 2;
      const r = Math.random()*3.5+0.5;
      motes.push({
        x:Math.random()*c.width, y:Math.random()*c.height,
        r, vx:(Math.random()-0.5)*0.08, vy:(Math.random()-0.5)*0.06,
        col: cols[ci], t: Math.random()*1000,
      });
    }

    function draw() {
      ctx.clearRect(0,0,c.width,c.height);
      for (const m of motes) {
        m.t += 0.5;
        m.x += m.vx + Math.sin(m.t*0.012)*0.15;
        m.y += m.vy + Math.cos(m.t*0.009)*0.12;
        if (m.x < 0) m.x = c.width;
        if (m.x > c.width) m.x = 0;
        if (m.y < 0) m.y = c.height;
        if (m.y > c.height) m.y = 0;

        const alpha = 0.3 + 0.3*Math.sin(m.t*0.02);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI*2);
        ctx.fillStyle = m.col.replace("VAL", String(alpha));
        ctx.fill();

        if (m.r > 5) {
          const g = ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*2.5);
          g.addColorStop(0, m.col.replace("VAL", String(alpha*0.5)));
          g.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r*2.5, 0, Math.PI*2);
          ctx.fillStyle = g;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none", opacity:0.7 }} />;
}

// ── Binary rain (faint background) ────────────────────────────────────────
function BinaryRain() {
  const cols = Array.from({length:8},(_,i)=>i*12+5);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden", opacity:0.06 }}>
      {cols.map((x,i) => (
        <div key={i} style={{
          position:"absolute", left:`${x}%`, top:0,
          ...mono, fontSize:"9px", color:TEAL,
          animation:`binary-fall ${14+i*3}s linear ${-i*2}s infinite`,
          whiteSpace:"nowrap",
        }}>
          {Array.from({length:30},()=>Math.round(Math.random())).join("\n")}
        </div>
      ))}
    </div>
  );
}

// ── TiltCard ───────────────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x:0, y:0 });
  const [hovered, setHovered] = useState(false);

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current!;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width/2) / (rect.width/2);
    const dy = (e.clientY - rect.top - rect.height/2) / (rect.height/2);
    setTilt({ x: dy*-5, y: dx*5 });
  }

  return (
    <div ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setTilt({x:0,y:0}); setHovered(false); }}
      style={{
        ...style,
        transform:`perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered?"translateZ(10px)":"translateZ(0)"}`,
        transition: hovered ? "transform 0.1s ease-out" : "transform 0.4s ease-out",
      }}
    >{children}</div>
  );
}

// ── Reveal ─────────────────────────────────────────────────────────────────
function Reveal({ children, delay=0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} style={{
      ...style,
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 0.9s ease ${delay}s, transform 0.9s ease ${delay}s`,
    }}>{children}</div>
  );
}

// ── GlitchText ─────────────────────────────────────────────────────────────
function GlitchText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const [g, setG] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setG(true); setTimeout(()=>setG(false),160); }, 4500);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ position:"relative", display:"inline-block", ...style }}>
      {text}
      {g && <>
        <span style={{
          position:"absolute", left:0, top:0, color:TEAL, opacity:0.75,
          animation:"glitch-clip1 0.16s steps(1) infinite",
        }}>{text}</span>
        <span style={{
          position:"absolute", left:0, top:0, color:GOLD, opacity:0.55,
          animation:"glitch-clip2 0.16s steps(1) 0.05s infinite",
        }}>{text}</span>
      </>}
    </span>
  );
}

// ── Orbital rings ──────────────────────────────────────────────────────────
function OrbitalRings() {
  return (
    <div style={{
      position:"absolute", right:"-120px", top:"50%",
      transform:"translateY(-50%)",
      width:"520px", height:"520px",
      pointerEvents:"none", opacity:0.12,
    }}>
      {[
        { size:300, dur:"13s", col:TEAL, anim:"orbit1" },
        { size:420, dur:"19s", col:PURPLE, anim:"orbit2" },
        { size:210, dur:"8s",  col:GOLD, anim:"orbit3" },
      ].map((ring,i) => (
        <div key={i} style={{
          position:"absolute",
          left:"50%", top:"50%",
          marginLeft:`-${ring.size/2}px`,
          marginTop:`-${ring.size/2}px`,
          width:ring.size, height:ring.size,
          borderRadius:"50%",
          border:`0.8px solid ${ring.col}`,
          animation:`${ring.anim} ${ring.dur} linear infinite`,
        }} />
      ))}
    </div>
  );
}

// ── IMAX Astronaut — ultra detailed ───────────────────────────────────────
function AstronautScene({ progress }: { progress: number }) {
  const y   = -50 + progress * 140;
  const rot = -8  + progress * 22;
  const opacityRaw = progress < 0.05 ? progress/0.05 :
                     progress > 0.85 ? (1-progress)/0.15 : 1;
  const opacity = Math.max(0, Math.min(1, opacityRaw));

  const equations = [
    { x:48,  y:190, label:"E=mc²",      o:0.3,  dur:"23s", delay:"0s" },
    { x:398, y:255, label:"∫f(x)dx",    o:0.22, dur:"31s", delay:"4s" },
    { x:60,  y:370, label:"PV=nRT",     o:0.2,  dur:"27s", delay:"8s" },
    { x:390, y:390, label:"F=ma",       o:0.25, dur:"19s", delay:"2s" },
    { x:80,  y:440, label:"ΔG=ΔH−TΔS", o:0.15, dur:"35s", delay:"11s" },
    { x:340, y:130, label:"∇×B=μ₀J",   o:0.18, dur:"41s", delay:"6s" },
  ];

  return (
    <div style={{
      position:"absolute", left:"50%", top:"50%",
      transform:`translate(-50%, calc(-50% + ${y}px)) rotate(${rot}deg)`,
      opacity,
      transition:"opacity 0.3s",
      pointerEvents:"none", userSelect:"none",
      width:"min(560px, 85vw)",
      animation:"float-astronaut 7s ease-in-out infinite",
      filter:"drop-shadow(0 0 60px rgba(0,196,180,0.3)) drop-shadow(0 0 120px rgba(123,94,167,0.18))",
    }}>
      <svg viewBox="0 0 560 520" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%" }}>
        <defs>
          <radialGradient id="pgrad" cx="33%" cy="30%">
            <stop offset="0%" stopColor="#1e3a6e" />
            <stop offset="100%" stopColor="#060d20" />
          </radialGradient>
          <radialGradient id="visorGrad" cx="30%" cy="25%">
            <stop offset="0%" stopColor="#0a1830" />
            <stop offset="60%" stopColor="#040a14" />
            <stop offset="100%" stopColor="#020509" />
          </radialGradient>
          <radialGradient id="suitGrad" cx="40%" cy="30%">
            <stop offset="0%" stopColor="#151f38" />
            <stop offset="100%" stopColor="#0e1628" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Shadow ellipse */}
        <ellipse cx="280" cy="490" rx="180" ry="18" fill="rgba(0,196,180,0.05)" />

        {/* ─ Mini planet orbiting upper right ─ */}
        <circle cx="420" cy="88" r="58" fill="url(#pgrad)" stroke="rgba(0,196,180,0.2)" strokeWidth="0.8" />
        {/* Planet bands */}
        <ellipse cx="420" cy="78"  rx="52" ry="6"  fill="rgba(0,20,80,0.3)" />
        <ellipse cx="420" cy="94"  rx="48" ry="5"  fill="rgba(30,60,150,0.15)" />
        {/* Planet ring — 3 */}
        <ellipse cx="420" cy="88"  rx="82" ry="18" fill="none" stroke="rgba(200,220,255,0.25)" strokeWidth="1.2" />
        <ellipse cx="420" cy="88"  rx="96" ry="22" fill="none" stroke="rgba(232,185,35,0.12)" strokeWidth="0.7" />
        <ellipse cx="420" cy="88"  rx="110" ry="26" fill="none" stroke="rgba(120,180,255,0.06)" strokeWidth="0.5" />
        {/* Limb glow */}
        <circle cx="420" cy="88" r="58" fill="none" stroke="rgba(80,140,255,0.18)" strokeWidth="4" />

        {/* ─ Astronaut body ─ */}
        <g transform="translate(148,108)">

          {/* Helmet */}
          <ellipse cx="122" cy="72" rx="60" ry="64"
            fill="url(#suitGrad)" stroke="rgba(200,220,255,0.2)" strokeWidth="1.2" />

          {/* Visor — galaxy reflection */}
          <ellipse cx="122" cy="68" rx="42" ry="44" fill="url(#visorGrad)" stroke="rgba(0,196,180,0.35)" strokeWidth="0.9" />
          {/* Galaxy inside visor */}
          {[
            {cx:118,cy:60,rx:16,ry:8,  col:"rgba(123,94,167,0.18)"},
            {cx:125,cy:65,rx:9, ry:5,  col:"rgba(0,196,180,0.12)"},
            {cx:112,cy:72,rx:6, ry:3,  col:"rgba(232,185,35,0.08)"},
          ].map((g,i) => (
            <ellipse key={i} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry}
              fill={g.col} style={{mixBlendMode:"screen"}} />
          ))}
          {/* Stars in visor */}
          {[{x:116,y:56,s:1.3,d:"2s"},{x:130,y:50,s:0.9,d:"3.1s"},{x:110,y:75,s:0.9,d:"2.4s"},
            {x:134,y:70,s:0.7,d:"1.8s"},{x:108,y:62,s:0.6,d:"4s"}].map((st,i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="rgba(200,220,255,0.7)"
              style={{animation:`star-twinkle ${st.d} ease-in-out infinite`}} />
          ))}
          {/* Visor rim light */}
          <ellipse cx="100" cy="50" rx="14" ry="8" fill="rgba(255,255,255,0.06)" transform="rotate(-20,100,50)" />

          {/* Neck ring */}
          <ellipse cx="122" cy="133" rx="38" ry="8" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1" />

          {/* Torso */}
          <rect x="68" y="133" width="108" height="100" rx="22"
            fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" />

          {/* Chest panel — holographic progress bar */}
          <rect x="90" y="152" width="64" height="36" rx="5"
            fill="rgba(0,196,180,0.07)" stroke="rgba(0,196,180,0.35)" strokeWidth="0.7" />
          <line x1="100" y1="162" x2="144" y2="162" stroke="rgba(0,196,180,0.5)" strokeWidth="0.8" />
          <line x1="100" y1="168" x2="136" y2="168" stroke="rgba(0,196,180,0.3)" strokeWidth="0.8" />
          {/* Progress bar fill */}
          <rect x="100" y="173" width="44" height="3" rx="1.5" fill="rgba(0,196,180,0.15)" />
          <rect x="100" y="173" width="24" height="3" rx="1.5" fill={TEAL}
            style={{animation:"pulse-glow 2.5s ease-in-out infinite"}} />
          <text x="122" y="195" textAnchor="middle" fill="rgba(0,196,180,0.55)"
            style={{fontFamily:"monospace",fontSize:"5px",letterSpacing:"0.18em"}}>STUDENIUS</text>

          {/* Suit fiber-optic seams */}
          {[[68,140,176,140],[68,195,176,195],[68,165,176,165]].map(([x1,y1,x2,y2],i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(0,196,180,0.08)" strokeWidth="0.5" strokeDasharray="3 8" />
          ))}

          {/* Left shoulder & arm */}
          <path d="M68 140 Q30 158 22 198" stroke="rgba(200,220,255,0.1)" strokeWidth="0.8" fill="none" />
          <rect x="50" y="136" width="24" height="92" rx="12"
            fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-28,62,182)" />

          {/* Left hand — holding light-book */}
          <g transform="translate(-14,196) rotate(12)">
            <rect x="0" y="0" width="54" height="40" rx="3" fill={TEAL} opacity="0.85" />
            <rect x="4" y="4" width="46" height="32" rx="2" fill="#0a1a2e" />
            {/* Book pages — light rays */}
            {[8,14,20,26].map((y,i) => (
              <line key={i} x1="8" y1={y} x2={38-i*2} y2={y}
                stroke={`rgba(0,196,180,${0.6-i*0.12})`} strokeWidth="0.8" />
            ))}
            {/* Golden photons rising */}
            {[12,20,28,36].map((x,i) => (
              <line key={i} x1={x} y1="4" x2={x+1} y2={-8-i*3}
                stroke="rgba(232,185,35,0.5)" strokeWidth="0.7"
                strokeDasharray="2 3" />
            ))}
            <text x="27" y="11" textAnchor="middle" fill="rgba(0,196,180,0.9)"
              style={{fontFamily:"monospace",fontSize:"5px",letterSpacing:"0.12em"}}>AI</text>
          </g>

          {/* Right arm — touching DNA */}
          <rect x="176" y="136" width="24" height="84" rx="12"
            fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(22,188,178)" />

          {/* DNA helix hologram */}
          <g transform="translate(196,155)">
            {/* Helix strands */}
            {Array.from({length:8},(_,i) => {
              const t = i/7;
              const y1 = t*80;
              const x1 = Math.sin(t*Math.PI*2)*16;
              const x2 = Math.sin(t*Math.PI*2+Math.PI)*16;
              return (
                <g key={i}>
                  <circle cx={x1} cy={y1} r="2" fill="rgba(0,196,180,0.6)" />
                  <circle cx={x2} cy={y1} r="2" fill="rgba(123,94,167,0.6)" />
                  {i<7 && <line x1={x1} y1={y1} x2={x2} y2={y1}
                    stroke="rgba(0,196,180,0.2)" strokeWidth="0.7" />}
                </g>
              );
            })}
          </g>

          {/* Legs */}
          <rect x="78" y="228" width="34" height="76" rx="17"
            fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-4,95,266)" />
          <rect x="122" y="228" width="34" height="76" rx="17"
            fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(6,139,266)" />

          {/* Boot thruster glow */}
          <ellipse cx="95" cy="308" rx="22" ry="6" fill="rgba(0,196,180,0.18)"
            style={{animation:"pulse-glow 3s ease-in-out infinite"}} />
          <ellipse cx="139" cy="308" rx="18" ry="5" fill="rgba(0,196,180,0.14)"
            style={{animation:"pulse-glow 3s ease-in-out 0.8s infinite"}} />
        </g>

        {/* ─ Floating equations ─ */}
        {equations.map((eq) => (
          <text key={eq.label} x={eq.x} y={eq.y}
            fill={`rgba(0,196,180,${eq.o})`}
            style={{
              fontFamily:"monospace", fontSize:"12px", letterSpacing:"0.05em",
              "--o":eq.o,
              animation:`drift-eq ${eq.dur} ease-in-out ${eq.delay} infinite`,
            } as React.CSSProperties}>
            {eq.label}
          </text>
        ))}

        {/* Scan-line grid lines */}
        <line x1="30"  y1="250" x2="148" y2="250" stroke="rgba(0,196,180,0.08)" strokeWidth="0.6" strokeDasharray="4 7" />
        <line x1="365" y1="310" x2="480" y2="310" stroke="rgba(0,196,180,0.08)" strokeWidth="0.6" strokeDasharray="4 7" />

        {/* Atomic model */}
        <g transform="translate(60,310)">
          <circle cx="0" cy="0" r="3" fill="rgba(232,185,35,0.7)" />
          <ellipse cx="0" cy="0" rx="18" ry="7" fill="none" stroke="rgba(0,196,180,0.25)" strokeWidth="0.7" strokeDasharray="2 2" />
          <circle cx="18" cy="0" r="1.5" fill="rgba(0,196,180,0.6)" />
        </g>

        {/* 3D Sigmoid curve */}
        <g transform="translate(420,310)" opacity="0.3">
          <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(0,196,180,0.4)" strokeWidth="0.5" />
          <line x1="0" y1="-40" x2="0" y2="10" stroke="rgba(0,196,180,0.4)" strokeWidth="0.5" />
          <path d="M0,5 Q15,5 30,-15 Q45,-35 60,-38"
            fill="none" stroke={TEAL} strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

// ── Cinematic scroll section ───────────────────────────────────────────────
function CinematicSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function onScroll() {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -rect.top / total));
      setProgress(p);
    }
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const bgY   = progress * 45;
  const midY  = progress * 90;
  const scale = 1 + progress * 0.15;

  return (
    <div ref={sectionRef} style={{ position:"relative", height:"420vh" }}>
      <div ref={containerRef} style={{
        position:"sticky", top:0, height:"100vh", overflow:"hidden",
        display:"flex", alignItems:"center", justifyContent:"center",
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}>
        {/* Film grain overlay */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:50,
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          animation: "grain-move 0.8s steps(4) infinite",
        }} />

        {/* Vortex background */}
        <div style={{
          position:"absolute", inset:"-50%",
          background: `conic-gradient(from ${progress*360}deg at 50% 50%, 
            rgba(0,196,180,0.03) 0deg, 
            transparent 60deg,
            rgba(123,94,167,0.04) 120deg,
            transparent 180deg,
            rgba(232,185,35,0.03) 240deg,
            transparent 300deg,
            rgba(0,196,180,0.03) 360deg)`,
          animation: "vortex-spin 20s linear infinite",
          opacity: 0.5 + progress * 0.5,
        }} />

        {/* Nebula backdrop */}
        <div style={{
          position:"absolute", inset:0,
          background:`
            radial-gradient(ellipse 90% 80% at ${28+progress*22}% ${38+bgY*0.3}%, rgba(0,196,180,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 70% 60% at ${72-progress*16}% ${60+bgY*0.2}%, rgba(232,185,35,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 50% 50%, rgba(123,94,167,0.1) 0%, transparent 60%)
          `,
          filter: "blur(40px)",
          transition: "background 0.1s ease-out",
        }} />

        {/* Chromatic aberration layers */}
        <div style={{
          position:"absolute", inset:0,
          background: `radial-gradient(ellipse 50% 50% at ${50+progress*10}% ${50-progress*5}%, rgba(0,196,180,0.06) 0%, transparent 60%)`,
          mixBlendMode: "screen" as any,
          transform: `translateX(${-progress*8}px)`,
        }} />
        <div style={{
          position:"absolute", inset:0,
          background: `radial-gradient(ellipse 50% 50% at ${50-progress*10}% ${50+progress*5}%, rgba(232,185,35,0.05) 0%, transparent 60%)`,
          mixBlendMode: "screen" as any,
          transform: `translateX(${progress*8}px)`,
        }} />

        {/* Perspective grid */}
        <div style={{
          position:"absolute", inset:0, opacity:0.06,
          backgroundImage:`
            linear-gradient(rgba(0,196,180,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,196,180,1) 1px, transparent 1px)`,
          backgroundSize:"64px 64px",
          transform:`translateY(${midY}px) perspective(600px) rotateX(12deg)`,
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        }} />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => {
          const px = (i * 37) % 100;
          const py = (i * 53) % 100;
          const size = 2 + (i % 4);
          return (
            <div key={i} style={{
              position:"absolute",
              left:`${px}%`,
              top:`${py}%`,
              width:size,
              height:size,
              background: i%3===0 ? TEAL : i%3===1 ? GOLD : PURPLE,
              borderRadius:"50%",
              opacity: 0.2 + Math.sin(progress*Math.PI + i)*0.2,
              filter: "blur(1px)",
              transform: `translateY(${progress*(20+i%10)}px) translateX(${Math.sin(progress*2+i)*10}px)`,
            }} />
          );
        })}

        {/* Horizon glow */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:"280px",
          background:`linear-gradient(transparent, rgba(0,196,180,${0.05+progress*0.08}))`,
        }} />

        {/* Astronaut */}
        <AstronautScene progress={progress} />

        {/* Scroll hint */}
        <div style={{
          position:"absolute", bottom:"12%", left:"50%",
          transform:"translateX(-50%)", textAlign:"center",
          opacity: progress < 0.15 ? progress/0.15 : progress > 0.5 ? Math.max(0,(1-progress)/0.35) : 1,
          transition: "opacity 0.3s",
        }}>
          <p style={{...mono,fontSize:"10px",color:`rgba(0,196,180,0.6)`,letterSpacing:"0.2em",marginBottom:"8px"}}>
            SCROLL TO EXPLORE
          </p>
          <div style={{width:"1px",height:"44px",background:`linear-gradient(${TEAL},transparent)`,margin:"0 auto"}} />
        </div>

        {/* Headline reveal with cinematic effects */}
        <div style={{
          position:"absolute", top:"13%", left:"50%",
          transform:`translateX(-50%) translateY(${progress*30}px)`,
          textAlign:"center",
          opacity: progress < 0.12 ? 0 : progress < 0.32 ? (progress-0.12)/0.2 : progress > 0.78 ? Math.max(0,(1-progress)/0.14) : 1,
          width:"min(640px,90vw)",
          filter: `blur(${Math.abs(progress-0.5)*2}px)`,
        }}>
          {progress < 0.5 ? (
            <h2 style={{
              fontSize:"clamp(22px,4vw,44px)",
              fontWeight:300,
              letterSpacing:"-0.03em",
              color:"#F2F5F8",
              lineHeight:1.12,
              animation: "chromatic-shift 4s ease-in-out infinite, cinematic-zoom 8s ease-in-out infinite",
              textShadow: "0 0 80px rgba(0,196,180,0.3)",
            }}>
              Knowledge travels<br/>
              <span style={{
                color:TEAL,
                display: "inline-block",
                animation: "fade-up 1.2s ease-out",
              }}>at the speed of curiosity.</span>
            </h2>
          ) : (
            <h2 style={{
              fontSize:"clamp(22px,4vw,44px)",
              fontWeight:300,
              letterSpacing:"-0.03em",
              color:"#F2F5F8",
              lineHeight:1.12,
              animation: "chromatic-shift 4s ease-in-out infinite, cinematic-zoom 8s ease-in-out infinite",
              textShadow: "0 0 80px rgba(232,185,35,0.3)",
            }}>
              AI-powered tools.<br/>
              <span style={{
                color:GOLD,
                display: "inline-block",
                animation: "fade-up 1.2s ease-out",
              }}>Built for students who demand results.</span>
            </h2>
          )}
          {/* Hairline separator */}
          <div style={{
            width:`${120 + progress*40}px`,
            height:"0.5px",
            background:`linear-gradient(90deg, transparent, ${TEAL}, ${GOLD}, transparent)`,
            margin:"20px auto 0",
            boxShadow: `0 0 20px ${TEAL}`,
          }} />
        </div>

        {/* Vertical scroll progress bar */}
        <div style={{
          position:"absolute", right:"28px", top:"50%",
          transform:"translateY(-50%)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
        }}>
          <div style={{width:"1px",height:"90px",background:"#0d1220",position:"relative"}}>
            <div style={{
              position:"absolute", top:0, left:0, right:0,
              height:`${progress*100}%`,
              background:`linear-gradient(${TEAL},${GOLD})`,
              boxShadow: `0 0 20px ${TEAL}`,
              transition:"height 0.08s",
            }} />
          </div>
          <span style={{...mono,fontSize:"9px",color:TEAL,letterSpacing:"0.1em",writingMode:"vertical-lr"}}>
            {Math.round(progress*100)}%
          </span>
        </div>

        {/* Coordinates HUD */}
        <div style={{
          position:"absolute", left:"24px", bottom:"10%",
          ...mono, fontSize:"9px", color:TEAL,
          letterSpacing:"0.12em", lineHeight:1.8,
          opacity: progress > 0.1 ? 0.7 : 0,
          transition:"opacity 0.4s",
          textShadow: `0 0 10px ${TEAL}`,
        }}>
          <div>LAT  {(progress*90-45).toFixed(2)}°</div>
          <div>LON  {(progress*360-180).toFixed(2)}°</div>
          <div>ALT  {Math.round(400 + progress*1200)} km</div>
        </div>

        {/* Circular progress rings */}
        <svg style={{
          position:"absolute",
          width:"600px",
          height:"600px",
          pointerEvents:"none",
          opacity: 0.15 + progress * 0.3,
        }} viewBox="0 0 600 600">
          <circle cx="300" cy="300" r="280" fill="none" stroke={TEAL} strokeWidth="0.5" strokeDasharray={`${progress*1400} 1400`} opacity="0.4" />
          <circle cx="300" cy="300" r="250" fill="none" stroke={GOLD} strokeWidth="0.5" strokeDasharray={`${progress*1200} 1200`} strokeDashoffset={progress*200} opacity="0.3" />
          <circle cx="300" cy="300" r="220" fill="none" stroke={PURPLE} strokeWidth="0.5" strokeDasharray={`${progress*1000} 1000`} strokeDashoffset={-progress*150} opacity="0.2" />
        </svg>
      </div>
    </div>
  );
}
            }}>
              <span style={{...mono,fontSize:"9px",color:c.id===selected||isCorrect?TEAL:"#333",minWidth:"14px"}}>{c.id}</span>
              <span style={{fontSize:"12px",color:"#666",fontWeight:300,lineHeight:1.5}}>{c.text}</span>
            </div>
          );
        })}
      </div>
      {showAnswer && (
        <div style={{borderTop:"0.5px solid #0d1220",paddingTop:"12px",marginBottom:"12px"}}>
          <p style={{...mono,fontSize:"11px",color:"#444",letterSpacing:"0.06em",marginBottom:"6px",textTransform:"uppercase"}}>Explanation</p>
          <p style={{fontSize:"12px",color:"#666",lineHeight:1.65,fontWeight:300}}>{mockQuestion.explanation}</p>
        </div>
      )}
      <div style={{marginTop:"14px"}}>
        {!showAnswer ? (
          <button onClick={() => { if (selected) setShowAnswer(true); }} style={{
            width:"100%",padding:"9px",fontSize:"11px",...mono,
            letterSpacing:"0.08em",textTransform:"uppercase",
            border:`0.5px solid ${selected?TEAL:"#0d1220"}`,
            background:"transparent",color:selected?TEAL:"#444",
            cursor:selected?"pointer":"not-allowed",transition:"color 0.15s,border-color 0.15s",
          }}>Check Answer</button>
        ) : (
          <button onClick={reset} style={{
            width:"100%",padding:"9px",fontSize:"11px",...mono,
            letterSpacing:"0.08em",textTransform:"uppercase",
            border:"0.5px solid #0d1220",background:"transparent",color:"#666",cursor:"pointer",
          }}>Try Again</button>
        )}
      </div>
    </div>
  );
}

// ── Chat demo ──────────────────────────────────────────────────────────────
function ChatDemo() {
  return (
    <div style={{background:"#080d1a",border:"0.5px solid #0d1220"}}>
      <div style={{padding:"12px 20px",borderBottom:"0.5px solid #0d1220",display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{...mono,fontSize:"10px",color:"#444",letterSpacing:"0.08em",textTransform:"uppercase"}}>BrainBot AI Tutor</span>
        <span style={{fontSize:"8px",padding:"1px 5px",background:"rgba(0,196,180,0.1)",color:TEAL,border:`0.5px solid rgba(0,196,180,0.3)`,...mono,fontWeight:700}}>LIVE</span>
      </div>
      <div style={{padding:"20px"}}>
        <div style={{textAlign:"right",marginBottom:"16px"}}>
          <span style={{fontSize:"13px",color:"#E0E8F0",fontWeight:300,borderRight:`1.5px solid rgba(0,196,180,0.3)`,paddingRight:"12px"}}>
            How do I remember the Krebs cycle?
          </span>
        </div>
        <div style={{borderLeft:`0.5px solid ${TEAL}`,paddingLeft:"14px",marginBottom:"16px"}}>
          <p style={{fontSize:"12px",color:"#666",lineHeight:1.65,fontWeight:300}}>
            Try the acronym <strong style={{color:"#E0E8F0",fontWeight:500}}>PCISSFM</strong>: Pyruvate → Citrate → Isocitrate → Succinate → Succinyl → Fumarate → Malate. Make a silly sentence and it'll stick. Want practice questions?
          </p>
        </div>
        <div style={{borderTop:"0.5px solid #0d1220",paddingTop:"14px",display:"flex",gap:"8px"}}>
          <div style={{flex:1,padding:"8px 12px",border:"0.5px solid #0d1220",fontSize:"12px",color:"#444",background:"transparent"}}>
            Ask about any topic...
          </div>
          <button style={{padding:"8px 14px",border:`0.5px solid ${TEAL}`,background:"transparent",color:TEAL,cursor:"pointer",fontSize:"14px"}}>→</button>
        </div>
      </div>
    </div>
  );
}

// ── Animated stat ──────────────────────────────────────────────────────────
function AnimatedStat({ value, label }: { value:string; label:string }) {
  const { ref, inView } = useInView(0.5);
  return (
    <div ref={ref} style={{opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(16px)",transition:"all 0.6s ease"}}>
      <div style={{...mono,fontSize:"20px",fontWeight:500,color:TEAL,letterSpacing:"-0.01em"}}>{value}</div>
      <div style={{fontSize:"10px",color:"#444",textTransform:"uppercase",letterSpacing:"0.10em",marginTop:"2px"}}>{label}</div>
    </div>
  );
}

// ── Main Landing ───────────────────────────────────────────────────────────
export default function Landing() {
  const scrollY = useScrollY();
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => { setNavScrolled(scrollY > 20); }, [scrollY]);

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      background:`linear-gradient(180deg, ${VOID} 0%, #060D1F 100%)`,
      color:"#E0E8F0",
      fontFamily:"'Inter', system-ui, sans-serif",
    }}>
      <style>{CSS}</style>

      {/* ── Fixed background layers ── */}
      <StarField scrollY={scrollY} />
      <NebulaLayer scrollY={scrollY} />
      <FloatingPlanets scrollY={scrollY} />
      <BinaryRain />
      <ParticleBokeh />

      {/* ── Nav ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 32px", height:48,
        borderBottom: navScrolled ? "0.5px solid rgba(0,196,180,0.18)" : "0.5px solid #0d1220",
        background: navScrolled ? "rgba(3,5,15,0.96)" : "rgba(3,5,15,0.88)",
        backdropFilter:"blur(24px)",
        position:"sticky", top:0, zIndex:50,
        transition:"background 0.3s, border-color 0.3s",
        boxShadow: navScrolled ? `0 1px 40px rgba(0,196,180,0.07)` : "none",
      }}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.22em",color:"#E0E8F0",...mono}}>
          STUDENIUS
        </span>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {[["Pricing","/pricing"],["Login","/login"]].map(([label,href]) => (
            <Link key={href} to={href}
              style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:"#444",textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
              onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>
              {label}
            </Link>
          ))}
          <Link to="/signup">
            <button style={{
              fontSize:11,fontWeight:600,color:"#05080f",background:TEAL,
              border:"none",padding:"6px 16px",cursor:"pointer",
              letterSpacing:"0.06em",transition:"opacity 0.15s, box-shadow 0.2s",
            }}
              onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.8";e.currentTarget.style.boxShadow=`0 0 28px rgba(0,196,180,0.5)`;}}
              onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";}}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding:"110px 32px 88px",
        maxWidth:"720px", margin:"0 auto", width:"100%",
        position:"relative", zIndex:2,
      }}>
        <OrbitalRings />

        <Reveal delay={0}>
          <p style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.16em",textTransform:"uppercase",
            marginBottom:"32px",animation:"pulse-glow 3s ease-in-out infinite"}}>
            AI-Powered Study Platform
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 style={{
            fontSize:"clamp(38px,6.5vw,68px)",fontWeight:300,
            letterSpacing:"-0.038em",lineHeight:1.04,marginBottom:"22px",color:"#F2F5F8",
          }}>
            <GlitchText text="Study smarter." /><br/>
            <span style={{
              background:`linear-gradient(135deg, ${TEAL}, ${PURPLE})`,
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
            }}>Master it faster.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{fontSize:"15px",color:"#555",maxWidth:"480px",
            marginBottom:"36px",lineHeight:1.78,fontWeight:300}}>
            12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall,
            confidence tracking and more. Built for students who demand results.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap"}}>
            <Link to="/signup">
              <button style={{
                fontSize:"12px",fontFamily:"'Inter',system-ui,sans-serif",
                fontWeight:600,color:"#05080f",background:TEAL,border:"none",
                padding:"11px 26px",cursor:"pointer",letterSpacing:"0.03em",
                transition:"opacity 0.15s,box-shadow 0.2s,transform 0.2s",
              }}
                onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";e.currentTarget.style.boxShadow=`0 0 40px rgba(0,196,180,0.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                Start for free →
              </button>
            </Link>
            <Link to="/dashboard">
              <button style={{
                fontSize:"12px",fontFamily:"'Inter',system-ui,sans-serif",
                fontWeight:300,color:"#444",background:"transparent",
                border:"none",cursor:"pointer",transition:"color 0.15s",
              }}
                onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
                onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>
                See Dashboard
              </button>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p style={{...mono,fontSize:"10px",color:"#1e2a44",marginTop:"18px",letterSpacing:"0.06em"}}>
            No credit card required · Free plan always available
          </p>
        </Reveal>
      </section>

      {/* Stats bar */}
      <div style={hairline} />
      <div style={{background:"rgba(6,8,18,0.92)",borderBottom:"0.5px solid #0d1220",position:"relative",zIndex:2}}>
        <div style={{maxWidth:"720px",margin:"0 auto",padding:"20px 32px",display:"flex",gap:"48px",flexWrap:"wrap"}}>
          {[
            {value:"12+",  label:"AI Study Tools"},
            {value:"50k+", label:"Students"},
            {value:"2M+",  label:"Questions Generated"},
            {value:"94%",  label:"Pass Rate"},
          ].map(s => <AnimatedStat key={s.label} value={s.value} label={s.label} />)}
        </div>
      </div>

      {/* ── Cinematic parallax scroll ── */}
      <div style={{position:"relative",zIndex:2}}>
        <CinematicSection />
      </div>

      {/* ── Content sections ── */}
      <div style={{position:"relative",zIndex:2,background:"#05080f"}}>

        {/* Demo */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"64px 32px"}}>
          <Reveal>
            <div style={sectionLabel}>
              <span>See it in action</span>
              <span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#0d1220"}}>
              <PracticeDemo />
              <ChatDemo />
            </div>
          </Reveal>
        </div>

        <div style={hairline} />

        {/* Upload */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"64px 32px"}}>
          <Reveal>
            <div style={sectionLabel}>
              <span>Upload anything</span>
              <span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 style={{fontSize:"clamp(22px,3vw,32px)",fontWeight:300,letterSpacing:"-0.02em",marginBottom:"8px"}}>
              Upload anything, learn everything
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p style={{fontSize:"14px",color:"#555",marginBottom:"28px",fontWeight:300}}>
              Every tool reads from your uploaded materials automatically — upload once, use everywhere.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {[
                {icon:FileText, label:"PDF Notes"},
                {icon:ImageIcon,label:"Images"},
                {icon:Mic,      label:"Voice Notes"},
                {icon:Hash,     label:"Topic Name"},
              ].map(item => (
                <TiltCard key={item.label}>
                  <div style={{
                    display:"flex",alignItems:"center",gap:"8px",
                    padding:"8px 14px",border:"0.5px solid #0d1220",
                    cursor:"default",transition:"border-color 0.15s,box-shadow 0.2s",
                  }}
                    onMouseEnter={(e)=>{(e.currentTarget as HTMLElement).style.borderColor=TEAL;(e.currentTarget as HTMLElement).style.boxShadow=`0 0 20px rgba(0,196,180,0.1)`;}}
                    onMouseLeave={(e)=>{(e.currentTarget as HTMLElement).style.borderColor="#0d1220";(e.currentTarget as HTMLElement).style.boxShadow="none";}}>
                    <item.icon style={{width:13,height:13,color:"#444"}} />
                    <span style={{...mono,fontSize:"11px",color:"#666",letterSpacing:"0.04em"}}>{item.label}</span>
                  </div>
                </TiltCard>
              ))}
            </div>
          </Reveal>
        </div>

        <div style={hairline} />

        {/* Features */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"64px 32px"}}>
          <Reveal>
            <div style={sectionLabel}>
              <span>Tools</span>
              <span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}} />
            </div>
          </Reveal>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#0d1220"}}>
            {features.map((f,i) => (
              <Reveal key={f.n} delay={i*0.04}>
                <TiltCard style={{height:"100%"}}>
                  <div style={{
                    background:"#080d1a",padding:"20px 24px",
                    transition:"background 0.2s,box-shadow 0.2s",
                    height:"100%",boxSizing:"border-box",
                  }}
                    onMouseEnter={(e)=>{(e.currentTarget as HTMLElement).style.background="#0d1525";(e.currentTarget as HTMLElement).style.boxShadow=`inset 0 0 30px rgba(0,196,180,0.04)`;}}
                    onMouseLeave={(e)=>{(e.currentTarget as HTMLElement).style.background="#080d1a";(e.currentTarget as HTMLElement).style.boxShadow="none";}}>
                    <div style={{...mono,fontSize:"10px",color:"#1e2838",marginBottom:"10px",letterSpacing:"0.06em"}}>{f.n}</div>
                    <div style={{fontSize:"13px",color:"#E0E8F0",fontWeight:500,marginBottom:"4px",letterSpacing:"-0.01em"}}>{f.title}</div>
                    <div style={{fontSize:"12px",color:"#444",lineHeight:1.6,fontWeight:300}}>{f.desc}</div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* Testimonials */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"64px 32px"}}>
          <Reveal>
            <div style={sectionLabel}>
              <span>Testimonials</span>
              <span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}} />
            </div>
          </Reveal>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#0d1220"}}>
            {testimonials.map((t,i) => (
              <Reveal key={t.name} delay={i*0.08}>
                <div style={{background:"#080d1a",padding:"20px 24px",transition:"background 0.2s"}}
                  onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.background="#0d1525")}
                  onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.background="#080d1a")}>
                  <div style={{...mono,fontSize:"10px",color:"#444",letterSpacing:"0.06em",marginBottom:"10px"}}>
                    {t.name} — {t.role}
                  </div>
                  <p style={{fontSize:"13px",color:"#555",lineHeight:1.65,fontWeight:300}}>"{t.text}"</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div style={hairline} />

        {/* CTA */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"80px 32px",position:"relative"}}>
          <div style={{
            position:"absolute",inset:0,pointerEvents:"none",
            background:`radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,196,180,0.05) 0%, transparent 70%)`,
          }} />
          <Reveal>
            <h2 style={{fontSize:"clamp(22px,3vw,36px)",fontWeight:300,letterSpacing:"-0.02em",marginBottom:"8px"}}>
              Ready to study smarter?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{fontSize:"14px",color:"#555",marginBottom:"28px",fontWeight:300}}>
              Start free. No credit card required.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link to="/signup">
              <button style={{
                fontSize:"12px",fontFamily:"'Inter',system-ui,sans-serif",
                fontWeight:600,color:"#05080f",background:TEAL,border:"none",
                padding:"11px 26px",cursor:"pointer",letterSpacing:"0.03em",
                transition:"opacity 0.15s,box-shadow 0.2s,transform 0.2s",
              }}
                onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";e.currentTarget.style.boxShadow=`0 0 48px rgba(0,196,180,0.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                Get started free →
              </button>
            </Link>
          </Reveal>
        </div>

        {/* Footer */}
        <footer style={{borderTop:"0.5px solid #0d1220"}}>
          <div style={{maxWidth:"720px",margin:"0 auto",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{...mono,fontSize:"10px",color:"#1e2838",letterSpacing:"0.06em"}}>
              STUDENIUS © {new Date().getFullYear()}
            </span>
            <div style={{display:"flex",gap:"20px"}}>
              {[["Pricing","/pricing"],["Login","/login"],["Sign Up","/signup"]].map(([label,href]) => (
                <Link key={href} to={href}
                  style={{fontSize:"11px",color:"#444",textDecoration:"none",transition:"color 0.15s"}}
                  onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.color="#666")}
                  onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.color="#444")}>
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
