/**
 * STUDENIUS ONBOARDING — src/pages/OnboardingFlow.tsx
 * =====================================================
 * Drop this file at: src/pages/OnboardingFlow.tsx
 *
 * GLBs → copy to: public/models/Bunny.glb, Bear.glb, cat.glb, fox.glb
 *
 * Font → add inside <head> of index.html:
 *   <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
 *
 * Supabase → search "TODO_SUPABASE" — 2 spots to swap in your client
 */

import React, {
  useRef, useState, useEffect, Suspense, useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
// TODO_SUPABASE: import { supabase } from "@/lib/supabase";
// TODO_SUPABASE: import { useAuth } from "@/contexts/AuthContext";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type StudyStyle = "grind" | "chill" | "streak" | "deep";
type AnimalKey  = "bunny" | "bear" | "cat" | "fox";
type DailyGoal  = 15 | 30 | 45 | 60;

interface OnboardingData {
  name:       string;
  studyStyle: StudyStyle | null;
  animal:     AnimalKey  | null;
  dailyGoal:  DailyGoal  | null;
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const C = {
  ink:    "#1A1A2E",
  cream:  "#FFFDF7",
  // hero block per screen
  h1: "#4D96FF",   // welcome   — blue
  h2: "#FF6B6B",   // style     — coral
  h3: "#FFD93D",   // identity  — yellow
  h4: "#6BCB77",   // plan      — green
  // accents
  pink:   "#FF6FC8",
  purple: "#A259FF",
  yellow: "#FFD93D",
  coral:  "#FF6B6B",
};

// ─── DATA ─────────────────────────────────────────────────────────────────────

const STYLES = [
  { key: "grind"  as StudyStyle, emoji: "🔥", label: "Grind mode",    sub: "Intense sessions", bg: C.coral  },
  { key: "chill"  as StudyStyle, emoji: "🌊", label: "Chill pace",    sub: "Easy does it",     bg: C.h1     },
  { key: "streak" as StudyStyle, emoji: "⚡", label: "Streak hunter", sub: "Daily habit",      bg: C.h4     },
  { key: "deep"   as StudyStyle, emoji: "🧠", label: "Deep focus",    sub: "Long sessions",    bg: C.purple },
];

const ANIMALS = [
  { key: "bunny" as AnimalKey, label: "Bunny", src: "/models/Bunny.glb", bg: C.yellow,  tag: "Consistent & fast" },
  { key: "bear"  as AnimalKey, label: "Bear",  src: "/models/Bear.glb",  bg: C.coral,   tag: "Strong & steady"   },
  { key: "cat"   as AnimalKey, label: "Cat",   src: "/models/cat.glb",   bg: C.purple,  tag: "Smart & curious"   },
  { key: "fox"   as AnimalKey, label: "Fox",   src: "/models/fox.glb",   bg: C.h1,      tag: "Clever & quick"    },
  // { key: "deer" as AnimalKey, label: "Deer", src: "/models/deer.glb", bg: "#6BCB77", tag: "Gentle & focused" },
  // { key: "capy" as AnimalKey, label: "Capy", src: "/models/Capycabra.glb", bg: C.pink, tag: "Chill & wise" },
];

const GOALS = [
  { value: 15 as DailyGoal, label: "15 min", sub: "Light"    },
  { value: 30 as DailyGoal, label: "30 min", sub: "Balanced" },
  { value: 45 as DailyGoal, label: "45 min", sub: "Focused"  },
  { value: 60 as DailyGoal, label: "1 hour", sub: "Beast"    },
];

const PLAN: Record<StudyStyle, [string, string][]> = {
  grind:  [["Intense sprint","2h sessions, 6 days/week"],["Exam simulations","Full papers, timed"],["Review & dominate","AI weak-spot drill"]],
  chill:  [["Gentle start","15 min daily, no pressure"],["Build momentum","Add topics slowly"],["Steady mastery","Review what sticks"]],
  streak: [["Lock the habit","Quick daily check-ins"],["Grow the chain","Micro quizzes daily"],["Streak milestones","XP rewards weekly"]],
  deep:   [["Deep dive","One topic, full depth"],["Connect the dots","Cross-topic mapping"],["Synthesize","Essays + hard problems"]],
};

const PLAN_DOTS = [C.coral, C.h1, C.h4];

// ─── 3-D MODEL ────────────────────────────────────────────────────────────────

function Model({ src, bounce }: { src: string; bounce: boolean }) {
  const group  = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(src);
  const { actions, names }    = useAnimations(animations, group);

  // play first baked clip if present
  useEffect(() => {
    if (!names.length) return;
    const a = actions[names[0]];
    if (a) { a.reset().fadeIn(0.4).play(); a.timeScale = 0.75; }
  }, [actions, names]);

  const clock    = useRef(0);
  const bounceT  = useRef(0);
  const bouncing = useRef(false);

  useEffect(() => {
    if (bounce) { bouncing.current = true; bounceT.current = 0; }
  }, [bounce]);

  useFrame((_, dt) => {
    if (!group.current) return;
    clock.current += dt;
    const sway = Math.sin(clock.current * 1.2) * 0.03;
    const bob  = Math.sin(clock.current * 1.8) * 0.012;
    group.current.rotation.y = sway;
    group.current.position.y = bob;

    if (bouncing.current) {
      bounceT.current += dt * 6;
      const h = Math.abs(Math.sin(bounceT.current)) * 0.22;
      const s = 1 + Math.sin(bounceT.current) * 0.1;
      group.current.position.y = bob + h;
      group.current.scale.setScalar(s);
      if (bounceT.current > Math.PI * 1.6) {
        bouncing.current = false;
        group.current.scale.setScalar(1);
      }
    }
  });

  const cloned = React.useMemo(() => scene.clone(), [scene]);
  return <group ref={group}><primitive object={cloned} /></group>;
}

// ─── ANIMAL CARD ──────────────────────────────────────────────────────────────

function AnimalCard({
  animal, selected, onSelect,
}: {
  animal: typeof ANIMALS[0];
  selected: boolean;
  onSelect: () => void;
}) {
  const [bounce, setBounce] = useState(false);
  const tap = () => {
    setBounce(true);
    onSelect();
    setTimeout(() => setBounce(false), 900);
  };
  return (
    <button onClick={tap} style={{
      background:    selected ? animal.bg : "#fff",
      border:        `2.5px solid ${C.ink}`,
      borderRadius:  18,
      padding:       "10px 6px 12px",
      cursor:        "pointer",
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           4,
      transform:     selected ? "scale(1.05)" : "scale(1)",
      transition:    "transform 0.15s, background 0.15s",
      fontFamily:    "'Quicksand',sans-serif",
    }}>
      <div style={{ width: "100%", height: 110, borderRadius: 12, overflow: "hidden" }}>
        <Canvas camera={{ position: [0, 0.35, 1.85], fov: 44 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}>
          <ambientLight intensity={1.3} />
          <directionalLight position={[2, 4, 2]} intensity={1.5} />
          <directionalLight position={[-2, 1, -1]} intensity={0.5} />
          <Suspense fallback={null}>
            <Model src={animal.src} bounce={bounce} />
          </Suspense>
        </Canvas>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{animal.label}</span>
      <span style={{ fontSize: 10, fontWeight: 500, color: C.ink, opacity: 0.5 }}>{animal.tag}</span>
    </button>
  );
}

// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────

function Blob({ color, size = 120, style: s }: { color: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200"
      style={{ position: "absolute", pointerEvents: "none", ...s }}>
      <path d="M47.1,-57.1C60.3,-46.6,69.9,-31.6,72.4,-15.2C74.9,1.2,70.3,19,60.5,32.8C50.7,46.5,35.7,56.2,18.9,62.3C2.1,68.3,-16.5,70.8,-31.6,64.6C-46.7,58.5,-58.2,43.7,-65.4,26.5C-72.6,9.3,-75.5,-10.3,-68.9,-26.1C-62.3,-41.9,-46.2,-53.9,-30.3,-63.4C-14.4,-72.9,1.3,-79.8,16.2,-76.3C31,-72.8,33.9,-67.5,47.1,-57.1Z"
        fill={color} transform="translate(100 100)" />
    </svg>
  );
}

function Hero({ bg, step, title, accent, children }: {
  bg: string; step?: string; title: React.ReactNode; accent?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{
      background:    bg,
      padding:       "38px 28px 32px",
      position:      "relative",
      overflow:      "hidden",
      borderBottom:  `3px solid ${C.ink}`,
      flexShrink:    0,
    }}>
      <Blob color={accent ?? C.yellow} size={160} style={{ right: -45, top: -45, opacity: 0.65 }} />
      <Blob color={C.ink}              size={80}  style={{ left: -15, bottom: -15, opacity: 0.1 }} />
      {step && (
        <div style={{
          display: "inline-block", background: C.ink, color: "#fff",
          fontSize: 10, fontWeight: 700, padding: "4px 11px",
          borderRadius: 20, letterSpacing: "0.08em", marginBottom: 14,
          opacity: 0.6, position: "relative", zIndex: 1,
        }}>{step}</div>
      )}
      <h1 style={{
        fontSize: 34, fontWeight: 700, color: C.ink,
        lineHeight: 1.1, margin: "0 0 10px",
        position: "relative", zIndex: 1,
      }}>{title}</h1>
      {children}
    </div>
  );
}

function BigBtn({ label, onClick, disabled = false }: {
  label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:       "100%",
      background:  disabled ? "#ddd" : C.ink,
      color:       disabled ? "#aaa" : C.cream,
      border:      `2.5px solid ${disabled ? "#ddd" : C.ink}`,
      borderRadius: 18,
      padding:     "15px",
      fontSize:    16,
      fontWeight:  700,
      fontFamily:  "'Quicksand',sans-serif",
      cursor:      disabled ? "not-allowed" : "pointer",
      marginTop:   "auto",
      flexShrink:  0,
      letterSpacing: "0.02em",
    }}>{label}</button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none",
      fontFamily: "'Quicksand',sans-serif",
      fontSize: 13, fontWeight: 600,
      color: C.ink, opacity: 0.4, cursor: "pointer",
      padding: 0, marginBottom: 12, alignSelf: "flex-start",
    }}>← back</button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.ink,
      opacity: 0.45, letterSpacing: "0.07em",
      marginBottom: 8, marginTop: 18,
    }}>{children}</div>
  );
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "14px 0 6px", background: C.cream }}>
      {Array.from({ length: total }).map((_, i) => {
        const on = i + 1 === current;
        return (
          <div key={i} style={{
            width:        on ? 22 : 7,
            height:       7,
            borderRadius: on ? 4 : "50%",
            background:   on ? C.ink : "#ccc",
            transition:   "all 0.3s ease",
          }} />
        );
      })}
    </div>
  );
}

