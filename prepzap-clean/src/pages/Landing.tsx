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

import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { Link } from "react-router-dom";

// ─── Brand ────────────────────────────────────────────────────────────────────
const TEAL   = "#8b1a2a";
const GOLD   = "#f0a040";
const PURPLE = "#7B5EA7";
const VOID   = "#160810";
const mono: React.CSSProperties = { fontFamily:"'Geist Mono','Courier New',monospace" };

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:smooth;}
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
    background:linear-gradient(90deg,#8b1a2a,#7B5EA7,#f0a040);
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
  .mq-wrap::before{left:0;background:linear-gradient(90deg,#160810,transparent);}
  .mq-wrap::after{right:0;background:linear-gradient(-90deg,#160810,transparent);}

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

  /* Custom cursor */
  *{cursor:none!important;}
  #cursor-dot{position:fixed;width:6px;height:6px;background:#8b1a2a;border-radius:50%;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:opacity 0.2s;}
  #cursor-ring{position:fixed;width:32px;height:32px;border:1px solid rgba(0,196,180,0.4);border-radius:50%;pointer-events:none;z-index:99998;transform:translate(-50%,-50%);transition:width 0.2s,height 0.2s,border-color 0.2s;}
  #cursor-ring.hovered{width:48px;height:48px;border-color:rgba(0,196,180,0.7);}

  /* Mobile nav */
  @keyframes menu-slide{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
  .mobile-menu{animation:menu-slide 0.25s ease both;}

  /* Mobile responsive */
  @media(max-width:768px){
    .sticky-left{position:relative;top:auto;}
    .hide-mobile{display:none!important;}
    .mobile-stack{flex-direction:column!important;}
    .mobile-full{flex:1 1 100%!important;width:100%!important;}
    .mobile-pad{padding:40px 20px!important;}
    .mobile-grid-1{grid-template-columns:1fr!important;}
  }

  /* Scroll indicator */
  @keyframes scroll-bounce{
    0%,100%{transform:translateY(0);opacity:0.45;}
    50%{transform:translateY(9px);opacity:1;}
  }

  /* Grain / film noise overlay */
  @keyframes grain{
    0%,100%{transform:translate(0,0);}
    10%{transform:translate(-2%,-3%);}
    20%{transform:translate(3%,2%);}
    30%{transform:translate(-1%,4%);}
    40%{transform:translate(4%,-1%);}
    50%{transform:translate(-3%,3%);}
    60%{transform:translate(2%,-4%);}
    70%{transform:translate(-4%,1%);}
    80%{transform:translate(3%,-2%);}
    90%{transform:translate(-2%,4%);}
  }
  #grain-overlay{
    position:fixed;inset:-50%;width:200%;height:200%;
    background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-size:200px 200px;
    opacity:0.022;pointer-events:none;z-index:99997;
    animation:grain 0.8s steps(1) infinite;
  }

  /* Magnetic button feel enhancement */
  .mag-btn{transition:transform 0.18s cubic-bezier(0.23,1,0.32,1),box-shadow 0.18s ease !important;}

  @keyframes page-enter{from{opacity:0;}to{opacity:1;}}
  .page-ready{animation:page-enter 0.5s ease both;}

  /* Rocket scene */
  @keyframes rocket-exhaust{0%,100%{opacity:0.6;transform:scaleY(1);}50%{opacity:1;transform:scaleY(1.15);}}
  @keyframes rocket-rise{0%{transform:translateY(0);}100%{transform:translateY(-12px);}}

  /* Mobile hamburger — default hidden, shown on small screens */
  .show-mobile{display:none!important;}
  @media(max-width:768px){
    .hide-mobile{display:none!important;}
    .show-mobile{display:flex!important;align-items:center;}
  }

  /* Twinkling stars */
  @keyframes twinkle{0%,100%{opacity:0.2;transform:scale(1);}50%{opacity:1;transform:scale(1.4);}}
  .star{position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;animation:twinkle var(--dur,3s) ease-in-out infinite;animation-delay:var(--delay,0s);}

  /* Smooth anchor scroll */

  /* Selection color */
  ::selection{background:rgba(0,196,180,0.25);color:#F2F5F8;}

  /* Glow pulse on teal elements */
  @keyframes glow-pulse{0%,100%{box-shadow:0 0 12px rgba(0,196,180,0.2);}50%{box-shadow:0 0 28px rgba(0,196,180,0.5);}}

  /* Shimmer effect */
  @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
  .shimmer{background:linear-gradient(90deg,transparent 0%,rgba(0,196,180,0.08) 50%,transparent 100%);background-size:200% 100%;animation:shimmer 2.5s ease infinite;}

  /* GSAP reveal base */
  [data-reveal]{opacity:0;transform:translateY(52px);filter:blur(5px);}

  /* Oryzo-style char split */
  @keyframes char-in{from{opacity:0;transform:translateY(1.2em) rotate(3deg);}to{opacity:1;transform:translateY(0) rotate(0deg);}}
  .char{display:inline-block;animation:char-in 0.65s cubic-bezier(0.16,1,0.3,1) both;overflow:hidden;}

  /* Horizontal line reveal */
  @keyframes line-x{from{transform:scaleX(0);}to{transform:scaleX(1);}}
  .line-reveal{transform-origin:left center;animation:line-x 1.4s cubic-bezier(0.16,1,0.3,1) both;}

  /* Section separator glow */
  .section-sep{height:0.5px;background:linear-gradient(90deg,transparent,rgba(0,196,180,0.15),rgba(123,94,167,0.1),transparent);}

  /* Magnetic link hover */
  .nav-link{position:relative;}
  .nav-link::after{content:"";position:absolute;bottom:-2px;left:0;width:0;height:0.5px;background:#8b1a2a;transition:width 0.3s cubic-bezier(0.16,1,0.3,1);}
  .nav-link:hover::after{width:100%;}
\``;


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
  {name:"Maria S.",  role:"Nursing Student",      text:"Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try.",   stars:5, initials:"MS", color:TEAL},
  {name:"James W.",  role:"Medical Student",       text:"Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly.",      stars:5, initials:"JW", color:PURPLE},
  {name:"Sarah C.",  role:"High School Teacher",   text:"Feynman Mode exposed every gap in my knowledge. Not just for exams — for truly understanding.",       stars:5, initials:"SC", color:GOLD},
  {name:"Ahmed R.",  role:"Engineering Student",   text:"High Yield Detector told me exactly what to study before finals. Went from a C to an A.",             stars:5, initials:"AR", color:"#4A9EFF"},
  {name:"Priya K.",  role:"Law Student",           text:"The Roadmap Generator broke down contract law into phases I could actually follow. Game changer.",      stars:5, initials:"PK", color:TEAL},
  {name:"Daniel M.", role:"Language Learner",      text:"Spaced repetition flashcards in three languages at once. My vocabulary doubled in two months.",         stars:5, initials:"DM", color:PURPLE},
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

// ─── TOAST CONTEXT ───────────────────────────────────────────────────────────
const ToastCtx = createContext<(msg:string, color?:string)=>void>(()=>{});
function useToast(){ return useContext(ToastCtx); }

// ─── LENIS + GSAP LOADER ─────────────────────────────────────────────────────
let _gsapReady   = false;
let _gsapLoading = false;
const _gsapQueue: Array<()=>void> = [];

function loadGSAP(cb: ()=>void){
  if(_gsapReady){ cb(); return; }
  _gsapQueue.push(cb);
  if(_gsapLoading) return;
  _gsapLoading = true;
  const loadScript = (src: string) => new Promise<void>(res=>{
    const s = document.createElement("script");
    s.src = src; s.onload = ()=>res(); document.head.appendChild(s);
  });
  Promise.all([
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"),
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"),
  ]).then(()=>{
    const G = (window as any).gsap;
    G.registerPlugin((window as any).ScrollTrigger);
    _gsapReady = true; _gsapLoading = false;
    _gsapQueue.forEach(f=>f()); _gsapQueue.length = 0;
  });
}

function useSmoothScroll(){ /* native scroll — Lenis removed */ }

function useGSAPReveal(
  containerRef: React.RefObject<HTMLElement>,
  selector: string,
  vars: Record<string,any> = {},
  trigger?: Record<string,any>
){
  useEffect(()=>{
    loadGSAP(()=>{
      const G = (window as any).gsap;
      const ST = (window as any).ScrollTrigger;
      if(!G || !ST || !containerRef.current) return;
      const els = containerRef.current.querySelectorAll(selector);
      if(!els.length) return;
      const ctx = G.context(()=>{
        G.fromTo(els,
          { opacity:0, y:48, filter:"blur(6px)", ...(vars.from||{}) },
          {
            opacity:1, y:0, filter:"blur(0px)", ...(vars.to||{}),
            duration: vars.duration ?? 1.1,
            ease: vars.ease ?? "power3.out",
            stagger: vars.stagger ?? 0.08,
            scrollTrigger: {
              trigger: containerRef.current,
              start: trigger?.start ?? "top 82%",
              toggleActions: "play none none none",
              ...trigger,
            }
          }
        );
      }, containerRef.current);
      return ()=>ctx.revert();
    });
  },[]);
}

// ─── THREE.JS SCENE LOADER ────────────────────────────────────────────────────
// Loads Three.js once (deduped), then calls setup only when canvas is in viewport.
// RAF loops are automatically paused when scrolled off-screen.
let _threeLoading = false;
let _threeReady   = false;
const _threeQueue: Array<()=>void> = [];

function loadThree(cb: ()=>void){
  if(_threeReady){ cb(); return; }
  _threeQueue.push(cb);
  if(_threeLoading) return;
  _threeLoading = true;
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
  s.onload = ()=>{ _threeReady=true; _threeLoading=false; _threeQueue.forEach(f=>f()); _threeQueue.length=0; };
  document.head.appendChild(s);
}

function useThree(canvasRef: React.RefObject<HTMLCanvasElement>, setup: (THREE: any, canvas: HTMLCanvasElement) => ()=>void){
  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    let cleanup: (()=>void)|undefined;
    let started = false;

    const start = ()=>{
      if(started) return;
      started = true;
      loadThree(()=>{ cleanup = setup((window as any).THREE, canvas); });
    };

    // IntersectionObserver: start RAF only when visible, cleanup when not
    const obs = new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting) start();
    }, { threshold: 0.05 });
    obs.observe(canvas);

    return ()=>{ obs.disconnect(); cleanup?.(); };
  },[]);
}


function useGSAPAnimations(){
  useEffect(()=>{
    loadGSAP(()=>{
      const G = (window as any).gsap;
      const ST = (window as any).ScrollTrigger;

      // Hero h1
      G.from("[data-gsap='hero-h1']",{
        opacity:0, y:60, skewY:3, duration:1.2, ease:"expo.out", delay:0.3,
      });

      // Generic section entrances
      document.querySelectorAll("[data-gsap='section-enter']").forEach((el)=>{
        G.from(el,{
          scrollTrigger:{trigger:el, start:"top 88%", toggleActions:"play none none none"},
          opacity:0, y:56, duration:1.1, ease:"expo.out",
        });
      });

      // Stagger children
      document.querySelectorAll("[data-gsap='stagger-children']").forEach((el)=>{
        G.from((el as HTMLElement).children,{
          scrollTrigger:{trigger:el, start:"top 85%", toggleActions:"play none none none"},
          opacity:0, y:40, stagger:0.09, duration:0.9, ease:"expo.out",
        });
      });

      // Parallax slow
      document.querySelectorAll("[data-gsap='parallax-slow']").forEach((el)=>{
        G.to(el,{
          scrollTrigger:{trigger:el, start:"top bottom", end:"bottom top", scrub:1.5},
          y:-80, ease:"none",
        });
      });

      // Parallax fast
      document.querySelectorAll("[data-gsap='parallax-fast']").forEach((el)=>{
        G.to(el,{
          scrollTrigger:{trigger:el, start:"top bottom", end:"bottom top", scrub:2},
          y:-140, ease:"none",
        });
      });

      // Line grow
      document.querySelectorAll("[data-gsap='line-grow']").forEach((el)=>{
        G.from(el,{
          scrollTrigger:{trigger:el, start:"top 90%", toggleActions:"play none none none"},
          scaleX:0, transformOrigin:"left center", duration:1.4, ease:"expo.out",
        });
      });

      // Stat strip
      G.from("[data-gsap='stat-strip']",{
        scrollTrigger:{trigger:"[data-gsap='stat-strip']", start:"top 80%", toggleActions:"play none none none"},
        opacity:0, scale:0.96, y:30, duration:1, ease:"expo.out",
      });

      // Manifesto
      const manifesto = document.querySelector("[data-gsap='manifesto']");
      if(manifesto){
        G.from(manifesto,{
          scrollTrigger:{trigger:manifesto, start:"top 70%", toggleActions:"play none none none"},
          opacity:0, y:40, duration:1.2, ease:"expo.out",
        });
      }

      // Feature rows
      document.querySelectorAll("[data-gsap='feature-row']").forEach((el,i)=>{
        G.from(el,{
          scrollTrigger:{trigger:el, start:"top 88%", toggleActions:"play none none none"},
          opacity:0, x:-30, duration:0.8, delay:i*0.04, ease:"expo.out",
        });
      });

      // Testimonial cards
      G.from("[data-gsap='testimonial-card']",{
        scrollTrigger:{trigger:"[data-gsap='testimonial-card']", start:"top 85%", toggleActions:"play none none none"},
        opacity:0, scale:0.94, y:30, stagger:0.1, duration:0.9, ease:"expo.out",
      });

      // 3D scenes
      G.from("[data-gsap='three-scene']",{
        scrollTrigger:{trigger:"[data-gsap='three-scene']", start:"top 75%", toggleActions:"play none none none"},
        opacity:0, scale:0.92, duration:1.4, ease:"expo.out",
      });

      // Pricing cards
      G.from("[data-gsap='pricing-card']",{
        scrollTrigger:{trigger:"[data-gsap='pricing-card']", start:"top 85%", toggleActions:"play none none none"},
        opacity:0, y:50, stagger:0.12, duration:1, ease:"expo.out",
      });

      // FAQ items
      G.from("[data-gsap='faq-item']",{
        scrollTrigger:{trigger:"[data-gsap='faq-item']", start:"top 85%", toggleActions:"play none none none"},
        opacity:0, x:-20, stagger:0.07, duration:0.7, ease:"expo.out",
      });

      // Footer
      G.from("footer",{
        scrollTrigger:{trigger:"footer", start:"top 90%", toggleActions:"play none none none"},
        opacity:0, y:30, duration:1, ease:"expo.out",
      });

      ST.refresh();
    });
    return ()=>{ loadGSAP(()=>{ (window as any).ScrollTrigger?.getAll().forEach((t:any)=>t.kill()); }); };
  },[]);
}

// ─── SCENE 1: GALAXY EXPLOSION ────────────────────────────────────────────────
function Scene1Galaxy({ progress }: { progress: number }){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<any>({});

  useThree(canvasRef, (THREE, canvas)=>{
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, W/H, 0.1, 1000);
    camera.position.z = 5;

    // Galaxy particles
    const N = 6000;
    const positions = new Float32Array(N*3);
    const colors    = new Float32Array(N*3);
    const arms = 3;
    const palette = [[0,0.77,0.71],[0.48,0.37,0.65],[0.91,0.73,0.14]];
    for(let i=0;i<N;i++){
      const arm    = i % arms;
      const t      = (i/N)*Math.PI*8 + (arm/arms)*Math.PI*2;
      const r      = 0.4 + (i/N)*3.5 + Math.random()*0.4;
      const spread = 0.15 + (i/N)*0.35;
      positions[i*3]   = Math.cos(t)*r + (Math.random()-0.5)*spread;
      positions[i*3+1] = (Math.random()-0.5)*spread*0.6;
      positions[i*3+2] = Math.sin(t)*r + (Math.random()-0.5)*spread;
      const [cr,cg,cb] = palette[arm];
      const bright = 0.55+Math.random()*0.45;
      colors[i*3]   = cr*bright; colors[i*3+1] = cg*bright; colors[i*3+2] = cb*bright;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions,3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors,3));
    const mat = new THREE.PointsMaterial({size:0.022, vertexColors:true, transparent:true, opacity:0.88});
    const galaxy = new THREE.Points(geo,mat);
    scene.add(galaxy);

    // Central glow orb
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18,32,32),
      new THREE.MeshBasicMaterial({color:0x8b1a2a, transparent:true, opacity:0.8})
    );
    scene.add(orb);

    const mouse = {x:0,y:0};
    const onMouse = (e:MouseEvent)=>{
      mouse.x = (e.clientX/window.innerWidth - 0.5)*2;
      mouse.y = -(e.clientY/window.innerHeight - 0.5)*2;
    };
    window.addEventListener("mousemove", onMouse);

    let raf:number, t=0;
    const tick = ()=>{
      raf = requestAnimationFrame(tick);
      t += 0.004;
      const p = stateRef.current.progress ?? 0;
      galaxy.rotation.y = t + mouse.x*0.3;
      galaxy.rotation.x = mouse.y*0.15 + p*0.4;
      // Warp speed: compress z on scroll
      const scaleZ = 1 + p*6;
      galaxy.scale.set(1+p*0.3, 1+p*0.3, scaleZ);
      mat.opacity = Math.max(0, 0.88 - p*1.5);
      orb.material.opacity = Math.max(0, 0.8 - p*2);
      camera.position.z = 5 - p*4.5;
      renderer.render(scene,camera);
    };
    tick();

    const onResize = ()=>{
      const w=canvas.clientWidth,h=canvas.clientHeight;
      camera.aspect=w/h; camera.updateProjectionMatrix();
      renderer.setSize(w,h,false);
    };
    window.addEventListener("resize",onResize);

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      renderer.dispose();
    };
  });

  stateRef.current.progress = progress;

  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 2: NEURAL NETWORK ──────────────────────────────────────────────────
