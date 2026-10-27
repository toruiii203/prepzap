import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { LayoutGroup, motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motionTokens } from "@/lib/motionTokens";
import { WelcomeArtwork, GoogleMark } from "./WelcomeArtwork";
import { StudyObject } from "./StudyObject";
import { bigMovements, goalStories, customStory, reactionSequence, subjectNames, subjectStories, type StoryScene, type SubjectName } from "./storyPlan";
import type { MascotMovement } from "@/lib/mascotMovement";
import "./onboarding-base.css";
import "./onboarding-story.css";

export interface OnboardingPresentationProps {
  dark: boolean;
  still: boolean;
  onAuth: (title: string) => void;
  initialSubject?: string;
  resumeAtSave?: boolean;
  questionOverride?: { question: string; options: string[]; correctIndex: number; explanation: string } | null;
  onSubjectSelect?: (subject: string) => void;
  onStartQuestion?: () => void;
  onAnswer?: (index: number) => void;
  saveActions?: ReactNode;
  reviewMode?: boolean;
}
export function OnboardingStory({ dark, still, onAuth, initialSubject = "", resumeAtSave = false, questionOverride, onSubjectSelect, onStartQuestion, onAnswer, saveActions, reviewMode = true }: OnboardingPresentationProps) {
  const [scene, setScene] = useState<StoryScene>("welcome");
  const [history, setHistory] = useState<StoryScene[]>([]);
  const [name, setName] = useState(initialSubject);
  const [custom, setCustom] = useState("");
  const [picker, setPicker] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [visible, setVisible] = useState(() => !document.hidden);
  const [sequence, setSequence] = useState<MascotMovement[]>([]);
  const [phase, setPhase] = useState(0);
  const [stageReady, setStageReady] = useState(false);
  const [visit, setVisit] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const pickerOpener = useRef<HTMLElement | null>(null);
  const first = useRef(true);
  const previousBig = useRef<MascotMovement>();
  const visited = useRef(new Set<string>());
  const reduced = usePrefersReducedMotion() || still;
  const subject = subjectStories[name as SubjectName] || customStory;
  const questionPending = questionOverride === null;
  const question = questionOverride ? { question: questionOverride.question, options: questionOverride.options, correct: questionOverride.correctIndex, why: questionOverride.explanation } : subject;
  const outcome = answer === question.correct ? "correct" : "incorrect";
  const reaction = scene !== "welcome" && scene !== "subject" && scene !== "goal" && scene !== "question";
  const ready = reduced || !sequence.length || stageReady;
  const movement = ready ? sequence[phase] : undefined;
  const surface = scene === "response" ? subject.surface : scene === "save" ? "forest" : scene === "feedback" && outcome === "correct" ? "yellow" : "paper";
  useEffect(() => { if (resumeAtSave) { setHistory(["welcome"]); setScene("save"); } }, [resumeAtSave]);
  useEffect(() => { if (initialSubject) setName(initialSubject === "Computer Science" ? "Computing" : initialSubject); }, [initialSubject]);
  useEffect(() => { const update = () => setVisible(!document.hidden); document.addEventListener("visibilitychange", update); return () => document.removeEventListener("visibilitychange", update); }, []);
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus({ preventScroll: true }); }, [scene, visit]);
  function arrive(next: StoryScene, direction: "forward" | "back" = "forward", result: "correct" | "incorrect" | "skipped" = outcome) {
    if (direction === "forward") setHistory(previous => [...previous, scene]);
    const key = `${next}:${name}:${next === "feedback" ? result : ""}`;
    const planned = direction === "back" || visited.current.has(key) ? [] : reactionSequence(next, subject, result, previousBig.current);
    if (direction === "forward") visited.current.add(key);
    const big = planned.find(item => bigMovements.includes(item));
    if (big && direction === "forward") previousBig.current = big;
    setSequence(planned); setPhase(0); setStageReady(false); setVisit(previous => previous + 1); setScene(next);
  }
  function back() { const previous = history[history.length - 1]; if (previous) { setHistory(items => items.slice(0, -1)); arrive(previous, "back"); } }
  function selectSubject(value: string) { setName(value); onSubjectSelect?.(value); setAnswer(null); }
  function check() { if (answer === null || questionPending) return; onAnswer?.(answer); arrive("feedback", "forward", answer === question.correct ? "correct" : "incorrect"); }
  const fieldTransition = { duration: reduced ? 0 : motionTokens.subjectTravel, ease: motionTokens.ease };
  const action = (label: string, click: () => void, disabled = false) => <SpringButton soundEnabled={false} className="story-primary" onClick={click} disabled={disabled}>{label}<span aria-hidden="true">→</span></SpringButton>;
  const title = (text: string) => <h1 ref={heading} tabIndex={-1}>{text}</h1>;
  function stage() {
    const mood = scene === "feedback" && outcome === "incorrect" ? "encouraging" : phase >= sequence.length - 1 && scene !== "feedback" || outcome === "correct" && scene === "feedback" ? "happy" : "idle";
    return <div className="story-stage" data-scene-art={scene} data-ready={ready}>
      <span className="story-shape story-disc" aria-hidden="true"/><span className="story-shape story-arch" aria-hidden="true"/><span className="story-shape story-dots" aria-hidden="true"/>
      {(scene === "response" || scene === "save") && <motion.div className="story-subject-object" data-orbit-object layoutId={scene === "response" ? `chosen-${name}` : undefined} transition={fieldTransition}><StudyObject accent="var(--story-leaf)" kind={scene === "save" ? "cards" : subject.kind}/>{scene === "response" && name === "English" && <svg className="story-page" viewBox="0 0 160 140" aria-hidden="true"><path d="M79 38q34-18 59-5v79q-26-13-59 7Z" fill="#FFF" stroke="#000" strokeWidth="4"/></svg>}</motion.div>}
      <Mascot key={`${scene}-${visit}`} mood={movement || reduced ? mood : "idle"} movement={reduced ? undefined : movement} reactionKey={`${visit}-${phase}`} animate={!reduced && ready} pauseWhenHidden onMovementComplete={movement ? () => setPhase(previous => previous + 1) : undefined} size="hero"/>
      {scene === "feedback" && outcome === "correct" && !reduced && ready && sequence.length > 0 && phase >= sequence.length - 1 && <div className="story-confetti" aria-hidden="true">{Array.from({length:12},(_,index)=><i key={index} style={{"--particle-x":`${(index%6-2.5)*43}px`,"--particle-y":`${-30-(index%4)*32}px`,"--particle-r":`${index*37}deg`} as CSSProperties}/>)}</div>}
    </div>;
  }
  return <LayoutGroup id="onboarding-story"><section className="story-root" data-scene={scene} data-subject={name} data-surface={surface} data-hidden={!visible} data-outcome={scene === "feedback" ? outcome : undefined} data-signature={sequence.find(item => bigMovements.includes(item)) || "quiet"}>
    {reaction && <div key={`wash-${visit}`} className="story-wash" data-static={reduced || !sequence.length} aria-hidden="true" onAnimationEnd={() => setStageReady(true)}/>}
    <nav className="story-journey" aria-label="Back navigation">{scene !== "welcome" && <button className="story-back" aria-label="Go back" onClick={back}>←</button>}</nav>
    <main key={`${scene}-${visit}`} className={`story-scroll ${reaction ? "story-reaction" : "story-question"}`}>
      {scene === "welcome" && <><WelcomeArtwork still={reduced} visit={visit}/><div className="story-copy welcome-copy"><p className="welcome-brand">Studenius</p>{title("Big ideas start here.")}<p>A calmer way to learn, one good question at a time.</p></div></>}
      {scene === "subject" && <div className="story-content"><div className="story-companion" aria-hidden="true"><Mascot mood="idle" size="sm" animate={!reduced}/></div><div className="story-copy">{title("What are we learning today?")}<p>Pick one. You can change it anytime.</p></div><div className="story-subjects" aria-label="Choose a subject">{subjectNames.map(item=><SpringButton soundEnabled={false} key={item} className="story-subject-card" aria-pressed={name === item} onClick={()=>selectSubject(item)}><motion.div layoutId={name === item ? `chosen-${name}` : undefined} transition={fieldTransition}><StudyObject accent="var(--story-leaf)" kind={subjectStories[item].kind}/></motion.div><strong>{item}</strong><span className="story-check" aria-hidden="true">{name === item ? "✓" : "+"}</span></SpringButton>)}</div><button className="story-more" onClick={() => { pickerOpener.current = document.activeElement as HTMLElement; setCustom(subjectNames.includes(name as SubjectName) ? "" : name); setPicker(true); }}>More subjects or something else <span aria-hidden="true">+</span></button>{name && !subjectNames.includes(name as SubjectName) && <p className="story-custom-label">Selected: {name}</p>}</div>}
      {scene === "response" && <>{stage()}<div className="story-copy">{title(subject.headline)}<p>{subject.support}</p></div></>}
      {scene === "goal" && <div className="story-content"><div className="story-companion" aria-hidden="true"><Mascot mood="idle" size="sm" animate={!reduced}/></div><div className="story-copy">{title("What's today's goal?")}</div><div className="story-goals">{goalStories.map((item,index)=><SpringButton key={item.label} soundEnabled={false} className="story-answer" aria-pressed={goal === index} onClick={()=>setGoal(index)}><StudyObject accent="var(--story-leaf)" kind={item.kind}/><strong>{item.label}</strong><span className="story-goal-check" aria-hidden="true">{goal === index ? "✓" : "+"}</span></SpringButton>)}</div></div>}
      {scene === "goal-response" && <>{stage()}<div className="story-copy">{title(goalStories[goal ?? 2].headline)}{goalStories[goal ?? 2].support && <p>{goalStories[goal ?? 2].support}</p>}</div></>}
      {scene === "question" && <div className="story-content"><div className="story-companion" aria-hidden="true"><Mascot mood="idle" size="sm" animate={!reduced}/></div><div className="story-copy">{title(questionPending ? "Getting your question ready…" : question.question)}</div><div className="story-answers">{!questionPending && question.options.map((option,index)=><SpringButton soundEnabled={false} key={option} className="story-answer" aria-pressed={answer === index} onClick={()=>setAnswer(index)}><span aria-hidden="true">{String.fromCharCode(65+index)}</span><strong>{option}</strong></SpringButton>)}</div></div>}
      {scene === "feedback" && <>{stage()}<div className="story-copy" role="status" aria-live="polite">{title(outcome === "correct" ? "You got it." : "Good try. Here's the trick.")}{<div className="story-why"><strong>{outcome === "correct" ? "Here's why" : `The answer is ${question.options[question.correct]}`}</strong><p>{question.why}</p></div>}</div></>}
      {scene === "save" && <><div className="story-copy">{title("Keep what you just did.")}<p>Save your progress and pick up where you left off.</p></div>{stage()}</>}
      {scene === "arrival" && <>{stage()}<div className="story-copy">{title("You're in. Here's your next step.")}</div></>}
    </main>
    <footer className="story-actions">
      {scene === "welcome" && <><SpringButton soundEnabled={false} className="story-google" onClick={()=>onAuth("Continue with Google")}><GoogleMark/>Continue with Google</SpringButton>{action("Get started",()=>arrive("subject"))}<button className="story-text" onClick={()=>onAuth("Log in")}>Already have an account? Log in</button>{reviewMode && <p className="story-review-note">Design preview · sign-in opens a review dialog.</p>}</>}

      {scene === "subject" && action("Let's go",()=>arrive("response"),!name.trim())}
      {scene === "response" && action("Continue",()=>arrive("goal"))}
      {scene === "goal" && action("Continue",()=>arrive("goal-response"),goal === null)}
      {scene === "goal-response" && action("Try a question",()=>{setAnswer(null);onStartQuestion?.();arrive("question");})}
      {scene === "question" && action("Check answer",()=>check(),answer === null || questionPending)}
      {scene === "feedback" && action("Keep going",()=>arrive("save"))}
      {scene === "save" && (saveActions || <>{action("Continue with Google",()=>onAuth("Continue with Google"))}<SpringButton soundEnabled={false} className="story-secondary" onClick={()=>onAuth("Continue with email")}>Continue with email</SpringButton><button className="story-text" onClick={()=>arrive("arrival")}>Continue preview</button><p className="story-review-note">Review layout only. Existing sign-in and consent connect here.</p></>)}
      {scene === "arrival" && <><a className="story-primary" href="https://studenius.com/dashboard">Open my study space <span aria-hidden="true">→</span></a><p className="story-review-note">Review handoff to the existing dashboard. No account or reward was created.</p></>}
    </footer>
    <Dialog.Root open={picker} onOpenChange={setPicker}><Dialog.Portal><Dialog.Overlay className="studio-modal-overlay"/><Dialog.Content className="studio-modal onboarding-dialog story-picker" data-theme={dark ? "dark" : "light"} onCloseAutoFocus={event=>{event.preventDefault();pickerOpener.current?.focus();}}><button className="close-modal" aria-label="Close subjects" onClick={()=>setPicker(false)}>×</button><Dialog.Title>Make it your subject.</Dialog.Title><Dialog.Description>Choose another subject or write your own.</Dialog.Description><div className="story-extra-subjects">{["Physics","Chemistry","Economics","General Studies"].map(value=><button key={value} onClick={()=>setCustom(value)} aria-pressed={custom===value}>{value}</button>)}</div><label>Your subject<input autoComplete="off" maxLength={70} placeholder="e.g. Architecture" value={custom} onChange={event=>setCustom(event.target.value)}/></label>{action("Use this subject",()=>{selectSubject(custom.trim());setPicker(false);},!custom.trim())}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </section></LayoutGroup>;
}