// ─── SCREEN 1 — WELCOME ───────────────────────────────────────────────────────

function S1({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <Hero bg={C.h1} title={<>study smarter.<br /><span style={{ color: C.cream }}>not harder.</span></>} accent={C.pink}>
        <p style={{ fontSize:14, color:C.ink, opacity:0.65, lineHeight:1.6, fontWeight:500, margin:0, position:"relative", zIndex:1 }}>
          Your AI-powered study companion. Build your perfect plan in 60 seconds.
        </p>
      </Hero>
      <div style={{ flex:1, padding:"24px 24px 32px", display:"flex", flexDirection:"column" }}>
        {[
          { icon:"🧠", text:"AI that adapts to your pace" },
          { icon:"⚡", text:"XP streaks that keep you going" },
          { icon:"🎯", text:"Personalized roadmap from day one" },
        ].map(f => (
          <div key={f.text} style={{
            display:"flex", alignItems:"center", gap:14,
            background:"#fff", border:`2.5px solid ${C.ink}`,
            borderRadius:16, padding:"14px 16px", marginBottom:12,
          }}>
            <span style={{ fontSize:22, width:36, textAlign:"center" }}>{f.icon}</span>
            <span style={{ fontSize:15, fontWeight:600, color:C.ink }}>{f.text}</span>
          </div>
        ))}
        <div style={{ flex:1 }} />
        <BigBtn label="Let's go →" onClick={onNext} />
      </div>
    </div>
  );
}