function Scene2Neural({ progress }: { progress: number }){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<any>({});

  useThree(canvasRef, (THREE, canvas)=>{
    const W=canvas.clientWidth, H=canvas.clientHeight;
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65,W/H,0.1,500);
    camera.position.z = 8;

    const tools = ["BrainBot","Flashcards","Cram Mode","Recall","Feynman","High Yield","Roadmap","Study DNA","Focus Timer","Mistakes","Source Lib","Confidence"];
    const nodeColors = [0x8b1a2a,0x7B5EA7,0xf0a040,0x4A9EFF,0xFF6B6B,0xA78BFA,0x8b1a2a,0x7B5EA7,0xf0a040,0x4A9EFF,0xFF6B6B,0xA78BFA];

    const nodes: any[] = [];
    const group = new THREE.Group();
    scene.add(group);

    // Icosphere-ish layout
    const phi = Math.PI*(3-Math.sqrt(5));
    tools.forEach((_, i)=>{
      const y   = 1 - (i/(tools.length-1))*2;
      const r   = Math.sqrt(1-y*y)*3.5;
      const theta = phi*i;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18,16,16),
        new THREE.MeshStandardMaterial({color:nodeColors[i], emissive:nodeColors[i], emissiveIntensity:0.35, roughness:0.3, metalness:0.6})
      );
      mesh.position.set(Math.cos(theta)*r, y*2.2, Math.sin(theta)*r);
      mesh.userData = {baseY: y*2.2, phase: i*0.52};
      group.add(mesh);
      nodes.push(mesh);
    });

    // Connections
    const lineMat = new THREE.LineBasicMaterial({color:0x8b1a2a, transparent:true, opacity:0.08});
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        if(Math.random()>0.45) continue;
        const geo = new THREE.BufferGeometry().setFromPoints([nodes[i].position, nodes[j].position]);
        group.add(new THREE.Line(geo,lineMat));
      }
    }

    // Pulse rings
    const rings: any[] = [];
    nodes.forEach((n,i)=>{
      if(i%3!==0) return;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.32,0.012,8,32),
        new THREE.MeshBasicMaterial({color:nodeColors[i],transparent:true,opacity:0})
      );
      ring.position.copy(n.position);
      ring.userData = {phase: i*0.8};
      group.add(ring);
      rings.push(ring);
    });

    scene.add(new THREE.AmbientLight(0xffffff,0.5));
    const pt = new THREE.PointLight(0x8b1a2a,2,20); pt.position.set(3,3,3); scene.add(pt);
    const pt2 = new THREE.PointLight(0x7B5EA7,1.5,20); pt2.position.set(-3,-2,2); scene.add(pt2);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{ mouse.x=(e.clientX/window.innerWidth-0.5)*2; mouse.y=-(e.clientY/window.innerHeight-0.5)*2; };
    window.addEventListener("mousemove",onMouse);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick); t+=0.008;
      const p = stateRef.current.progress ?? 0;
      group.rotation.y = t*0.25 + mouse.x*0.4;
      group.rotation.x = mouse.y*0.2;
      nodes.forEach(n=>{ n.position.y = n.userData.baseY + Math.sin(t+n.userData.phase)*0.15; });
      rings.forEach(r=>{
        const s = (Math.sin(t*1.2+r.userData.phase)+1)/2;
        r.scale.setScalar(1+s*0.8);
        r.material.opacity = (1-s)*0.4;
      });
      lineMat.opacity = 0.06 + Math.sin(t*0.5)*0.04;
      // Transition out
      group.scale.setScalar(Math.max(0.01, 1 - Math.max(0,(p-0.85)*6)));
      renderer.render(scene,camera);
    };
    tick();

    const onResize=()=>{ const w=canvas.clientWidth,h=canvas.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); };
    window.addEventListener("resize",onResize);

    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("mousemove",onMouse); window.removeEventListener("resize",onResize); renderer.dispose(); };
  });

  stateRef.current.progress = progress;
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 3: CRYSTAL FLASHCARD ───────────────────────────────────────────────
function Scene3Flashcard({ progress }: { progress: number }){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<any>({});

  useThree(canvasRef, (THREE, canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55,W/H,0.1,200);
    camera.position.set(0,0,7);

    const group = new THREE.Group();
    scene.add(group);

    // Main card — box geometry
    const cardGeo = new THREE.BoxGeometry(4.2,2.6,0.08);
    const cardMat = new THREE.MeshStandardMaterial({color:0x080d1a, roughness:0.1, metalness:0.9, envMapIntensity:1});
    const card = new THREE.Mesh(cardGeo, cardMat);
    group.add(card);

    // Card edge glow
    const edgeGeo = new THREE.EdgesGeometry(cardGeo);
    const edgeMat = new THREE.LineBasicMaterial({color:0x8b1a2a,linewidth:1});
    group.add(new THREE.LineSegments(edgeGeo,edgeMat));

    // Orbiting mini-cards
    const miniCards: any[] = [];
    [[0x7B5EA7,2.8,0],[0xf0a040,2.8,2.09],[0x4A9EFF,2.8,4.19]].forEach(([col,r,ang],i)=>{
      const mini = new THREE.Mesh(
        new THREE.BoxGeometry(1.2,0.75,0.06),
        new THREE.MeshStandardMaterial({color:col,roughness:0.2,metalness:0.8})
      );
      mini.userData = {r, ang, phase:i*1.05};
      group.add(mini);
      const edge2 = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2,0.75,0.06)),
        new THREE.LineBasicMaterial({color:col})
      );
      mini.add(edge2);
      miniCards.push(mini);
    });

    // Particle trail
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(300*3);
    for(let i=0;i<300;i++){
      trailPos[i*3]   = (Math.random()-0.5)*12;
      trailPos[i*3+1] = (Math.random()-0.5)*8;
      trailPos[i*3+2] = (Math.random()-0.5)*4 - 2;
    }
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos,3));
    scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({color:0x8b1a2a,size:0.03,transparent:true,opacity:0.5})));

    scene.add(new THREE.AmbientLight(0xffffff,0.4));
    const pl1 = new THREE.PointLight(0x8b1a2a,3,20); pl1.position.set(4,3,3); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x7B5EA7,2,20); pl2.position.set(-4,-2,2); scene.add(pl2);
    const pl3 = new THREE.PointLight(0xf0a040,1.5,15); pl3.position.set(0,4,-2); scene.add(pl3);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{ mouse.x=(e.clientX/window.innerWidth-0.5)*2; mouse.y=-(e.clientY/window.innerHeight-0.5)*2; };
    window.addEventListener("mousemove",onMouse);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick); t+=0.01;
      const p = stateRef.current.progress ?? 0;
      group.rotation.y = mouse.x*0.35 + Math.sin(t*0.3)*0.1;
      group.rotation.x = mouse.y*0.2 + Math.sin(t*0.2)*0.05;
      // Card flip on scroll
      card.rotation.y = p*Math.PI*1.5;
      cardMat.color.setHex(p>0.5 ? 0x0a1a2e : 0x080d1a);
      edgeMat.color.setHex(p>0.5 ? 0xf0a040 : 0x8b1a2a);
      // Orbit mini-cards
      miniCards.forEach(m=>{
        const a = m.userData.ang + t*0.4;
        const r = m.userData.r;
        m.position.set(Math.cos(a)*r, Math.sin(a*0.7)*0.8, Math.sin(a)*r*0.5);
        m.rotation.y = a + Math.PI/4;
        m.rotation.x = Math.sin(t+m.userData.phase)*0.3;
      });
      pl1.position.x = Math.sin(t*0.7)*5;
      pl2.position.y = Math.cos(t*0.5)*4;
      renderer.render(scene,camera);
    };
    tick();

    const onResize=()=>{ const w=canvas.clientWidth,h=canvas.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); };
    window.addEventListener("resize",onResize);

    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("mousemove",onMouse); window.removeEventListener("resize",onResize); renderer.dispose(); };
  });

  stateRef.current.progress = progress;
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── 3D JOURNEY SECTION (replaces CinematicVideoSection) ─────────────────────
function ThreeDJourneySection(){
  const outerRef = useRef<HTMLDivElement>(null);
  const pRef     = useRef(0);
  const [p, setP]= useState(0);

  useEffect(()=>{
    const onScroll=()=>{
      const el=outerRef.current; if(!el) return;
      const rect=el.getBoundingClientRect();
      const scrollable=el.offsetHeight-window.innerHeight;
      const scrolled=Math.max(0,-rect.top);
      const progress=scrollable>0?Math.min(1,scrolled/scrollable):0;
      pRef.current=progress;
      setP(progress);
    };
    window.addEventListener("scroll",onScroll,{passive:true});
    onScroll();
    return ()=>window.removeEventListener("scroll",onScroll);
  },[]);

  // Scene selection and within-scene progress
  const scene     = p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
  const sceneP    = p < 0.33 ? p/0.33 : p < 0.66 ? (p-0.33)/0.33 : (p-0.66)/0.34;

  const scenes = [
    { label:"01 — The Universe",  title:"Enter a universe\nbuilt for learning",    sub:"A galaxy of 12 AI tools orbiting one mission — your breakthrough.", color:TEAL },
    { label:"02 — The Network",   title:"Intelligence that\nadapts to you",         sub:"BrainBot learns your gaps. Neural pathways form. You level up.", color:PURPLE },
    { label:"03 — The Method",    title:"Study smarter.\nNot longer.",              sub:"Flip between modes — Recall, Cram, Feynman, High Yield — in one flow.", color:GOLD },
  ];

  const cur = scenes[scene];

  const textEnter = Math.min(1, sceneP*3);
  const textExit  = Math.max(0, 1 - Math.max(0,(sceneP-0.75)*4));
  const textOp    = textEnter * textExit;

  return(
    <div ref={outerRef} style={{height:"380vh", position:"relative", background:VOID}}>
      <div style={{position:"sticky",top:0,height:"100vh",overflow:"hidden",background:VOID}}>

        {/* Scene canvases — layered, opacity transitions between them */}
        <div style={{position:"absolute",inset:0,opacity:scene===0?1:0,transition:"opacity 0.9s ease"}}>
          <Scene1Galaxy progress={sceneP}/>
        </div>
        <div style={{position:"absolute",inset:0,opacity:scene===1?1:0,transition:"opacity 0.9s ease"}}>
          <Scene2Neural progress={sceneP}/>
        </div>
        <div style={{position:"absolute",inset:0,opacity:scene===2?1:0,transition:"opacity 0.9s ease"}}>
          <Scene3Flashcard progress={sceneP}/>
        </div>

        {/* Warp speed lines (scene 1 transition) */}
        {scene===0 && sceneP>0.7 && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",opacity:(sceneP-0.7)/0.3}}>
            {Array.from({length:24},(_,i)=>{
              const ang = (i/24)*Math.PI*2;
              const len = 30+Math.random()*40;
              return(
                <div key={i} style={{
                  position:"absolute",left:"50%",top:"50%",
                  width:"1px",height:`${len}%`,
                  background:`linear-gradient(${i%3===0?TEAL:i%3===1?PURPLE:GOLD},transparent)`,
                  transformOrigin:"top center",
                  transform:`rotate(${ang}rad) translateX(-50%)`,
                  opacity:0.25+Math.random()*0.3,
                }}/>
              );
            })}
          </div>
        )}

        {/* HUD overlay — scene label */}
        <div style={{position:"absolute",top:"32px",left:"40px",zIndex:10,pointerEvents:"none"}}>
          <div style={{...mono,fontSize:"9px",color:"rgba(255,255,255,0.2)",letterSpacing:"0.22em",textTransform:"uppercase"}}>{cur.label}</div>
        </div>

        {/* Scene dots */}
        <div style={{position:"absolute",right:"32px",top:"50%",transform:"translateY(-50%)",zIndex:10,display:"flex",flexDirection:"column",gap:"10px"}}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:"4px",height:i===scene?"22px":"4px",borderRadius:"2px",
              background:i===scene?scenes[i].color:"rgba(255,255,255,0.12)",
              transition:"height 0.4s ease,background 0.4s ease",
            }}/>
          ))}
        </div>

        {/* Text overlay */}
        <div style={{
          position:"absolute",bottom:"14%",left:"50%",transform:"translateX(-50%)",
          textAlign:"center",zIndex:10,pointerEvents:"none",width:"min(640px,90vw)",
          opacity:textOp,
          transition:"opacity 0.15s",
        }}>
          <h2 style={{fontSize:"clamp(24px,4vw,52px)",fontWeight:300,letterSpacing:"-0.03em",
            lineHeight:1.12,color:"#F2F5F8",marginBottom:"16px",whiteSpace:"pre-line",
            textShadow:"0 0 60px rgba(0,0,0,0.9)"}}>
            {cur.title}
          </h2>
          <p style={{fontSize:"14px",color:"rgba(255,255,255,0.4)",maxWidth:"400px",
            margin:"0 auto",lineHeight:1.75,fontWeight:300}}>
            {cur.sub}
          </p>
          <div style={{width:"40px",height:"1px",background:cur.color,margin:"20px auto 0",opacity:0.6}}/>
        </div>

        {/* Scroll hint */}
        <div style={{position:"absolute",bottom:"32px",left:"50%",transform:"translateX(-50%)",
          zIndex:10,textAlign:"center",opacity:p<0.05?1:0,transition:"opacity 0.5s",pointerEvents:"none"}}>
          <div style={{...mono,fontSize:"9px",color:"rgba(255,255,255,0.3)",letterSpacing:"0.2em",marginBottom:"8px"}}>SCROLL TO EXPLORE</div>
          <div style={{width:"1px",height:"28px",background:`linear-gradient(${TEAL},transparent)`,margin:"0 auto",animation:"binary-fall 1.8s ease-in-out infinite"}}/>
        </div>

        {/* Progress bar */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"1.5px",zIndex:10}}>
          <div style={{height:"100%",background:`linear-gradient(90deg,${TEAL},${PURPLE},${GOLD})`,
            width:`${p*100}%`,transition:"width 0.05s linear"}}/>
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
    <div style={{position:"relative",zIndex:3,background:"#160810",borderTop:"0.5px solid #0d1220",borderBottom:"0.5px solid #0d1220"}}>
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
  const isDecimal=target%1!==0;
  useEffect(()=>{
    if(!inView||started.current)return;
    started.current=true;
    const dur=1800;const start=performance.now();
    const tick=(now:number)=>{
      const t=Math.min((now-start)/dur,1);
      const ease=1-Math.pow(1-t,4);
      const val=ease*target;
      setCount(isDecimal?Math.round(val*10)/10:Math.round(val));
      if(t<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },[inView,target]);
  return(
    <div ref={ref} style={{padding:"28px 8px",textAlign:"center",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(24px)",transition:"all 0.7s ease"}}>
      <div style={{...mono,fontSize:"clamp(22px,2.8vw,32px)",fontWeight:300,color:"#F2F5F8",letterSpacing:"-0.03em",
        textShadow:`0 0 24px rgba(0,196,180,0.4)`}}>
        {isDecimal?count.toFixed(1):count}{suffix}
      </div>
      <div style={{...mono,fontSize:"9px",color:"#2a3448",textTransform:"uppercase",letterSpacing:"0.14em",marginTop:6}}>{label}</div>
    </div>
  );
}

// ─── G: Clip-path reveal wrapper ─────────────────────────────────────────────
function ClipReveal({children,delay=0}:{children:React.ReactNode;delay?:number}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    loadGSAP(()=>{
      const G=(window as any).gsap;
      const ST=(window as any).ScrollTrigger;
      if(!G||!ST||!ref.current)return;
      const ctx=G.context(()=>{
        G.fromTo(ref.current,
          {clipPath:"inset(0 100% 0 0)",opacity:0},
          {clipPath:"inset(0 0% 0 0)",opacity:1,duration:1.2,ease:"power4.out",delay,
           scrollTrigger:{trigger:ref.current,start:"top 88%",toggleActions:"play none none none"}}
        );
      },ref.current);
      return()=>ctx.revert();
    });
  },[delay]);
  return <div ref={ref} style={{clipPath:"inset(0 100% 0 0)",opacity:0}}>{children}</div>;
}

// SplitText: animates each character in on scroll — Oryzo signature move
function SplitTextReveal({text,style,delay=0,tag="span"}:{text:string;style?:React.CSSProperties;delay?:number;tag?:string}){
  const ref=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    loadGSAP(()=>{
      const G=(window as any).gsap;
      const ST=(window as any).ScrollTrigger;
      if(!G||!ST||!ref.current)return;
      const chars=ref.current.querySelectorAll(".char");
      const ctx=G.context(()=>{
        G.fromTo(chars,
          {opacity:0,yPercent:110,rotation:3},
          {opacity:1,yPercent:0,rotation:0,
           duration:0.7,ease:"power3.out",stagger:0.022,delay,
           scrollTrigger:{trigger:ref.current,start:"top 88%",toggleActions:"play none none none"}}
        );
      },ref.current);
      return()=>ctx.revert();
    });
  },[delay]);
  return(
    <span ref={ref} style={{display:"inline",overflow:"hidden",...style}}>
      {text.split("").map((ch,i)=>(
        <span key={i} className="char" style={{display:"inline-block",opacity:0,whiteSpace:ch===" "?"pre":"normal"}}>{ch===" "?" ":ch}</span>
      ))}
    </span>
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
    <div ref={ref} data-gsap="manifesto" style={{position:"relative",zIndex:2,padding:"120px 32px",background:"#160810",overflow:"hidden"}}>
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
          <div style={{marginBottom:"14px",lineHeight:1,transition:"all 0.3s",width:28,height:28}}>{ToolIcons[f.icon]||<span style={{fontSize:28}}>{f.icon}</span>}</div>
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
          <div key={feat.n} data-gsap="feature-row" ref={el=>{itemRefs.current[i]=el;}} style={{
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
        display:"flex",flexDirection:"column",justifyContent:"center",background:"#160810"}}>

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
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    loadGSAP(()=>{
      const G=(window as any).gsap;
      const ST=(window as any).ScrollTrigger;
      if(!G||!ST||!ref.current)return;
      const ctx=G.context(()=>{
        G.fromTo(ref.current,
          {opacity:0,y:44,filter:"blur(6px)"},
          {opacity:1,y:0,filter:"blur(0px)",duration:1.1,ease:"power3.out",delay,
           scrollTrigger:{trigger:ref.current,start:"top 86%",toggleActions:"play none none none"}}
        );
      },ref.current);
      return()=>ctx.revert();
    });
  },[delay]);
  return <div ref={ref} style={{...style,opacity:0}}>{children}</div>;
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

