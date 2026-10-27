import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Dialog from "@radix-ui/react-dialog";
import { Mascot } from "@/components/Mascot";
import { PageTransition } from "@/components/PageTransition";
import { SpringButton } from "@/components/ui/SpringButton";
import { motionVariables } from "@/lib/motionTokens";
import { StudyObject, type StudyObjectKind } from "./StudyObject";
import "./studio.css";
import { OnboardingStory } from "./OnboardingStory";

type Scene = "subject" | "response" | "question" | "feedback" | "save" | "home";
const subjects: { name: string; kind: StudyObjectKind }[] = [
  { name: "Math", kind: "blocks" }, { name: "Science", kind: "science" },
  { name: "English", kind: "book" }, { name: "Biology", kind: "cell" },
  { name: "History", kind: "globe" }, { name: "Computing", kind: "code" },
];
const samples: Record<string, { question: string; options: string[]; correct: number; explanation: string }> = {
  Math: { question: "What is 6 × 7?", options: ["36", "42", "48"], correct: 1, explanation: "Six groups of seven make 42." },
  Science: { question: "Which planet is closest to the Sun?", options: ["Earth", "Venus", "Mercury"], correct: 2, explanation: "Mercury is the closest planet to the Sun." },
  English: { question: "Which word is a verb?", options: ["Run", "Blue", "Window"], correct: 0, explanation: "Run describes an action, so it is a verb." },
  Biology: { question: "Which part of a plant absorbs water from soil?", options: ["Flower", "Roots", "Leaves"], correct: 1, explanation: "Roots absorb water and minerals from the soil." },
  History: { question: "Which is a primary source?", options: ["A modern textbook", "A review article", "A diary from the time"], correct: 2, explanation: "A diary written at the time gives a firsthand account." },
  Computing: { question: "What does a loop do in a program?", options: ["Repeats instructions", "Deletes every file", "Turns off the screen"], correct: 0, explanation: "A loop repeats instructions while its condition applies." },
};
const tools: { title: string; kind: StudyObjectKind; note: string }[] = [
  { title: "Practice", kind: "blocks", note: "One question at a time." },
  { title: "Flashcards", kind: "cards", note: "Remember a little more." },
  { title: "Notes", kind: "book", note: "Make room for your ideas." },
  { title: "Tutor", kind: "chat", note: "Work through a tricky bit." },
];
const Arrow = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;