// ─── SCREEN 2 — STUDY STYLE ───────────────────────────────────────────────────

function S2({ data, setData, onNext, onBack }: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <Hero bg={C.h2} step="STEP 1 OF 3" accent={C.yellow}
        title={<>how do you<br /><span style={{ color:C.cream }}>like to learn?</span></>} />
      <div style={{ flex:1, padding:"20px 24px 28px", display:"flex", flexDirection:"column" }}>
        <BackBtn onClick={onBack} />
        <p style={{ fontSize:14, color:C.ink, opacity:0.6, fontWeight:500, marginBottom:18, lineHeight:1.5 }}>
          Pick your study vibe — AI shapes everything around it.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {STYLES.map(s => {
            const sel = data.studyStyle === s.key;
            return (
              <button key={s.key} onClick={() => setData(d => ({ ...d, studyStyle: s.key }))} style={{
                background:    sel ? s.bg : "#fff",
                border:        `2.5px solid ${C.ink}`,
                borderRadius:  18,
                padding:       "16px 14px",
                cursor:        "pointer",
                display:       "flex",
                flexDirection: "column",
                alignItems:    "flex-start",
                gap:           4,
                transform:     sel ? "scale(1.03)" : "scale(1)",
                transition:    "transform 0.12s, background 0.15s",
                fontFamily:    "'Quicksand',sans-serif",
              }}>
                <span style={{ fontSize:28, marginBottom:4 }}>{s.emoji}</span>
                <span style={{ fontSize:14, fontWeight:700, color:C.ink }}>{s.label}</span>
                <span style={{ fontSize:11, fontWeight:500, color:C.ink, opacity:0.55 }}>{s.sub}</span>
              </button>
            );
          })}
        </div>
        <BigBtn label="Next →" onClick={onNext} disabled={!data.studyStyle} />
      </div>
    </div>
  );
}