// ─── HERO 3D GALAXY BACKGROUND ───────────────────────────────────────────────
function HeroGalaxy(){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useThree(canvasRef, (THREE, canvas)=>{
    const W=canvas.clientWidth||window.innerWidth, H=canvas.clientHeight||window.innerHeight;
    const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70,W/H,0.1,200);
    camera.position.set(0,1.5,6);
    camera.lookAt(0,0,0);

    // Big star field
    const N=4000;
    const pos=new Float32Array(N*3), col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const r=4+Math.random()*14;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta);
      pos[i*3+2]=r*Math.cos(phi);
      const warm=Math.random()<0.12;
      const bright=0.3+Math.random()*0.7;
      col[i*3]=warm?bright*0.9:bright*0.75;
      col[i*3+1]=warm?bright*0.7:bright*0.85;
      col[i*3+2]=warm?bright*0.2:bright;
    }
    const starGeo=new THREE.BufferGeometry();
    starGeo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    starGeo.setAttribute("color",new THREE.BufferAttribute(col,3));
    scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({size:0.025,vertexColors:true,transparent:true,opacity:0.9})));

    // Spiral galaxy in foreground-right
    const GN=2800;
    const gpos=new Float32Array(GN*3), gcol=new Float32Array(GN*3);
    for(let i=0;i<GN;i++){
      const arm=i%2;
      const t=(i/GN)*Math.PI*5+(arm/2)*Math.PI;
      const r=0.2+(i/GN)*2.8+Math.random()*0.25;
      gpos[i*3]=Math.cos(t)*r*1.8+2.5+(Math.random()-0.5)*0.2;
      gpos[i*3+1]=(Math.random()-0.5)*0.18;
      gpos[i*3+2]=Math.sin(t)*r+(Math.random()-0.5)*0.2;
      const teal=arm===0;
      const b=0.5+Math.random()*0.5;
      gcol[i*3]=teal?0:b*0.48; gcol[i*3+1]=teal?b*0.77:b*0.37; gcol[i*3+2]=teal?b*0.71:b*0.65;
    }
    const gGeo=new THREE.BufferGeometry();
    gGeo.setAttribute("position",new THREE.BufferAttribute(gpos,3));
    gGeo.setAttribute("color",new THREE.BufferAttribute(gcol,3));
    scene.add(new THREE.Points(gGeo,new THREE.PointsMaterial({size:0.018,vertexColors:true,transparent:true,opacity:0.75})));

    // Floating orbs
    [[0x8b1a2a,[-1.5,0.5,-1],0.12],[0x7B5EA7,[2,1,-2],0.18],[0xf0a040,[0.5,-1,-1.5],0.08]].forEach(([col,pos,r]:any)=>{
      const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,16),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.7}));
      m.position.set(...pos); scene.add(m);
    });

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{ mouse.x=(e.clientX/window.innerWidth-0.5); mouse.y=-(e.clientY/window.innerHeight-0.5); };
    window.addEventListener("mousemove",onMouse,{passive:true});

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick); t+=0.003;
      scene.rotation.y=t*0.06+mouse.x*0.12;
      scene.rotation.x=mouse.y*0.08;
      renderer.render(scene,camera);
    };
    tick();

    const onResize=()=>{ const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); };
    window.addEventListener("resize",onResize);

    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener("mousemove",onMouse); window.removeEventListener("resize",onResize); renderer.dispose(); };
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── D: Hero with mouse parallax (lerped + true Z-depth) ─────────────────────
function HeroSection(){
  const mouse=useMouseParallax();
  const scrollY=useScrollY();
  const showToast=useToast();

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
    <section style={{padding:"110px 32px 120px",maxWidth:"720px",margin:"0 auto",width:"100%",position:"relative",zIndex:2}}>
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
      <h1 data-gsap="hero-h1" style={{fontSize:"clamp(38px,6.5vw,68px)",fontWeight:300,letterSpacing:"-0.038em",lineHeight:1.04,marginBottom:"22px",color:"#F2F5F8",animation:"hero-enter 1.4s ease 0.31s both"}}>
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
          <button style={{fontSize:"12px",fontFamily:"'Nunito',system-ui,sans-serif",fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"11px 26px",cursor:"pointer",letterSpacing:"0.03em",transition:"opacity 0.15s,box-shadow 0.2s,transform 0.2s"}}
            onClick={()=>showToast("✓ Redirecting to signup…",TEAL)}
            onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";e.currentTarget.style.boxShadow=`0 0 40px rgba(0,196,180,0.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
            Start for free →
          </button>
        </Link>
        <Link to="/signup">
          <button style={{fontSize:"12px",fontFamily:"'Nunito',system-ui,sans-serif",fontWeight:300,color:"#444",background:"transparent",border:"none",cursor:"pointer",transition:"color 0.15s"}}
            onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
            onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>
            See Dashboard →
          </button>
        </Link>
      </div>
      <p style={{...mono,fontSize:"10px",color:"#1e2a44",marginTop:"18px",letterSpacing:"0.06em",animation:"hero-enter 1.4s ease 0.79s both"}}>
        No credit card required · Free plan always available
      </p>

      {/* Scroll indicator — fades out once user scrolls */}
      <div style={{
        position:"absolute",bottom:"-48px",left:"50%",transform:"translateX(-50%)",
        display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",
        opacity:Math.max(0, 1 - scrollY / 80),
        transition:"opacity 0.2s",
        pointerEvents:"none",
        animation:"hero-enter 1.4s ease 1.1s both",
      }}>
        <span style={{...mono,fontSize:"9px",color:"#2a3a5a",letterSpacing:"0.18em",textTransform:"uppercase"}}>scroll</span>
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none" style={{animation:"scroll-bounce 1.8s ease-in-out infinite"}}>
          <rect x="1" y="1" width="14" height="22" rx="7" stroke="rgba(0,196,180,0.25)" strokeWidth="1"/>
          <rect x="6.5" y="4" width="3" height="5" rx="1.5" fill={TEAL} style={{animation:"scroll-bounce 1.8s ease-in-out infinite"}}/>
        </svg>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{animation:"scroll-bounce 1.8s ease-in-out infinite",animationDelay:"0.15s"}}>
          <path d="M1 1l5 5 5-5" stroke="rgba(0,196,180,0.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
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
    <div ref={ref} style={{position:"relative",minHeight:"500px",overflow:"hidden",background:"linear-gradient(180deg,#160810 0%,#060c1a 50%,#160810 100%)"}}>
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
    <div ref={ref} style={{position:"relative",height:"480px",overflow:"hidden",background:"#160810"}}>
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

// ─── TWINKLING STARS BACKGROUND ──────────────────────────────────────────────
function TwinklingStars({count=60}:{count?:number}){
  const stars=useMemo(()=>Array.from({length:count},(_,i)=>({
    id:i,
    x:Math.random()*100,
    y:Math.random()*100,
    dur:`${2+Math.random()*4}s`,
    delay:`${Math.random()*5}s`,
    size:Math.random()>0.8?3:Math.random()>0.5?2:1,
    opacity:0.1+Math.random()*0.5,
  })),[count]);
  return(
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
      {stars.map(s=>(
        <div key={s.id} className="star" style={{
          left:`${s.x}%`,top:`${s.y}%`,
          width:s.size,height:s.size,
          opacity:s.opacity,
          //@ts-ignore
          "--dur":s.dur,"--delay":s.delay,
        }}/>
      ))}
    </div>
  );
}

// ─── LOADING SCREEN ──────────────────────────────────────────────────────────
function LoadingScreen({onDone}:{onDone:()=>void}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [pct,setPct]=useState(0);
  const [fading,setFading]=useState(false);

  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(60,W/H,0.1,100);
    camera.position.z=5;

    // Orb core
    const orb=new THREE.Mesh(
      new THREE.SphereGeometry(0.7,64,64),
      new THREE.MeshStandardMaterial({color:0x8b1a2a,emissive:0x8b1a2a,emissiveIntensity:0.6,roughness:0.1,metalness:0.9})
    );
    scene.add(orb);

    // Rings
    const rings:any[]=[];
    [[0x8b1a2a,1.4,0.01],[0x7B5EA7,1.9,0.008],[0xf0a040,2.4,0.006]].forEach(([col,r,thick]:any,i)=>{
      const ring=new THREE.Mesh(
        new THREE.TorusGeometry(r,thick,8,80),
        new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.6})
      );
      ring.rotation.x=Math.PI/2+(i*0.3);
      ring.rotation.y=i*0.5;
      scene.add(ring); rings.push(ring);
    });

    // Particles
    const N=1200;const pp=new Float32Array(N*3);
    for(let i=0;i<N;i++){const r=3+Math.random()*4,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);pp[i*3]=r*Math.sin(p)*Math.cos(t);pp[i*3+1]=r*Math.sin(p)*Math.sin(t);pp[i*3+2]=r*Math.cos(p);}
    const pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(pp,3));
    scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x8b1a2a,size:0.018,transparent:true,opacity:0.5})));

    scene.add(new THREE.AmbientLight(0xffffff,0.3));
    const pl=new THREE.PointLight(0x8b1a2a,4,20);pl.position.set(2,2,3);scene.add(pl);
    const pl2=new THREE.PointLight(0x7B5EA7,3,20);pl2.position.set(-2,-1,2);scene.add(pl2);

    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.012;
      orb.rotation.y=t*0.4;orb.rotation.x=Math.sin(t*0.3)*0.2;
      rings.forEach((r,i)=>{r.rotation.z=t*(0.2+i*0.1);r.rotation.x=Math.PI/2+Math.sin(t*0.15+i)*0.4;});
      renderer.render(scene,camera);
    };
    tick();
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",onResize);renderer.dispose();};
  });

  useEffect(()=>{
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*4+1;
      if(p>=100){p=100;clearInterval(iv);
        setTimeout(()=>{setFading(true);setTimeout(onDone,700);},400);
      }
      setPct(Math.round(p));
    },60);
    return ()=>clearInterval(iv);
  },[]);

  return(
    <div style={{position:"fixed",inset:0,background:"#160810",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      opacity:fading?0:1,transition:"opacity 0.7s ease",pointerEvents:fading?"none":"all"}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
      <div style={{position:"relative",zIndex:2,textAlign:"center"}}>
        <div style={{...mono,fontSize:"11px",color:"rgba(0,196,180,0.5)",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:"32px"}}>STUDENIUS</div>
        <div style={{width:"180px",height:"1px",background:"#0d1220",margin:"0 auto 8px",position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,height:"100%",background:`linear-gradient(90deg,${TEAL},${PURPLE})`,width:`${pct}%`,transition:"width 0.1s linear"}}/>
        </div>
        <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.1em"}}>{pct}%</div>
      </div>
    </div>
  );
}

