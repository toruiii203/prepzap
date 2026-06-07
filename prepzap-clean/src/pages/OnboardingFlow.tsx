/**
 * STUDENIUS ONBOARDING — src/pages/OnboardingFlow.tsx
 * =====================================================
 * 10-screen onboarding flow
 * Screens 1-3: Swipeable intro slides (no decisions)
 * Screens 4-10: Personalization steps
 *
 * GLBs → public/models/Bunny.glb, Bear.glb, cat.glb, fox.glb
 * Font → index.html <head>:
 *   <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
 */

import React, { useRef, useState, useEffect, Suspense, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
// TODO_SUPABASE: import { supabase } from "@/lib/supabase";
// TODO_SUPABASE: import { useAuth } from "@/contexts/AuthContext";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type StudyStyle = "visual" | "practice" | "flashcards" | "reading" | "mixed";
type Goal       = "grades" | "faster" | "habits" | "college" | "skill";
type Subject    = "math" | "science" | "english" | "history" | "programming" | "arts";
type AnimalKey  = "bunny" | "bear" | "cat" | "fox";
type DailyGoal  = 15 | 30 | 45 | 60;

interface OBData {
  name:       string;
  subject:    Subject  | null;
  goal:       Goal     | null;
  studyStyle: StudyStyle | null;
  animal:     AnimalKey  | null;
  dailyGoal:  DailyGoal  | null;
}

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const SCREENS_BG = [
  "#FFD93D", // 1 splash        — yellow
  "#4ECDC4", // 2 feature 1     — teal
  "#4D96FF", // 3 feature 2     — blue
  "#A259FF", // 4 what studying — purple
  "#FF8C42", // 5 goal          — orange
  "#FF6B6B", // 6 study style   — coral/red
  "#4D96FF", // 7 name          — blue
  "#A259FF", // 8 avatar        — purple
  "#6BCB77", // 9 daily goal    — green
  "#FF6FC8", // 10 plan reveal  — pink
];

const INK   = "#1A1A2E";
const WHITE = "#FFFFFF";
const CREAM = "#FFFDF7";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SUBJECTS: { key: Subject; label: string; icon: string }[] = [
  { key: "math",        label: "Mathematics",  icon: "📐" },
  { key: "science",     label: "Science",      icon: "🔬" },
  { key: "english",     label: "English",      icon: "📖" },
  { key: "history",     label: "History",      icon: "🏛️" },
  { key: "programming", label: "Programming",  icon: "💻" },
  { key: "arts",        label: "Arts",         icon: "🎨" },
];

const GOALS: { key: Goal; label: string; icon: string }[] = [
  { key: "grades",  label: "Improve Grades",     icon: "📈" },
  { key: "faster",  label: "Study Faster",        icon: "⚡" },
  { key: "habits",  label: "Build Study Habits",  icon: "🔁" },
  { key: "college", label: "Prepare for College", icon: "🎓" },
  { key: "skill",   label: "Learn a New Skill",   icon: "🧠" },
];

const STUDY_STYLES: { key: StudyStyle; label: string; icon: string }[] = [
  { key: "visual",    label: "Visual Scenes",  icon: "👁️" },
  { key: "practice",  label: "Practice Tests", icon: "✏️" },
  { key: "flashcards",label: "Flashcards",     icon: "🗂️" },
  { key: "reading",   label: "Reading",        icon: "📚" },
  { key: "mixed",     label: "Mixed",          icon: "🔀" },
];

const ANIMALS: { key: AnimalKey; label: string; src: string; bg: string; tag: string }[] = [
  { key: "bunny", label: "Bunny", src: "/models/Bunny.glb", bg: "#FFD93D", tag: "Consistent & fast"  },
  { key: "bear",  label: "Bear",  src: "/models/Bear.glb",  bg: "#FF6B6B", tag: "Strong & steady"    },
  { key: "cat",   label: "Cat",   src: "/models/cat.glb",   bg: "#A259FF", tag: "Smart & curious"    },
  { key: "fox",   label: "Fox",   src: "/models/fox.glb",   bg: "#4D96FF", tag: "Clever & quick"     },
];

const DAILY_GOALS: { value: DailyGoal; label: string; sub: string; color: string }[] = [
  { value: 15, label: "15 min", sub: "Light touch",  color: "#4ECDC4" },
  { value: 30, label: "30 min", sub: "Balanced",     color: "#4D96FF" },
  { value: 45, label: "45 min", sub: "Focused",      color: "#A259FF" },
  { value: 60, label: "1 hour", sub: "Beast mode",   color: "#FF6B6B" },
];

// ─── 3D MODEL ─────────────────────────────────────────────────────────────────
function Model({ src, bounce, scale = 1 }: { src: string; bounce?: boolean; scale?: number }) {
  const group  = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(src);
  const { actions, names }    = useAnimations(animations, group);
  useEffect(() => {
    if (!names.length) return;
    const a = actions[names[0]];
    if (a) { a.reset().fadeIn(0.4).play(); a.timeScale = 0.75; }
  }, [actions, names]);
  const clock   = useRef(0);
  const bounceT = useRef(0);
  const bouncing = useRef(false);
  useEffect(() => { if (bounce) { bouncing.current = true; bounceT.current = 0; } }, [bounce]);
  useFrame((_, dt) => {
    if (!group.current) return;
    clock.current += dt;
    const bob  = Math.sin(clock.current * 1.8) * 0.012;
    const sway = Math.sin(clock.current * 1.2) * 0.025;
    group.current.rotation.y = sway;
    group.current.position.y = bob;
    if (bouncing.current) {
      bounceT.current += dt * 6;
      group.current.position.y = bob + Math.abs(Math.sin(bounceT.current)) * 0.2;
      group.current.scale.setScalar(scale * (1 + Math.sin(bounceT.current) * 0.1));
      if (bounceT.current > Math.PI * 1.6) { bouncing.current = false; group.current.scale.setScalar(scale); }
    }
  });
  const cloned = React.useMemo(() => scene.clone(), [scene]);
  return <group ref={group} scale={[scale, scale, scale]}><primitive object={cloned} /></group>;
}

function AnimalCanvas({ src, h = 200, camY = 0.5, bounce }: { src: string; h?: number; camY?: number; bounce?: boolean }) {
  return (
    <div style={{ width: "100%", height: h }}>
      <Canvas camera={{ position: [0, camY, 2.2], fov: 42 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[2, 4, 2]} intensity={1.6} />
        <directionalLight position={[-2, 1, -1]} intensity={0.5} />
        <Suspense fallback={null}><Model src={src} bounce={bounce} /></Suspense>
      </Canvas>
    </div>
  );
}

// ─── CONFETTI DOTS ────────────────────────────────────────────────────────────
function Confetti() {
  const items = [
    { x: "8%",  y: "12%", color: "#FF6B6B", size: 10, rot: 20  },
    { x: "88%", y: "8%",  color: "#4D96FF", size: 8,  rot: -15 },
    { x: "15%", y: "28%", color: "#6BCB77", size: 12, rot: 45  },
    { x: "80%", y: "22%", color: "#FF6FC8", size: 9,  rot: -30 },
    { x: "5%",  y: "55%", color: "#A259FF", size: 7,  rot: 60  },
    { x: "92%", y: "50%", color: "#FFD93D", size: 11, rot: 10  },
    { x: "20%", y: "75%", color: "#4ECDC4", size: 8,  rot: -45 },
    { x: "85%", y: "70%", color: "#FF8C42", size: 10, rot: 25  },
    { x: "50%", y: "10%", color: "#FF6B6B", size: 6,  rot: -20 },
    { x: "70%", y: "85%", color: "#4D96FF", size: 9,  rot: 35  },
  ];
  return (
    <>
      {items.map((c, i) => (
        <div key={i} style={{
          position: "absolute", left: c.x, top: c.y,
          width: c.size, height: c.size * 2.2,
          background: c.color, borderRadius: 2,
          transform: `rotate(${c.rot}deg)`,
          opacity: 0.85, pointerEvents: "none",
        }} />
      ))}
    </>
  );
}

// ─── SPARKLES ─────────────────────────────────────────────────────────────────
function Sparkles({ color = WHITE }: { color?: string }) {
  const pts = [
    { x: "10%", y: "15%", s: 18 }, { x: "85%", y: "20%", s: 22 },
    { x: "20%", y: "60%", s: 14 }, { x: "78%", y: "55%", s: 16 },
    { x: "50%", y: "8%",  s: 12 }, { x: "90%", y: "75%", s: 20 },
  ];
  return (
    <>
      {pts.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p.x, top: p.y, pointerEvents: "none", opacity: 0.7 }}>
          <svg width={p.s} height={p.s} viewBox="0 0 24 24">
            <path d="M12 2L13.5 9.5L21 11L13.5 12.5L12 20L10.5 12.5L3 11L10.5 9.5Z" fill={color} />
          </svg>
        </div>
      ))}
    </>
  );
}