export function StudioPrototype() {
  const [storyVersion, setStoryVersion] = useState(0);
  const [view, setView] = useState<"prototype" | "board">(() => new URLSearchParams(location.search).get("view") === "board" ? "board" : "prototype");
  const [scene, setScene] = useState<Scene>("subject");
  const [history, setHistory] = useState<Scene[]>([]);
  const [subject, setSubject] = useState("");
  const [custom, setCustom] = useState("");
  const [more, setMore] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [dark, setDark] = useState(() => new URLSearchParams(location.search).get("theme") === "dark");
  const [still, setStill] = useState(() => new URLSearchParams(location.search).get("motion") === "static");
  const [modal, setModal] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const modalOpener = useRef<HTMLElement | null>(null);
  const first = useRef(true);
  const name = subject === "Custom" ? custom.trim() : subject;
  const object = subjects.find(item => item.name === subject)?.kind || "book";
  const question = samples[name] || samples.Math;
  const correct = answer === question.correct;
  const reset = () => { setStoryVersion(value => value + 1); setScene("subject"); setHistory([]); setAnswer(null); setSkipped(false); setSubject(""); setCustom(""); };
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [scene, view]);
  function openModal(title: string) { modalOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setModal(title); }
  function go(next: Scene) { setHistory(previous => [...previous, scene]); setScene(next); }
  function back() { const previous = history[history.length - 1]; if (previous) { setHistory(items => items.slice(0, -1)); setScene(previous); } }
  function continueToQuestion() { setAnswer(null); setSkipped(false); go("question"); }
  function home() { go("home"); setModal(null); }

  return <div className="studio" data-onboarding={view === "prototype" && scene !== "home"} data-theme={dark ? "dark" : "light"} style={motionVariables}>
    {(view === "board" || scene === "home") && <><div className="review-bar"><span>DESIGN REVIEW <span className="review-dot"/> Sample content · no account changes</span><nav aria-label="Review views"><button aria-pressed={view === "prototype"} onClick={() => setView("prototype")}>Prototype</button><button aria-pressed={view === "board"} onClick={() => setView("board")}>Art board</button></nav><div className="review-options"><label><input type="checkbox" checked={dark} onChange={event => setDark(event.target.checked)}/>Dark</label><label><input type="checkbox" checked={still} onChange={event => setStill(event.target.checked)}/>Static mascot</label></div></div>
    <header className="studio-header"><button className="wordmark" onClick={() => { reset(); setView("prototype"); }}>Studenius<span className="brand-dot"/></button><button className="quiet-button" onClick={() => openModal("Log in")}>Log in <Arrow/></button></header></>}
    {view === "board" ? <main className="art-board">
      <p className="eyebrow">01 / Graphic study studio</p><h1 ref={heading} tabIndex={-1}>A little space.<br/>A lot of possibility.</h1><p className="intro">Warm paper. Bold shapes. A companion who meets you where you are.</p>
      <div className="board-triptych"><article><span className="eyebrow">Choose</span><h2>What are we<br/>learning today?</h2><div className="board-objects"><StudyObject kind="blocks"/><StudyObject kind="science"/><StudyObject kind="book"/></div><p>One friendly decision.</p></article><article className="board-mascot"><span className="eyebrow">Connect</span><Mascot mood="idle" movement="wave" animate={!still} size="lg"/><h2>One step at a time.</h2><p>A moment of encouragement.</p></article><article><span className="eyebrow">Begin</span><h2>Your next<br/>little win.</h2><StudyObject kind="cards"/><span className="board-cta">Start practicing <Arrow/></span><p>A clear next action.</p></article></div>
      <section className="art-hero"><div><p className="eyebrow">Original illustration study</p><h2>Objects with personality.<br/>Room for your own story.</h2><p>Layered flat art in the current palette. Labels and controls stay as real text.</p></div><img src="./study-composition.webp" width="600" height="400" alt="Original illustrated notebook and recall-card composition"/></section>
      <section className="asset-kit"><p className="eyebrow">A shared visual vocabulary</p><h2>Small pieces. One world.</h2><div>{(["blocks", "science", "book", "cell", "globe", "code", "cards", "timer", "chat"] as StudyObjectKind[]).map(kind => <figure key={kind}><StudyObject kind={kind}/><figcaption>{kind}</figcaption></figure>)}</div></section>
      <section className="palette" aria-label="Approved palette">{[["Paper", "#FAF7F2"], ["Ink", "#000000"], ["Yellow", "#FFD13B"], ["Coral", "#FF4D2E"], ["Crimson", "#ae2925"]].map(([label, color]) => <div key={label}><span style={{ background: color }}/><strong>{label}</strong><code>{color}</code></div>)}</section>
      <SpringButton soundEnabled={false} className="primary" onClick={() => { reset(); setView("prototype"); }}>Try the onboarding <Arrow/></SpringButton>
    </main> : scene === "home" ? <PageTransition key={scene}>
        {scene === "home" && <main className="dashboard-concept" data-scene="home"><div className="home-heading"><div><p className="eyebrow">Your study space</p><h1 ref={heading} tabIndex={-1}>Your next little win.</h1><p>You don’t have to do everything today.</p></div><button className="quiet-button" onClick={() => openModal("Celebration preview")}>Preview a celebration</button></div><section className="home-hero"><div><span className="subject-tag">{name || "A fresh start"}</span><h2>One question.<br/>A little momentum.</h2><p>Make a little room for what you’re learning.</p><SpringButton soundEnabled={false} className="primary" onClick={continueToQuestion}>Start practicing <Arrow/></SpringButton></div><div className="home-hero-art"><img src="./study-composition.webp" width="600" height="400" alt=""/><Mascot mood="idle" movement="wave" size="lg" animate={!still}/></div></section><section className="home-tools"><div className="section-heading"><h2>Find your way in</h2><span>Tools for different kinds of days</span></div><div>{tools.map(tool => <SpringButton soundEnabled={false} className="tool-card" key={tool.title} onClick={() => tool.title === "Practice" ? continueToQuestion() : openModal(tool.title)}><StudyObject kind={tool.kind}/><h3>{tool.title}</h3><p>{tool.note}</p><Arrow/></SpringButton>)}</div></section><section className="source-nudge"><StudyObject kind="book"/><div><h2>Bring your own notes.</h2><p>A familiar starting point for your next session.</p></div><button className="quiet-button" onClick={() => openModal("Source Library")}>Explore <Arrow/></button></section><p className="small-note">Dashboard concept · sample content · no streak, XP or mastery awarded.</p></main>}
      </PageTransition> : <OnboardingStory key={storyVersion} dark={dark} still={still} onAuth={openModal}/>}
    <Dialog.Root open={modal !== null} onOpenChange={open => { if (!open) setModal(null); }}><Dialog.Portal><Dialog.Overlay className="studio-modal-overlay"/><Dialog.Content onCloseAutoFocus={event => { event.preventDefault(); modalOpener.current?.focus(); }} className="studio-modal onboarding-dialog" data-theme={dark ? "dark" : "light"} style={motionVariables}><button className="close-modal" aria-label="Close preview" onClick={() => setModal(null)}>×</button>{modal === "Celebration preview" ? <><Mascot mood="happy" movement="dance" size="xl" animate={!still}/><p className="eyebrow">Sample celebration</p><Dialog.Title>Look at you grow.</Dialog.Title><Dialog.Description>A cheerful moment for completed work. This preview awards no progress or rewards.</Dialog.Description><SpringButton soundEnabled={false} className="primary" onClick={() => setModal(null)}>Keep going <Arrow/></SpringButton></> : <><StudyObject kind={tools.find(tool => tool.title === modal)?.kind || "book"}/><Dialog.Title>{modal}</Dialog.Title><Dialog.Description>{modal === "Log in" || modal?.startsWith("Continue") ? "Account actions connect to the existing sign-in flow during implementation. This review does not sign you in or create an account." : "A preview of the tool’s visual identity. Your real notes, sources and study data stay in the existing app."}</Dialog.Description><SpringButton soundEnabled={false} className="primary" onClick={() => setModal(null)}>Back to the concept <Arrow/></SpringButton></>}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <footer className="review-footer">Studenius graphic study studio · original objects + approved Seedling · interactive design proposal</footer>
  </div>;
}
createRoot(document.getElementById("root")!).render(<StudioPrototype/>);