// ─── SCENE 4: GLOWING BRAIN ───────────────────────────────────────────────────
function SceneBrain(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(55,W/H,0.1,100);
    camera.position.set(0,0,5);
    const group=new THREE.Group();scene.add(group);

    // Brain shape: layered spheres forming lobes
    const brainMat=(col:number)=>new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:0.3,roughness:0.4,metalness:0.5,transparent:true,opacity:0.85});
    // Left hemisphere
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(1.1,32,32),brainMat(0x0099aa)),{position:{x:-0.3,y:0,z:0}} as any));
    // Right hemisphere
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(1.05,32,32),brainMat(0x006688)),{position:{x:0.3,y:0,z:0}} as any));
    // Frontal lobe bump
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.65,24,24),brainMat(0x8b1a2a)),{position:{x:0,y:0.6,z:0.7}} as any));
    // Occipital lobe
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.55,24,24),brainMat(0x005577)),{position:{x:0,y:0.1,z:-0.9}} as any));
    // Cerebellum
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.45,20,20),brainMat(0x007799)),{position:{x:0,y:-0.85,z:-0.5}} as any));
    // Temporal lobes
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.48,20,20),brainMat(0x00aabb)),{position:{x:-1.1,y:-0.3,z:0.1}} as any));
    group.add(Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.45,20,20),brainMat(0x00aabb)),{position:{x:1.1,y:-0.3,z:0.1}} as any));

    // Gyri (surface ridges as torus segments)
    for(let i=0;i<18;i++){
      const t=i/18;
      const ridge=new THREE.Mesh(
        new THREE.TorusGeometry(0.12+Math.random()*0.08,0.025,6,12),
        new THREE.MeshBasicMaterial({color:0x8b1a2a,transparent:true,opacity:0.25+Math.random()*0.15})
      );
      ridge.position.set((Math.random()-0.5)*1.8,(Math.random()-0.5)*1.4,(Math.random()-0.5)*1.2);
      ridge.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
      group.add(ridge);
    }

    // Neural spark particles
    const NP=300;const np=new Float32Array(NP*3);
    for(let i=0;i<NP;i++){const r=1.3+Math.random()*0.6,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);np[i*3]=r*Math.sin(p)*Math.cos(t);np[i*3+1]=r*Math.sin(p)*Math.sin(t)*0.85;np[i*3+2]=r*Math.cos(p);}
    const npg=new THREE.BufferGeometry();npg.setAttribute("position",new THREE.BufferAttribute(np,3));
    group.add(new THREE.Points(npg,new THREE.PointsMaterial({color:0x8b1a2a,size:0.025,transparent:true,opacity:0.6})));

    scene.add(new THREE.AmbientLight(0xffffff,0.3));
    const pl1=new THREE.PointLight(0x8b1a2a,5,15);pl1.position.set(3,2,3);scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,3,12);pl2.position.set(-3,-1,2);scene.add(pl2);
    const pl3=new THREE.PointLight(0xffffff,1,10);pl3.position.set(0,4,1);scene.add(pl3);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.007;
      group.rotation.y=t*0.2+mouse.x*0.3;group.rotation.x=mouse.y*0.15+Math.sin(t*0.3)*0.05;
      pl1.position.x=Math.sin(t*0.7)*4;pl1.position.y=Math.cos(t*0.5)*3;
      renderer.render(scene,camera);
    };
    tick();
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 5: DNA HELIX ──────────────────────────────────────────────────────
function SceneDNA(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(50,W/H,0.1,100);
    camera.position.set(0,0,8);
    const group=new THREE.Group();scene.add(group);

    const steps=28;const height=5;
    for(let i=0;i<steps;i++){
      const t=(i/steps)*Math.PI*4;
      const y=(i/steps)*height-height/2;
      // Strand A (teal)
      const sA=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,12),new THREE.MeshStandardMaterial({color:0x8b1a2a,emissive:0x8b1a2a,emissiveIntensity:0.5,roughness:0.2,metalness:0.8}));
      sA.position.set(Math.cos(t)*1.1,y,Math.sin(t)*1.1);group.add(sA);
      // Strand B (purple)
      const sB=new THREE.Mesh(new THREE.SphereGeometry(0.12,12,12),new THREE.MeshStandardMaterial({color:0x7B5EA7,emissive:0x7B5EA7,emissiveIntensity:0.5,roughness:0.2,metalness:0.8}));
      sB.position.set(Math.cos(t+Math.PI)*1.1,y,Math.sin(t+Math.PI)*1.1);group.add(sB);
      // Rungs (crossbars)
      if(i%2===0){
        const rungGeo=new THREE.BufferGeometry().setFromPoints([sA.position.clone(),sB.position.clone()]);
        group.add(new THREE.Line(rungGeo,new THREE.LineBasicMaterial({color:0xf0a040,transparent:true,opacity:0.45})));
        // Rung sphere at center
        const mid=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),new THREE.MeshBasicMaterial({color:0xf0a040,transparent:true,opacity:0.6}));
        mid.position.set(0,y,0);group.add(mid);
      }
    }
    // Backbone tubes (approximated with lines)
    const ptsA:any[]=[],ptsB:any[]=[];
    for(let i=0;i<=80;i++){const t=(i/80)*Math.PI*4,y=(i/80)*height-height/2;ptsA.push(new THREE.Vector3(Math.cos(t)*1.1,y,Math.sin(t)*1.1));ptsB.push(new THREE.Vector3(Math.cos(t+Math.PI)*1.1,y,Math.sin(t+Math.PI)*1.1));}
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsA),new THREE.LineBasicMaterial({color:0x8b1a2a,transparent:true,opacity:0.3})));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsB),new THREE.LineBasicMaterial({color:0x7B5EA7,transparent:true,opacity:0.3})));

    scene.add(new THREE.AmbientLight(0xffffff,0.4));
    const pl1=new THREE.PointLight(0x8b1a2a,4,15);pl1.position.set(3,2,3);scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,3,12);pl2.position.set(-3,-2,2);scene.add(pl2);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.008;
      group.rotation.y=t*0.3+mouse.x*0.25;group.rotation.x=mouse.y*0.1;
      renderer.render(scene,camera);
    };
    tick();
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 6: CRYSTAL CLUSTER ────────────────────────────────────────────────
function SceneCrystal(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(50,W/H,0.1,100);
    camera.position.set(0,0,6);
    const group=new THREE.Group();scene.add(group);

    // Crystal spikes: cone+octahedron combos
    const crystalDefs=[
      {h:2.4,r:0.22,x:0,y:0.4,z:0,rx:0,col:0x8b1a2a,ei:0.8},
      {h:1.8,r:0.18,x:0.7,y:0,z:0.2,rx:0.3,col:0x4A9EFF,ei:0.6},
      {h:1.4,r:0.15,x:-0.65,y:-0.1,z:0.3,rx:-0.25,col:0x7B5EA7,ei:0.7},
      {h:1.6,r:0.16,x:0.35,y:0.2,z:-0.4,rx:0.15,col:0x8b1a2a,ei:0.5},
      {h:1.1,r:0.13,x:-0.3,y:0.5,z:0.5,rx:-0.1,col:0xf0a040,ei:0.6},
      {h:0.9,r:0.11,x:0.9,y:0.5,z:-0.2,rx:0.4,col:0x4A9EFF,ei:0.4},
      {h:1.2,r:0.14,x:-0.9,y:0.3,z:-0.1,rx:-0.3,col:0x8b1a2a,ei:0.5},
    ];
    crystalDefs.forEach(d=>{
      const mat=new THREE.MeshStandardMaterial({color:d.col,emissive:d.col,emissiveIntensity:d.ei,roughness:0.05,metalness:0.7,transparent:true,opacity:0.88});
      // Upper spike
      const top=new THREE.Mesh(new THREE.ConeGeometry(d.r,d.h,8),mat);
      top.position.set(d.x,d.y+d.h/2,d.z);top.rotation.z=d.rx;group.add(top);
      // Lower base
      const bot=new THREE.Mesh(new THREE.ConeGeometry(d.r,d.h*0.4,8),mat.clone());
      bot.rotation.z=Math.PI+d.rx;bot.position.set(d.x,d.y-d.h*0.15,d.z);group.add(bot);
      // Edge glow
      const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(d.r,d.h,8)),new THREE.LineBasicMaterial({color:d.col,transparent:true,opacity:0.3}));
      eg.position.copy(top.position);eg.rotation.copy(top.rotation);group.add(eg);
    });

    // Scatter particles
    const NP=200;const pp=new Float32Array(NP*3);
    for(let i=0;i<NP;i++){pp[i*3]=(Math.random()-0.5)*4;pp[i*3+1]=(Math.random()-0.5)*4;pp[i*3+2]=(Math.random()-0.5)*3-1;}
    const ppg=new THREE.BufferGeometry();ppg.setAttribute("position",new THREE.BufferAttribute(pp,3));
    scene.add(new THREE.Points(ppg,new THREE.PointsMaterial({color:0x8b1a2a,size:0.022,transparent:true,opacity:0.4})));

    scene.add(new THREE.AmbientLight(0xffffff,0.25));
    const pl1=new THREE.PointLight(0x8b1a2a,6,15);pl1.position.set(2,3,3);scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,4,12);pl2.position.set(-2,-2,2);scene.add(pl2);
    const pl3=new THREE.PointLight(0xf0a040,2,10);pl3.position.set(0,4,-2);scene.add(pl3);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.008;
      group.rotation.y=t*0.15+mouse.x*0.3;group.rotation.x=mouse.y*0.15+Math.sin(t*0.2)*0.06;
      pl1.intensity=4+Math.sin(t*1.5)*2;renderer.render(scene,camera);
    };
    tick();
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 7: SATELLITE ──────────────────────────────────────────────────────
function SceneSatellite(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);
    camera.position.set(2,1.5,6);camera.lookAt(0,0,0);
    const group=new THREE.Group();scene.add(group);

    const metalMat=new THREE.MeshStandardMaterial({color:0x8899aa,roughness:0.3,metalness:0.9});
    const darkMat=new THREE.MeshStandardMaterial({color:0x1a2235,roughness:0.5,metalness:0.8});
    const solarMat=new THREE.MeshStandardMaterial({color:0x1a3a6e,roughness:0.4,metalness:0.6,emissive:0x0a1a3a,emissiveIntensity:0.3});

    // Main body
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.6,16),metalMat);group.add(body);
    // End caps
    [[0,0.85,0],[0,-0.85,0]].forEach(([x,y,z])=>{
      const cap=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,8,0,Math.PI*2,0,Math.PI/2),metalMat);
      cap.position.set(x,y,z);if(y<0)cap.rotation.x=Math.PI;group.add(cap);
    });
    // Solar panels (left + right)
    [[-2.1,0,0],[2.1,0,0]].forEach(([x,y,z])=>{
      const panel=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.02,0.9),solarMat);
      panel.position.set(x,y,z);group.add(panel);
      // Panel grid lines
      const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5,0.02,0.9)),new THREE.LineBasicMaterial({color:0x4488ff,transparent:true,opacity:0.4}));
      eg.position.copy(panel.position);group.add(eg);
      // Panel arm
      const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,1.2,8),metalMat);
      arm.rotation.z=Math.PI/2;arm.position.set(x/2.5,y,z);group.add(arm);
    });
    // Antenna
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,1.2,8),metalMat);
    ant.position.set(0,1.4,0);group.add(ant);
    const dish=new THREE.Mesh(new THREE.SphereGeometry(0.28,16,8,0,Math.PI*2,0,Math.PI/2),metalMat);
    dish.position.set(0,2.05,0);dish.rotation.x=Math.PI;group.add(dish);
    // Thrusters
    [[-0.35,-0.85,0.35],[0.35,-0.85,0.35],[0.35,-0.85,-0.35],[-0.35,-0.85,-0.35]].forEach(([x,y,z])=>{
      const th=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.05,0.2,8),darkMat);th.position.set(x,y,z);group.add(th);
    });

    // Orbit ring
    const orbitRing=new THREE.Mesh(new THREE.TorusGeometry(3,0.008,8,80),new THREE.MeshBasicMaterial({color:0x8b1a2a,transparent:true,opacity:0.15}));
    orbitRing.rotation.x=Math.PI/4;scene.add(orbitRing);

    // Stars
    const NS=800;const sp=new Float32Array(NS*3);
    for(let i=0;i<NS;i++){const r=8+Math.random()*8,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);sp[i*3]=r*Math.sin(p)*Math.cos(t);sp[i*3+1]=r*Math.sin(p)*Math.sin(t);sp[i*3+2]=r*Math.cos(p);}
    const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.BufferAttribute(sp,3));
    scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.025,transparent:true,opacity:0.6})));

    scene.add(new THREE.AmbientLight(0xffffff,0.4));
    const sun=new THREE.DirectionalLight(0xfff8e0,2);sun.position.set(5,5,3);scene.add(sun);
    const pl=new THREE.PointLight(0x8b1a2a,1.5,20);pl.position.set(-3,2,4);scene.add(pl);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.005;
      group.rotation.y=t*0.18+mouse.x*0.25;group.rotation.x=mouse.y*0.12+Math.sin(t*0.4)*0.08;
      renderer.render(scene,camera);
    };
    tick();
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 8: ASTEROID ───────────────────────────────────────────────────────
function SceneAsteroid(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);
    camera.position.set(0,0,5);
    const group=new THREE.Group();scene.add(group);

    // Distort a sphere to look rocky
    const geo=new THREE.SphereGeometry(1.2,32,32);
    const pos2=geo.attributes.position;
    for(let i=0;i<pos2.count;i++){
      const x=pos2.getX(i),y=pos2.getY(i),z=pos2.getZ(i);
      const noise=0.85+Math.sin(x*4+y*3)*0.1+Math.cos(z*5+x*2)*0.08+Math.sin(y*6)*0.06;
      pos2.setXYZ(i,x*noise,y*noise,z*noise);
    }
    geo.computeVertexNormals();
    const rock=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x4a4a5a,roughness:0.92,metalness:0.15}));
    group.add(rock);

    // Craters (dark concave spots approximated as flat discs)
    for(let i=0;i<8;i++){
      const c=new THREE.Mesh(new THREE.CircleGeometry(0.08+Math.random()*0.12,12),new THREE.MeshBasicMaterial({color:0x1a1a22,transparent:true,opacity:0.7}));
      const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      const r=1.22;c.position.set(r*Math.sin(phi)*Math.cos(theta),r*Math.sin(phi)*Math.sin(theta),r*Math.cos(phi));
      c.lookAt(0,0,0);c.rotateX(Math.PI);group.add(c);
    }

    // Dust particles
    const ND=400;const dp=new Float32Array(ND*3);
    for(let i=0;i<ND;i++){const r=1.5+Math.random()*1.5,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);dp[i*3]=r*Math.sin(p)*Math.cos(t);dp[i*3+1]=r*Math.sin(p)*Math.sin(t);dp[i*3+2]=r*Math.cos(p);}
    const dg=new THREE.BufferGeometry();dg.setAttribute("position",new THREE.BufferAttribute(dp,3));
    scene.add(new THREE.Points(dg,new THREE.PointsMaterial({color:0x8888aa,size:0.015,transparent:true,opacity:0.3})));

    scene.add(new THREE.AmbientLight(0x334466,0.5));
    const sun2=new THREE.DirectionalLight(0xfff0cc,2.5);sun2.position.set(4,3,3);scene.add(sun2);
    const pl=new THREE.PointLight(0x4466ff,1,15);pl.position.set(-4,-2,3);scene.add(pl);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.005;
      group.rotation.y=t*0.12+mouse.x*0.2;group.rotation.x=t*0.07+mouse.y*0.12;
      renderer.render(scene,camera);
    };
    tick();
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── 3D SHOWCASE SECTION (Brain + DNA + Crystal) ──────────────────────────────
function ThreeDShowcaseSection(){
  const items=[
    {label:"BrainBot AI",desc:"Ask anything. Get taught, quizzed, or challenged.",scene:<SceneBrain/>,color:TEAL},
    {label:"Study DNA",desc:"Your living learner profile — adapts every session.",scene:<SceneDNA/>,color:PURPLE},
    {label:"Knowledge Crystals",desc:"Hard facts forged into long-term memory.",scene:<SceneCrystal/>,color:GOLD},
  ];
  return(
    <div style={{background:"#160810",padding:"80px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"8px"}}>— Core 3D Objects</div>
          <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"60px"}}>
            See your tools in <span style={{color:TEAL}}>three dimensions</span>
          </h2>
        </ClipReveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1px",background:"#0d1220"}}>
          {items.map((item,i)=>(
            <div key={i} style={{background:"#160810",position:"relative",overflow:"hidden"}}>
              <div style={{height:"320px",position:"relative"}}>
                {item.scene}
              </div>
              <div style={{padding:"24px",borderTop:"0.5px solid #0d1220"}}>
                <div style={{...mono,fontSize:"10px",color:item.color,letterSpacing:"0.12em",marginBottom:"8px",textTransform:"uppercase"}}>{item.label}</div>
                <p style={{fontSize:"13px",color:"#555",fontWeight:300,lineHeight:1.6}}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SATELLITE + ASTEROID AMBIENT SECTION ─────────────────────────────────────
function SpaceObjectsSection(){
  const {ref,inView}=useInView(0.1);
  return(
    <div ref={ref} style={{background:"#160810",padding:"80px 0",position:"relative",zIndex:2,overflow:"hidden"}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px",display:"flex",gap:"64px",alignItems:"center",flexWrap:"wrap"}}>
        {/* Left text */}
        <div style={{flex:"1 1 300px"}}>
          <ClipReveal>
            <div style={{...mono,fontSize:"10px",color:GOLD,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"12px"}}>— Your Study Universe</div>
            <h2 style={{fontSize:"clamp(20px,2.8vw,36px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",lineHeight:1.25,marginBottom:"16px"}}>
              Every student is a<br/><span style={{color:TEAL}}>satellite in orbit</span>
            </h2>
            <p style={{fontSize:"13px",color:"#444",lineHeight:1.75,fontWeight:300,marginBottom:"24px"}}>
              You're not just studying. You're navigating a knowledge universe. Studenius is mission control — tracking your trajectory, closing the gaps, plotting your path to mastery.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {["Adaptive difficulty per session","Real-time gap detection","12 tools in one orbit"].map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{width:"3px",height:"3px",borderRadius:"50%",background:TEAL,flexShrink:0}}/>
                  <span style={{fontSize:"12px",color:"#555",fontWeight:300}}>{t}</span>
                </div>
              ))}
            </div>
          </ClipReveal>
        </div>
        {/* Right: two 3D objects stacked */}
        <div style={{flex:"1 1 400px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#0d1220"}}>
          <div style={{background:"#160810",height:"260px",position:"relative"}}>
            <SceneSatellite/>
            <div style={{position:"absolute",bottom:"12px",left:"16px",...mono,fontSize:"9px",color:"rgba(0,196,180,0.4)",letterSpacing:"0.1em"}}>SATELLITE</div>
          </div>
          <div style={{background:"#160810",height:"260px",position:"relative"}}>
            <SceneAsteroid/>
            <div style={{position:"absolute",bottom:"12px",left:"16px",...mono,fontSize:"9px",color:"rgba(232,185,35,0.4)",letterSpacing:"0.1em"}}>ASTEROID</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOW IT WORKS SECTION ─────────────────────────────────────────────────────
function HowItWorksSection(){
  const steps=[
    {n:"01",title:"Upload your materials",desc:"Drop in PDFs, images, lecture notes — any format. Studenius reads everything.",icon:"📁",color:TEAL},
    {n:"02",title:"AI analyzes your gaps",desc:"BrainBot maps what you know, what's shaky, and what's missing. Your Study DNA forms.",icon:"🧠",color:PURPLE},
    {n:"03",title:"Study with 12 AI tools",desc:"Flashcards, Cram Mode, Feynman Method, Recall, High Yield — use any tool any time.",icon:"⚡",color:GOLD},
    {n:"04",title:"Track and adapt",desc:"Your confidence calibration updates in real time. The platform learns as you do.",icon:"🎯",color:"#4A9EFF"},
  ];
  return(
    <div style={{background:"#05080f",padding:"100px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"8px"}}>— Process</div>
          <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"64px"}}>
            How it <span style={{color:TEAL}}>actually works</span>
          </h2>
        </ClipReveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"1px",background:"#0d1220"}}>
          {steps.map((s,i)=>(
            <ClipReveal key={i} delay={i*0.08}>
              <div style={{background:"#05080f",padding:"32px 24px",position:"relative",overflow:"hidden",height:"100%",
                transition:"background 0.3s"}}
                onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.background="#080d1a")}
                onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.background="#05080f")}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:s.color,opacity:0.6}}/>
                <div style={{marginBottom:"16px",width:28,height:28}}>{ToolIcons[s.icon]||<span style={{fontSize:28}}>{s.icon}</span>}</div>
                <div style={{...mono,fontSize:"10px",color:s.color,letterSpacing:"0.12em",marginBottom:"10px"}}>{s.n}</div>
                <h3 style={{fontSize:"15px",fontWeight:400,color:"#E0E8F0",marginBottom:"10px",letterSpacing:"-0.01em"}}>{s.title}</h3>
                <p style={{fontSize:"12px",color:"#444",lineHeight:1.7,fontWeight:300}}>{s.desc}</p>
                <div style={{position:"absolute",right:"16px",bottom:"16px",...mono,fontSize:"56px",fontWeight:700,color:"rgba(255,255,255,0.02)",lineHeight:1}}>{s.n}</div>
              </div>
            </ClipReveal>
          ))}
        </div>
        {/* Connector line */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"0",marginTop:"40px",opacity:0.15}}>
          {steps.map((_,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:TEAL}}/>
              {i<steps.length-1&&<div style={{width:"80px",height:"0.5px",background:TEAL}}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PRICING SECTION ─────────────────────────────────────────────────────────
function PricingSection(){
  const showToast = useToast();
  const plans=[
    {
      name:"Free",label:"For curious learners",price:"0",per:"forever",color:"#333",
      features:["BrainBot (limited)","50 flashcards/month","Basic practice questions","1 source upload","Community access"],
      cta:"Get Started",ctaStyle:{border:"0.5px solid #1a2240",color:"#555",background:"transparent"},
      highlight:false,
    },
    {
      name:"Pro",label:"For serious students",price:"12",per:"/ month",color:TEAL,
      features:["All 12 AI tools unlocked","Unlimited flashcards","Unlimited source uploads","Cram Mode + Recall Mode","Study DNA tracking","Priority AI response"],
      cta:"Start Pro Free",ctaStyle:{background:TEAL,color:"#160810",border:"none"},
      highlight:true,
      badge:"Most Popular",
    },
    {
      name:"Team",label:"For study groups & schools",price:"8",per:"/ user / month",color:PURPLE,
      features:["Everything in Pro","Shared source library","Group progress tracking","Admin dashboard","Custom branding","Dedicated support"],
      cta:"Contact Us",ctaStyle:{border:`0.5px solid ${PURPLE}`,color:PURPLE,background:"transparent"},
      highlight:false,
    },
  ];
  return(
    <div style={{background:"#160810",padding:"100px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"960px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{textAlign:"center",marginBottom:"64px"}}>
            <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"12px"}}>— Pricing</div>
            <h2 style={{fontSize:"clamp(22px,3vw,38px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"12px"}}>
              Simple, transparent pricing
            </h2>
            <p style={{fontSize:"13px",color:"#444",fontWeight:300}}>No hidden fees. Cancel anytime.</p>
          </div>
        </ClipReveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"1px",background:"#0d1220"}}>
          {plans.map((plan,i)=>(
            <ClipReveal key={i} delay={i*0.08}>
              <div data-gsap="pricing-card" style={{background:plan.highlight?"#080d1a":"#160810",padding:"36px 28px",position:"relative",height:"100%",display:"flex",flexDirection:"column"}}>
                {plan.highlight&&<div style={{position:"absolute",top:0,left:0,right:0,height:"1.5px",background:`linear-gradient(90deg,${TEAL},${PURPLE})`}}/>}
                {plan.badge&&(
                  <div className="shimmer" style={{position:"absolute",top:"16px",right:"16px",...mono,fontSize:"9px",color:TEAL,border:`0.5px solid ${TEAL}`,padding:"2px 7px",letterSpacing:"0.1em"}}>{plan.badge}</div>
                )}
                <div style={{...mono,fontSize:"10px",color:plan.color,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px"}}>{plan.name}</div>
                <div style={{fontSize:"11px",color:"#333",marginBottom:"24px",fontWeight:300}}>{plan.label}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:"4px",marginBottom:"32px"}}>
                  <span style={{fontSize:"11px",color:"#444"}}>$</span>
                  <span style={{fontSize:"clamp(32px,4vw,44px)",fontWeight:300,color:"#F2F5F8",letterSpacing:"-0.03em"}}>{plan.price}</span>
                  <span style={{fontSize:"11px",color:"#444",fontWeight:300}}>{plan.per}</span>
                </div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:"10px",marginBottom:"32px"}}>
                  {plan.features.map((f,j)=>(
                    <div key={j} style={{display:"flex",alignItems:"flex-start",gap:"10px"}}>
                      <span style={{color:plan.color,fontSize:"10px",marginTop:"2px",flexShrink:0}}>✓</span>
                      <span style={{fontSize:"12px",color:"#555",fontWeight:300,lineHeight:1.5}}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/signup">
                  <button style={{width:"100%",padding:"11px",fontSize:"11px",...mono,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"opacity 0.15s,box-shadow 0.2s,transform 0.15s",...plan.ctaStyle}}
                    onClick={()=>showToast(plan.name==="Team"?"✉ Redirecting to contact…":"✓ Redirecting to signup…", plan.color==="transparent"||!plan.color||plan.color==="#333"?TEAL:(plan.color as string))}
                    onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";if(plan.highlight)e.currentTarget.style.boxShadow=`0 0 32px rgba(0,196,180,0.4)`;e.currentTarget.style.transform="translateY(-1px)";}}
                    onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                    {plan.cta} →
                  </button>
                </Link>
              </div>
            </ClipReveal>
          ))}
        </div>
        <ClipReveal delay={0.2}>
          <p style={{textAlign:"center",fontSize:"11px",color:"#1e2838",marginTop:"32px",...mono,letterSpacing:"0.06em"}}>
            All plans include 14-day free trial · No credit card required
          </p>
        </ClipReveal>
      </div>
    </div>
  );
}

// ─── FAQ SECTION ─────────────────────────────────────────────────────────────
const faqData=[
  {q:"How is Studenius different from ChatGPT?",a:"ChatGPT is a general chatbot. Studenius is purpose-built for learning — with spaced repetition, recall testing, session analytics, Study DNA, and 12 tools designed specifically to make knowledge stick."},
  {q:"Can I upload my own study materials?",a:"Yes. Upload PDFs, images, screenshots, or paste text. BrainBot and all tools will read your materials and generate content directly from them."},
  {q:"What is Cram Mode?",a:"Cram Mode is an emergency study session where AI breaks down your subject into prioritized topics based on what's most testable, then drills you in a timed format. Perfect for the night before an exam."},
  {q:"What is Study DNA?",a:"Study DNA is your living learner profile — it tracks your strengths, weaknesses, learning pace, and mistake patterns. It updates every session and shapes how all tools interact with you."},
  {q:"Is there a free plan?",a:"Yes, there's a free plan with access to core features and limited usage. No credit card required to sign up."},
  {q:"Does it work for any subject?",a:"Yes. Medicine, law, engineering, languages, finance, programming — if you can upload or describe the content, Studenius can help you master it."},
];

function FAQSection(){
  const [open,setOpen]=useState<number|null>(null);
  return(
    <div style={{background:"#05080f",padding:"100px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"8px"}}>— FAQ</div>
          <h2 style={{fontSize:"clamp(20px,2.8vw,36px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"48px"}}>
            Common questions
          </h2>
        </ClipReveal>
        <div style={{display:"flex",flexDirection:"column"}}>
          {faqData.map((item,i)=>(
            <div data-gsap="faq-item" key={i} style={{borderTop:"0.5px solid #0d1220"}}>
              <button
                onClick={()=>setOpen(open===i?null:i)}
                onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setOpen(open===i?null:i);}}}
                aria-expanded={open===i}
                aria-controls={`faq-answer-${i}`}
                style={{
                width:"100%",background:"transparent",border:"none",padding:"20px 0",
                display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px",
                cursor:"pointer",textAlign:"left",
              }}>
                <span style={{fontSize:"14px",color:open===i?"#F2F5F8":"#888",fontWeight:300,transition:"color 0.2s",lineHeight:1.4}}>{item.q}</span>
                <span style={{...mono,fontSize:"16px",color:open===i?TEAL:"#333",transition:"color 0.2s,transform 0.3s",transform:open===i?"rotate(45deg)":"rotate(0deg)",flexShrink:0,lineHeight:1}}>+</span>
              </button>
              <div id={`faq-answer-${i}`} role="region" style={{overflow:"hidden",maxHeight:open===i?"200px":"0",transition:"max-height 0.4s cubic-bezier(0.16,1,0.3,1)",}}>
                <p style={{fontSize:"13px",color:"#444",lineHeight:1.75,fontWeight:300,paddingBottom:"20px",paddingRight:"32px"}}>{item.a}</p>
              </div>
            </div>
          ))}
          <div style={{borderTop:"0.5px solid #0d1220"}}/>
        </div>
      </div>
    </div>
  );
}

// ─── CURSOR GLOW ─────────────────────────────────────────────────────────────
function CursorGlow(){
  const dotRef=useRef<HTMLDivElement>(null);
  const ringRef=useRef<HTMLDivElement>(null);
  const pos=useRef({x:-200,y:-200});
  const smooth=useRef({x:-200,y:-200});
  useEffect(()=>{
    const onMove=(e:MouseEvent)=>{pos.current={x:e.clientX,y:e.clientY};};
    window.addEventListener("mousemove",onMove,{passive:true});
    let raf:number;
    const tick=()=>{
      raf=requestAnimationFrame(tick);
      smooth.current.x+=(pos.current.x-smooth.current.x)*0.11;
      smooth.current.y+=(pos.current.y-smooth.current.y)*0.11;
      if(dotRef.current){dotRef.current.style.left=pos.current.x+"px";dotRef.current.style.top=pos.current.y+"px";}
      if(ringRef.current){ringRef.current.style.left=smooth.current.x+"px";ringRef.current.style.top=smooth.current.y+"px";}
    };
    tick();
    const hover=()=>ringRef.current?.classList.add("hovered");
    const unhover=()=>ringRef.current?.classList.remove("hovered");
    document.querySelectorAll("a,button").forEach(el=>{el.addEventListener("mouseenter",hover);el.addEventListener("mouseleave",unhover);});
    return ()=>{window.removeEventListener("mousemove",onMove);cancelAnimationFrame(raf);};
  },[]);
  return(<>
    <div id="cursor-dot" ref={dotRef} style={{position:"fixed",width:6,height:6,background:TEAL,borderRadius:"50%",pointerEvents:"none",zIndex:99999,transform:"translate(-50%,-50%)",transition:"opacity 0.2s"}}/>
    <div id="cursor-ring" ref={ringRef} style={{position:"fixed",width:32,height:32,border:`1px solid rgba(0,196,180,0.4)`,borderRadius:"50%",pointerEvents:"none",zIndex:99998,transform:"translate(-50%,-50%)",transition:"width 0.2s,height 0.2s,border-color 0.2s"}}/>
  </>);
}

// ─── MOBILE MENU ─────────────────────────────────────────────────────────────
function MobileMenu({open,onClose}:{open:boolean;onClose:()=>void}){
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow="";};},[open]);
  if(!open)return null;
  const navLinks=[["Features","#features"],["How It Works","#howitworks"],["Pricing","#pricing"],["FAQ","#faq"]];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(3,5,15,0.97)",backdropFilter:"blur(24px)",zIndex:200,display:"flex",flexDirection:"column",padding:"80px 32px 40px",animation:"menuIn 0.22s ease both"}}>
      <style>{`@keyframes menuIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}`}</style>
      <button onClick={onClose} style={{position:"absolute",top:16,right:22,background:"transparent",border:"none",color:"#555",fontSize:22,lineHeight:1,cursor:"pointer",fontWeight:300}}>✕</button>
      <nav style={{display:"flex",flexDirection:"column",gap:0,flex:1}}>
        {navLinks.map(([lbl,href])=>(
          <a key={href} href={href} onClick={onClose}
            style={{fontSize:"clamp(26px,7vw,42px)",fontWeight:300,color:"#888",textDecoration:"none",letterSpacing:"-0.02em",padding:"14px 0",borderBottom:"0.5px solid #0d1220",transition:"color 0.18s"}}
            onMouseEnter={(e)=>(e.currentTarget.style.color=TEAL)}
            onMouseLeave={(e)=>(e.currentTarget.style.color="#888")}>{lbl}</a>
        ))}
      </nav>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginTop:"auto"}}>
        <Link to="/login" onClick={onClose} style={{textDecoration:"none"}}>
          <button style={{width:"100%",padding:13,fontSize:11,...mono,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",background:"transparent",border:"0.5px solid #1a2240",cursor:"pointer"}}>Log In</button>
        </Link>
        <Link to="/signup" onClick={onClose} style={{textDecoration:"none"}}>
          <button style={{width:"100%",padding:13,fontSize:11,...mono,letterSpacing:"0.1em",textTransform:"uppercase",color:"#160810",background:TEAL,border:"none",cursor:"pointer"}}>Get Started Free →</button>
        </Link>
      </div>
    </div>
  );
}