// ─── PILL LIST ────────────────────────────────────────────────────────────────
function PillList<T extends string>({
  items, selected, onSelect, accentColor,
}: {
  items: { key: T; label: string; icon: string }[];
  selected: T | null;
  onSelect: (k: T) => void;
  accentColor: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {items.map(item => {
        const sel = selected === item.key;
        return (
          <button key={item.key} onClick={() => onSelect(item.key)} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 18px",
            background: sel ? INK : WHITE,
            color: sel ? WHITE : INK,
            border: `2.5px solid ${sel ? INK : "rgba(255,255,255,0.6)"}`,
            borderRadius: 100,
            fontSize: 15, fontWeight: 700,
            fontFamily: "'Quicksand', sans-serif",
            cursor: "pointer",
            transition: "all 0.15s",
            transform: sel ? "scale(1.02)" : "scale(1)",
            textAlign: "left" as const,
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: "50%",
              background: sel ? accentColor : "rgba(0,0,0,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, flexShrink: 0,
            }}>{item.icon}</span>
            {item.label}
            {sel && <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── SHARED LAYOUT ────────────────────────────────────────────────────────────
function Screen({ bg, children, style: extraStyle }: {
  bg: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      minHeight: "100dvh", background: bg,
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
      fontFamily: "'Quicksand', sans-serif",
      animation: "fadeIn 0.3s ease",
      ...extraStyle,
    }}>
      {children}
    </div>
  );
}

function BigTitle({ children, color = WHITE }: { children: React.ReactNode; color?: string }) {
  return (
    <h1 style={{
      fontSize: "clamp(32px, 8vw, 52px)",
      fontWeight: 700, color,
      lineHeight: 1.1, margin: "0 0 12px",
      position: "relative", zIndex: 1,
    }}>{children}</h1>
  );
}

function SubText({ children, color = "rgba(255,255,255,0.8)" }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{
      fontSize: 16, fontWeight: 500, color,
      lineHeight: 1.5, margin: 0,
      position: "relative", zIndex: 1,
    }}>{children}</p>
  );
}

function NextBtn({ label = "Next", onClick, disabled = false, outline = false }: {
  label?: string; onClick: () => void; disabled?: boolean; outline?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1,
      padding: "16px 24px",
      background: disabled ? "rgba(255,255,255,0.3)" : outline ? "transparent" : INK,
      color: disabled ? "rgba(255,255,255,0.5)" : WHITE,
      border: outline ? `2.5px solid ${WHITE}` : "none",
      borderRadius: 100,
      fontSize: 16, fontWeight: 700,
      fontFamily: "'Quicksand', sans-serif",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity 0.15s",
    }}>{label}</button>
  );
}

function SkipBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "16px 24px",
      background: "transparent",
      color: WHITE, border: `2px solid rgba(255,255,255,0.5)`,
      borderRadius: 100, fontSize: 15, fontWeight: 600,
      fontFamily: "'Quicksand', sans-serif", cursor: "pointer",
    }}>Skip for now</button>
  );
}

function NavBar({ step, total, onBack }: { step: number; total: number; onBack: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 24px 0",
    }}>
      <button onClick={onBack} style={{
        background: "rgba(255,255,255,0.2)", border: "none",
        borderRadius: "50%", width: 38, height: 38,
        color: WHITE, fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Quicksand', sans-serif",
      }}>←</button>
      <div style={{
        background: "rgba(255,255,255,0.25)", borderRadius: 100,
        padding: "6px 14px", fontSize: 13, fontWeight: 700, color: WHITE,
      }}>Step {step} of {total}</div>
    </div>
  );
}

function SlideDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 7, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 22 : 8, height: 8,
          borderRadius: 4,
          background: i === current ? WHITE : "rgba(255,255,255,0.4)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "16px 24px 32px",
      display: "flex", flexDirection: "column", gap: 12,
      position: "relative", zIndex: 2,
    }}>{children}</div>
  );
}

// ─── SCREEN 1 — SPLASH ────────────────────────────────────────────────────────
function S1({ onNext }: { onNext: () => void }) {
  const animal = ANIMALS[0]; // bunny
  return (
    <Screen bg={SCREENS_BG[0]}>
      <Confetti />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px 0", position: "relative", zIndex: 1 }}>
        <div style={{
          width: "min(320px, 85vw)", aspectRatio: "1/1",
          background: "rgba(255,255,255,0.25)",
          borderRadius: 40, overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.5)",
          marginBottom: 24,
        }}>
          <AnimalCanvas src={animal.src} h={300} camY={0.3} />
        </div>
        <SlideDots current={0} total={3} />
      </div>
      <div style={{ padding: "24px 32px 0", zIndex: 1, position: "relative" }}>
        <BigTitle color={INK}>Study Smarter.<br />Own It.</BigTitle>
        <SubText color="rgba(26,26,46,0.7)">Your AI-powered study companion. Built for every type of learner.</SubText>
      </div>
      <BottomBar>
        <NextBtn label="Get Started →" onClick={onNext} />
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 2 — FEATURE 1 ─────────────────────────────────────────────────────
function S2({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const animal = ANIMALS[2]; // cat
  return (
    <Screen bg={SCREENS_BG[1]}>
      <Sparkles />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <AnimalCanvas src={animal.src} h={280} camY={0.2} />
        <SlideDots current={1} total={3} />
      </div>
      <div style={{ padding: "16px 32px 0", zIndex: 1, position: "relative" }}>
        <BigTitle>See It, Learn It,<br />Own It</BigTitle>
        <SubText>Visual tools that make ideas click and stay with you forever.</SubText>
      </div>
      <BottomBar>
        <div style={{ display: "flex", gap: 12 }}>
          <NextBtn onClick={onNext} />
          <SkipBtn onClick={onSkip} />
        </div>
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 3 — FEATURE 2 ─────────────────────────────────────────────────────
function S3({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const animal = ANIMALS[3]; // fox
  const tools = ["AI Tutor", "Flashcards", "Visual Learner", "Practice Tests", "Boss Round"];
  return (
    <Screen bg={SCREENS_BG[2]}>
      <Sparkles />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px 0", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 20 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {tools.map((t, i) => (
              <div key={t} style={{
                background: i === 2 ? INK : "rgba(255,255,255,0.9)",
                color: i === 2 ? WHITE : INK,
                borderRadius: 14, padding: "12px 16px",
                fontSize: 14, fontWeight: 700,
                transform: `translateX(${i % 2 === 0 ? 0 : 8}px)`,
              }}>{t}</div>
            ))}
          </div>
          <div style={{ width: 120, flexShrink: 0 }}>
            <AnimalCanvas src={animal.src} h={180} camY={0.3} />
          </div>
        </div>
        <SlideDots current={2} total={3} />
      </div>
      <div style={{ padding: "8px 32px 0", zIndex: 1, position: "relative" }}>
        <BigTitle>23 Smart Tools,<br />One Place</BigTitle>
        <SubText>Built for every type of learner.</SubText>
      </div>
      <BottomBar>
        <div style={{ display: "flex", gap: 12 }}>
          <NextBtn onClick={onNext} />
          <SkipBtn onClick={onSkip} />
        </div>
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 4 — WHAT ARE YOU STUDYING ────────────────────────────────────────
function S4({ data, setData, onNext, onBack, onSkip }: {
  data: OBData; setData: React.Dispatch<React.SetStateAction<OBData>>;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const animal = ANIMALS[2]; // cat — studying vibe
  return (
    <Screen bg={SCREENS_BG[3]}>
      <Confetti />
      <NavBar step={1} total={6} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", gap: 0, padding: "16px 24px 8px", position: "relative", zIndex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: 8 }}>
          <BigTitle>What are<br />you studying?</BigTitle>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <PillList items={SUBJECTS} selected={data.subject} onSelect={k => setData(d => ({ ...d, subject: k }))} accentColor={SCREENS_BG[3]} />
          </div>
        </div>
        <div style={{ width: 110, flexShrink: 0, alignSelf: "flex-end", marginBottom: -20 }}>
          <AnimalCanvas src={animal.src} h={190} camY={0.1} />
        </div>
      </div>
      <BottomBar>
        <div style={{ display: "flex", gap: 12 }}>
          <NextBtn onClick={onNext} disabled={!data.subject} />
          <SkipBtn onClick={onSkip} />
        </div>
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 5 — WHAT IS YOUR GOAL ─────────────────────────────────────────────
function S5({ data, setData, onNext, onBack, onSkip }: {
  data: OBData; setData: React.Dispatch<React.SetStateAction<OBData>>;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const animal = ANIMALS[2]; // deer/cat
  return (
    <Screen bg={SCREENS_BG[4]}>
      <Confetti />
      <NavBar step={2} total={6} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", gap: 0, padding: "16px 24px 8px", position: "relative", zIndex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: 8 }}>
          <BigTitle>What is<br />your goal?</BigTitle>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <PillList items={GOALS} selected={data.goal} onSelect={k => setData(d => ({ ...d, goal: k }))} accentColor={SCREENS_BG[4]} />
          </div>
        </div>
        <div style={{ width: 110, flexShrink: 0, alignSelf: "flex-end", marginBottom: -20 }}>
          <AnimalCanvas src={animal.src} h={190} camY={0.1} />
        </div>
      </div>
      <BottomBar>
        <div style={{ display: "flex", gap: 12 }}>
          <NextBtn onClick={onNext} disabled={!data.goal} />
          <SkipBtn onClick={onSkip} />
        </div>
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 6 — HOW DO YOU LEARN BEST ────────────────────────────────────────
function S6({ data, setData, onNext, onBack, onSkip }: {
  data: OBData; setData: React.Dispatch<React.SetStateAction<OBData>>;
  onNext: () => void; onBack: () => void; onSkip: () => void;
}) {
  const animal = ANIMALS[0]; // bunny
  return (
    <Screen bg={SCREENS_BG[5]}>
      <Confetti />
      <NavBar step={3} total={6} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", gap: 0, padding: "16px 24px 8px", position: "relative", zIndex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: 8 }}>
          <BigTitle>How do you<br />learn best?</BigTitle>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <PillList items={STUDY_STYLES} selected={data.studyStyle} onSelect={k => setData(d => ({ ...d, studyStyle: k }))} accentColor={SCREENS_BG[5]} />
          </div>
        </div>
        <div style={{ width: 110, flexShrink: 0, alignSelf: "flex-end", marginBottom: -20 }}>
          <AnimalCanvas src={animal.src} h={190} camY={0.1} />
        </div>
      </div>
      <BottomBar>
        <div style={{ display: "flex", gap: 12 }}>
          <NextBtn onClick={onNext} disabled={!data.studyStyle} />
          <SkipBtn onClick={onSkip} />
        </div>
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 7 — WHAT SHOULD WE CALL YOU ──────────────────────────────────────
function S7({ data, setData, onNext, onBack }: {
  data: OBData; setData: React.Dispatch<React.SetStateAction<OBData>>;
  onNext: () => void; onBack: () => void;
}) {
  const animal = ANIMALS[2]; // cat — peeking
  return (
    <Screen bg={SCREENS_BG[6]}>
      <Confetti />
      <NavBar step={4} total={6} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 32px 0", position: "relative", zIndex: 1 }}>
        <BigTitle>What should<br />we call you?</BigTitle>
        <SubText>You can always change this later</SubText>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
          <div style={{
            background: WHITE, borderRadius: 28,
            padding: "28px 24px 80px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: INK, opacity: 0.5, marginBottom: 10, letterSpacing: "0.06em" }}>ENTER YOUR NAME</p>
            <input
              value={data.name}
              onChange={e => setData(d => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Adrian"
              maxLength={24}
              style={{
                width: "100%", border: "none", borderBottom: `2.5px solid ${SCREENS_BG[6]}`,
                padding: "10px 0", fontFamily: "'Quicksand', sans-serif",
                fontSize: 22, fontWeight: 700, color: INK,
                background: "transparent", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {/* animal peeking from bottom of card */}
          <div style={{
            position: "absolute", bottom: -10, right: 20,
            width: 120, height: 120, pointerEvents: "none",
          }}>
            <AnimalCanvas src={animal.src} h={120} camY={0.6} />
          </div>
        </div>
      </div>
      <BottomBar>
        <NextBtn label="Let's Go →" onClick={onNext} disabled={!data.name.trim()} />
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 8 — PICK YOUR AVATAR ─────────────────────────────────────────────
function S8({ data, setData, onNext, onBack }: {
  data: OBData; setData: React.Dispatch<React.SetStateAction<OBData>>;
  onNext: () => void; onBack: () => void;
}) {
  const [bounce, setBounce] = useState(false);
  const selected = ANIMALS.find(a => a.key === data.animal) ?? ANIMALS[0];

  const pick = (key: AnimalKey) => {
    setData(d => ({ ...d, animal: key }));
    setBounce(true);
    setTimeout(() => setBounce(false), 900);
  };

  return (
    <Screen bg={SCREENS_BG[7]}>
      <Confetti />
      <NavBar step={5} total={6} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 0", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <BigTitle>Build Your<br />Avatar</BigTitle>
            <SubText>Pick your look</SubText>
          </div>
          {/* big selected animal preview */}
          <div style={{
            width: 130, height: 140,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 24, overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.4)",
          }}>
            <AnimalCanvas src={selected.src} h={140} camY={0.4} bounce={bounce} />
          </div>
        </div>

        {/* animal selector pills */}
        <div style={{
          background: "rgba(255,255,255,0.15)",
          borderRadius: 24, padding: "16px",
          backdropFilter: "blur(8px)",
          marginTop: 16,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {ANIMALS.map(a => {
              const sel = data.animal === a.key;
              return (
                <button key={a.key} onClick={() => pick(a.key)} style={{
                  background: sel ? WHITE : "rgba(255,255,255,0.25)",
                  border: `2.5px solid ${sel ? WHITE : "rgba(255,255,255,0.4)"}`,
                  borderRadius: 18, padding: "10px 14px",
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", transition: "all 0.15s",
                  transform: sel ? "scale(1.04)" : "scale(1)",
                  fontFamily: "'Quicksand', sans-serif",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: a.bg, overflow: "hidden", flexShrink: 0,
                  }}>
                    <Canvas camera={{ position: [0, 0.5, 2.2], fov: 42 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
                      <ambientLight intensity={1.4} />
                      <directionalLight position={[2, 4, 2]} intensity={1.5} />
                      <Suspense fallback={null}><Model src={a.src} /></Suspense>
                    </Canvas>
                  </div>
                  <div style={{ textAlign: "left" as const }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: sel ? INK : WHITE }}>{a.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: sel ? INK : WHITE, opacity: 0.6 }}>{a.tag}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <BottomBar>
        <NextBtn label="Save & Continue →" onClick={onNext} disabled={!data.animal} />
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 9 — DAILY GOAL ────────────────────────────────────────────────────
function S9({ data, setData, onNext, onBack }: {
  data: OBData; setData: React.Dispatch<React.SetStateAction<OBData>>;
  onNext: () => void; onBack: () => void;
}) {
  const animal = ANIMALS.find(a => a.key === data.animal) ?? ANIMALS[0];
  return (
    <Screen bg={SCREENS_BG[8]}>
      <Confetti />
      <NavBar step={6} total={6} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 0", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <BigTitle color={INK}>Daily<br />goal?</BigTitle>
            <SubText color="rgba(26,26,46,0.65)">We'll remind you every day.</SubText>
          </div>
          <div style={{ width: 110, flexShrink: 0 }}>
            <AnimalCanvas src={animal.src} h={140} camY={0.4} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, justifyContent: "center" }}>
          {DAILY_GOALS.map(g => {
            const sel = data.dailyGoal === g.value;
            return (
              <button key={g.value} onClick={() => setData(d => ({ ...d, dailyGoal: g.value }))} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 22px",
                background: sel ? INK : WHITE,
                border: `3px solid ${sel ? INK : "rgba(255,255,255,0.7)"}`,
                borderRadius: 20,
                cursor: "pointer", transition: "all 0.15s",
                transform: sel ? "scale(1.02)" : "scale(1)",
                fontFamily: "'Quicksand', sans-serif",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: sel ? g.color : `${g.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>⏱️</div>
                  <div style={{ textAlign: "left" as const }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: sel ? WHITE : INK }}>{g.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: sel ? "rgba(255,255,255,0.6)" : "rgba(26,26,46,0.5)" }}>{g.sub}</div>
                  </div>
                </div>
                {sel && <div style={{ width: 24, height: 24, borderRadius: "50%", background: g.color, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: 13, fontWeight: 700 }}>✓</div>}
              </button>
            );
          })}
        </div>
      </div>
      <BottomBar>
        <NextBtn label="Build My Plan →" onClick={onNext} disabled={!data.dailyGoal} />
      </BottomBar>
    </Screen>
  );
}

// ─── SCREEN 10 — PLAN REVEAL ──────────────────────────────────────────────────
function S10({ data, onFinish, saving }: {
  data: OBData; onFinish: () => void; saving: boolean;
}) {
  const animal  = ANIMALS.find(a => a.key === data.animal) ?? ANIMALS[0];
  const [xp, setXp] = useState(0);
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setXp(40), 800);
    const t2 = setTimeout(() => setBounce(true), 600);
    const t3 = setTimeout(() => setBounce(false), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const bubbles = [
    { label: "Focus Score", value: "87%",    icon: "🎯", color: "#FF6FC8" },
    { label: "Streak",      value: "Day 1",  icon: "⚡", color: "#FFD93D" },
    { label: "Weak Spot",   value: "TBD",    icon: "📍", color: "#4D96FF" },
  ];

  return (
    <Screen bg={SCREENS_BG[9]}>
      <Sparkles />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 28px 0", position: "relative", zIndex: 1, alignItems: "center" }}>
        <BigTitle>Know Your Focus,<br />Ace Your Goals</BigTitle>
        <SubText>Track progress. Study smarter.</SubText>

        {/* animal + bubbles */}
        <div style={{ position: "relative", width: "100%", maxWidth: 340, height: 260, marginTop: 16 }}>
          {bubbles.map((b, i) => {
            const positions = [
              { top: "5%",  left: "2%"  },
              { top: "0%",  right: "5%" },
              { top: "45%", right: "0%" },
            ];
            return (
              <div key={b.label} style={{
                position: "absolute", ...positions[i],
                background: WHITE, borderRadius: 20,
                padding: "12px 16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                minWidth: 110,
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{b.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: INK, opacity: 0.5 }}>{b.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{b.value}</div>
              </div>
            );
          })}
          <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 180 }}>
            <AnimalCanvas src={animal.src} h={200} camY={0.2} bounce={bounce} />
          </div>
        </div>

        {/* XP bar */}
        <div style={{ width: "100%", maxWidth: 340, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: WHITE, opacity: 0.8 }}>STARTER XP</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{xp} / 100</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.3)", borderRadius: 10, height: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${xp}%`, background: WHITE, borderRadius: 10, transition: "width 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </div>
        </div>

        <p style={{ fontSize: 20, fontWeight: 700, color: WHITE, marginTop: 20, textAlign: "center" as const }}>
          {data.name ? `Welcome, ${data.name}! 🎉` : "You're all set! 🎉"}
        </p>
      </div>
      <BottomBar>
        <NextBtn label={saving ? "Setting up…" : "Start Studying →"} onClick={onFinish} disabled={saving} />
      </BottomBar>
    </Screen>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(0); // 0-indexed, 0–9
  const [saving, setSaving] = useState(false);
  const [data, setData]     = useState<OBData>({
    name: "", subject: null, goal: null, studyStyle: null, animal: null, dailyGoal: null,
  });

  const next = useCallback(() => setStep(s => Math.min(s + 1, 9)), []);
  const back = useCallback(() => setStep(s => Math.max(s - 1, 0)), []);
  const skip = useCallback(() => setStep(s => Math.min(s + 1, 9)), []);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      // TODO_SUPABASE: const { data: { user } } = await supabase.auth.getUser();
      // TODO_SUPABASE: await supabase.from("profiles").upsert({
      // TODO_SUPABASE:   id:                   user?.id,
      // TODO_SUPABASE:   display_name:         data.name,
      // TODO_SUPABASE:   subject:              data.subject,
      // TODO_SUPABASE:   goal:                 data.goal,
      // TODO_SUPABASE:   study_style:          data.studyStyle,
      // TODO_SUPABASE:   avatar_animal:        data.animal,
      // TODO_SUPABASE:   daily_goal_minutes:   data.dailyGoal,
      // TODO_SUPABASE:   onboarding_complete:  true,
      // TODO_SUPABASE: });
      localStorage.setItem("studenius_onboarding", JSON.stringify(data));
      navigate("/dashboard");
    } catch (err) {
      console.error("Onboarding save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [data, navigate]);

  const screens = [
    <S1  key={0} onNext={next} />,
    <S2  key={1} onNext={next} onSkip={skip} />,
    <S3  key={2} onNext={next} onSkip={skip} />,
    <S4  key={3} data={data} setData={setData} onNext={next} onBack={back} onSkip={skip} />,
    <S5  key={4} data={data} setData={setData} onNext={next} onBack={back} onSkip={skip} />,
    <S6  key={5} data={data} setData={setData} onNext={next} onBack={back} onSkip={skip} />,
    <S7  key={6} data={data} setData={setData} onNext={next} onBack={back} />,
    <S8  key={7} data={data} setData={setData} onNext={next} onBack={back} />,
    <S9  key={8} data={data} setData={setData} onNext={next} onBack={back} />,
    <S10 key={9} data={data} onFinish={handleFinish} saving={saving} />,
  ];

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        button:active { opacity: 0.85; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh" }} key={step}>
        {screens[step]}
      </div>
    </>
  );
}

ANIMALS.forEach(a => useGLTF.preload(a.src));