// ─── SCREEN 3 — IDENTITY ──────────────────────────────────────────────────────

function S3({ data, setData, onNext, onBack }: {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const ok = !!data.name.trim() && !!data.animal && !!data.dailyGoal;
  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <Hero bg={C.h3} step="STEP 2 OF 3" accent={C.pink}
        title={<>make it<br /><span style={{ color:C.ink, opacity:0.55 }}>yours.</span></>} />
      <div style={{ flex:1, padding:"20px 24px 28px", display:"flex", flexDirection:"column", overflowY:"auto" }}>
        <BackBtn onClick={onBack} />

        <FieldLabel>YOUR NAME</FieldLabel>
        <input
          value={data.name}
          onChange={e => setData(d => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Adrian"
          maxLength={24}
          style={{
            width:"100%", border:`2.5px solid ${C.ink}`, borderRadius:14,
            padding:"13px 16px", fontFamily:"'Quicksand',sans-serif",
            fontSize:18, fontWeight:600, color:C.ink,
            background:"#fff", outline:"none", boxSizing:"border-box",
          }}
        />

        <FieldLabel>PICK YOUR AVATAR</FieldLabel>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {ANIMALS.map(a => (
            <AnimalCard key={a.key} animal={a}
              selected={data.animal === a.key}
              onSelect={() => setData(d => ({ ...d, animal: a.key }))} />
          ))}
        </div>

        <FieldLabel>DAILY GOAL</FieldLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
          {GOALS.map(g => {
            const sel = data.dailyGoal === g.value;
            return (
              <button key={g.value} onClick={() => setData(d => ({ ...d, dailyGoal: g.value }))} style={{
                border:`2.5px solid ${C.ink}`, borderRadius:14,
                padding:"10px 4px", background: sel ? C.yellow : "#fff",
                cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", gap:2,
                transform: sel ? "scale(1.05)" : "scale(1)",
                transition:"background 0.12s, transform 0.1s",
                fontFamily:"'Quicksand',sans-serif",
              }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>{g.label}</span>
                <span style={{ fontSize:9, fontWeight:600, color:C.ink, opacity:0.5 }}>{g.sub}</span>
              </button>
            );
          })}
        </div>

        <BigBtn label="Build my plan →" onClick={onNext} disabled={!ok} />
      </div>
    </div>
  );
}

// ─── SCREEN 4 — PLAN REVEAL ───────────────────────────────────────────────────

function S4({ data, onFinish, saving }: {
  data: OnboardingData;
  onFinish: () => void;
  saving: boolean;
}) {
  const plan   = PLAN[data.studyStyle ?? "streak"];
  const animal = ANIMALS.find(a => a.key === data.animal) ?? ANIMALS[0];
  const style  = STYLES.find(s => s.key === data.studyStyle);
  const [xp, setXp]         = useState(0);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setXp(40), 700);
    const t2 = setTimeout(() => setBounce(true), 500);
    const t3 = setTimeout(() => setBounce(false), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
      <Hero bg={C.h4} step="YOUR PLAN" accent={C.coral}
        title={<>ready,<br /><span style={{ color:C.cream }}>{(data.name || "let's go").toLowerCase()}.</span></>} />

      <div style={{ flex:1, padding:"20px 24px 28px", display:"flex", flexDirection:"column", overflowY:"auto" }}>

        {/* avatar preview strip */}
        <div style={{
          display:"flex", alignItems:"center", gap:14,
          background: animal.bg, border:`2.5px solid ${C.ink}`,
          borderRadius:18, padding:"12px 16px", marginBottom:4,
        }}>
          <div style={{ width:80, height:80, flexShrink:0 }}>
            <Canvas camera={{ position:[0,0.35,1.85], fov:44 }}
              gl={{ antialias:true, alpha:true }}
              style={{ background:"transparent" }}>
              <ambientLight intensity={1.3} />
              <directionalLight position={[2,4,2]} intensity={1.5} />
              <Suspense fallback={null}>
                <Model src={animal.src} bounce={bounce} />
              </Suspense>
            </Canvas>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:C.ink }}>
              {data.name || "You"} × {animal.label}
            </div>
            <div style={{ fontSize:12, color:C.ink, opacity:0.55, fontWeight:500 }}>
              {data.dailyGoal} min/day · {style?.label}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <FieldLabel>STARTER XP</FieldLabel>
        <div style={{
          background:"#eee", borderRadius:10, height:10,
          overflow:"hidden", border:`1.5px solid ${C.ink}`,
        }}>
          <div style={{
            height:"100%", width:`${xp}%`,
            background: C.h1, borderRadius:10,
            transition:"width 1.1s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:C.ink, opacity:0.4, marginTop:4 }}>
          {xp} / 100 XP · Level 1
        </div>

        {/* roadmap */}
        <FieldLabel>YOUR ROADMAP</FieldLabel>
        {plan.map(([title, sub], i) => (
          <div key={i} style={{
            display:"flex", gap:12, alignItems:"flex-start",
            border:`2px solid ${C.ink}`, borderRadius:16,
            padding:"12px 14px", background:"#fff", marginBottom:10,
          }}>
            <div style={{
              width:12, height:12, borderRadius:"50%",
              background: PLAN_DOTS[i], border:`2px solid ${C.ink}`,
              flexShrink:0, marginTop:4,
            }} />
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:C.ink, opacity:0.4, letterSpacing:"0.07em" }}>
                WEEK {i === 0 ? "1–2" : i === 1 ? "3–4" : "5+"}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>{title}</div>
              <div style={{ fontSize:12, fontWeight:500, color:C.ink, opacity:0.55 }}>{sub}</div>
            </div>
          </div>
        ))}

        <BigBtn
          label={saving ? "Setting up…" : "Start studying →"}
          onClick={onFinish}
          disabled={saving}
        />
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const navigate = useNavigate();
  // TODO_SUPABASE: const { user } = useAuth();
  const [step,   setStep]  = useState(1);
  const [saving, setSaving] = useState(false);
  const [data,   setData]  = useState<OnboardingData>({
    name: "", studyStyle: null, animal: null, dailyGoal: null,
  });

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      // ── Supabase upsert ─────────────────────────────────────────────────
      // TODO_SUPABASE: const { data: { user } } = await supabase.auth.getUser();
      // TODO_SUPABASE: await supabase.from("profiles").upsert({
      // TODO_SUPABASE:   id:                    user?.id,
      // TODO_SUPABASE:   display_name:          data.name,
      // TODO_SUPABASE:   study_style:           data.studyStyle,
      // TODO_SUPABASE:   avatar_animal:         data.animal,
      // TODO_SUPABASE:   daily_goal_minutes:    data.dailyGoal,
      // TODO_SUPABASE:   onboarding_complete:   true,
      // TODO_SUPABASE: });
      // ── fallback (remove once Supabase is wired) ────────────────────────
      localStorage.setItem("studenius_onboarding", JSON.stringify(data));
      // ────────────────────────────────────────────────────────────────────
      navigate("/dashboard");
    } catch (err) {
      console.error("Onboarding save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [data, navigate]);

  return (
    <div style={{
      fontFamily:   "'Quicksand', sans-serif",
      background:   C.cream,
      minHeight:    "100dvh",
      display:      "flex",
      flexDirection:"column",
      maxWidth:     480,
      margin:       "0 auto",
      overflowX:    "hidden",
    }}>
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        * { box-sizing: border-box; }
        button:active { transform: scale(0.97) !important; }
        input:focus { border-color: ${C.h1} !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <Dots current={step} total={4} />

      <div style={{ flex:1, display:"flex", flexDirection:"column",
        animation:"fadeSlide 0.3s ease" }} key={step}>
        {step === 1 && <S1 onNext={() => setStep(2)} />}
        {step === 2 && <S2 data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <S3 data={data} setData={setData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <S4 data={data} onFinish={handleFinish} saving={saving} />}
      </div>
    </div>
  );
}

// preload all models on import
ANIMALS.forEach(a => useGLTF.preload(a.src));