// ─── PRESS BAR ───────────────────────────────────────────────────────────────
function PressBar(){
  const logos=["Product Hunt","TechCrunch","EdTech Review","The Study Blog","G2","Capterra"];
  return(
    <div style={{background:"#160810",borderTop:"0.5px solid #0d1220",borderBottom:"0.5px solid #0d1220",padding:"22px 32px"}}>
      <div style={{maxWidth:"960px",margin:"0 auto"}}>
        <div style={{...mono,fontSize:"9px",color:"#1a2030",letterSpacing:"0.18em",textTransform:"uppercase",textAlign:"center",marginBottom:"16px"}}>As featured in</div>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:"20px 44px"}}>
          {logos.map((l,i)=>(
            <div key={i} style={{...mono,fontSize:"10px",color:"#252d40",letterSpacing:"0.12em",textTransform:"uppercase",transition:"color 0.2s",cursor:"default"}}
              onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.color="#444")}
              onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.color="#252d40")}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMPARISON TABLE ────────────────────────────────────────────────────────
function ComparisonSection(){
  const rows=[
    {f:"Spaced repetition",s:true,c:false,t:false},
    {f:"Upload your own materials",s:true,c:"~",t:false},
    {f:"Recall testing",s:true,c:false,t:true},
    {f:"AI gap detection",s:true,c:false,t:false},
    {f:"Cram mode",s:true,c:false,t:false},
    {f:"Study DNA learner profile",s:true,c:false,t:false},
    {f:"Feynman method tool",s:true,c:"~",t:false},
    {f:"Session analytics",s:true,c:false,t:false},
    {f:"Always available",s:true,c:true,t:false},
  ];
  const cell=(v:any)=>v===true?<span style={{color:TEAL,fontSize:15}}>✓</span>:v==="~"?<span style={{color:GOLD,...mono,fontSize:11}}>~</span>:<span style={{color:"#1e2838",fontSize:13}}>—</span>;
  return(
    <div id="compare" style={{background:"#05080f",padding:"80px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"780px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"8px"}}>— Why Studenius</div>
          <h2 style={{fontSize:"clamp(20px,2.8vw,34px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"40px"}}>
            Built for learning.<br/><span style={{color:TEAL}}>Not for chatting.</span>
          </h2>
        </ClipReveal>
        <div style={{border:"0.5px solid #0d1220",overflow:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 120px",minWidth:460,background:"#080d1a",borderBottom:"0.5px solid #0d1220"}}>
            <div style={{padding:"12px 16px",...mono,fontSize:"9px",color:"#333",letterSpacing:"0.12em",textTransform:"uppercase"}}>Feature</div>
            {[["Studenius",TEAL],["ChatGPT","#555"],["Traditional","#444"]].map(([h,col],i)=>(
              <div key={i} style={{padding:"12px 16px",textAlign:"center",...mono,fontSize:"9px",color:col as string,letterSpacing:"0.1em",textTransform:"uppercase",borderLeft:"0.5px solid #0d1220"}}>{h}</div>
            ))}
          </div>
          {rows.map((row,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 120px",minWidth:460,borderBottom:"0.5px solid #0d1220",background:i%2===0?"#160810":"#040709",transition:"background 0.18s"}}
              onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.background="#080d1a")}
              onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.background=i%2===0?"#160810":"#040709")}>
              <div style={{padding:"11px 16px",fontSize:12,color:"#555",fontWeight:300}}>{row.f}</div>
              {[row.s,row.c,row.t].map((v,j)=>(
                <div key={j} style={{padding:"11px 16px",textAlign:"center",borderLeft:"0.5px solid #0d1220",display:"flex",alignItems:"center",justifyContent:"center"}}>{cell(v)}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 9: ROCKET ─────────────────────────────────────────────────────────
function SceneRocket(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);camera.position.set(0,0,9);
    const group=new THREE.Group();scene.add(group);group.rotation.z=-0.12;
    const white=new THREE.MeshStandardMaterial({color:0xd8dde8,roughness:0.4,metalness:0.6});
    const dark=new THREE.MeshStandardMaterial({color:0x1a1e2e,roughness:0.5,metalness:0.7});
    const orng=new THREE.MeshStandardMaterial({color:0xc86014,roughness:0.5,metalness:0.4,emissive:0x6a2800,emissiveIntensity:0.3});
    // Orbiter
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.32,2.4,16),white);body.position.y=0.4;group.add(body);
    const nose=new THREE.Mesh(new THREE.ConeGeometry(0.38,1.0,16),white);nose.position.y=2.0;group.add(nose);
    [[-0.3,1.6,0.3],[0.3,1.6,0.3]].forEach(([x,y,z])=>{const w=new THREE.Mesh(new THREE.SphereGeometry(0.09,10,10),new THREE.MeshStandardMaterial({color:0x0a1830,roughness:0.1,metalness:0.9,emissive:0x0a2040,emissiveIntensity:0.5}));w.position.set(x,y,z);group.add(w);});
    // Wings
    [1,-1].forEach(s=>{const wg=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.9,1.2),white);wg.position.set(s*0.6,-0.5,0);group.add(wg);});
    const vt=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.8,0.7),white);vt.position.set(0,-0.3,-0.35);group.add(vt);
    // External tank
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.42,3.6,16),orng);tank.position.set(0,0.3,-0.85);group.add(tank);
    const tankNose=new THREE.Mesh(new THREE.ConeGeometry(0.5,0.8,16),orng);tankNose.position.set(0,2.3,-0.85);group.add(tankNose);
    // SRBs
    [-0.9,0.9].forEach(x=>{
      const srb=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.18,3.2,12),white);srb.position.set(x,0.1,-0.85);group.add(srb);
      const srbTop=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.5,12),white);srbTop.position.set(x,1.85,-0.85);group.add(srbTop);
      const nz=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.18,0.3,10),dark);nz.position.set(x,-1.55,-0.85);group.add(nz);
      const gf=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.8,10),new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:0.75}));
      gf.rotation.x=Math.PI;gf.position.set(x,-2.0,-0.85);group.add(gf);
    });
    const eng=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.25,0.4,12),dark);eng.position.set(0,-1.0,0);group.add(eng);
    const glow1=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.9,10),new THREE.MeshBasicMaterial({color:0xff6600,transparent:true,opacity:0.8}));
    glow1.rotation.x=Math.PI;glow1.position.set(0,-1.55,0);group.add(glow1);
    // Exhaust particles
    const ep=new Float32Array(360*3);
    for(let i=0;i<360;i++){ep[i*3]=(Math.random()-0.5)*1.4;ep[i*3+1]=-1.5-Math.random()*2.2;ep[i*3+2]=(Math.random()-0.5)*1.4-0.6;}
    const epg=new THREE.BufferGeometry();epg.setAttribute("position",new THREE.BufferAttribute(ep,3));
    group.add(new THREE.Points(epg,new THREE.PointsMaterial({color:0xff6600,size:0.04,transparent:true,opacity:0.4})));
    // Stars
    const sp2=new Float32Array(500*3);
    for(let i=0;i<500;i++){const r=7+Math.random()*8,t2=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);sp2[i*3]=r*Math.sin(p)*Math.cos(t2);sp2[i*3+1]=r*Math.sin(p)*Math.sin(t2);sp2[i*3+2]=r*Math.cos(p);}
    const sg2=new THREE.BufferGeometry();sg2.setAttribute("position",new THREE.BufferAttribute(sp2,3));
    scene.add(new THREE.Points(sg2,new THREE.PointsMaterial({color:0xffffff,size:0.022,transparent:true,opacity:0.6})));
    scene.add(new THREE.AmbientLight(0x334466,0.5));
    const sun3=new THREE.DirectionalLight(0xfff8e0,2.5);sun3.position.set(4,6,3);scene.add(sun3);
    const exL=new THREE.PointLight(0xff6600,3,6);exL.position.set(0,-1.5,-0.5);scene.add(exL);
    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.006;
      group.rotation.y=mouse.x*0.3+Math.sin(t*0.2)*0.05;group.position.y=Math.sin(t*0.8)*0.08;
      glow1.material.opacity=0.6+Math.sin(t*4)*0.2;exL.intensity=2.5+Math.sin(t*5)*0.5;
      renderer.render(scene,camera);};
    tick();
    const onR=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onR);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 10: TELESCOPE ─────────────────────────────────────────────────────
