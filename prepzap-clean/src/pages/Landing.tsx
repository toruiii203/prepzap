/**
 * STUDENIUS — Landing Page
 * All parallax effects are pure CSS + React hooks (no GSAP dependency).
 *
 * NEW in this version:
 *  H · Scroll progress line    — 1px teal bar at very top of viewport
 *  A · Infinite marquee        — kinetic tool-name ticker between sections
 *  D · Mouse parallax hero     — cursor-driven depth layers in hero
 *  E · Animated counters       — numbers count up from 0 on viewport enter
 *  C · Word-by-word reveal     — manifesto lights up word by word on scroll
 *  B · Sticky feature showcase — pinned left panel, scrolling right features
 *  F · Horizontal scroll       — vertical scroll drives horizontal card strip
 *  G · Clip-path transitions   — wipe reveals between content sections
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// ─── Brand ────────────────────────────────────────────────────────────────────
const TEAL   = "#00C4B4";
const GOLD   = "#E8B923";
const PURPLE = "#7B5EA7";
const VOID   = "#03050F";
const mono: React.CSSProperties = { fontFamily:"'Geist Mono','Courier New',monospace" };

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:auto;}
  ::selection{background:rgba(0,196,180,0.25);}

  @keyframes float-slow{
    0%,100%{transform:translateY(0px) rotate(-4deg);}
    50%{transform:translateY(-26px) rotate(5deg);}
  }
  @keyframes pulse-glow{0%,100%{opacity:.55;}50%{opacity:1;}}
  @keyframes orbit1{to{transform:rotateX(75deg) rotateZ(360deg);}}
  @keyframes orbit2{to{transform:rotateX(65deg) rotateZ(480deg);}}
  @keyframes orbit3{to{transform:rotateX(80deg) rotateZ(600deg);}}
  @keyframes star-twinkle{0%,100%{opacity:.3;transform:scale(1);}50%{opacity:1;transform:scale(1.5);}}
  @keyframes drift-eq{
    0%{transform:translateY(0) translateX(0) rotate(0deg);}
    33%{transform:translateY(-10px) translateX(6px) rotate(2deg);}
    66%{transform:translateY(5px) translateX(-4px) rotate(-1.5deg);}
    100%{transform:translateY(0) translateX(0) rotate(0deg);}
  }
  @keyframes binary-fall{
    from{transform:translateY(-40px);opacity:0;}
    10%{opacity:1;}90%{opacity:1;}
    to{transform:translateY(130vh);opacity:0;}
  }
  @keyframes rim-pulse{
    0%,100%{box-shadow:0 0 60px rgba(0,196,180,.12);}
    50%{box-shadow:0 0 120px rgba(0,196,180,.28);}
  }
  @keyframes god-ray{0%,100%{opacity:.03;}50%{opacity:.08;}}
  @keyframes glitch1{
    0%,100%{clip-path:inset(20% 0 55% 0);transform:translate(-2px,0);}
    50%{clip-path:inset(35% 0 15% 0);transform:translate(3px,0);}
  }
  @keyframes glitch2{
    0%,100%{clip-path:inset(65% 0 8% 0);transform:translate(2px,0);}
    50%{clip-path:inset(5% 0 70% 0);transform:translate(-1px,0);}
  }
  @keyframes hero-enter{
    from{opacity:0;transform:translateY(54px);filter:blur(8px);}
    to{opacity:1;transform:translateY(0);filter:blur(0px);}
  }
  @keyframes mote-drift{
    0%{transform:translate(0,0);}
    25%{transform:translate(8px,-12px);}
    50%{transform:translate(-5px,-20px);}
    75%{transform:translate(-12px,-8px);}
    100%{transform:translate(0,0);}
  }
  @keyframes astro-float{
    0%,100%{transform:translateY(0px) rotate(0deg);}
    50%{transform:translateY(-28px) rotate(5deg);}
  }

  /* H: Scroll progress line */
  #scroll-progress-line{
    position:fixed;top:0;left:0;width:100%;height:1.5px;z-index:9999;
    background:linear-gradient(90deg,#00C4B4,#7B5EA7,#E8B923);
    transform-origin:left center;
    pointer-events:none;
  }

  /* A: Marquee */
  @keyframes marquee-left{from{transform:translateX(0);}to{transform:translateX(-50%);}}
  @keyframes marquee-right{from{transform:translateX(-50%);}to{transform:translateX(0);}}
  .mq-track-left{display:flex;width:max-content;white-space:nowrap;animation:marquee-left 30s linear infinite;}
  .mq-track-right{display:flex;width:max-content;white-space:nowrap;animation:marquee-right 42s linear infinite;}
  .mq-wrap{overflow:hidden;position:relative;}
  .mq-wrap::before,.mq-wrap::after{
    content:'';position:absolute;top:0;bottom:0;width:100px;z-index:2;pointer-events:none;
  }
  .mq-wrap::before{left:0;background:linear-gradient(90deg,#03050f,transparent);}
  .mq-wrap::after{right:0;background:linear-gradient(-90deg,#03050f,transparent);}

  /* G: Clip-path reveal */
  .clip-reveal{clip-path:inset(0 100% 0 0);transition:clip-path 1.1s cubic-bezier(0.16,1,0.3,1);}
  .clip-reveal.in{clip-path:inset(0 0% 0 0);}

  /* C: Word reveal */
  .wd{color:rgba(255,255,255,0.1);transition:color 0.5s ease,text-shadow 0.5s ease;display:inline-block;margin-right:0.28em;}
  .wd-lit{color:#F2F5F8 !important;text-shadow:0 0 40px rgba(0,196,180,0.4);}
  .wd-past{color:rgba(255,255,255,0.25) !important;}

  /* B: Sticky panel */
  .sticky-left{position:sticky;top:88px;align-self:flex-start;}

  /* Extra parallax animations */
  @keyframes float-a{0%,100%{transform:translateY(0px);}50%{transform:translateY(-22px);}}
  @keyframes float-b{0%,100%{transform:translateY(0px);}50%{transform:translateY(-18px);}}
  @keyframes float-c{0%,100%{transform:translateY(0px);}50%{transform:translateY(-14px);}}
  @keyframes spin-slow{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes spin-rev{from{transform:rotate(360deg);}to{transform:rotate(0deg);}}
  @keyframes particle-up{0%{transform:translateY(0);opacity:0;}10%{opacity:0.5;}90%{opacity:0.2;}100%{transform:translateY(-90px);opacity:0;}}
  @keyframes beam-sweep{0%,100%{opacity:0;transform:translateX(-10%);}50%{opacity:1;transform:translateX(110vw);}}
`;

// ─── Data ─────────────────────────────────────────────────────────────────────
const mockQuestion = {
  text:"Which of the following best describes the process of osmosis?",
  choices:[
    {id:"a",text:"Movement of solute from high to low concentration"},
    {id:"b",text:"Movement of water across a semipermeable membrane"},
    {id:"c",text:"Active transport requiring ATP energy"},
    {id:"d",text:"Diffusion of large molecules through cell walls"},
  ],
  correct:"b",
  explanation:"Osmosis is the passive movement of water molecules across a selectively permeable membrane from an area of lower solute concentration to higher.",
};

const features = [
  {n:"01",title:"AI Tutor (BrainBot)",    desc:"Ask anything — Explain, ELI5, Analogy, Quiz, Debate, Summary",      icon:"🧠"},
  {n:"02",title:"Practice & Flashcards",  desc:"AI-generated questions and spaced-repetition from your materials",   icon:"🃏"},
  {n:"03",title:"Cram Mode",              desc:"Emergency timed session — AI breaks subjects into prioritised topics",icon:"⚡"},
  {n:"04",title:"High Yield Detector",    desc:"Identifies the most testable concepts and drills you instantly",      icon:"🎯"},
  {n:"05",title:"Recall Mode",            desc:"Type from memory and get scored — the hardest way to study",          icon:"🔁"},
  {n:"06",title:"Confidence Calibration", desc:"Sort every concept into Know / Shaky / No idea",                     icon:"📊"},
  {n:"07",title:"Mistake Journal",        desc:"Log errors with spaced-repetition — overdue items resurface",        icon:"📓"},
  {n:"08",title:"Roadmap Generator",      desc:"Zero-to-mastery plan for any subject, broken into phases",           icon:"🗺️"},
  {n:"09",title:"Feynman Mode",           desc:"Teach the AI — it pokes holes until you truly understand",           icon:"💡"},
  {n:"10",title:"Source Library",         desc:"Upload PDFs, images, or notes — every tool reads them",              icon:"📚"},
  {n:"11",title:"Study DNA",              desc:"Your living learner profile — adapts and reveals your patterns",     icon:"🧬"},
  {n:"12",title:"Focus Timer + Progress", desc:"Built-in Pomodoro with activity tracking and session analytics",     icon:"⏱️"},
];

const testimonials = [
  {name:"Maria S.", role:"Nursing Student",     text:"Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try."},
  {name:"James W.", role:"Medical Student",      text:"Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly."},
  {name:"Sarah C.", role:"Teacher",             text:"Feynman Mode exposed every gap in my knowledge. Not just for exams — for any subject."},
  {name:"Ahmed R.", role:"Engineering Student", text:"High Yield Detector told me exactly what to study before finals. Went from C to A."},
];

const useCaseCards = [
  {label:"Medicine",    tool:"Cram Mode",           stat:"Night before boards",   color:TEAL},
  {label:"Engineering", tool:"Recall Mode",          stat:"Equation mastery",      color:PURPLE},
  {label:"Law",         tool:"Feynman Mode",         stat:"Case law deep-dives",   color:GOLD},
  {label:"Languages",   tool:"Flashcards",           stat:"Vocab spaced reps",     color:"#4A9EFF"},
  {label:"Finance",     tool:"High Yield Detector",  stat:"CFA exam prep",         color:"#FF6B6B"},
  {label:"Programming", tool:"BrainBot",             stat:"Debug + explain code",  color:"#A78BFA"},
];

const MANIFESTO = "Stop highlighting. Stop re-reading. Start recalling. Build understanding that lasts past the exam and stays with you forever.";
const MARQUEE_ITEMS = ["BrainBot","Cram Mode","Flashcards","Recall Mode","Feynman Mode","High Yield","Roadmap","Study DNA","Mistake Journal","Focus Timer","Source Library","Confidence","Practice","Spaced Rep","Pomodoro"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hairline: React.CSSProperties = {height:"0.5px",background:"#0d1220",margin:0};
const sectionLabel: React.CSSProperties = {
  ...mono,fontSize:"10px",color:"#444",letterSpacing:"0.14em",
  textTransform:"uppercase",marginBottom:"40px",
  display:"flex",alignItems:"center",gap:"12px",
};

// lerp(a,b,t): moves 'a' toward 'b' by factor 't' each frame.
// Creates exponential decay — fast approach, asymptotic settle = "momentum" feel.
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

function useScrollY(){
  const rawRef=useRef(0);
  const smoothRef=useRef(0);
  const [sy,setSy]=useState(0);
  const rafRef=useRef<number>(0);
  const runningRef=useRef(false);
  useEffect(()=>{
    const startRAF=()=>{
      if(runningRef.current)return;
      runningRef.current=true;
      const tick=()=>{
        const next=lerp(smoothRef.current,rawRef.current,0.085);
        const delta=Math.abs(next-smoothRef.current);
        smoothRef.current=next;
        setSy(next);
        if(delta>0.1){
          rafRef.current=requestAnimationFrame(tick);
        } else {
          runningRef.current=false; // settle — stop burning CPU
        }
      };
      rafRef.current=requestAnimationFrame(tick);
    };
    const onScroll=()=>{rawRef.current=window.scrollY;startRAF();};
    window.addEventListener("scroll",onScroll,{passive:true});
    return ()=>{window.removeEventListener("scroll",onScroll);cancelAnimationFrame(rafRef.current);};
  },[]);
  return sy;
}

function useScrollProgress(){
  const [pct,setPct]=useState(0);
  useEffect(()=>{
    const h=()=>{
      const max=document.documentElement.scrollHeight-window.innerHeight;
      setPct(max>0?window.scrollY/max:0);
    };
    window.addEventListener("scroll",h,{passive:true});
    return ()=>window.removeEventListener("scroll",h);
  },[]);
  return pct;
}

function useInView(threshold=0.1){
  const ref=useRef<HTMLDivElement>(null);
  const [inView,setInView]=useState(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting)setInView(true);},{threshold});
    if(ref.current)obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[threshold]);
  return {ref,inView};
}

function useMouseParallax(){
  const rawRef=useRef({x:0,y:0});    // instant cursor position
  const smoothRef=useRef({x:0,y:0}); // trailing lerped position
  const [pos,setPos]=useState({x:0,y:0});
  const rafRef=useRef<number>(0);
  useEffect(()=>{
    const onMove=(e:MouseEvent)=>{
      rawRef.current={x:(e.clientX/window.innerWidth-0.5)*2,y:(e.clientY/window.innerHeight-0.5)*2};
    };
    window.addEventListener("mousemove",onMove,{passive:true});
    // t=0.06 → ~100ms+ trailing lag — the "gliding to a halt" cinematic feel
    const tick=()=>{
      smoothRef.current={
        x:lerp(smoothRef.current.x,rawRef.current.x,0.06),
        y:lerp(smoothRef.current.y,rawRef.current.y,0.06),
      };
      setPos({...smoothRef.current});
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return ()=>{window.removeEventListener("mousemove",onMove);cancelAnimationFrame(rafRef.current);};
  },[]);
  return pos;
}

// ─── CINEMATIC VIDEO SECTION ─────────────────────────────────────────────────
// Approach: 500vh outer div, sticky 100vh panel.
// scrollProgress (0→1) drives BOTH card size AND video.currentTime.
// No body lock. No wheel hijack. No velocity bucket.
// Video readiness: we mark ready on ANY of loadeddata/canplay/canplaythrough
// so cached videos (which skip canplaythrough) still work.
function CinematicVideoSection(){
  const outerRef    = useRef<HTMLDivElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const hintRef     = useRef<HTMLDivElement>(null);
  const textRef     = useRef<HTMLDivElement>(null);
  const barRef      = useRef<HTMLDivElement>(null);
  const dotsRef     = useRef<(HTMLDivElement|null)[]>([]);
  const nudgeRef    = useRef<HTMLDivElement>(null);
  const label0Ref   = useRef<HTMLDivElement>(null);
  const label1Ref   = useRef<HTMLDivElement>(null);
  const label2Ref   = useRef<HTMLDivElement>(null);
  const rafRef      = useRef<number>(0);
  const pRef        = useRef(0);
  const readyRef    = useRef(false);

  const videoSrc = "https://pub-d4e39d5727524f80936033c452d28c71.r2.dev/202605031431%20(1)%20(2).mp4";

  // Unlock seeking: browsers won't allow currentTime scrubbing until the video
  // has been "played" at least once. We play then immediately pause to unlock it.
  const markReady = ()=>{
    if(readyRef.current) return;
    readyRef.current = true;
    const v = videoRef.current;
    if(!v) return;
    v.currentTime = 0;
    const unlock = v.play();
    if(unlock !== undefined){
      unlock.then(()=>{ v.pause(); v.currentTime = 0; }).catch(()=>{});
    }
  };

  const phases = [
    {label:"— The Journey Begins",    title:"Enter a universe\nbuilt for learning",  sub:"12 AI tools. One mission. Your academic breakthrough."},
    {label:"— Your AI Study Partner", title:"Intelligence that\nadapts to you",      sub:"BrainBot learns your gaps and drills your weak spots."},
    {label:"— Master It Faster",      title:"Study smarter.\nNot longer.",           sub:"Cram Mode, Recall, Feynman, High Yield — all in one."},
  ];

  // ── Scroll → pRef only (no setState, no re-render) ───────────────────────
  useEffect(()=>{
    const onScroll = ()=>{
      const el = outerRef.current;
      if(!el) return;
      const rect      = el.getBoundingClientRect();
      const scrollable= el.offsetHeight - window.innerHeight;
      const scrolled  = Math.max(0, -rect.top);
      const progress  = scrollable > 0 ? Math.min(1, scrolled / scrollable) : 0;
      pRef.current    = progress;
    };
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();
    return ()=> window.removeEventListener("scroll", onScroll);
  },[]);

  // ── RAF: seek video + mutate DOM styles directly — ZERO setState ──────────
  useEffect(()=>{
    const easeOut = (t:number)=> 1 - Math.pow(1-t, 3);
    let lastPhase = -1;

    const tick = ()=>{
      const v = videoRef.current;
      const p = pRef.current;
      const ep = easeOut(p);

      // 1. Seek video — snap if gap is big, lerp if small
      if(v && readyRef.current && v.duration > 0){
        if(!v.paused) v.pause();
        const target = p * v.duration;
        const diff   = target - v.currentTime;
        const absDiff = Math.abs(diff);
        if(absDiff > 2){
          // Gap too large — snap directly to avoid crawling
          v.currentTime = target;
        } else if(absDiff > 1/60){
          // Small gap — smooth lerp
          v.currentTime = v.currentTime + diff * 0.35;
        }
      }

      // 2. Card size + visibility — hidden until user starts scrolling
      const card = cardRef.current;
      if(card){
        const reveal = Math.min(1, p * 20); // fully visible after 5% scroll
        card.style.opacity = String(reveal);
        card.style.width  = `${56 + ep * 44}%`;
        card.style.height = `${62 + ep * 38}%`;
        card.style.borderRadius = `${Math.round(14 * (1 - ep))}px`;
        card.style.boxShadow = ep < 0.98
          ? `0 24px 100px rgba(0,0,0,0.9), 0 0 0 0.5px rgba(255,255,255,0.06)`
          : "none";
      }

      // 3. Hint opacity
      if(hintRef.current)
        hintRef.current.style.opacity = String(Math.max(0, 1 - p * 6));

      // 4. Overlay text opacity — NO re-render, just style write
      const textOpacity = Math.max(0, (p - 0.75) / 0.25);
      if(textRef.current)
        textRef.current.style.opacity = String(textOpacity);

      // 5. Phase switch — only update DOM when phase changes
      const phase = p < 0.4 ? 0 : p < 0.75 ? 1 : 2;
      if(phase !== lastPhase){
        lastPhase = phase;
        const ph = phases[phase];
        if(label0Ref.current) label0Ref.current.textContent = ph.label;
        if(label1Ref.current) label1Ref.current.textContent = ph.title;
        if(label2Ref.current) label2Ref.current.textContent = ph.sub;
        dotsRef.current.forEach((dot,i)=>{
          if(!dot) return;
          dot.style.width      = i===phase ? "18px" : "5px";
          dot.style.background = i===phase ? TEAL   : "rgba(255,255,255,0.12)";
        });
      }

      // 6. Progress bar
      if(barRef.current)
        barRef.current.style.width = `${p*100}%`;

      // 7. Nudge
      if(nudgeRef.current)
        nudgeRef.current.style.opacity = p > 0.9 ? "1" : "0";

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(rafRef.current);
  },[]);

  return(
    <div ref={outerRef} style={{height:"1200vh", position:"relative", background:"#03050f"}}>
      <div style={{
        position:"sticky", top:0, height:"100vh",
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"#03050f", overflow:"hidden",
      }}>
        {/* Card — size controlled by RAF via cardRef */}
        <div ref={cardRef} style={{
          width:"56%", height:"62%",
          borderRadius:"14px", overflow:"hidden", position:"relative",
          opacity:0,
          boxShadow:`0 24px 100px rgba(0,0,0,0.9), 0 0 0 0.5px rgba(255,255,255,0.06)`,
        }}>
          <video
            ref={videoRef}
            muted playsInline preload="auto"
            crossOrigin="anonymous"
            onLoadedData={markReady} onCanPlay={markReady} onCanPlayThrough={markReady}
            style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",display:"block"}}
          >
            <source src={videoSrc} type="video/mp4"/>
          </video>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:2,
            background:"linear-gradient(180deg,rgba(3,5,15,0.4) 0%,transparent 20%,transparent 65%,rgba(3,5,15,0.8) 100%)"}}/>

          {/* Scroll hint */}
          <div ref={hintRef} style={{
            position:"absolute",bottom:"28px",left:"50%",transform:"translateX(-50%)",
            zIndex:3,textAlign:"center",opacity:1,pointerEvents:"none",
          }}>
            <div style={{...mono,fontSize:"9px",color:"rgba(255,255,255,0.4)",
              letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:"8px"}}>scroll to play</div>
            <div style={{width:"1px",height:"28px",background:`linear-gradient(${TEAL},transparent)`,
              margin:"0 auto",animation:"binary-fall 1.8s ease-in-out infinite"}}/>
          </div>

          {/* Overlay text — opacity driven by RAF, NOT by React state */}
          <div ref={textRef} style={{
            position:"absolute",inset:0,zIndex:4,
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            textAlign:"center",padding:"0 32px",opacity:0,pointerEvents:"none",
          }}>
            <div style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.22em",
              textTransform:"uppercase",marginBottom:"16px",opacity:0.85}}
              ref={label0Ref}>{phases[0].label}</div>
            <h2 ref={label1Ref} style={{fontSize:"clamp(26px,4vw,50px)",fontWeight:300,
              letterSpacing:"-0.03em",lineHeight:1.15,color:"#F2F5F8",marginBottom:"20px",
              maxWidth:"640px",whiteSpace:"pre-line",textShadow:"0 2px 40px rgba(0,0,0,0.95)"}}>
              {phases[0].title}
            </h2>
            <p ref={label2Ref} style={{fontSize:"14px",color:"rgba(255,255,255,0.45)",
              maxWidth:"380px",lineHeight:1.7,fontWeight:300,
              textShadow:"0 1px 20px rgba(0,0,0,0.9)"}}>
              {phases[0].sub}
            </p>
          </div>

          {/* Progress bar */}
          <div ref={barRef} style={{position:"absolute",bottom:0,left:0,zIndex:5,
            height:"1.5px",width:"0%",background:`linear-gradient(90deg,${TEAL},${PURPLE})`}}/>
        </div>

        {/* Phase dots */}
        <div style={{position:"absolute",bottom:"20px",left:"50%",transform:"translateX(-50%)",
          zIndex:10,display:"flex",gap:"8px"}}>
          {[0,1,2].map(i=>(
            <div key={i} ref={el=>{dotsRef.current[i]=el;}}
              style={{width:i===0?"18px":"5px",height:"5px",borderRadius:"3px",
              background:i===0?TEAL:"rgba(255,255,255,0.12)",
              transition:"width 0.4s ease, background 0.4s ease"}}/>
          ))}
        </div>

        {/* Continue nudge */}
        <div ref={nudgeRef} style={{position:"absolute",bottom:"48px",left:"50%",
          transform:"translateX(-50%)",zIndex:10,textAlign:"center",
          opacity:0,transition:"opacity 0.5s ease",pointerEvents:"none"}}>
          <div style={{...mono,fontSize:"9px",color:TEAL,letterSpacing:"0.2em",
            textTransform:"uppercase",marginBottom:"6px"}}>continue scrolling</div>
          <div style={{width:"1px",height:"20px",background:`linear-gradient(${TEAL},transparent)`,
            margin:"0 auto",animation:"binary-fall 1.4s ease-in-out infinite"}}/>
        </div>
      </div>
    </div>
  );
}

// ─── H: Scroll progress line ──────────────────────────────────────────────────
function ScrollProgressLine(){
  const pct=useScrollProgress();
  return <div id="scroll-progress-line" style={{transform:`scaleX(${pct})`}}/>;
}

// ─── A: Infinite Marquee ──────────────────────────────────────────────────────
function MarqueeRow({dir}:{dir:"left"|"right"}){
  const items=[...MARQUEE_ITEMS,...MARQUEE_ITEMS];
  return(
    <div className="mq-wrap" style={{padding:"12px 0"}}>
      <div className={dir==="left"?"mq-track-left":"mq-track-right"}>
        {items.map((item,i)=>(
          <span key={i} style={{
            ...mono,fontSize:"10px",letterSpacing:"0.18em",textTransform:"uppercase",
            color:i%5===0?TEAL:i%7===0?GOLD:i%11===0?PURPLE:"#1a2440",
            marginRight:"44px",display:"inline-flex",alignItems:"center",gap:"14px",
          }}>
            {item}
            <span style={{width:"3px",height:"3px",borderRadius:"50%",background:"#1a2440",display:"inline-block",flexShrink:0}}/>
          </span>
        ))}
      </div>
    </div>
  );
}

function MarqueeDivider(){
  return(
    <div style={{position:"relative",zIndex:3,background:"#03050f",borderTop:"0.5px solid #0d1220",borderBottom:"0.5px solid #0d1220"}}>
      <MarqueeRow dir="left"/>
      <div style={{height:"0.5px",background:"#0d1220"}}/>
      <MarqueeRow dir="right"/>
    </div>
  );
}

// ─── E: Animated counter ─────────────────────────────────────────────────────
function AnimatedCounter({target,suffix="",label}:{target:number;suffix?:string;label:string}){
  const {ref,inView}=useInView(0.5);
  const [count,setCount]=useState(0);
  const started=useRef(false);
  useEffect(()=>{
    if(!inView||started.current)return;
    started.current=true;
    const dur=1600;const start=performance.now();
    const tick=(now:number)=>{
      const t=Math.min((now-start)/dur,1);
      const ease=1-Math.pow(1-t,3);
      setCount(Math.round(ease*target));
      if(t<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },[inView,target]);
  return(
    <div ref={ref} style={{opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all 0.8s ease"}}>
      <div style={{...mono,fontSize:"clamp(20px,2.5vw,28px)",fontWeight:500,color:TEAL,letterSpacing:"-0.02em"}}>{count}{suffix}</div>
      <div style={{fontSize:"10px",color:"#444",textTransform:"uppercase",letterSpacing:"0.10em",marginTop:"4px"}}>{label}</div>
    </div>
  );
}

// ─── G: Clip-path reveal wrapper ─────────────────────────────────────────────
function ClipReveal({children,delay=0}:{children:React.ReactNode;delay?:number}){
  const {ref,inView}=useInView(0.05);
  return(
    <div ref={ref} className={`clip-reveal${inView?" in":""}`} style={{transitionDelay:`${delay}s`}}>
      {children}
    </div>
  );
}

// ─── C: Word-by-word manifesto ────────────────────────────────────────────────
function WordReveal(){
  const ref=useRef<HTMLDivElement>(null);
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const h=()=>{
      if(!ref.current)return;
      const rect=ref.current.getBoundingClientRect();
      const pos=window.innerHeight-rect.top;
      setProgress(Math.max(0,Math.min(1,pos/(window.innerHeight*1.6))));
    };
    window.addEventListener("scroll",h,{passive:true});
    h();
    return ()=>window.removeEventListener("scroll",h);
  },[]);
  const words=MANIFESTO.split(" ");
  return(
    <div ref={ref} style={{position:"relative",zIndex:2,padding:"120px 32px",background:"#03050f",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",
        background:"radial-gradient(ellipse 60% 50% at 50% 50%,rgba(0,196,180,0.04) 0%,transparent 70%)"}}/>
      <div style={{maxWidth:"720px",margin:"0 auto",position:"relative"}}>
        <div style={{...mono,fontSize:"10px",color:"#282e42",letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"36px"}}>
          — The Studenius Principle
        </div>
        <p style={{fontSize:"clamp(24px,3.8vw,44px)",fontWeight:300,letterSpacing:"-0.025em",lineHeight:1.35}}>
          {words.map((word,i)=>{
            const thr=i/words.length;
            const lit=progress>=thr;
            const past=progress>=thr+0.12;
            return(
              <span key={i} className={`wd${lit?(past?" wd-past":" wd-lit"):""}`}>{word}</span>
            );
          })}
        </p>
      </div>
    </div>
  );
}

// ─── B: Sticky feature showcase ───────────────────────────────────────────────
function StickyFeatureShowcase(){
  const [active,setActive]=useState(0);
  const itemRefs=useRef<(HTMLDivElement|null)[]>([]);
  const accentColors=[TEAL,PURPLE,GOLD,"#4A9EFF","#FF6B6B","#A78BFA",TEAL,PURPLE,GOLD,"#4A9EFF","#FF6B6B","#A78BFA"];

  useEffect(()=>{
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const idx=itemRefs.current.indexOf(e.target as HTMLDivElement);
          if(idx>=0)setActive(idx);
        }
      });
    },{rootMargin:"-40% 0px -40% 0px"});
    itemRefs.current.forEach(r=>{if(r)obs.observe(r);});
    return ()=>obs.disconnect();
  },[]);

  const f=features[active];
  const ac=accentColors[active];

  return(
    <div style={{maxWidth:"1100px",margin:"0 auto",padding:"40px 32px 80px",display:"flex",gap:"72px",alignItems:"flex-start",position:"relative",zIndex:1}}>

      {/* Left sticky panel */}
      <div className="sticky-left" style={{flex:"0 0 300px"}}>
        <div style={{marginBottom:"28px",minHeight:"160px"}}>
          <div style={{fontSize:"44px",marginBottom:"14px",lineHeight:1,transition:"all 0.3s"}}>{f.icon}</div>
          <div style={{...mono,fontSize:"10px",color:ac,letterSpacing:"0.1em",marginBottom:"8px",transition:"color 0.4s"}}>{f.n}</div>
          <h3 style={{fontSize:"clamp(18px,1.8vw,24px)",fontWeight:300,letterSpacing:"-0.02em",color:"#F2F5F8",marginBottom:"10px"}}>{f.title}</h3>
          <p style={{fontSize:"12px",color:"#555",lineHeight:1.7,fontWeight:300}}>{f.desc}</p>
        </div>
        {/* Dot nav */}
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",maxWidth:"160px"}}>
          {features.map((_,i)=>(
            <div key={i} style={{
              width:"5px",height:"5px",borderRadius:"50%",
              background:i===active?ac:"#1a2240",
              transition:"background 0.3s,transform 0.3s",
              transform:i===active?"scale(1.5)":"scale(1)",
            }}/>
          ))}
        </div>
        {/* Accent line */}
        <div style={{
          position:"absolute",left:0,top:"10%",bottom:"10%",width:"1px",
          background:`linear-gradient(transparent,${ac},transparent)`,
          opacity:0.25,transition:"background 0.5s",
        }}/>
      </div>

      {/* Right scrolling list */}
      <div style={{flex:1}}>
        {features.map((feat,i)=>(
          <div key={feat.n} ref={el=>{itemRefs.current[i]=el;}} style={{
            padding:"28px 0",borderBottom:"0.5px solid #0d1220",
            opacity:i===active?1:0.28,transition:"opacity 0.45s ease",
          }}>
            <div style={{display:"flex",alignItems:"baseline",gap:"14px"}}>
              <span style={{...mono,fontSize:"10px",color:i===active?accentColors[i]:"#1e2838",transition:"color 0.4s"}}>{feat.n}</span>
              <span style={{fontSize:"15px",color:"#E0E8F0",fontWeight:300,letterSpacing:"-0.01em"}}>{feat.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── F: Horizontal scroll gallery ─────────────────────────────────────────────
function HorizontalScrollGallery(){
  const sectionRef=useRef<HTMLDivElement>(null);
  const trackRef=useRef<HTMLDivElement>(null);
  const [offset,setOffset]=useState(0);
  const [pct,setPct]=useState(0);

  useEffect(()=>{
    const h=()=>{
      if(!sectionRef.current||!trackRef.current)return;
      const rect=sectionRef.current.getBoundingClientRect();
      const sectionH=sectionRef.current.offsetHeight-window.innerHeight;
      if(rect.top>window.innerHeight||rect.bottom<0)return;
      const scrolled=Math.abs(Math.min(rect.top,0));
      const p=Math.max(0,Math.min(1,scrolled/sectionH));
      const maxOffset=trackRef.current.scrollWidth-window.innerWidth+64;
      setPct(p);
      setOffset(p*maxOffset);
    };
    window.addEventListener("scroll",h,{passive:true});
    h();
    return ()=>window.removeEventListener("scroll",h);
  },[]);

  return(
    <div ref={sectionRef} style={{height:"260vh",position:"relative",zIndex:2}}>
      <div style={{position:"sticky",top:"48px",height:"calc(100vh - 48px)",overflow:"hidden",
        display:"flex",flexDirection:"column",justifyContent:"center",background:"#03050f"}}>

        <div style={{maxWidth:"1100px",margin:"0 auto",width:"100%",padding:"0 32px",marginBottom:"28px"}}>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"6px"}}>Who it's for</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <h2 style={{fontSize:"clamp(18px,2.4vw,30px)",fontWeight:300,letterSpacing:"-0.02em",color:"#F2F5F8"}}>Every student. Every subject.</h2>
            <span style={{...mono,fontSize:"9px",color:"#222",letterSpacing:"0.12em"}}>SCROLL ←→</span>
          </div>
        </div>

        <div style={{overflow:"hidden",paddingLeft:"32px"}}>
          <div ref={trackRef} style={{
            display:"flex",gap:"14px",
            transform:`translateX(${-offset}px)`,
            transition:"transform 0.06s linear",
            willChange:"transform",
          }}>
            {useCaseCards.map((card,i)=>(
              <div key={i} style={{
                flex:"0 0 280px",background:"#080d1a",
                border:"0.5px solid #0d1220",padding:"28px",
                position:"relative",overflow:"hidden",
                transition:"border-color 0.3s",
              }}
                onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.borderColor=card.color+"55")}
                onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.borderColor="#0d1220")}
              >
                <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:card.color,opacity:0.55}}/>
                <div style={{...mono,fontSize:"10px",color:card.color,letterSpacing:"0.12em",marginBottom:"18px",textTransform:"uppercase"}}>{card.label}</div>
                <div style={{fontSize:"20px",fontWeight:300,color:"#F2F5F8",marginBottom:"6px",letterSpacing:"-0.02em"}}>{card.tool}</div>
                <div style={{fontSize:"11px",color:"#444",fontWeight:300}}>{card.stat}</div>
                <div style={{position:"absolute",right:"12px",bottom:"12px",...mono,fontSize:"72px",fontWeight:700,
                  color:"rgba(255,255,255,0.025)",lineHeight:1,userSelect:"none"}}>{String(i+1).padStart(2,"0")}</div>
              </div>
            ))}
            <div style={{flex:"0 0 240px",border:"0.5px dashed #1a2240",padding:"28px",
              display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",textAlign:"center",gap:"12px"}}>
              <div style={{fontSize:"12px",color:"#333",fontWeight:300}}>More use cases await.</div>
              <Link to="/signup">
                <button style={{...mono,fontSize:"10px",letterSpacing:"0.12em",textTransform:"uppercase",
                  color:TEAL,border:`0.5px solid ${TEAL}`,background:"transparent",padding:"7px 14px",cursor:"pointer"}}>
                  Start Free
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Track progress bar */}
        <div style={{padding:"20px 32px 0",maxWidth:"1100px",margin:"0 auto",width:"100%"}}>
          <div style={{height:"1px",background:"#0d1220",position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,height:"100%",
              background:`linear-gradient(90deg,${TEAL},${PURPLE})`,
              width:`${pct*100}%`,transition:"width 0.06s linear"}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Background layers (absolute — scoped to hero) ───────────────────────────
function StarFieldContained(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=canvasRef.current!;const ctx=c.getContext("2d")!;let raf:number;
    function resize(){
      const parent=c.parentElement!;
      c.width=parent.offsetWidth;c.height=parent.offsetHeight;
    }
    resize();
    const ro=new ResizeObserver(resize);
    if(c.parentElement)ro.observe(c.parentElement);
    type Star={x:number;y:number;r:number;o:number;phase:number;freq:number;layer:number;warm:boolean;spike:boolean};
    const stars:Star[]=[];
    const addLayer=(n:number,rMin:number,rMax:number,layer:number,warmChance:number,spikes:number)=>{
      for(let i=0;i<n;i++)stars.push({
        x:Math.random()*c.width,y:Math.random()*c.height,
        r:Math.random()*(rMax-rMin)+rMin,o:Math.random()*0.7+0.15,
        phase:Math.random()*Math.PI*2,freq:Math.random()*0.006+0.001,
        layer,warm:Math.random()<warmChance,spike:i<spikes,
      });
    };
    addLayer(900,0.15,0.65,0,0.04,0);
    addLayer(200,0.6,1.4,1,0.06,0);
    addLayer(40,1.4,3.0,2,0.12,3);
    let t=0;
    function draw(){
      t++;ctx.clearRect(0,0,c.width,c.height);
      for(const s of stars){
        const pulse=s.o*(0.55+0.45*Math.sin(t*s.freq*60+s.phase));
        const col=s.warm?`rgba(232,185,35,${pulse*0.75})`:s.layer===2?`rgba(120,180,255,${pulse})`:s.layer===1?`rgba(180,240,235,${pulse*0.85})`:`rgba(200,220,255,${pulse})`;
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
        if(s.layer===2&&s.spike){
          const len=s.r*12;ctx.save();ctx.globalAlpha=pulse*0.5;
          ctx.strokeStyle="rgba(120,180,255,0.5)";ctx.lineWidth=0.5;
          [[1,0],[0,1]].forEach(([cx,cy])=>{
            ctx.beginPath();ctx.moveTo(s.x-cx*len,s.y-cy*len);ctx.lineTo(s.x+cx*len,s.y+cy*len);ctx.stroke();
          });
          ctx.restore();
        }
      }
      raf=requestAnimationFrame(draw);
    }
    draw();
    return ()=>{cancelAnimationFrame(raf);ro.disconnect();};
  },[]);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

function StarField(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const scrollRef=useRef(0);
  useEffect(()=>{
    const h=()=>{scrollRef.current=window.scrollY;};
    window.addEventListener("scroll",h,{passive:true});
    return ()=>window.removeEventListener("scroll",h);
  },[]);
  useEffect(()=>{
    const c=canvasRef.current!;const ctx=c.getContext("2d")!;let raf:number;
    function resize(){c.width=window.innerWidth;c.height=window.innerHeight;}
    resize();window.addEventListener("resize",resize);
    type Star={x:number;y:number;r:number;o:number;phase:number;freq:number;layer:number;warm:boolean;spike:boolean};
    const stars:Star[]=[];const PARALLAX=[0.018,0.055,0.13];
    const addLayer=(n:number,rMin:number,rMax:number,layer:number,warmChance:number,spikes:number)=>{
      for(let i=0;i<n;i++)stars.push({
        x:Math.random()*c.width,y:Math.random()*c.height*3,
        r:Math.random()*(rMax-rMin)+rMin,o:Math.random()*0.7+0.15,
        phase:Math.random()*Math.PI*2,freq:Math.random()*0.006+0.001,
        layer,warm:Math.random()<warmChance,spike:i<spikes,
      });
    };
    addLayer(1800,0.15,0.65,0,0.04,0);addLayer(400,0.6,1.4,1,0.06,0);addLayer(80,1.4,3.0,2,0.12,3);
    let t=0;
    function draw(){
      t++;ctx.clearRect(0,0,c.width,c.height);const sy=scrollRef.current;
      for(const s of stars){
        const py=((s.y-PARALLAX[s.layer]*sy)%(c.height*3)+c.height*3)%(c.height*3);
        if(py<-4||py>c.height+4)continue;
        const pulse=s.o*(0.55+0.45*Math.sin(t*s.freq*60+s.phase));
        const col=s.warm?`rgba(232,185,35,${pulse*0.75})`:s.layer===2?`rgba(120,180,255,${pulse})`:s.layer===1?`rgba(180,240,235,${pulse*0.85})`:`rgba(200,220,255,${pulse})`;
        ctx.beginPath();ctx.arc(s.x,py,s.r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
        if(s.layer===2){
          const g=ctx.createRadialGradient(s.x,py,0,s.x,py,s.r*3.5);
          g.addColorStop(0,s.warm?`rgba(232,185,35,${pulse*0.35})`:`rgba(120,180,255,${pulse*0.3})`);
          g.addColorStop(1,"transparent");
          ctx.beginPath();ctx.arc(s.x,py,s.r*3.5,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        }
        if(s.spike){
          const len=s.r*14;ctx.save();ctx.globalAlpha=pulse*0.55;
          ctx.strokeStyle="rgba(120,180,255,0.6)";ctx.lineWidth=0.5;
          [[1,0],[0,1]].forEach(([cx,cy])=>{
            ctx.beginPath();ctx.moveTo(s.x-cx*len,py-cy*len);ctx.lineTo(s.x+cx*len,py+cy*len);ctx.stroke();
          });
          ctx.restore();
        }
      }
      raf=requestAnimationFrame(draw);
    }
    draw();
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

function NebulaLayer(){
  const base:React.CSSProperties={position:"absolute",inset:"-20%",zIndex:0,pointerEvents:"none",transformOrigin:"center center"};
  return(
    <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      <div style={{...base,background:"radial-gradient(ellipse 80% 60% at 22% 30%, rgba(180,40,160,0.11) 0%, transparent 65%)",animation:"float-slow 24s ease-in-out infinite"}}/>
      <div style={{...base,background:"radial-gradient(ellipse 55% 70% at 15% 65%, rgba(0,196,180,0.09) 0%, transparent 60%)",animation:"float-slow 30s ease-in-out 4s infinite"}}/>
      <div style={{...base,background:"radial-gradient(ellipse 45% 32% at 80% 30%, rgba(232,185,35,0.07) 0%, transparent 50%)",animation:"float-slow 36s ease-in-out 8s infinite"}}/>
      <div style={{...base,background:"radial-gradient(ellipse 65% 22% at 60% 50%, rgba(120,180,255,0.06) 0%, transparent 55%)",animation:"float-slow 42s ease-in-out 2s infinite"}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(112deg,transparent 30%,rgba(232,185,35,0.045) 45%,transparent 48%,rgba(232,185,35,0.03) 52%,transparent 58%,rgba(120,180,255,0.03) 65%,transparent 70%)",animation:"god-ray 9s ease-in-out infinite"}}/>
    </div>
  );
}

function FloatingPlanets(){
  return(
    <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      <div style={{
        position:"absolute",right:"-60px",top:"-60px",width:"340px",height:"340px",borderRadius:"50%",
        background:"radial-gradient(circle at 32% 32%,#1d3a7e 0%,#0d1b6e 35%,#080f40 60%,#04081a 100%)",
        boxShadow:"inset -30px -30px 80px rgba(0,0,0,0.85),0 0 80px rgba(123,94,167,0.18)",
        border:"0.5px solid rgba(123,94,167,0.2)",animation:"rim-pulse 8s ease-in-out infinite",overflow:"hidden",
      }}>
        {[18,38,52,68,80].map((pct,i)=>(
          <div key={i} style={{position:"absolute",left:0,right:0,top:`${pct}%`,height:`${[8,6,10,5,7][i]}%`,
            background:i%2===0?"rgba(10,20,80,0.35)":"rgba(40,80,160,0.12)"}}/>
        ))}
        <div style={{position:"absolute",left:"30%",top:"62%",width:"28%",height:"14%",borderRadius:"50%",background:"rgba(6,10,50,0.6)",transform:"rotate(-8deg)"}}/>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",background:"radial-gradient(circle at 100% 50%,rgba(80,120,255,0.15) 0%,transparent 45%)"}}/>
      </div>
      {[
        {w:480,bw:"10px",col:"rgba(200,220,255,0.18)"},
        {w:560,bw:"5px", col:"rgba(232,185,35,0.10)"},
        {w:630,bw:"2px", col:"rgba(120,180,255,0.06)"},
      ].map((r,i)=>(
        <div key={i} style={{
          position:"absolute",right:`${-60-(r.w-340)/2}px`,top:`${-60+(340-r.w)/2+(i+1)*-40+80}px`,
          width:`${r.w}px`,height:`${r.w}px`,borderRadius:"50%",border:`${r.bw} solid ${r.col}`,
          transform:"rotateX(72deg)",
        }}/>
      ))}
      <div style={{
        position:"absolute",left:"-100px",top:"320px",width:"220px",height:"220px",borderRadius:"50%",
        background:"radial-gradient(circle at 45% 35%,#1e4a30 0%,#1a3a2a 40%,#040c0c 100%)",
        boxShadow:"inset -15px -15px 40px rgba(0,0,0,0.85),0 0 40px rgba(0,196,180,0.12)",
        border:"0.5px solid rgba(0,196,180,0.15)",overflow:"hidden",
      }}>
        <svg viewBox="0 0 220 220" style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.5}}>
          {[0,1,2].map(i=>(
            <ellipse key={i} cx={110+i*8} cy={110} rx={130+i*20} ry={80+i*12}
              fill="none" stroke="rgba(0,196,180,0.25)" strokeWidth="0.5" strokeDasharray={`${4+i*2} ${6+i}`}/>
          ))}
        </svg>
      </div>
      <div style={{
        position:"absolute",right:"7%",top:"60%",width:"48px",height:"32px",
        borderRadius:"40% 60% 55% 45%",background:"#111828",
        boxShadow:"0 0 24px rgba(232,185,35,0.1)",opacity:0.45,
      }}/>
    </div>
  );
}

function ParticleMotes(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=canvasRef.current!;const ctx=c.getContext("2d")!;let raf:number;
    const parent=c.parentElement!;
    c.width=parent.offsetWidth||window.innerWidth;c.height=parent.offsetHeight||window.innerHeight;
    type Mote={x:number;y:number;r:number;vx:number;vy:number;col:string;t:number;sp:number};
    const motes:Mote[]=[];
    const palettes=["rgba(120,180,255,V)","rgba(0,196,180,V)","rgba(232,185,35,V)"];
    const wt=[0.6,0.25,0.15];
    for(let i=0;i<220;i++){
      const pr=Math.random();const ci=pr<wt[0]?0:pr<wt[0]+wt[1]?1:2;
      motes.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*4+0.5,
        vx:(Math.random()-.5)*0.07,vy:(Math.random()-.5)*0.055,col:palettes[ci],t:Math.random()*1000,sp:Math.random()*0.6+0.3});
    }
    function draw(){
      ctx.clearRect(0,0,c.width,c.height);
      for(const m of motes){
        m.t+=m.sp;m.x+=m.vx+Math.sin(m.t*0.011)*0.18;m.y+=m.vy+Math.cos(m.t*0.009)*0.14;
        if(m.x<0)m.x=c.width;if(m.x>c.width)m.x=0;if(m.y<0)m.y=c.height;if(m.y>c.height)m.y=0;
        const a=0.25+0.28*Math.sin(m.t*0.022);
        ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);ctx.fillStyle=m.col.replace("V",String(a));ctx.fill();
        if(m.r>3.5){
          const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*3);
          g.addColorStop(0,m.col.replace("V",String(a*0.5)));g.addColorStop(1,"transparent");
          ctx.beginPath();ctx.arc(m.x,m.y,m.r*3,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
        }
      }
      raf=requestAnimationFrame(draw);
    }
    draw();return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.65}}/>;
}

function BinaryRain(){
  return(
    <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden",opacity:0.055}}>
      {Array.from({length:8},(_,i)=>(
        <div key={i} style={{position:"absolute",left:`${i*12+5}%`,top:0,...mono,fontSize:"9px",color:TEAL,whiteSpace:"nowrap",
          animation:`binary-fall ${14+i*3}s linear ${-i*2}s infinite`}}>
          {Array.from({length:34},()=>Math.round(Math.random())).join("\n")}
        </div>
      ))}
    </div>
  );
}

function SectionParticles({count=25,color=TEAL}:{count?:number;color?:string}){
  const motes=Array.from({length:count},()=>({
    left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,
    r:Math.random()*3+1,dur:`${12+Math.random()*16}s`,delay:`${-Math.random()*12}s`,op:0.06+Math.random()*0.1,
  }));
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      {motes.map((m,i)=>(
        <div key={i} style={{position:"absolute",left:m.left,top:m.top,
          width:`${m.r*2}px`,height:`${m.r*2}px`,borderRadius:"50%",
          background:`radial-gradient(circle,${color} 0%,transparent 80%)`,
          opacity:m.op,animation:`mote-drift ${m.dur} ease-in-out ${m.delay} infinite`}}/>
      ))}
    </div>
  );
}

function TiltCard({children,style}:{children:React.ReactNode;style?:React.CSSProperties}){
  const ref=useRef<HTMLDivElement>(null);
  const [tilt,setTilt]=useState({x:0,y:0});
  const [hovered,setHovered]=useState(false);
  function onMove(e:React.MouseEvent){
    const rect=ref.current!.getBoundingClientRect();
    setTilt({x:((e.clientY-rect.top-rect.height/2)/(rect.height/2))*-5,
              y:((e.clientX-rect.left-rect.width/2)/(rect.width/2))*5});
  }
  return(
    <div ref={ref} onMouseMove={onMove}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>{setTilt({x:0,y:0});setHovered(false);}}
      style={{...style,
        transform:`perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered?"translateZ(10px)":"translateZ(0)"}`,
        transition:hovered?"transform 0.08s ease-out":"transform 0.45s ease-out",
      }}>
      {children}
    </div>
  );
}

function Reveal({children,delay=0,style}:{children:React.ReactNode;delay?:number;style?:React.CSSProperties}){
  const {ref,inView}=useInView(0.08);
  return(
    <div ref={ref} style={{...style,
      opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(32px)",
      filter:inView?"blur(0px)":"blur(4px)",
      transition:`opacity 1s ease ${delay}s,transform 1s ease ${delay}s,filter 1s ease ${delay}s`,
    }}>
      {children}
    </div>
  );
}

function GlitchText({text,style}:{text:string;style?:React.CSSProperties}){
  const [g,setG]=useState(false);
  useEffect(()=>{
    const id=setInterval(()=>{setG(true);setTimeout(()=>setG(false),160);},4200);
    return ()=>clearInterval(id);
  },[]);
  return(
    <span style={{position:"relative",display:"inline-block",...style}}>
      {text}
      {g&&<>
        <span style={{position:"absolute",left:0,top:0,color:TEAL,opacity:0.75,animation:"glitch1 0.16s steps(1) infinite"}}>{text}</span>
        <span style={{position:"absolute",left:0,top:0,color:GOLD,opacity:0.55,animation:"glitch2 0.16s steps(1) 0.05s infinite"}}>{text}</span>
      </>}
    </span>
  );
}

function OrbitalRings(){
  return(
    <div style={{position:"absolute",right:"-120px",top:"50%",transform:"translateY(-50%)",width:"520px",height:"520px",pointerEvents:"none",opacity:0.11}}>
      {[{sz:300,dur:"13s",col:TEAL,a:"orbit1"},{sz:420,dur:"19s",col:PURPLE,a:"orbit2"},{sz:210,dur:"8s",col:GOLD,a:"orbit3"}]
        .map((r,i)=>(
          <div key={i} style={{position:"absolute",left:"50%",top:"50%",
            marginLeft:`-${r.sz/2}px`,marginTop:`-${r.sz/2}px`,
            width:r.sz,height:r.sz,borderRadius:"50%",border:`0.8px solid ${r.col}`,
            animation:`${r.a} ${r.dur} linear infinite`}}/>
        ))}
    </div>
  );
}

// ─── Astronaut (CSS-only float, no GSAP) ──────────────────────────────────────
function AstronautScene(){
  const {ref,inView}=useInView(0.1);
  const eqs=[
    {x:48, y:190,label:"E=mc²",     dur:"24s",delay:"0s"},
    {x:398,y:255,label:"∫f(x)dx",   dur:"32s",delay:"4s"},
    {x:60, y:370,label:"PV=nRT",    dur:"28s",delay:"8s"},
    {x:390,y:390,label:"F=ma",      dur:"20s",delay:"2s"},
    {x:80, y:440,label:"ΔG=ΔH−TΔS",dur:"36s",delay:"11s"},
    {x:340,y:130,label:"∇×B=μ₀J",  dur:"42s",delay:"6s"},
  ];
  return(
    <div ref={ref} style={{
      position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
      pointerEvents:"none",userSelect:"none",width:"min(560px,85vw)",
      opacity:inView?1:0,transition:"opacity 1.4s ease",
      filter:"drop-shadow(0 0 60px rgba(0,196,180,0.32)) drop-shadow(0 0 120px rgba(123,94,167,0.18))",
    }}>
      <div style={{animation:"astro-float 7s ease-in-out infinite",willChange:"transform"}}>
        <svg viewBox="0 0 560 520" xmlns="http://www.w3.org/2000/svg" style={{width:"100%"}}>
          <defs>
            <radialGradient id="pgrad" cx="33%" cy="30%">
              <stop offset="0%" stopColor="#1e3a6e"/><stop offset="100%" stopColor="#060d20"/>
            </radialGradient>
            <radialGradient id="visorGrad" cx="30%" cy="25%">
              <stop offset="0%" stopColor="#0a1830"/><stop offset="60%" stopColor="#040a14"/><stop offset="100%" stopColor="#020509"/>
            </radialGradient>
            <radialGradient id="suitGrad" cx="40%" cy="30%">
              <stop offset="0%" stopColor="#151f38"/><stop offset="100%" stopColor="#0e1628"/>
            </radialGradient>
          </defs>
          <ellipse cx="280" cy="490" rx="180" ry="18" fill="rgba(0,196,180,0.05)"/>
          <circle cx="420" cy="88" r="58" fill="url(#pgrad)" stroke="rgba(0,196,180,0.2)" strokeWidth="0.8"/>
          <ellipse cx="420" cy="78" rx="52" ry="6" fill="rgba(0,20,80,0.3)"/>
          <ellipse cx="420" cy="94" rx="48" ry="5" fill="rgba(30,60,150,0.15)"/>
          <ellipse cx="420" cy="88" rx="82" ry="18" fill="none" stroke="rgba(200,220,255,0.25)" strokeWidth="1.2"/>
          <ellipse cx="420" cy="88" rx="96" ry="22" fill="none" stroke="rgba(232,185,35,0.12)" strokeWidth="0.7"/>
          <ellipse cx="420" cy="88" rx="110" ry="26" fill="none" stroke="rgba(120,180,255,0.06)" strokeWidth="0.5"/>
          <circle cx="420" cy="88" r="58" fill="none" stroke="rgba(80,140,255,0.18)" strokeWidth="4"/>
          <g transform="translate(148,108)">
            <ellipse cx="122" cy="72" rx="60" ry="64" fill="url(#suitGrad)" stroke="rgba(200,220,255,0.2)" strokeWidth="1.2"/>
            <ellipse cx="122" cy="68" rx="42" ry="44" fill="url(#visorGrad)" stroke="rgba(0,196,180,0.35)" strokeWidth="0.9"/>
            <ellipse cx="118" cy="60" rx="16" ry="8" fill="rgba(123,94,167,0.18)"/>
            <ellipse cx="125" cy="65" rx="9" ry="5" fill="rgba(0,196,180,0.12)"/>
            <ellipse cx="112" cy="72" rx="6" ry="3" fill="rgba(232,185,35,0.08)"/>
            {[{x:116,y:56,s:1.3,d:"2s"},{x:130,y:50,s:0.9,d:"3.1s"},{x:110,y:75,s:0.9,d:"2.4s"},
              {x:134,y:70,s:0.7,d:"1.8s"},{x:108,y:62,s:0.6,d:"4s"}].map((st,i)=>(
              <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="rgba(200,220,255,0.7)"
                style={{animation:`star-twinkle ${st.d} ease-in-out infinite`}}/>
            ))}
            <ellipse cx="100" cy="50" rx="14" ry="8" fill="rgba(255,255,255,0.06)" transform="rotate(-20,100,50)"/>
            <ellipse cx="122" cy="133" rx="38" ry="8" fill="#0e1628" stroke="rgba(200,220,255,0.12)" strokeWidth="1"/>
            <rect x="68" y="133" width="108" height="100" rx="22" fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1"/>
            <rect x="90" y="152" width="64" height="36" rx="5" fill="rgba(0,196,180,0.07)" stroke="rgba(0,196,180,0.35)" strokeWidth="0.7"/>
            <line x1="100" y1="162" x2="144" y2="162" stroke="rgba(0,196,180,0.5)" strokeWidth="0.8"/>
            <line x1="100" y1="168" x2="136" y2="168" stroke="rgba(0,196,180,0.3)" strokeWidth="0.8"/>
            <rect x="100" y="173" width="44" height="3" rx="1.5" fill="rgba(0,196,180,0.15)"/>
            <rect x="100" y="173" width="24" height="3" rx="1.5" fill={TEAL} style={{animation:"pulse-glow 2.5s ease-in-out infinite"}}/>
            <text x="122" y="195" textAnchor="middle" fill="rgba(0,196,180,0.55)"
              style={{fontFamily:"monospace",fontSize:"5px",letterSpacing:"0.18em"}}>STUDENIUS</text>
            {[[68,155,176,155],[68,190,176,190]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,196,180,0.07)" strokeWidth="0.5" strokeDasharray="3 8"/>
            ))}
            <rect x="50" y="136" width="24" height="92" rx="12" fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-28,62,182)"/>
            <g transform="translate(-14,196) rotate(12)">
              <rect x="0" y="0" width="54" height="40" rx="3" fill={TEAL} opacity="0.85"/>
              <rect x="4" y="4" width="46" height="32" rx="2" fill="#0a1a2e"/>
              {[8,14,20,26].map((y,i)=>(
                <line key={i} x1="8" y1={y} x2={38-i*2} y2={y} stroke={`rgba(0,196,180,${0.6-i*0.12})`} strokeWidth="0.8"/>
              ))}
              {[12,20,28,36].map((x,i)=>(
                <line key={i} x1={x} y1="4" x2={x+1} y2={-8-i*3} stroke="rgba(232,185,35,0.5)" strokeWidth="0.7" strokeDasharray="2 3"/>
              ))}
            </g>
            <rect x="176" y="136" width="24" height="84" rx="12" fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(22,188,178)"/>
            <g transform="translate(196,155)">
              {Array.from({length:8},(_,i)=>{
                const t=i/7,y1=t*80;
                const x1=Math.sin(t*Math.PI*2)*16,x2=Math.sin(t*Math.PI*2+Math.PI)*16;
                return(<g key={i}>
                  <circle cx={x1} cy={y1} r="2" fill="rgba(0,196,180,0.6)"/>
                  <circle cx={x2} cy={y1} r="2" fill="rgba(123,94,167,0.6)"/>
                  {i<7&&<line x1={x1} y1={y1} x2={x2} y2={y1} stroke="rgba(0,196,180,0.2)" strokeWidth="0.7"/>}
                </g>);
              })}
            </g>
            <rect x="78" y="228" width="34" height="76" rx="17" fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(-4,95,266)"/>
            <rect x="122" y="228" width="34" height="76" rx="17" fill="url(#suitGrad)" stroke="rgba(200,220,255,0.12)" strokeWidth="1" transform="rotate(6,139,266)"/>
            <ellipse cx="95" cy="308" rx="22" ry="6" fill="rgba(0,196,180,0.2)" style={{animation:"pulse-glow 3s ease-in-out infinite"}}/>
            <ellipse cx="139" cy="308" rx="18" ry="5" fill="rgba(0,196,180,0.15)" style={{animation:"pulse-glow 3s ease-in-out 0.8s infinite"}}/>
          </g>
          {eqs.map(eq=>(
            <text key={eq.label} x={eq.x} y={eq.y} fill="rgba(0,196,180,0.28)"
              style={{fontFamily:"monospace",fontSize:"12px",letterSpacing:"0.05em",
                animation:`drift-eq ${eq.dur} ease-in-out ${eq.delay} infinite`}}>
              {eq.label}
            </text>
          ))}
          <line x1="30" y1="250" x2="148" y2="250" stroke="rgba(0,196,180,0.08)" strokeWidth="0.6" strokeDasharray="4 7"/>
          <line x1="365" y1="310" x2="480" y2="310" stroke="rgba(0,196,180,0.08)" strokeWidth="0.6" strokeDasharray="4 7"/>
          <g transform="translate(60,310)">
            <circle cx="0" cy="0" r="3" fill="rgba(232,185,35,0.7)"/>
            <ellipse cx="0" cy="0" rx="18" ry="7" fill="none" stroke="rgba(0,196,180,0.25)" strokeWidth="0.7" strokeDasharray="2 2"/>
            <circle cx="18" cy="0" r="1.5" fill="rgba(0,196,180,0.6)"/>
          </g>
          <g transform="translate(420,310)" opacity="0.28">
            <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(0,196,180,0.4)" strokeWidth="0.5"/>
            <line x1="0" y1="-40" x2="0" y2="10" stroke="rgba(0,196,180,0.4)" strokeWidth="0.5"/>
            <path d="M0,5 Q15,5 30,-15 Q45,-35 60,-38" fill="none" stroke={TEAL} strokeWidth="1.2"/>
          </g>
        </svg>
      </div>
    </div>
  );
}

// ─── CinematicSection removed per design update ──────────────────────────────
function _CinematicSection_UNUSED(){
  const sectionRef=useRef<HTMLDivElement>(null);
  const [p,setP]=useState(0);
  useEffect(()=>{
    const h=()=>{
      if(!sectionRef.current)return;
      const rect=sectionRef.current.getBoundingClientRect();
      const total=sectionRef.current.offsetHeight-window.innerHeight;
      const scrolled=Math.abs(Math.min(rect.top,0));
      setP(Math.max(0,Math.min(1,scrolled/total)));
    };
    window.addEventListener("scroll",h,{passive:true});h();
    return ()=>window.removeEventListener("scroll",h);
  },[]);
  const showA=p<0.45;const showB=p>=0.4;
  return(
    <div ref={sectionRef} style={{position:"relative",height:"320vh",zIndex:2}}>
      <div style={{position:"sticky",top:0,height:"100vh",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",inset:0,
          background:`radial-gradient(ellipse 70% 60% at 28% 38%, rgba(0,196,180,0.09) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 72% 60%, rgba(232,185,35,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 50%, rgba(123,94,167,0.07) 0%, transparent 60%)`}}/>
        <div style={{
          position:"absolute",inset:0,opacity:0.038,
          backgroundImage:`linear-gradient(rgba(0,196,180,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,196,180,1) 1px,transparent 1px)`,
          backgroundSize:"64px 64px",
          transform:`perspective(400px) rotateX(8deg) translateY(${p*100}px) scale(${1+p*0.08})`,
          transformOrigin:"center 60%",willChange:"transform",
        }}/>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"220px",background:"linear-gradient(transparent,rgba(0,196,180,0.05))"}}/>
        <SectionParticles count={45} color={TEAL}/>
        <AstronautScene/>
        {/* Scene A */}
        <div style={{position:"absolute",top:"13%",left:"50%",textAlign:"center",width:"min(640px,90vw)",
          opacity:showA?1:0,transform:`translateX(-50%) translateY(${showA?0:-50}px)`,
          filter:showA?"blur(0)":"blur(5px)",transition:"opacity 0.6s ease,transform 0.6s ease,filter 0.6s ease",
        }}>
          <h2 style={{fontSize:"clamp(22px,4vw,44px)",fontWeight:300,letterSpacing:"-0.03em",color:"#F2F5F8",lineHeight:1.12}}>Knowledge travels</h2>
          <h2 style={{fontSize:"clamp(22px,4vw,44px)",fontWeight:300,letterSpacing:"-0.03em",color:TEAL,lineHeight:1.12}}>at the speed of curiosity.</h2>
          <div style={{width:"120px",height:"0.5px",background:"rgba(0,196,180,0.3)",margin:"20px auto 0"}}/>
        </div>
        {/* Scene B */}
        <div style={{position:"absolute",top:"13%",left:"50%",textAlign:"center",width:"min(640px,90vw)",
          opacity:showB?1:0,transform:`translateX(-50%) translateY(${showB?0:50}px)`,
          filter:showB?"blur(0)":"blur(8px)",transition:"opacity 0.6s ease 0.1s,transform 0.6s ease 0.1s,filter 0.6s ease 0.1s",
        }}>
          <h2 style={{fontSize:"clamp(22px,4vw,44px)",fontWeight:300,letterSpacing:"-0.03em",color:"#F2F5F8",lineHeight:1.12}}>AI-powered tools.</h2>
          <h2 style={{fontSize:"clamp(22px,4vw,44px)",fontWeight:300,letterSpacing:"-0.03em",color:GOLD,lineHeight:1.12}}>Built for students who demand results.</h2>
          <div style={{width:"120px",height:"0.5px",background:"rgba(232,185,35,0.3)",margin:"20px auto 0"}}/>
        </div>
        {/* Scroll hint */}
        <div style={{position:"absolute",bottom:"12%",left:"50%",transform:"translateX(-50%)",textAlign:"center",
          opacity:p<0.08?1:0,transition:"opacity 0.4s"}}>
          <p style={{...mono,fontSize:"10px",color:"rgba(0,196,180,0.6)",letterSpacing:"0.2em",marginBottom:"8px"}}>SCROLL TO EXPLORE</p>
          <div style={{width:"1px",height:"44px",background:`linear-gradient(${TEAL},transparent)`,margin:"0 auto"}}/>
        </div>
        {/* Progress bar */}
        <div style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
          <div style={{width:"1px",height:"90px",background:"#0d1220",position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:`${p*100}%`,background:`linear-gradient(${TEAL},${GOLD})`}}/>
          </div>
          <span style={{...mono,fontSize:"9px",color:"#333",letterSpacing:"0.1em",writingMode:"vertical-lr"}}>{Math.round(p*100)}%</span>
        </div>
        {/* HUD */}
        <div style={{position:"absolute",left:"24px",bottom:"10%",...mono,fontSize:"9px",
          color:"rgba(0,196,180,0.35)",letterSpacing:"0.12em",lineHeight:1.9,
          opacity:p>0.06?0.75:0,transition:"opacity 0.4s"}}>
          <div>LAT {((p*90)-45).toFixed(2)}°</div>
          <div>LON {((p*360)-180).toFixed(2)}°</div>
          <div>ALT {Math.round(400+p*1200)} km</div>
        </div>
      </div>
    </div>
  );
}

// ─── D: Hero with mouse parallax (lerped + true Z-depth) ─────────────────────
function HeroSection(){
  const mouse=useMouseParallax();
  const scrollY=useScrollY();

  // layer(): GPU-composited depth helper.
  // 'speed'  → fraction of scrollY applied as Y offset (0.05x=bg, 0.4x=fg).
  // 'zDepth' → 0=near/foreground, 1=far/background.
  //   • scale:  foreground elements grow slightly as scroll pulls them toward camera.
  //   • blur:   far elements soften on scroll, simulating depth-of-field.
  const layer=(
    mouseFactor:number,
    speed=0,
    zDepth=0,
    extra?:React.CSSProperties
  ):React.CSSProperties=>{
    const scrollOffset=scrollY*speed;
    const scale=1+scrollY*0.00006*(1-zDepth);         // near elements swell toward camera
    const blurPx=Math.min(scrollY*0.006*zDepth,4);    // far elements soften on scroll
    return{
      transform:`translate3d(${mouse.x*mouseFactor}px,${mouse.y*mouseFactor+scrollOffset}px,0) scale(${scale})`,
      filter:blurPx>0.2?`blur(${blurPx}px)`:undefined,
      willChange:"transform,filter",
      ...extra,
    };
  };

  return(
    <section style={{padding:"110px 32px 88px",maxWidth:"720px",margin:"0 auto",width:"100%",position:"relative",zIndex:2}}>
      {/* Parallax depth layers — each on a distinct Z plane */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        {/* Deep background nebula — slowest scroll (0.05x), heavy blur = far plane */}
        <div style={layer(5,0.05,0.9,{position:"absolute",right:"-80px",top:"20px",width:"320px",height:"320px",borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(123,94,167,0.055) 0%,transparent 70%)"})}/>
        {/* Mid-ground ring — 0.18x scroll */}
        <div style={layer(12,0.18,0.5,{position:"absolute",right:"-20px",top:"80px",width:"160px",height:"160px",borderRadius:"50%",
          border:"0.5px solid rgba(0,196,180,0.055)"})}/>
        {/* Foreground dots — each at a distinct speed for genuine depth stagger */}
        {[
          {sz:3,r:110,t:90, mf:15,speed:0.38,zDepth:0.1},
          {sz:2,r:155,t:135,mf:22,speed:0.28,zDepth:0.2},
          {sz:4,r:85, t:170,mf:9, speed:0.42,zDepth:0.05},
          {sz:2,r:195,t:100,mf:17,speed:0.32,zDepth:0.15},
        ].map((d,i)=>(
          <div key={i} style={{
            ...layer(d.mf,d.speed,d.zDepth),
            position:"absolute",right:`${d.r}px`,top:`${d.t}px`,
            width:`${d.sz}px`,height:`${d.sz}px`,borderRadius:"50%",
            background:i%2===0?TEAL:GOLD,opacity:0.3,
          }}/>
        ))}
        {/* Foreground text column — fastest scroll (0.4x), closest plane, zero blur */}
        <div style={layer(19,0.4,0,{position:"absolute",right:"30px",top:"40px",...mono,fontSize:"9px",
          color:"rgba(0,196,180,0.12)",letterSpacing:"0.14em",lineHeight:2.4,textTransform:"uppercase",whiteSpace:"nowrap"})}>
          {["recall","understand","retain","master","grow"].map((w,i)=><div key={i}>{w}</div>)}
        </div>
      </div>

      <OrbitalRings/>
      <p style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"32px",animation:"pulse-glow 3s ease-in-out infinite, hero-enter 1.4s ease 0.15s both"}}>
        AI-Powered Study Platform
      </p>
      <h1 style={{fontSize:"clamp(38px,6.5vw,68px)",fontWeight:300,letterSpacing:"-0.038em",lineHeight:1.04,marginBottom:"22px",color:"#F2F5F8",animation:"hero-enter 1.4s ease 0.31s both"}}>
        <GlitchText text="Study smarter."/><br/>
        <span style={{background:`linear-gradient(135deg,${TEAL},${PURPLE})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
          Master it faster.
        </span>
      </h1>
      <p style={{fontSize:"15px",color:"#555",maxWidth:"480px",marginBottom:"36px",lineHeight:1.78,fontWeight:300,animation:"hero-enter 1.4s ease 0.47s both"}}>
        12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall, confidence tracking and more. Built for students who demand results.
      </p>
      <div style={{display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap",animation:"hero-enter 1.4s ease 0.63s both"}}>
        <Link to="/signup">
          <button style={{fontSize:"12px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"11px 26px",cursor:"pointer",letterSpacing:"0.03em",transition:"opacity 0.15s,box-shadow 0.2s,transform 0.2s"}}
            onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";e.currentTarget.style.boxShadow=`0 0 40px rgba(0,196,180,0.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
            Start for free →
          </button>
        </Link>
        <Link to="/dashboard">
          <button style={{fontSize:"12px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:300,color:"#444",background:"transparent",border:"none",cursor:"pointer",transition:"color 0.15s"}}
            onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
            onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>
            See Dashboard
          </button>
        </Link>
      </div>
      <p style={{...mono,fontSize:"10px",color:"#1e2a44",marginTop:"18px",letterSpacing:"0.06em",animation:"hero-enter 1.4s ease 0.79s both"}}>
        No credit card required · Free plan always available
      </p>
    </section>
  );
}

function PracticeDemo(){
  const [sel,setSel]=useState<string|null>(null);
  const [show,setShow]=useState(false);
  const reset=()=>{setSel(null);setShow(false);};
  return(
    <div style={{background:"#080d1a",border:"0.5px solid #0d1220",padding:"20px"}}>
      <div style={{...mono,fontSize:"10px",color:"#444",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"14px"}}>Practice Question</div>
      <p style={{fontSize:"13px",color:"#C0CCD8",lineHeight:1.6,fontWeight:300,marginBottom:"16px"}}>{mockQuestion.text}</p>
      <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"14px"}}>
        {mockQuestion.choices.map(c=>{
          const ok=show&&c.id===mockQuestion.correct;const no=show&&c.id===sel&&c.id!==mockQuestion.correct;
          return(
            <div key={c.id} onClick={()=>!show&&setSel(c.id)} style={{
              padding:"9px 12px",border:`0.5px solid ${ok?TEAL:no?"#ff4444":c.id===sel?TEAL:"#0d1220"}`,
              cursor:show?"default":"pointer",display:"flex",alignItems:"center",gap:"10px",
              background:ok?"rgba(0,196,180,0.06)":no?"rgba(255,68,68,0.04)":"transparent",transition:"all 0.2s",
            }}>
              <span style={{...mono,fontSize:"9px",color:c.id===sel||ok?TEAL:"#333",minWidth:"14px"}}>{c.id}</span>
              <span style={{fontSize:"12px",color:"#666",fontWeight:300,lineHeight:1.5}}>{c.text}</span>
            </div>
          );
        })}
      </div>
      {show&&(
        <div style={{borderTop:"0.5px solid #0d1220",paddingTop:"12px",marginBottom:"12px"}}>
          <p style={{...mono,fontSize:"11px",color:"#444",letterSpacing:"0.06em",marginBottom:"6px",textTransform:"uppercase"}}>Explanation</p>
          <p style={{fontSize:"12px",color:"#666",lineHeight:1.65,fontWeight:300}}>{mockQuestion.explanation}</p>
        </div>
      )}
      <div style={{marginTop:"14px"}}>
        {!show
          ?<button onClick={()=>{if(sel)setShow(true);}} style={{width:"100%",padding:"9px",fontSize:"11px",...mono,letterSpacing:"0.08em",textTransform:"uppercase",border:`0.5px solid ${sel?TEAL:"#0d1220"}`,background:"transparent",color:sel?TEAL:"#444",cursor:sel?"pointer":"not-allowed",transition:"color 0.15s,border-color 0.15s"}}>Check Answer</button>
          :<button onClick={reset} style={{width:"100%",padding:"9px",fontSize:"11px",...mono,letterSpacing:"0.08em",textTransform:"uppercase",border:"0.5px solid #0d1220",background:"transparent",color:"#666",cursor:"pointer"}}>Try Again</button>
        }
      </div>
    </div>
  );
}

function ChatDemo(){
  return(
    <div style={{background:"#080d1a",border:"0.5px solid #0d1220"}}>
      <div style={{padding:"12px 20px",borderBottom:"0.5px solid #0d1220",display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{...mono,fontSize:"10px",color:"#444",letterSpacing:"0.08em",textTransform:"uppercase"}}>BrainBot AI Tutor</span>
        <span style={{fontSize:"8px",padding:"1px 5px",background:"rgba(0,196,180,0.1)",color:TEAL,border:`0.5px solid rgba(0,196,180,0.3)`,...mono,fontWeight:700}}>LIVE</span>
      </div>
      <div style={{padding:"20px"}}>
        <div style={{textAlign:"right",marginBottom:"16px"}}>
          <span style={{fontSize:"13px",color:"#E0E8F0",fontWeight:300,borderRight:`1.5px solid rgba(0,196,180,0.3)`,paddingRight:"12px"}}>How do I remember the Krebs cycle?</span>
        </div>
        <div style={{borderLeft:`0.5px solid ${TEAL}`,paddingLeft:"14px",marginBottom:"16px"}}>
          <p style={{fontSize:"12px",color:"#666",lineHeight:1.65,fontWeight:300}}>
            Try the acronym <strong style={{color:"#E0E8F0",fontWeight:500}}>PCISSFM</strong>: Pyruvate → Citrate → Isocitrate → Succinate → Succinyl → Fumarate → Malate. Make a silly sentence and it'll stick.
          </p>
        </div>
        <div style={{borderTop:"0.5px solid #0d1220",paddingTop:"14px",display:"flex",gap:"8px"}}>
          <div style={{flex:1,padding:"8px 12px",border:"0.5px solid #0d1220",fontSize:"12px",color:"#444",background:"transparent"}}>Ask about any topic...</div>
          <button style={{padding:"8px 14px",border:`0.5px solid ${TEAL}`,background:"transparent",color:TEAL,cursor:"pointer",fontSize:"14px"}}>→</button>
        </div>
      </div>
    </div>
  );
}

// ─── FLOATING OBJECTS PARALLAX (lerped + velocity-staggered) ─────────────────
function FloatingObjectsSection(){
  const ref=useRef<HTMLDivElement>(null);
  const rawP=useRef(0);      // raw [0-1] scroll progress, updated instantly
  const smoothP=useRef(0);   // lerped output — trails behind rawP
  const rafRef=useRef<number>(0);
  const [p,setP]=useState(0);
  const {ref:inRef,inView}=useInView(0.1);
  useEffect(()=>{
    const onScroll=()=>{
      if(!ref.current)return;
      const rect=ref.current.getBoundingClientRect();
      rawP.current=Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight+rect.height)));
    };
    window.addEventListener("scroll",onScroll,{passive:true});
    onScroll();
    // t=0.07 → SVGs glide to a halt rather than hard-stop
    const tick=()=>{
      smoothP.current=lerp(smoothP.current,rawP.current,0.07);
      setP(smoothP.current);
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return ()=>{window.removeEventListener("scroll",onScroll);cancelAnimationFrame(rafRef.current);};
  },[]);

  // Each SVG moves at a distinct fraction of max travel — genuine Z-depth stagger:
  //   circle  0.12x → slowest, background plane
  //   diamond 0.22x → mid-ground (original speed)
  //   cross   0.30x → closer mid-ground
  //   hex     0.18x → mid-background
  const circleY =-p*110*0.12/0.22;
  const diamondY=-p*55;
  const crossY  =-p*170*0.30/0.22;
  const hexY    =-p*85*0.18/0.22;

  return(
    <div ref={ref} style={{position:"relative",minHeight:"500px",overflow:"hidden",background:"linear-gradient(180deg,#03050f 0%,#060c1a 50%,#03050f 100%)"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"38%",left:"-5%",width:"160px",height:"1px",background:`linear-gradient(90deg,transparent,${TEAL},transparent)`,opacity:0.15,animation:"beam-sweep 10s ease-in-out infinite"}}/>
        <div style={{position:"absolute",top:"65%",left:"-5%",width:"100px",height:"1px",background:`linear-gradient(90deg,transparent,${GOLD},transparent)`,opacity:0.12,animation:"beam-sweep 15s ease-in-out 5s infinite"}}/>
      </div>
      {/* Circle — slowest, background plane */}
      <div style={{position:"absolute",left:"7%",top:"12%",transform:`translate3d(0,${circleY}px,0)`,willChange:"transform",animation:"float-a 7s ease-in-out infinite"}}>
        <svg width="88" height="88" viewBox="0 0 88 88" style={{opacity:0.18}}><circle cx="44" cy="44" r="40" fill="none" stroke={TEAL} strokeWidth="0.8"/><circle cx="44" cy="44" r="26" fill="none" stroke={TEAL} strokeWidth="0.5" strokeDasharray="4 6"/><circle cx="44" cy="44" r="3" fill={TEAL} opacity="0.5"/></svg>
      </div>
      {/* Diamond — mid-ground */}
      <div style={{position:"absolute",right:"10%",top:"8%",transform:`translate3d(0,${diamondY}px,0)`,willChange:"transform",animation:"float-b 10s ease-in-out 1.5s infinite"}}>
        <svg width="58" height="58" viewBox="0 0 58 58" style={{opacity:0.14}}><polygon points="29,2 56,29 29,56 2,29" fill="none" stroke={GOLD} strokeWidth="0.8"/><circle cx="29" cy="29" r="4" fill={GOLD} opacity="0.4"/></svg>
      </div>
      {/* Cross — foreground, fastest */}
      <div style={{position:"absolute",left:"20%",bottom:"18%",transform:`translate3d(0,${crossY}px,0)`,willChange:"transform"}}>
        <div style={{animation:"spin-slow 22s linear infinite",opacity:0.1}}>
          <svg width="68" height="68" viewBox="0 0 68 68"><line x1="34" y1="0" x2="34" y2="68" stroke={PURPLE} strokeWidth="0.6"/><line x1="0" y1="34" x2="68" y2="34" stroke={PURPLE} strokeWidth="0.6"/><circle cx="34" cy="34" r="28" fill="none" stroke={PURPLE} strokeWidth="0.5"/></svg>
        </div>
      </div>
      {/* Hex — mid-background */}
      <div style={{position:"absolute",right:"22%",bottom:"12%",transform:`translate3d(0,${hexY}px,0)`,willChange:"transform"}}>
        <div style={{animation:"spin-rev 30s linear infinite",opacity:0.11}}>
          <svg width="76" height="76" viewBox="0 0 76 76"><polygon points="38,4 70,21 70,55 38,72 6,55 6,21" fill="none" stroke={TEAL} strokeWidth="0.7"/></svg>
        </div>
      </div>
      {Array.from({length:14},(_,i)=>(
        <div key={i} style={{position:"absolute",left:`${6+i*6.5}%`,bottom:"15%",width:"1.5px",height:"1.5px",borderRadius:"50%",background:[TEAL,PURPLE,GOLD][i%3],opacity:0.35,animation:`particle-up ${4+i*0.6}s ease-out ${-i*0.4}s infinite`}}/>
      ))}
      <div ref={inRef} style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"500px",padding:"60px 32px",textAlign:"center"}}>
        <div style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:"20px",transition:"all 0.8s ease",opacity:inView?0.7:0,transform:inView?"translateY(0)":"translateY(20px)"}}>— Built Different</div>
        <h2 style={{fontSize:"clamp(24px,3.5vw,44px)",fontWeight:300,letterSpacing:"-0.03em",color:"#F2F5F8",maxWidth:"560px",lineHeight:1.2,marginBottom:"16px",transition:"all 0.9s ease 0.1s",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(30px)"}}>Every tool moves<br/>with your progress</h2>
        <p style={{fontSize:"13px",color:"#444",maxWidth:"360px",lineHeight:1.7,fontWeight:300,transition:"all 1s ease 0.2s",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)"}}>Studenius adapts in real time — your Study DNA updates every session.</p>
      </div>
    </div>
  );
}

// ─── DEPTH PARALLAX ───────────────────────────────────────────────────────────
function DepthParallaxSection(){
  const ref=useRef<HTMLDivElement>(null);
  const [p,setP]=useState(0);
  const {ref:inRef,inView}=useInView(0.15);
  useEffect(()=>{
    const h=()=>{if(!ref.current)return;const rect=ref.current.getBoundingClientRect();setP(Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight+rect.height))));};
    window.addEventListener("scroll",h,{passive:true});h();return ()=>window.removeEventListener("scroll",h);
  },[]);
  return(
    <div ref={ref} style={{position:"relative",height:"480px",overflow:"hidden",background:"#03050f"}}>
      <div style={{position:"absolute",inset:0,transform:`translateY(${p*-28}px)`,transition:"transform 0.05s linear",pointerEvents:"none"}}>
        <div style={{position:"absolute",left:"8%",top:"15%",width:"280px",height:"280px",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(123,94,167,0.06) 0%,transparent 70%)"}}/>
      </div>
      <div style={{position:"absolute",inset:0,transform:`translateY(${p*-68}px)`,transition:"transform 0.05s linear",pointerEvents:"none"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.025}} preserveAspectRatio="none">
          {Array.from({length:10},(_,i)=><line key={i} x1={`${i*11}%`} y1="0" x2={`${i*11}%`} y2="100%" stroke={TEAL} strokeWidth="0.5"/>)}
          {Array.from({length:7},(_,i)=><line key={i} x1="0" y1={`${i*16}%`} x2="100%" y2={`${i*16}%`} stroke={TEAL} strokeWidth="0.5"/>)}
        </svg>
        {[{l:"14%",t:"28%",col:TEAL,an:"float-a"},{l:"58%",t:"22%",col:PURPLE,an:"float-c"},{l:"74%",t:"52%",col:TEAL,an:"float-a"}].map((d,i)=>(
          <div key={i} style={{position:"absolute",left:d.l,top:d.t,width:"4px",height:"4px",borderRadius:"50%",background:d.col,opacity:0.3,animation:`${d.an} ${7+i}s ease-in-out ${i*0.8}s infinite`}}/>
        ))}
      </div>
      <div style={{position:"absolute",inset:0,transform:`translateY(${p*-135}px)`,transition:"transform 0.05s linear",pointerEvents:"none"}}>
        <div style={{position:"absolute",right:"18%",top:"28%",opacity:0.09,animation:"spin-slow 26s linear infinite"}}>
          <svg width="56" height="56" viewBox="0 0 56 56"><polygon points="28,2 54,28 28,54 2,28" fill="none" stroke={GOLD} strokeWidth="0.6"/></svg>
        </div>
      </div>
      <div ref={inRef} style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px",textAlign:"center"}}>
        <div style={{...mono,fontSize:"10px",color:GOLD,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:"18px",transition:"all 0.8s ease",opacity:inView?0.75:0,transform:inView?"translateY(0)":"translateY(24px)"}}>— Your Learning Universe</div>
        <h2 style={{fontSize:"clamp(22px,3vw,40px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",maxWidth:"500px",lineHeight:1.25,transition:"all 0.9s ease 0.12s",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(32px)"}}>
          12 tools orbiting<br/>one goal: <span style={{color:TEAL}}>your mastery</span>
        </h2>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Landing(){
  const scrollY=useScrollY();
  const [navScrolled,setNavScrolled]=useState(false);
  useEffect(()=>{setNavScrolled(scrollY>20);},[scrollY]);

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",
      background:`linear-gradient(180deg,${VOID} 0%,#060D1F 100%)`,
      color:"#E0E8F0",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* H: Scroll progress */}
      <ScrollProgressLine/>

      {/* Nav */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",height:48,
        borderBottom:navScrolled?"0.5px solid rgba(0,196,180,0.18)":"0.5px solid #0d1220",
        background:navScrolled?"rgba(3,5,15,0.96)":"rgba(3,5,15,0.88)",
        backdropFilter:"blur(24px)",position:"sticky",top:0,zIndex:50,
        transition:"background 0.3s,border-color 0.3s",
        boxShadow:navScrolled?"0 1px 40px rgba(0,196,180,0.07)":"none"}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.22em",color:"#E0E8F0",...mono}}>STUDENIUS</span>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {[["Pricing","/pricing"],["Login","/login"]].map(([lbl,href])=>(
            <Link key={href} to={href}
              style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:"#444",textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
              onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>{lbl}</Link>
          ))}
          <Link to="/signup">
            <button style={{fontSize:11,fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"6px 16px",cursor:"pointer",letterSpacing:"0.06em",transition:"opacity 0.15s,box-shadow 0.2s"}}
              onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.8";e.currentTarget.style.boxShadow=`0 0 28px rgba(0,196,180,0.5)`;}}
              onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";}}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* ── HERO SECTION with scoped space background ── */}
      <div style={{position:"relative",overflow:"hidden",background:VOID,zIndex:2,isolation:"isolate"}}>
        {/* Space bg layers — contained inside this div, not fixed globally */}
        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
          <StarFieldContained/>
          <NebulaLayer/>
          <FloatingPlanets/>
          <BinaryRain/>
          <ParticleMotes/>
        </div>
        {/* D: Hero + mouse parallax */}
        <div style={{position:"relative",zIndex:2,overflow:"hidden"}}><HeroSection/></div>
        {/* Clean fade into video section — no bleed */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"120px",zIndex:3,pointerEvents:"none",
          background:`linear-gradient(to bottom, transparent, ${VOID})`}}/>
      </div>

      {/* ── CINEMATIC VIDEO SECTION ── */}
      <CinematicVideoSection/>

      {/* E: Animated counters */}
      <div style={hairline}/>
      <div style={{background:"rgba(6,8,18,0.92)",borderBottom:"0.5px solid #0d1220",position:"relative",zIndex:2}}>
        <div style={{maxWidth:"720px",margin:"0 auto",padding:"28px 32px",display:"flex",gap:"48px",flexWrap:"wrap"}}>
          <AnimatedCounter target={12}  suffix="+"  label="AI Study Tools"/>
          <AnimatedCounter target={50}  suffix="k+" label="Students"/>
          <AnimatedCounter target={2}   suffix="M+" label="Questions Generated"/>
          <AnimatedCounter target={94}  suffix="%"  label="Pass Rate"/>
        </div>
      </div>

      {/* A: Marquee #1 */}
      <MarqueeDivider/>

      {/* Main content */}
      <div style={{position:"relative",zIndex:2,background:"#05080f",overflow:"hidden"}}>

        {/* B: Sticky features */}
        <div style={{position:"relative"}}>
          <SectionParticles count={18} color={PURPLE}/>
          <ClipReveal>
            <div style={{maxWidth:"1100px",margin:"0 auto",padding:"60px 32px 0",position:"relative",zIndex:1}}>
              <div style={sectionLabel}><span>Tools</span><span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}}/></div>
            </div>
          </ClipReveal>
          <StickyFeatureShowcase/>
        </div>

        <div style={hairline}/>

        {/* A: Marquee #2 */}
        <MarqueeDivider/>

        {/* C: Word-by-word manifesto */}
        <WordReveal/>

        <div style={hairline}/>

        {/* F: Horizontal scroll */}
        <HorizontalScrollGallery/>

        <div style={hairline}/>

        {/* G: Clip-path testimonials */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"64px 32px",position:"relative"}}>
          <SectionParticles count={18} color={GOLD}/>
          <ClipReveal>
            <div style={sectionLabel}><span>Testimonials</span><span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}}/></div>
          </ClipReveal>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#0d1220"}}>
            {testimonials.map((t,i)=>(
              <ClipReveal key={t.name} delay={i*0.1}>
                <div style={{background:"#080d1a",padding:"20px 24px",transition:"background 0.2s"}}
                  onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.background="#0d1525")}
                  onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.background="#080d1a")}>
                  <div style={{...mono,fontSize:"10px",color:"#444",letterSpacing:"0.06em",marginBottom:"10px"}}>{t.name} — {t.role}</div>
                  <p style={{fontSize:"13px",color:"#555",lineHeight:1.65,fontWeight:300}}>"{t.text}"</p>
                </div>
              </ClipReveal>
            ))}
          </div>
        </div>

        <div style={hairline}/>

        {/* CTA */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"80px 32px",position:"relative"}}>
          <SectionParticles count={30} color={TEAL}/>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 60% 40% at 50% 50%,rgba(0,196,180,0.05) 0%,transparent 70%)"}}/>
          <ClipReveal><h2 style={{fontSize:"clamp(22px,3vw,36px)",fontWeight:300,letterSpacing:"-0.02em",marginBottom:"8px"}}>Ready to study smarter?</h2></ClipReveal>
          <ClipReveal delay={0.08}><p style={{fontSize:"14px",color:"#555",marginBottom:"28px",fontWeight:300}}>Start free. No credit card required.</p></ClipReveal>
          <ClipReveal delay={0.16}>
            <Link to="/signup">
              <button style={{fontSize:"12px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"11px 26px",cursor:"pointer",letterSpacing:"0.03em",transition:"opacity 0.15s,box-shadow 0.2s,transform 0.2s"}}
                onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";e.currentTarget.style.boxShadow=`0 0 48px rgba(0,196,180,0.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                Get started free →
              </button>
            </Link>
          </ClipReveal>
        </div>

        <footer style={{borderTop:"0.5px solid #0d1220"}}>
          <div style={{maxWidth:"720px",margin:"0 auto",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{...mono,fontSize:"10px",color:"#1e2838",letterSpacing:"0.06em"}}>STUDENIUS © {new Date().getFullYear()}</span>
            <div style={{display:"flex",gap:"20px"}}>
              {[["Pricing","/pricing"],["Login","/login"],["Sign Up","/signup"]].map(([lbl,href])=>(
                <Link key={href} to={href}
                  style={{fontSize:"11px",color:"#444",textDecoration:"none",transition:"color 0.15s"}}
                  onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.color="#666")}
                  onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.color="#444")}>{lbl}</Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