function SceneTelescope(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);camera.position.set(1,0.5,6);camera.lookAt(0,0,0);
    const group=new THREE.Group();scene.add(group);group.rotation.z=0.4;
    const tubeMat=new THREE.MeshStandardMaterial({color:0x9a8866,roughness:0.5,metalness:0.7});
    const darkM=new THREE.MeshStandardMaterial({color:0x1a1a22,roughness:0.6,metalness:0.8});
    const lensM=new THREE.MeshStandardMaterial({color:0x001133,roughness:0.05,metalness:0.95,emissive:0x001844,emissiveIntensity:0.5});
    const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.32,3.2,20),tubeMat);tube.rotation.z=Math.PI/2;group.add(tube);
    const front=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.32,0.3,20),darkM);front.rotation.z=Math.PI/2;front.position.x=1.7;group.add(front);
    const lens=new THREE.Mesh(new THREE.CircleGeometry(0.3,24),lensM);lens.rotation.y=Math.PI/2;lens.position.x=1.85;group.add(lens);
    const eyeEnd=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.32,0.3,16),darkM);eyeEnd.rotation.z=Math.PI/2;eyeEnd.position.x=-1.7;group.add(eyeEnd);
    const ep2=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.22,0.5,12),darkM);ep2.rotation.z=Math.PI/2;ep2.position.x=-2.1;group.add(ep2);
    const finder=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.2,10),tubeMat);finder.rotation.z=Math.PI/2;finder.position.set(0.2,0.45,0);group.add(finder);
    [-0.8,0,0.8].forEach(x=>{const band=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.04,8,24),darkM);band.rotation.y=Math.PI/2;band.position.x=x;group.add(band);});
    const mount=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,0.5,12),darkM);mount.position.set(0,-0.55,0);group.add(mount);
    [[0.5,-0.9,0.4],[-0.5,-0.9,0.4],[0,-0.9,-0.5]].forEach(([x,y,z])=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,1.0,6),darkM);leg.position.set(x/2,y/2-0.05,z/2);leg.lookAt(x,y,z);group.add(leg);});
    const sp3=new Float32Array(500*3);
    for(let i=0;i<500;i++){const r=7+Math.random()*8,t3=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);sp3[i*3]=r*Math.sin(p)*Math.cos(t3);sp3[i*3+1]=r*Math.sin(p)*Math.sin(t3);sp3[i*3+2]=r*Math.cos(p);}
    const sg3=new THREE.BufferGeometry();sg3.setAttribute("position",new THREE.BufferAttribute(sp3,3));
    scene.add(new THREE.Points(sg3,new THREE.PointsMaterial({color:0xffffff,size:0.02,transparent:true,opacity:0.6})));
    const lg2=new THREE.Mesh(new THREE.SphereGeometry(0.07,16,16),new THREE.MeshBasicMaterial({color:0x4488ff,transparent:true,opacity:0.7}));lg2.position.x=1.88;group.add(lg2);
    scene.add(new THREE.AmbientLight(0x223344,0.6));
    const moon=new THREE.DirectionalLight(0xaabbcc,1.8);moon.position.set(-3,4,2);scene.add(moon);
    const lensL=new THREE.PointLight(0x4488ff,2,5);lensL.position.set(2,0,0);scene.add(lensL);
    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.006;
      group.rotation.y=mouse.x*0.25+Math.sin(t*0.15)*0.04;group.rotation.x=mouse.y*0.1;
      lensL.intensity=1.5+Math.sin(t*2)*0.5;renderer.render(scene,camera);};
    tick();
    const onR=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onR);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── ROCKET + TELESCOPE SECTION ──────────────────────────────────────────────
function RocketTelescopeSection(){
  return(
    <div style={{background:"#160810",padding:"80px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"8px"}}>— Explore</div>
          <h2 style={{fontSize:"clamp(20px,2.8vw,34px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"48px"}}>
            Launch your knowledge.<br/><span style={{color:TEAL}}>Discover the universe.</span>
          </h2>
        </ClipReveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1px",background:"#0d1220"}}>
          <div style={{background:"#160810"}}>
            <div style={{height:"360px",position:"relative"}}><SceneRocket/></div>
            <div style={{padding:"24px",borderTop:"0.5px solid #0d1220"}}>
              <div style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.12em",marginBottom:"8px",textTransform:"uppercase"}}>Cram Mode</div>
              <p style={{fontSize:"13px",color:"#555",fontWeight:300,lineHeight:1.6}}>Emergency study sessions that launch you from zero to ready — fast as a rocket at liftoff.</p>
            </div>
          </div>
          <div style={{background:"#160810"}}>
            <div style={{height:"360px",position:"relative"}}><SceneTelescope/></div>
            <div style={{padding:"24px",borderTop:"0.5px solid #0d1220"}}>
              <div style={{...mono,fontSize:"10px",color:GOLD,letterSpacing:"0.12em",marginBottom:"8px",textTransform:"uppercase"}}>Roadmap Generator</div>
              <p style={{fontSize:"13px",color:"#555",fontWeight:300,lineHeight:1.6}}>Point at any subject and Studenius maps the path — zero to mastery, broken into focused phases.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 11: ASTRONAUT ─────────────────────────────────────────────────────
function SceneAstronaut(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);
    camera.position.set(0,0,7);
    const group=new THREE.Group();scene.add(group);

    const suitMat=new THREE.MeshStandardMaterial({color:0xd8dde8,roughness:0.6,metalness:0.4});
    const darkMat=new THREE.MeshStandardMaterial({color:0x0a0e1a,roughness:0.3,metalness:0.9});
    const goldMat=new THREE.MeshStandardMaterial({color:0xc8902a,roughness:0.3,metalness:0.8,emissive:0x6a4800,emissiveIntensity:0.2});
    const visorMat=new THREE.MeshStandardMaterial({color:0x1a1000,roughness:0.05,metalness:1.0,emissive:0x2a1800,emissiveIntensity:0.3});

    // Helmet
    const helmet=new THREE.Mesh(new THREE.SphereGeometry(0.58,24,24),suitMat);
    helmet.position.y=1.55;group.add(helmet);
    // Visor (front half sphere)
    const visor=new THREE.Mesh(new THREE.SphereGeometry(0.42,20,20,0,Math.PI*2,0,Math.PI*0.55),visorMat);
    visor.position.set(0,1.55,0.22);group.add(visor);
    // Helmet ring
    const hring=new THREE.Mesh(new THREE.TorusGeometry(0.58,0.04,8,32),new THREE.MeshStandardMaterial({color:0x888ea0,roughness:0.3,metalness:0.9}));
    hring.position.y=1.1;group.add(hring);

    // Torso — bulky suit
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.46,1.1,16),suitMat);
    torso.position.y=0.35;group.add(torso);
    // PLSS backpack
    const plss=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.8,0.3),suitMat);
    plss.position.set(0,0.4,-0.52);group.add(plss);
    // Front chest unit
    const chest=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.15),new THREE.MeshStandardMaterial({color:0x888ea0,roughness:0.4,metalness:0.8}));
    chest.position.set(0,0.45,0.52);group.add(chest);
    // Chest display panel
    const panel=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.2,0.05),new THREE.MeshStandardMaterial({color:0x001833,roughness:0.1,metalness:0.9,emissive:0x002244,emissiveIntensity:0.6}));
    panel.position.set(0,0.48,0.6);group.add(panel);

    // Arms
    [[-0.75,0.45,0],[0.75,0.45,0]].forEach(([x,y,z],si)=>{
      // Upper arm
      const ua=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.18,0.55,12),suitMat);
      ua.position.set(x,y,z);ua.rotation.z=(si===0?1:-1)*0.55;group.add(ua);
      // Elbow joint
      const ej=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,12),suitMat);
      ej.position.set(x+(si===0?-0.18:0.18),y-0.28,z);group.add(ej);
      // Lower arm
      const la=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.15,0.5,12),suitMat);
      la.position.set(x+(si===0?-0.32:0.32),y-0.48,z+0.1);la.rotation.z=(si===0?1:-1)*0.2;group.add(la);
      // Glove
      const gl=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,12),new THREE.MeshStandardMaterial({color:0x888ea0,roughness:0.5,metalness:0.7}));
      gl.position.set(x+(si===0?-0.44:0.44),y-0.72,z+0.18);group.add(gl);
    });

    // Legs
    [[-0.28,-0.42,0],[0.28,-0.42,0]].forEach(([x,y,z])=>{
      const ul=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.18,0.6,12),suitMat);
      ul.position.set(x,y,z);group.add(ul);
      const knee=new THREE.Mesh(new THREE.SphereGeometry(0.2,12,12),suitMat);
      knee.position.set(x,y-0.38,z+0.08);group.add(knee);
      const ll=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.16,0.55,12),suitMat);
      ll.position.set(x,y-0.7,z+0.1);ll.rotation.x=0.15;group.add(ll);
      const boot=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.14,0.35),darkMat);
      boot.position.set(x,y-1.02,z+0.14);group.add(boot);
    });

    // US flag patch
    const flag=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.12,0.03),new THREE.MeshBasicMaterial({color:0x8b1a1a}));
    flag.position.set(-0.68,0.7,0.35);flag.rotation.y=-0.6;group.add(flag);

    // Floating particles around astronaut (dust/debris)
    const NP=200;const pp=new Float32Array(NP*3);
    for(let i=0;i<NP;i++){const r=1.8+Math.random()*2,t=Math.random()*Math.PI*2,p2=Math.acos(2*Math.random()-1);pp[i*3]=r*Math.sin(p2)*Math.cos(t);pp[i*3+1]=r*Math.sin(p2)*Math.sin(t)*0.7;pp[i*3+2]=r*Math.cos(p2);}
    const ppg=new THREE.BufferGeometry();ppg.setAttribute("position",new THREE.BufferAttribute(pp,3));
    scene.add(new THREE.Points(ppg,new THREE.PointsMaterial({color:0x8899aa,size:0.018,transparent:true,opacity:0.35})));

    // Earth glow at bottom
    const earth=new THREE.Mesh(new THREE.SphereGeometry(3,32,32),new THREE.MeshStandardMaterial({color:0x1a3a6e,roughness:0.8,metalness:0.1,emissive:0x0a1a3a,emissiveIntensity:0.3}));
    earth.position.set(0,-5,0);scene.add(earth);
    // Atmosphere rim
    const atm=new THREE.Mesh(new THREE.SphereGeometry(3.1,32,32),new THREE.MeshBasicMaterial({color:0x2244aa,transparent:true,opacity:0.08,side:THREE.BackSide}));
    atm.position.copy(earth.position);scene.add(atm);

    // Stars
    const NS=600;const sp=new Float32Array(NS*3);
    for(let i=0;i<NS;i++){const r=8+Math.random()*8,t=Math.random()*Math.PI*2,p2=Math.acos(2*Math.random()-1);sp[i*3]=r*Math.sin(p2)*Math.cos(t);sp[i*3+1]=r*Math.sin(p2)*Math.sin(t);sp[i*3+2]=r*Math.cos(p2);}
    const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.BufferAttribute(sp,3));
    scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.022,transparent:true,opacity:0.7})));

    scene.add(new THREE.AmbientLight(0x223355,0.4));
    const sun=new THREE.DirectionalLight(0xfff5e0,2.2);sun.position.set(5,4,3);scene.add(sun);
    const earthLight=new THREE.PointLight(0x2244aa,1.5,12);earthLight.position.set(0,-3.5,2);scene.add(earthLight);
    const rimLight=new THREE.PointLight(0x8b1a2a,0.8,10);rimLight.position.set(-4,2,1);scene.add(rimLight);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.005;
      group.rotation.y=mouse.x*0.25+Math.sin(t*0.3)*0.04;
      group.rotation.z=Math.sin(t*0.4)*0.03;
      group.position.y=Math.sin(t*0.6)*0.12;
      renderer.render(scene,camera);
    };
    tick();
    const onR=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onR);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 12: LAPTOP MOCKUP ─────────────────────────────────────────────────
function SceneLaptop(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(40,W/H,0.1,100);
    camera.position.set(0,0.8,6);camera.lookAt(0,0,0);
    const group=new THREE.Group();scene.add(group);
    group.rotation.x=-0.08;

    const bodyMat=new THREE.MeshStandardMaterial({color:0x2a2d38,roughness:0.3,metalness:0.85});
    const screenMat=new THREE.MeshStandardMaterial({color:0x030814,roughness:0.05,metalness:0.5,emissive:0x030814,emissiveIntensity:1});
    const edgeMat=new THREE.MeshStandardMaterial({color:0x1a1d26,roughness:0.4,metalness:0.9});

    // Base
    const base=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.08,2.1),bodyMat);
    base.position.y=-0.04;group.add(base);
    // Keyboard deck (slightly raised)
    const deck=new THREE.Mesh(new THREE.BoxGeometry(3.0,0.02,1.8),edgeMat);
    deck.position.set(0,0.05,-0.05);group.add(deck);
    // Trackpad
    const tp=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.01,0.45),new THREE.MeshStandardMaterial({color:0x222530,roughness:0.2,metalness:0.9}));
    tp.position.set(0,0.06,0.55);group.add(tp);

    // Lid (screen panel) - open at ~110deg
    const lid=new THREE.Group();lid.position.set(0,0.08,-1.05);lid.rotation.x=-1.9;group.add(lid);
    const screen=new THREE.Mesh(new THREE.BoxGeometry(3.0,0.06,1.85),bodyMat);
    screen.position.set(0,0,0.93);lid.add(screen);
    // Screen bezel
    const bezel=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.02,1.55),screenMat);
    bezel.position.set(0,0.04,0.95);lid.add(bezel);

    // Screen glow content (UI panels)
    const uiColors=[TEAL,PURPLE,GOLD,"#4A9EFF","#4A9EFF"];
    const uiRects=[[-0.85,0.04,0.15,0.5,0.9],[0.65,0.04,0.15,0.5,0.9],[0,0.04,0.52,0.9,0.35],[-0.6,0.04,0.62,0.25,0.18],[0.5,0.04,0.62,0.35,0.18]];
    uiRects.forEach(([x,y,z,w,h],i)=>{
      const ui=new THREE.Mesh(new THREE.BoxGeometry(w,0.01,h),
        new THREE.MeshBasicMaterial({color:uiColors[i]||TEAL,transparent:true,opacity:0.12+i*0.02}));
      ui.position.set(x as number,y as number,z as number);lid.add(ui);
    });
    // Thin glowing lines on screen
    for(let i=0;i<6;i++){
      const line=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.005,0.018),
        new THREE.MeshBasicMaterial({color:TEAL,transparent:true,opacity:0.15+i*0.02}));
      line.position.set(-0.2,0.05,0.55+i*0.12);lid.add(line);
    }

    // Keyboard keys (simplified grid)
    for(let r=0;r<4;r++)for(let c=0;c<12;c++){
      const key=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.015,0.14),edgeMat);
      key.position.set(-1.0+c*0.19,0.065,-0.08+r*0.19);group.add(key);
    }

    // Floating glow under laptop
    const glow=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.5),
      new THREE.MeshBasicMaterial({color:TEAL,transparent:true,opacity:0.03,side:THREE.DoubleSide}));
    glow.rotation.x=-Math.PI/2;glow.position.y=-0.12;scene.add(glow);

    // Ambient particles
    const NP=150;const pp=new Float32Array(NP*3);
    for(let i=0;i<NP;i++){pp[i*3]=(Math.random()-0.5)*6;pp[i*3+1]=(Math.random()-0.5)*3+0.5;pp[i*3+2]=(Math.random()-0.5)*4;}
    const ppg=new THREE.BufferGeometry();ppg.setAttribute("position",new THREE.BufferAttribute(pp,3));
    scene.add(new THREE.Points(ppg,new THREE.PointsMaterial({color:TEAL,size:0.015,transparent:true,opacity:0.25})));

    scene.add(new THREE.AmbientLight(0x334466,0.5));
    const key1=new THREE.DirectionalLight(0xffffff,1.5);key1.position.set(3,4,3);scene.add(key1);
    const fill=new THREE.DirectionalLight(0x2244aa,0.5);fill.position.set(-3,2,-2);scene.add(fill);
    const screenLight=new THREE.PointLight(TEAL,1.2,8);screenLight.position.set(0,1.5,-0.5);scene.add(screenLight);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.006;
      group.rotation.y=mouse.x*0.3+Math.sin(t*0.2)*0.04;
      group.rotation.x=-0.08+mouse.y*0.08;
      screenLight.intensity=1.0+Math.sin(t*1.5)*0.2;
      renderer.render(scene,camera);
    };
    tick();
    const onR=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onR);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE 13: 3D FLASHCARD STACK ────────────────────────────────────────────
function SceneFlashcards(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth,H=canvas.clientHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);
    camera.position.set(0,1.2,6);camera.lookAt(0,0,0);
    const group=new THREE.Group();scene.add(group);

    const cardColors=[0x8b1a2a,0x7B5EA7,0xf0a040,0x4A9EFF,0xe05050,0x44bb88];
    const cards:THREE.Group[]=[];

    cardColors.forEach((col,i)=>{
      const cg=new THREE.Group();
      const offset=i*(0.06);
      cg.position.set((i-2.5)*0.04,offset*0.5,-i*0.08);
      cg.rotation.z=(i-2.5)*0.04;
      cg.rotation.y=(i-2.5)*0.02;

      // Card body
      const card=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.5,0.03),
        new THREE.MeshStandardMaterial({color:col,roughness:0.5,metalness:0.2,emissive:col,emissiveIntensity:0.08}));
      cg.add(card);
      // Card border line at top
      const border=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.06,0.04),
        new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.9}));
      border.position.y=0.72;cg.add(border);
      // Lines on card (like ruled paper)
      for(let l=0;l<4;l++){
        const line=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.018,0.04),
          new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.1}));
        line.position.set(0,0.2-l*0.2,0.02);cg.add(line);
      }
      // Hole punch circle
      const hole=new THREE.Mesh(new THREE.CircleGeometry(0.09,16),
        new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.3}));
      hole.position.set(-0.9,0.55,0.03);cg.add(hole);
      // Binder ring
      const ring=new THREE.Mesh(new THREE.TorusGeometry(0.09,0.02,8,20),
        new THREE.MeshStandardMaterial({color:0x888ea0,roughness:0.2,metalness:0.9}));
      ring.position.set(-0.9,0.55,0.08);ring.rotation.y=Math.PI/2;cg.add(ring);

      group.add(cg);cards.push(cg);
    });

    // Scattered mini cards in background
    for(let i=0;i<8;i++){
      const mc=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.55,0.02),
        new THREE.MeshBasicMaterial({color:cardColors[i%cardColors.length],transparent:true,opacity:0.15}));
      mc.position.set((Math.random()-0.5)*5,(Math.random()-0.5)*3-0.5,(Math.random()-0.5)*2-2);
      mc.rotation.set(Math.random()*0.5,Math.random()*0.5,Math.random()*0.4);
      scene.add(mc);
    }

    scene.add(new THREE.AmbientLight(0xffffff,0.5));
    const key2=new THREE.DirectionalLight(0xffffff,1.5);key2.position.set(3,4,4);scene.add(key2);
    const fill2=new THREE.PointLight(0x7B5EA7,2,10);fill2.position.set(-3,2,2);scene.add(fill2);
    const top2=new THREE.PointLight(0x8b1a2a,1.5,8);top2.position.set(0,4,2);scene.add(top2);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-0.5)*2;mouse.y=-(e.clientY/window.innerHeight-0.5)*2;};
    window.addEventListener("mousemove",onMouse);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=0.006;
      group.rotation.y=mouse.x*0.3+Math.sin(t*0.2)*0.06;
      group.rotation.x=-0.2+mouse.y*0.12;
      // Subtle card float
      cards.forEach((c,i)=>{c.position.y+=(Math.sin(t*0.5+i*0.6)*0.04-c.position.y)*0.03;});
      renderer.render(scene,camera);
    };
    tick();
    const onR=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onR);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── ASTRONAUT HERO SECTION ───────────────────────────────────────────────────
function AstronautSection(){
  return(
    <div style={{background:"#160810",position:"relative",zIndex:2,overflow:"hidden"}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"80px 32px",display:"flex",alignItems:"center",gap:48,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 300px",position:"relative",zIndex:2}}>
          <ClipReveal>
            <div style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"12px"}}>— Mission Control</div>
            <h2 style={{fontSize:"clamp(22px,3vw,40px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",lineHeight:1.2,marginBottom:"16px"}}>
              You're the astronaut.<br/><span style={{color:TEAL}}>We're mission control.</span>
            </h2>
            <p style={{fontSize:"13px",color:"#444",lineHeight:1.75,fontWeight:300,marginBottom:"28px"}}>
              Studenius tracks your trajectory through any subject. No matter how vast the knowledge space — we map it, break it down, and navigate it with you in real time.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {["Zero to orbit in any subject","Real-time position tracking","Mission briefings before every exam"].map((txt,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:3,height:3,borderRadius:"50%",background:TEAL,flexShrink:0}}/>
                  <span style={{fontSize:"12px",color:"#555",fontWeight:300}}>{txt}</span>
                </div>
              ))}
            </div>
          </ClipReveal>
        </div>
        <div style={{flex:"1 1 380px",height:"480px",position:"relative"}}>
          <SceneAstronaut/>
          <div style={{position:"absolute",bottom:16,right:16,...mono,fontSize:"9px",color:"rgba(0,196,180,0.3)",letterSpacing:"0.12em"}}>EVA MODE</div>
        </div>
      </div>
    </div>
  );
}

// ─── LAPTOP + FLASHCARD SECTION ───────────────────────────────────────────────
function ProductShowcaseSection(){
  return(
    <div style={{background:"#05080f",padding:"80px 0",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px"}}>
        <ClipReveal>
          <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"8px"}}>— Product</div>
          <h2 style={{fontSize:"clamp(20px,2.8vw,34px)",fontWeight:300,letterSpacing:"-0.025em",color:"#F2F5F8",marginBottom:"48px"}}>
            Everything you need.<br/><span style={{color:TEAL}}>One platform.</span>
          </h2>
        </ClipReveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:"1px",background:"#0d1220"}}>
          <div style={{background:"#05080f"}}>
            <div style={{height:"340px",position:"relative"}}><SceneLaptop/></div>
            <div style={{padding:"24px",borderTop:"0.5px solid #0d1220"}}>
              <div style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:"0.12em",marginBottom:"8px",textTransform:"uppercase"}}>Dashboard</div>
              <p style={{fontSize:"13px",color:"#555",fontWeight:300,lineHeight:1.6}}>Your full study command center — sessions, progress, DNA profile, all tools — in one clean interface.</p>
            </div>
          </div>
          <div style={{background:"#05080f"}}>
            <div style={{height:"340px",position:"relative"}}><SceneFlashcards/></div>
            <div style={{padding:"24px",borderTop:"0.5px solid #0d1220"}}>
              <div style={{...mono,fontSize:"10px",color:PURPLE,letterSpacing:"0.12em",marginBottom:"8px",textTransform:"uppercase"}}>Smart Flashcards</div>
              <p style={{fontSize:"13px",color:"#555",fontWeight:300,lineHeight:1.6}}>AI-generated cards from your own materials. Spaced repetition built in. Color-coded by subject.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar(){
  const stats=[
    {n:"24,000+",label:"Students enrolled"},
    {n:"12",label:"AI-powered tools"},
    {n:"98%",label:"Retention rate"},
    {n:"4.9★",label:"Average rating"},
    {n:"140+",label:"Subjects covered"},
  ];
  return(
    <div style={{background:"#05080f",borderTop:"0.5px solid #0d1220",borderBottom:"0.5px solid #0d1220"}}>
      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px",display:"flex",flexWrap:"wrap",justifyContent:"space-around"}}>
        {stats.map((s,i)=>(
          <div key={i} style={{padding:"32px 16px",textAlign:"center",flex:"1 1 140px"}}>
            <div style={{fontSize:"clamp(22px,3vw,32px)",fontWeight:300,color:"#F2F5F8",letterSpacing:"-0.03em",marginBottom:6}}>{s.n}</div>
            <div style={{...mono,fontSize:"9px",color:"#2a3448",letterSpacing:"0.12em",textTransform:"uppercase"}}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NEWSLETTER BAR ───────────────────────────────────────────────────────────
function NewsletterBar(){
  const [email,setEmail]=useState("");
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState(false);
  const submit=()=>{
    if(!email.includes("@")){setErr(true);return;}
    setErr(false);setSent(true);
  };
  return(
    <div style={{background:"#080d1a",borderTop:"0.5px solid #0d1220",padding:"48px 32px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 80% at 50% 50%,rgba(0,196,180,0.03) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{maxWidth:"560px",margin:"0 auto",textAlign:"center",position:"relative"}}>
        <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"10px"}}>— Stay in the loop</div>
        <h3 style={{fontSize:"clamp(16px,2.5vw,24px)",fontWeight:300,color:"#E0E8F0",marginBottom:"8px",letterSpacing:"-0.02em"}}>
          Get early access + study tips
        </h3>
        <p style={{fontSize:"12px",color:"#444",marginBottom:"24px",fontWeight:300}}>No spam. Just the best AI study techniques, feature drops, and student wins.</p>
        {sent?(
          <div style={{...mono,fontSize:"11px",color:TEAL,letterSpacing:"0.08em",padding:"12px",border:`0.5px solid ${TEAL}`,background:"rgba(0,196,180,0.05)"}}>
            ✓ You're in! We'll be in touch.
          </div>
        ):(
          <div style={{display:"flex",maxWidth:420,margin:"0 auto",flexWrap:"wrap",gap:8}}>
            <input
              type="email" value={email} onChange={(e)=>{setEmail(e.target.value);setErr(false);}}
              placeholder="your@email.com"
              onKeyDown={(e)=>e.key==="Enter"&&submit()}
              style={{flex:"1 1 200px",padding:"11px 14px",background:"#160810",border:`0.5px solid ${err?"#e05050":"#1a2240"}`,color:"#E0E8F0",fontSize:12,outline:"none",fontFamily:"inherit",transition:"border-color 0.2s"}}
              onFocus={(e)=>{if(!err)e.target.style.borderColor="#333";}}
              onBlur={(e)=>{if(!err)e.target.style.borderColor="#1a2240";}}
            />
            <button onClick={submit}
              style={{padding:"11px 22px",background:TEAL,border:"none",color:"#160810",fontSize:11,...mono,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"opacity 0.15s,box-shadow 0.2s",whiteSpace:"nowrap"}}
              onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.85";e.currentTarget.style.boxShadow=`0 0 24px rgba(0,196,180,0.4)`;}}
              onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";}}>
              Join waitlist →
            </button>
          </div>
        )}
        {err&&<div style={{...mono,fontSize:"10px",color:"#e05050",marginTop:8,letterSpacing:"0.04em"}}>Please enter a valid email</div>}
        <div style={{...mono,fontSize:"9px",color:"#1e2838",marginTop:12,letterSpacing:"0.06em"}}>Free forever plan available · No credit card</div>
      </div>
    </div>
  );
}

// ─── SCROLL TO TOP ────────────────────────────────────────────────────────────
function ScrollToTop(){
  const scrollY=useScrollY();
  const visible=scrollY>600;
  return(
    <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}
      style={{position:"fixed",bottom:28,right:24,width:40,height:40,background:"rgba(3,5,15,0.9)",border:`0.5px solid ${visible?"#1a2240":"transparent"}`,color:visible?TEAL:"transparent",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:80,backdropFilter:"blur(12px)",
        opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(12px)",transition:"opacity 0.3s,transform 0.3s,border-color 0.3s,color 0.3s",pointerEvents:visible?"all":"none",...mono}}
      aria-label="Scroll to top">↑</button>
  );
}

// ─── SVG TOOL ICONS ───────────────────────────────────────────────────────────
const ToolIcons:{[key:string]:JSX.Element}={
  "🧠": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><ellipse cx="10" cy="14" rx="6" ry="8" stroke={TEAL} strokeWidth="1.2" fill="none"/><ellipse cx="18" cy="14" rx="6" ry="8" stroke={TEAL} strokeWidth="1.2" fill="none"/><path d="M14 6 Q14 10 14 14 Q14 18 14 22" stroke={TEAL} strokeWidth="0.8" strokeDasharray="2 2"/><circle cx="10" cy="9" r="1.2" fill={TEAL} opacity="0.6"/><circle cx="18" cy="9" r="1.2" fill={TEAL} opacity="0.6"/><circle cx="10" cy="19" r="1" fill={TEAL} opacity="0.4"/><circle cx="18" cy="19" r="1" fill={TEAL} opacity="0.4"/></svg>,
  "🃏": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="7" width="16" height="11" rx="1.5" stroke={PURPLE} strokeWidth="1.2" fill="none"/><rect x="7" y="10" width="16" height="11" rx="1.5" stroke={TEAL} strokeWidth="1.2" fill="none" opacity="0.5"/><line x1="6" y1="13" x2="17" y2="13" stroke={PURPLE} strokeWidth="0.7" opacity="0.4"/><line x1="6" y1="15.5" x2="14" y2="15.5" stroke={PURPLE} strokeWidth="0.7" opacity="0.4"/></svg>,
  "⚡": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polygon points="16,4 8,15 14,15 12,24 20,13 14,13" stroke={GOLD} strokeWidth="1.2" fill="none"/><line x1="14" y1="4" x2="14" y2="24" stroke={GOLD} strokeWidth="0.5" opacity="0.2" strokeDasharray="2 3"/></svg>,
  "🎯": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="10" stroke={TEAL} strokeWidth="1.2" fill="none"/><circle cx="14" cy="14" r="6" stroke={TEAL} strokeWidth="1" fill="none" opacity="0.6"/><circle cx="14" cy="14" r="2.5" fill={TEAL} opacity="0.8"/><line x1="14" y1="4" x2="14" y2="8" stroke={TEAL} strokeWidth="1"/><line x1="14" y1="20" x2="14" y2="24" stroke={TEAL} strokeWidth="1"/></svg>,
  "🔁": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 10 A7 7 0 0 1 21 10" stroke={PURPLE} strokeWidth="1.2" fill="none" strokeLinecap="round"/><path d="M21 18 A7 7 0 0 1 7 18" stroke={PURPLE} strokeWidth="1.2" fill="none" strokeLinecap="round"/><polygon points="21,7 21,13 15,10" fill={PURPLE}/><polygon points="7,15 7,21 13,18" fill={PURPLE}/></svg>,
  "📊": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="16" width="5" height="8" rx="1" stroke={GOLD} strokeWidth="1.2" fill="none"/><rect x="11.5" y="11" width="5" height="13" rx="1" stroke={GOLD} strokeWidth="1.2" fill="none"/><rect x="19" y="6" width="5" height="18" rx="1" stroke={GOLD} strokeWidth="1.2" fill="none"/><line x1="4" y1="24" x2="24" y2="24" stroke={GOLD} strokeWidth="0.8" opacity="0.4"/></svg>,
  "📓": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="6" y="4" width="16" height="20" rx="1.5" stroke={TEAL} strokeWidth="1.2" fill="none"/><line x1="10" y1="4" x2="10" y2="24" stroke={TEAL} strokeWidth="2" opacity="0.3"/><line x1="13" y1="10" x2="20" y2="10" stroke={TEAL} strokeWidth="0.8" opacity="0.5"/><line x1="13" y1="14" x2="20" y2="14" stroke={TEAL} strokeWidth="0.8" opacity="0.5"/><line x1="13" y1="18" x2="17" y2="18" stroke={TEAL} strokeWidth="0.8" opacity="0.5"/></svg>,
  "🗺️": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><polygon points="4,6 11,4 17,6 24,4 24,22 17,24 11,22 4,24" stroke={PURPLE} strokeWidth="1.2" fill="none"/><line x1="11" y1="4" x2="11" y2="22" stroke={PURPLE} strokeWidth="0.7" opacity="0.4"/><line x1="17" y1="6" x2="17" y2="24" stroke={PURPLE} strokeWidth="0.7" opacity="0.4"/><path d="M7 12 Q10 10 13 13 Q16 16 20 12" stroke={GOLD} strokeWidth="1" fill="none" strokeLinecap="round"/></svg>,
  "💡": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 5 A7 7 0 0 1 14 19" stroke={GOLD} strokeWidth="1.2" fill="none"/><path d="M14 5 A7 7 0 0 0 14 19" stroke={GOLD} strokeWidth="1.2" fill="none" opacity="0.5"/><rect x="11" y="19" width="6" height="2.5" rx="0.5" stroke={GOLD} strokeWidth="1" fill="none"/><rect x="11.5" y="21.5" width="5" height="1.5" rx="0.5" stroke={GOLD} strokeWidth="0.8" fill="none"/><line x1="14" y1="3" x2="14" y2="5" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/><line x1="7" y1="6" x2="8.5" y2="7.5" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/><line x1="21" y1="6" x2="19.5" y2="7.5" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/></svg>,
  "📚": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="4" y="5" width="9" height="18" rx="1" stroke={TEAL} strokeWidth="1.2" fill="none"/><rect x="15" y="5" width="9" height="18" rx="1" stroke={PURPLE} strokeWidth="1.2" fill="none"/><line x1="7" y1="9" x2="10" y2="9" stroke={TEAL} strokeWidth="0.8" opacity="0.5"/><line x1="7" y1="12" x2="10" y2="12" stroke={TEAL} strokeWidth="0.8" opacity="0.5"/><line x1="18" y1="9" x2="21" y2="9" stroke={PURPLE} strokeWidth="0.8" opacity="0.5"/><line x1="18" y1="12" x2="21" y2="12" stroke={PURPLE} strokeWidth="0.8" opacity="0.5"/></svg>,
  "🧬": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M11 4 Q17 8 11 13 Q17 18 11 22" stroke={TEAL} strokeWidth="1.4" fill="none" strokeLinecap="round"/><path d="M17 4 Q11 8 17 13 Q11 18 17 22" stroke={PURPLE} strokeWidth="1.4" fill="none" strokeLinecap="round"/><line x1="11" y1="8.5" x2="17" y2="8.5" stroke={GOLD} strokeWidth="0.9" opacity="0.6"/><line x1="11" y1="13" x2="17" y2="13" stroke={GOLD} strokeWidth="0.9" opacity="0.6"/><line x1="11" y1="17.5" x2="17" y2="17.5" stroke={GOLD} strokeWidth="0.9" opacity="0.6"/></svg>,
  "⏱️": <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="15" r="9" stroke={TEAL} strokeWidth="1.2" fill="none"/><line x1="14" y1="15" x2="14" y2="10" stroke={TEAL} strokeWidth="1.4" strokeLinecap="round"/><line x1="14" y1="15" x2="18" y2="17" stroke={TEAL} strokeWidth="1.2" strokeLinecap="round"/><line x1="11" y1="4" x2="17" y2="4" stroke={TEAL} strokeWidth="1.2" strokeLinecap="round"/><line x1="14" y1="4" x2="14" y2="6" stroke={TEAL} strokeWidth="1.2"/></svg>,
};

// ─── TOAST NOTIFICATION ───────────────────────────────────────────────────────
function Toast({msg,visible,color=TEAL}:{msg:string;visible:boolean;color?:string}){
  return(
    <div style={{position:"fixed",bottom:76,right:24,zIndex:90,
      background:"rgba(3,5,15,0.95)",border:`0.5px solid ${color}`,
      padding:"10px 18px",backdropFilter:"blur(16px)",
      opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",
      transition:"opacity 0.3s,transform 0.3s",pointerEvents:"none"}}>
      <span style={{...mono,fontSize:"11px",color,letterSpacing:"0.06em"}}>{msg}</span>
    </div>
  );
}

// ─── GRAIN OVERLAY ────────────────────────────────────────────────────────────
function GrainOverlay(){ return <div id="grain-overlay" aria-hidden="true"/>; }

// ─── PAGE TRANSITION WRAPPER ──────────────────────────────────────────────────
function PageFade({children}:{children:React.ReactNode}){
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),10);return()=>clearTimeout(t);},[]);
  return(
    <div style={{opacity:show?1:0,transition:"opacity 0.4s ease",minHeight:"100vh"}}>
      {children}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Landing(){
  useSmoothScroll();
  const scrollY=useScrollY();
  const [navScrolled,setNavScrolled]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [toast,setToast]=useState({msg:"",visible:false,color:TEAL});

  const showToast=(msg:string,color=TEAL)=>{
    setToast({msg,visible:true,color});
    setTimeout(()=>setToast(t=>({...t,visible:false})),2800);
  };

  useEffect(()=>{setNavScrolled(scrollY>20);},[scrollY]);

  // ESC closes mobile menu
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setMenuOpen(false);};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  return(<ToastCtx.Provider value={showToast}>
    {/* Loading screen — outside PageFade so it renders immediately without fade delay */}
    {!loaded&&<LoadingScreen onDone={()=>setLoaded(true)}/>}

    <PageFade>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",
        background:`linear-gradient(180deg,${VOID} 0%,#060D1F 100%)`,
        color:"#E0E8F0",fontFamily:"'Nunito',system-ui,sans-serif"}}>
        <style>{CSS}</style>

      {/* Grain overlay */}
      <GrainOverlay/>

      {/* Custom cursor */}
      <CursorGlow/>

      {/* Toast */}
      <Toast msg={toast.msg} visible={toast.visible} color={toast.color}/>

      {/* Mobile menu overlay */}
      <MobileMenu open={menuOpen} onClose={()=>setMenuOpen(false)}/>

      {/* Scroll to top */}
      <ScrollToTop/>

      {/* H: Scroll progress */}
      <ScrollProgressLine/>

      {/* Nav */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:48,
        borderBottom:navScrolled?"0.5px solid rgba(0,196,180,0.18)":"0.5px solid #0d1220",
        background:navScrolled?"rgba(3,5,15,0.96)":"rgba(3,5,15,0.88)",
        backdropFilter:"blur(24px)",position:"sticky",top:0,zIndex:50,
        transition:"background 0.3s,border-color 0.3s",
        boxShadow:navScrolled?"0 1px 40px rgba(0,196,180,0.07)":"none"}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:"0.22em",color:"#E0E8F0",...mono}}>STUDENIUS</span>
        {/* Desktop links */}
        <div className="hide-mobile" style={{display:"flex",alignItems:"center",gap:24}}>
          {[["Features","#features"],["How It Works","#howitworks"],["Pricing","#pricing"],["FAQ","#faq"]].map(([lbl,href])=>(
            <a key={href} href={href}
              style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:"#444",textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
              onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>{lbl}</a>
          ))}
          <Link to="/login" style={{fontSize:10,fontWeight:600,letterSpacing:"0.14em",textTransform:"uppercase",color:"#444",textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={(e)=>(e.currentTarget.style.color="#E0E8F0")}
            onMouseLeave={(e)=>(e.currentTarget.style.color="#444")}>Login</Link>
          <Link to="/signup">
            <button
              onClick={()=>showToast("✓ Redirecting to signup…",TEAL)}
              style={{fontSize:11,fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"6px 16px",cursor:"pointer",letterSpacing:"0.06em",transition:"opacity 0.15s,box-shadow 0.2s"}}
              onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.8";e.currentTarget.style.boxShadow=`0 0 28px rgba(0,196,180,0.5)`;}}
              onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";}}>
              Get Started
            </button>
          </Link>
        </div>
        {/* Mobile hamburger */}
        <button className="show-mobile" onClick={()=>setMenuOpen(true)}
          style={{display:"none",background:"transparent",border:"none",color:"#E0E8F0",fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}}
          aria-label="Open menu">☰</button>
      </nav>

      {/* ── HERO SECTION with scoped space background ── */}
      <div style={{position:"relative",overflow:"hidden",background:VOID,zIndex:2,isolation:"isolate"}}>
        {/* Three.js hero galaxy — full bleed behind everything */}
        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>
          <HeroGalaxy/>
        </div>
        {/* Legacy space bg layers — subtle overlay */}
        <div style={{position:"absolute",inset:0,zIndex:1,pointerEvents:"none",overflow:"hidden",opacity:0.5}}>
          <NebulaLayer/>
          <BinaryRain/>
          <TwinklingStars count={70}/>
        </div>
        {/* D: Hero + mouse parallax */}
        <div style={{position:"relative",zIndex:2,overflow:"hidden"}}><HeroSection/></div>
        {/* Clean fade into 3D section */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"120px",zIndex:3,pointerEvents:"none",
          background:`linear-gradient(to bottom, transparent, ${VOID})`}}/>
      </div>

      {/* ── 3D JOURNEY SECTION ── */}
      <div data-gsap="three-scene" style={{position:"relative", zIndex:1}}>
        <ThreeDJourneySection/>
      </div>

      {/* E: Stats strip — single source of truth */}
      <div style={hairline}/>
      <div style={{background:"rgba(4,6,14,0.96)",borderBottom:"0.5px solid #0d1220",position:"relative",zIndex:2,overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 100% at 50% 50%,rgba(0,196,180,0.03) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div data-gsap="stat-strip" style={{maxWidth:"960px",margin:"0 auto",padding:"0 32px",display:"flex",flexWrap:"wrap",justifyContent:"space-around"}}>
          <AnimatedCounter target={24}  suffix="k+" label="Students Enrolled"/>
          <AnimatedCounter target={12}  suffix="+"  label="AI Study Tools"/>
          <AnimatedCounter target={98}  suffix="%"  label="Retention Rate"/>
          <AnimatedCounter target={4.9} suffix="★"  label="Average Rating"/>
          <AnimatedCounter target={140} suffix="+"  label="Subjects Covered"/>
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
            <div id="features" style={{maxWidth:"1100px",margin:"0 auto",padding:"60px 32px 0",position:"relative",zIndex:1}}>
              <div style={sectionLabel}><span>Tools</span><span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}}/></div>
            </div>
          </ClipReveal>
          <StickyFeatureShowcase/>
        </div>

        <div style={hairline}/>

        {/* Press bar */}
        <PressBar/>

        <div style={hairline}/>

        {/* A: Marquee #2 */}
        <MarqueeDivider/>

        {/* C: Word-by-word manifesto */}
        <WordReveal/>

        <div style={hairline}/>

        {/* F: Horizontal scroll */}
        <HorizontalScrollGallery/>

        {/* 3D Showcase — Brain, DNA, Crystal */}
        <div id="showcase">
          <ThreeDShowcaseSection/>
        </div>

        <div style={hairline}/>

        {/* Rocket + Telescope */}
        <RocketTelescopeSection/>

        <div style={hairline}/>

        {/* How It Works */}
        <div id="howitworks">
          <HowItWorksSection/>
        </div>

        <div style={hairline}/>

        {/* Space Objects — Satellite + Asteroid */}
        <SpaceObjectsSection/>

        <div style={hairline}/>

        {/* Astronaut */}
        <AstronautSection/>

        <div style={hairline}/>

        {/* Laptop + Flashcard 3D */}
        <ProductShowcaseSection/>

        <div style={hairline}/>

        {/* Comparison table */}
        <ComparisonSection/>

        <div style={hairline}/>

        {/* G: Testimonials */}
        <div style={{background:"#160810",padding:"80px 0",position:"relative",zIndex:2}}>
          <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 32px"}}>
            <SectionParticles count={18} color={GOLD}/>
            <ClipReveal>
              <div style={sectionLabel}><span>Testimonials</span><span style={{flex:1,height:"0.5px",background:"#0d1220",display:"block"}}/></div>
            </ClipReveal>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1px",background:"#0d1220"}}>
              {testimonials.map((t,i)=>(
                <ClipReveal key={t.name} delay={i*0.07}>
                  <div data-gsap="testimonial-card" style={{background:"#160810",padding:"24px",height:"100%",display:"flex",flexDirection:"column",gap:14,transition:"background 0.2s"}}
                    onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.background="#080d1a")}
                    onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.background="#160810")}>
                    {/* Stars */}
                    <div style={{display:"flex",gap:3}}>
                      {Array(t.stars).fill(0).map((_,si)=>(
                        <span key={si} style={{color:GOLD,fontSize:11}}>★</span>
                      ))}
                    </div>
                    {/* Quote */}
                    <p style={{fontSize:"13px",color:"#666",lineHeight:1.7,fontWeight:300,flex:1}}>"{t.text}"</p>
                    {/* Avatar + name */}
                    <div style={{display:"flex",alignItems:"center",gap:12,marginTop:"auto"}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${t.color}22,${t.color}44)`,border:`0.5px solid ${t.color}44`,display:"flex",alignItems:"center",justifyContent:"center",...mono,fontSize:10,color:t.color,letterSpacing:"0.05em",flexShrink:0}}>
                        {t.initials}
                      </div>
                      <div>
                        <div style={{fontSize:12,color:"#888",fontWeight:500}}>{t.name}</div>
                        <div style={{...mono,fontSize:9,color:"#333",letterSpacing:"0.08em",textTransform:"uppercase",marginTop:1}}>{t.role}</div>
                      </div>
                    </div>
                  </div>
                </ClipReveal>
              ))}
            </div>
          </div>
        </div>

        <div style={hairline}/>

        {/* Pricing */}
        <div id="pricing">
          <PricingSection/>
        </div>

        <div style={hairline}/>

        {/* FAQ */}
        <div id="faq">
          <FAQSection/>
        </div>

        <div style={hairline}/>

        {/* CTA */}
        <div style={{maxWidth:"720px",margin:"0 auto",width:"100%",padding:"80px 32px",position:"relative",textAlign:"center"}}>
          <SectionParticles count={30} color={TEAL}/>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 60% 40% at 50% 50%,rgba(0,196,180,0.05) 0%,transparent 70%)"}}/>
          <ClipReveal>
            <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:"16px"}}>— Start Today</div>
            <h2 style={{fontSize:"clamp(24px,3.5vw,42px)",fontWeight:300,letterSpacing:"-0.02em",marginBottom:"12px",lineHeight:1.2}}>
              Ready to study<br/><span style={{color:TEAL}}>smarter?</span>
            </h2>
          </ClipReveal>
          <ClipReveal delay={0.08}><p style={{fontSize:"14px",color:"#555",marginBottom:"32px",fontWeight:300}}>Start free. No credit card required. Cancel anytime.</p></ClipReveal>
          <ClipReveal delay={0.16}>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <Link to="/signup">
                <button
                  onClick={()=>showToast("✓ Redirecting to signup…",TEAL)}
                  style={{fontSize:"12px",fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"12px 28px",cursor:"pointer",letterSpacing:"0.04em",transition:"opacity 0.15s,box-shadow 0.2s,transform 0.2s"}}
                  onMouseEnter={(e)=>{e.currentTarget.style.opacity="0.82";e.currentTarget.style.boxShadow=`0 0 48px rgba(0,196,180,0.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                  Get started free →
                </button>
              </Link>
              <Link to="/login">
                <button style={{fontSize:"12px",fontWeight:600,color:"#555",background:"transparent",border:"0.5px solid #1a2240",padding:"12px 28px",cursor:"pointer",letterSpacing:"0.04em",transition:"color 0.2s,border-color 0.2s"}}
                  onMouseEnter={(e)=>{e.currentTarget.style.color="#E0E8F0";e.currentTarget.style.borderColor="#333";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#1a2240";}}>
                  Sign in
                </button>
              </Link>
            </div>
          </ClipReveal>
        </div>

        {/* Mobile app teaser */}
        <div style={{background:"#160810",borderTop:"0.5px solid #0d1220",padding:"48px 32px",textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 50% 60% at 50% 50%,rgba(123,94,167,0.04) 0%,transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"relative",maxWidth:560,margin:"0 auto"}}>
            <div style={{...mono,fontSize:"9px",color:"#1e2838",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:12}}>— Coming Soon</div>
            <h3 style={{fontSize:"clamp(16px,2.5vw,22px)",fontWeight:300,color:"#E0E8F0",marginBottom:8,letterSpacing:"-0.02em"}}>
              Studenius on iOS & Android
            </h3>
            <p style={{fontSize:"12px",color:"#333",marginBottom:24,fontWeight:300}}>Study on the go. Same 12 tools, same Study DNA — in your pocket.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              {["App Store","Google Play"].map((store,i)=>(
                <button key={i}
                  onClick={()=>showToast("Notify me when available →",PURPLE)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:"transparent",border:"0.5px solid #1a2240",color:"#444",...mono,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",cursor:"pointer",transition:"color 0.2s,border-color 0.2s"}}
                  onMouseEnter={(e)=>{e.currentTarget.style.color="#E0E8F0";e.currentTarget.style.borderColor="#333";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.color="#444";e.currentTarget.style.borderColor="#1a2240";}}>
                  <span style={{fontSize:14}}>{i===0?"":"🤖"}</span>
                  {store}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={hairline}/>

        {/* Newsletter */}
        <NewsletterBar/>

        {/* Footer */}
        <footer style={{borderTop:"0.5px solid #0d1220",background:"#160810"}}>
          <div style={{maxWidth:"1100px",margin:"0 auto",padding:"32px 32px 24px",display:"flex",flexWrap:"wrap",justifyContent:"space-between",alignItems:"flex-start",gap:"32px"}}>
            <div>
              <div style={{...mono,fontSize:"13px",fontWeight:700,letterSpacing:"0.22em",color:"#E0E8F0",marginBottom:"8px"}}>STUDENIUS</div>
              <div style={{fontSize:"11px",color:"#2a3448",fontWeight:300,maxWidth:220,lineHeight:1.6}}>The AI study platform built for students who want to actually learn.</div>
            </div>
            <div style={{display:"flex",gap:"48px",flexWrap:"wrap"}}>
              {[
                {heading:"Product",links:[["Features","#features"],["How It Works","#howitworks"],["Pricing","#pricing"]]},
                {heading:"Account",links:[["Log In","/login"],["Sign Up","/signup"]]},
                {heading:"Info",links:[["FAQ","#faq"],["Compare","#compare"]]},
              ].map((col)=>(
                <div key={col.heading}>
                  <div style={{...mono,fontSize:"9px",color:"#2a3448",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"12px"}}>{col.heading}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    {col.links.map(([lbl,href])=>(
                      href.startsWith("#")
                        ? <a key={lbl} href={href} style={{fontSize:"11px",color:"#444",textDecoration:"none",transition:"color 0.15s"}}
                            onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.color="#888")}
                            onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.color="#444")}>{lbl}</a>
                        : <Link key={lbl} to={href} style={{fontSize:"11px",color:"#444",textDecoration:"none",transition:"color 0.15s"}}
                            onMouseEnter={(e)=>((e.currentTarget as HTMLElement).style.color="#888")}
                            onMouseLeave={(e)=>((e.currentTarget as HTMLElement).style.color="#444")}>{lbl}</Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{borderTop:"0.5px solid #0d1220",maxWidth:"1100px",margin:"0 auto",padding:"16px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <span style={{...mono,fontSize:"10px",color:"#1e2838",letterSpacing:"0.06em"}}>STUDENIUS © {new Date().getFullYear()}</span>
            <span style={{...mono,fontSize:"10px",color:"#1a2030",letterSpacing:"0.06em"}}>Built for students. Powered by AI.</span>
          </div>
        </footer>
      </div>{/* ── end sections wrapper ── */}
    </div>{/* ── end main content ── */}
    </PageFade>
  </ToastCtx.Provider>);
}
