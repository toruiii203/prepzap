/**
 * STUDENIUS — Cinematic 3D Landing Page
 * Five distinct Three.js scenes driven by scroll.
 * Each scene is its own canvas with its own RAF loop.
 * Scroll-pinned ThreeDJourneySection transitions between them.
 *
 * PATCHES APPLIED:
 * 1. useThree: setup stored in ref to avoid stale closure on empty dep array
 * 2. GPU memory: all scene cleanups now dispose geometries AND materials
 * 3. pts[a] guard added in SceneConstellation edges (was only checking pts[b])
 * 4. Cleanup fn return type corrected to (() => void) | void
 * 5. HeroGalaxy canvas size uses getBoundingClientRect to avoid clientWidth=0
 * 6. SceneGalaxy Z warp scale capped to stay within frustum (far=300)
 * 7. shVel scoped correctly inside setup; resets cleanly on remount
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

const TEAL   = "#00C4B4";
const GOLD   = "#E8B923";
const PURPLE = "#7B5EA7";
const VOID   = "#03050F";
const mono: React.CSSProperties = { fontFamily:"'Geist Mono','Courier New',monospace" };

const lerp = (a:number,b:number,t:number) => a+(b-a)*t;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:auto;}
  body{overflow-x:hidden;background:#03050f;}
  ::selection{background:rgba(0,196,180,0.25);}

  @keyframes hero-enter{from{opacity:0;transform:translateY(44px);filter:blur(6px);}to{opacity:1;transform:translateY(0);filter:blur(0);}}
  @keyframes glitch1{0%,100%{clip-path:inset(20% 0 55% 0);transform:translate(-2px,0);}50%{clip-path:inset(35% 0 15% 0);transform:translate(3px,0);}}
  @keyframes glitch2{0%,100%{clip-path:inset(65% 0 8% 0);transform:translate(2px,0);}50%{clip-path:inset(5% 0 70% 0);transform:translate(-1px,0);}}
  @keyframes pulse-glow{0%,100%{opacity:.55;}50%{opacity:1;}}
  @keyframes float-slow{0%,100%{transform:translateY(0);}50%{transform:translateY(-18px);}}
  @keyframes spin-slow{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes spin-rev{from{transform:rotate(360deg);}to{transform:rotate(0deg);}}
  @keyframes beam-sweep{0%,100%{opacity:0;transform:translateX(-10%);}50%{opacity:1;transform:translateX(110vw);}}
  @keyframes mote-drift{0%{transform:translate(0,0);}25%{transform:translate(8px,-12px);}50%{transform:translate(-5px,-20px);}75%{transform:translate(-12px,-8px);}100%{transform:translate(0,0);}}
  @keyframes binary-fall{from{transform:translateY(-40px);opacity:0;}10%{opacity:1;}90%{opacity:1;}to{transform:translateY(130vh);opacity:0;}}
  @keyframes marquee-left{from{transform:translateX(0);}to{transform:translateX(-50%);}}
  @keyframes marquee-right{from{transform:translateX(-50%);}to{transform:translateX(0);}}
  @keyframes warp-flicker{0%,100%{opacity:0.18;}50%{opacity:0.55;}}

  #scroll-bar{position:fixed;top:0;left:0;width:100%;height:1.5px;z-index:9999;
    background:linear-gradient(90deg,#00C4B4,#7B5EA7,#E8B923);
    transform-origin:left center;pointer-events:none;}

  .mq-wrap{overflow:hidden;position:relative;}
  .mq-wrap::before,.mq-wrap::after{content:'';position:absolute;top:0;bottom:0;width:110px;z-index:2;pointer-events:none;}
  .mq-wrap::before{left:0;background:linear-gradient(90deg,#03050f,transparent);}
  .mq-wrap::after{right:0;background:linear-gradient(-90deg,#03050f,transparent);}
  .mq-l{display:flex;width:max-content;white-space:nowrap;animation:marquee-left 30s linear infinite;}
  .mq-r{display:flex;width:max-content;white-space:nowrap;animation:marquee-right 42s linear infinite;}

  .clip-reveal{clip-path:inset(0 100% 0 0);transition:clip-path 1.1s cubic-bezier(0.16,1,0.3,1);}
  .clip-reveal.in{clip-path:inset(0 0% 0 0);}

  .wd{color:rgba(255,255,255,0.08);transition:color .45s,text-shadow .45s;display:inline-block;margin-right:.28em;}
  .wd-lit{color:#F2F5F8!important;text-shadow:0 0 40px rgba(0,196,180,0.45);}
  .wd-past{color:rgba(255,255,255,0.22)!important;}

  .sticky-left{position:sticky;top:88px;align-self:flex-start;}
`;

const MARQUEE_ITEMS = ["BrainBot","Cram Mode","Flashcards","Recall Mode","Feynman Mode","High Yield","Roadmap","Study DNA","Mistake Journal","Focus Timer","Source Library","Confidence","Practice","Spaced Rep","Pomodoro"];
const MANIFESTO = "Stop highlighting. Stop re-reading. Start recalling. Build understanding that lasts past the exam and stays with you forever.";

const features = [
  {n:"01",title:"AI Tutor (BrainBot)",    desc:"Ask anything — Explain, ELI5, Analogy, Quiz, Debate, Summary",      icon:"🧠",color:TEAL},
  {n:"02",title:"Practice & Flashcards",  desc:"AI-generated questions and spaced-repetition from your materials",   icon:"🃏",color:PURPLE},
  {n:"03",title:"Cram Mode",              desc:"Emergency timed session — AI breaks subjects into prioritised topics",icon:"⚡",color:GOLD},
  {n:"04",title:"High Yield Detector",    desc:"Identifies the most testable concepts and drills you instantly",      icon:"🎯",color:"#4A9EFF"},
  {n:"05",title:"Recall Mode",            desc:"Type from memory and get scored — the hardest way to study",          icon:"🔁",color:"#FF6B6B"},
  {n:"06",title:"Confidence Calibration", desc:"Sort every concept into Know / Shaky / No idea",                     icon:"📊",color:"#A78BFA"},
  {n:"07",title:"Mistake Journal",        desc:"Log errors with spaced-repetition — overdue items resurface",        icon:"📓",color:TEAL},
  {n:"08",title:"Roadmap Generator",      desc:"Zero-to-mastery plan for any subject, broken into phases",           icon:"🗺️",color:PURPLE},
  {n:"09",title:"Feynman Mode",           desc:"Teach the AI — it pokes holes until you truly understand",           icon:"💡",color:GOLD},
  {n:"10",title:"Source Library",         desc:"Upload PDFs, images, or notes — every tool reads them",              icon:"📚",color:"#4A9EFF"},
  {n:"11",title:"Study DNA",              desc:"Your living learner profile — adapts and reveals your patterns",     icon:"🧬",color:"#FF6B6B"},
  {n:"12",title:"Focus Timer + Progress", desc:"Built-in Pomodoro with activity tracking and session analytics",     icon:"⏱️",color:"#A78BFA"},
];

const testimonials = [
  {name:"Maria S.", role:"Nursing Student",     text:"Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try."},
  {name:"James W.", role:"Medical Student",      text:"Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly."},
  {name:"Sarah C.", role:"Teacher",             text:"Feynman Mode exposed every gap in my knowledge. Not just for exams — for any subject."},
  {name:"Ahmed R.", role:"Engineering Student", text:"High Yield Detector told me exactly what to study before finals. Went from C to A."},
];

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useScrollProgress(){
  const [p,setP]=useState(0);
  useEffect(()=>{
    const h=()=>{const max=document.documentElement.scrollHeight-window.innerHeight;setP(max>0?window.scrollY/max:0);};
    window.addEventListener("scroll",h,{passive:true});
    return ()=>window.removeEventListener("scroll",h);
  },[]);
  return p;
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
  const rawRef=useRef({x:0,y:0});
  const smoothRef=useRef({x:0,y:0});
  const [pos,setPos]=useState({x:0,y:0});
  const rafRef=useRef<number>(0);
  useEffect(()=>{
    const onMove=(e:MouseEvent)=>{rawRef.current={x:(e.clientX/window.innerWidth-.5)*2,y:(e.clientY/window.innerHeight-.5)*2};};
    window.addEventListener("mousemove",onMove,{passive:true});
    const tick=()=>{
      smoothRef.current={x:lerp(smoothRef.current.x,rawRef.current.x,.06),y:lerp(smoothRef.current.y,rawRef.current.y,.06)};
      setPos({...smoothRef.current});rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return ()=>{window.removeEventListener("mousemove",onMove);cancelAnimationFrame(rafRef.current);};
  },[]);
  return pos;
}

// ─── THREE.JS LOADER ──────────────────────────────────────────────────────────
// FIX #1 & #4: setup stored in ref so effect never re-runs with a stale closure.
// Return type is (() => void) | void — cleanup is optional, not forced.
function useThree(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  setup: (T: any, c: HTMLCanvasElement) => (() => void) | void
) {
  const setupRef = useRef(setup);
  useEffect(() => { setupRef.current = setup; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let cleanup: (() => void) | void;

    const run = (T: any) => {
      if (!alive) return;
      cleanup = setupRef.current(T, canvas);
    };

    if ((window as any).THREE) {
      run((window as any).THREE);
    } else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
      s.onload = () => run((window as any).THREE);
      document.head.appendChild(s);
    }

    return () => {
      alive = false;
      if (typeof cleanup === "function") cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── SCENE A: SPIRAL GALAXY ───────────────────────────────────────────────────
function SceneGalaxy({progress}:{progress:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<any>({progress:0});
  stateRef.current.progress=progress;

  const setup=useCallback((THREE:any,canvas:HTMLCanvasElement)=>{
    // FIX #5: getBoundingClientRect avoids clientWidth=0 on first paint
    const rect=canvas.getBoundingClientRect();
    const W=rect.width||window.innerWidth,H=rect.height||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(72,W/H,.1,300);
    camera.position.z=6;

    // FIX #2: track all geometries and materials for disposal
    const geometries:any[]=[], materials:any[]=[];
    const tG=(g:any)=>{geometries.push(g);return g;};
    const tM=(m:any)=>{materials.push(m);return m;};

    const SN=7000;const sPos=new Float32Array(SN*3),sCol=new Float32Array(SN*3);
    for(let i=0;i<SN;i++){
      const r=8+Math.random()*60,t2=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      sPos[i*3]=r*Math.sin(phi)*Math.cos(t2);sPos[i*3+1]=r*Math.sin(phi)*Math.sin(t2);sPos[i*3+2]=r*Math.cos(phi);
      const warm=Math.random()<.1,b=.3+Math.random()*.7;
      sCol[i*3]=warm?b*.9:b*.75;sCol[i*3+1]=warm?b*.7:b*.88;sCol[i*3+2]=warm?b*.15:b;
    }
    const sGeo=tG(new THREE.BufferGeometry());
    sGeo.setAttribute("position",new THREE.BufferAttribute(sPos,3));
    sGeo.setAttribute("color",new THREE.BufferAttribute(sCol,3));
    const sMat=tM(new THREE.PointsMaterial({size:.022,vertexColors:true,transparent:true,opacity:.85}));
    const stars=new THREE.Points(sGeo,sMat);
    scene.add(stars);

    const GN=8000,arms=3;
    const gPos=new Float32Array(GN*3),gCol=new Float32Array(GN*3);
    const palette=[[0,0.77,0.71],[0.48,0.37,0.65],[0.91,0.73,0.14]];
    for(let i=0;i<GN;i++){
      const arm=i%arms;const t=(i/GN)*Math.PI*9+(arm/arms)*Math.PI*2;
      const r=.25+(i/GN)*4.5+Math.random()*.5;const spread=.08+(i/GN)*.55;
      gPos[i*3]=Math.cos(t)*r+(Math.random()-.5)*spread;
      gPos[i*3+1]=(Math.random()-.5)*spread*.35;
      gPos[i*3+2]=Math.sin(t)*r+(Math.random()-.5)*spread;
      const [cr,cg,cb]=palette[arm];const b=.45+Math.random()*.55;
      gCol[i*3]=cr*b;gCol[i*3+1]=cg*b;gCol[i*3+2]=cb*b;
    }
    const gGeo=tG(new THREE.BufferGeometry());
    gGeo.setAttribute("position",new THREE.BufferAttribute(gPos,3));
    gGeo.setAttribute("color",new THREE.BufferAttribute(gCol,3));
    const galaxyMat=tM(new THREE.PointsMaterial({size:.024,vertexColors:true,transparent:true,opacity:.9}));
    const galaxy=new THREE.Points(gGeo,galaxyMat);
    scene.add(galaxy);

    const coreMat=tM(new THREE.MeshBasicMaterial({color:0x00C4B4,transparent:true,opacity:.85}));
    const core=new THREE.Mesh(tG(new THREE.SphereGeometry(.22,32,32)),coreMat);
    scene.add(core);

    const MN=2200;
    const mPos=new Float32Array(MN*3),mCol=new Float32Array(MN*3);
    for(let i=0;i<MN;i++){
      const t=(i/MN)*Math.PI*5+(i%2)*Math.PI;const r=.18+(i/MN)*2.2+Math.random()*.2;
      mPos[i*3]=Math.cos(t)*r*1.6+3.2+(Math.random()-.5)*.18;
      mPos[i*3+1]=(Math.random()-.5)*.15;
      mPos[i*3+2]=Math.sin(t)*r+(Math.random()-.5)*.18;
      const b=.4+Math.random()*.6;
      mCol[i*3]=b*.48;mCol[i*3+1]=b*.37;mCol[i*3+2]=b*.65;
    }
    const mGeo=tG(new THREE.BufferGeometry());
    mGeo.setAttribute("position",new THREE.BufferAttribute(mPos,3));
    mGeo.setAttribute("color",new THREE.BufferAttribute(mCol,3));
    scene.add(new THREE.Points(mGeo,tM(new THREE.PointsMaterial({size:.016,vertexColors:true,transparent:true,opacity:.65}))));

    ([[0x00C4B4,[-1.8,.7,-1],.14],[0x7B5EA7,[1.6,-.5,-1.5],.2],[0xE8B923,[.4,-1.2,-1.2],.09]] as [number,number[],number][]).forEach(([col,pos,r])=>{
      const m=new THREE.Mesh(tG(new THREE.SphereGeometry(r,16,16)),tM(new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.7})));
      m.position.set(pos[0],pos[1],pos[2]);scene.add(m);
    });

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-.5)*2;mouse.y=-(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener("mousemove",onMouse,{passive:true});
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick);t+=.004;
      const p=stateRef.current.progress??0;
      galaxy.rotation.y=t+mouse.x*.28;
      galaxy.rotation.x=mouse.y*.14+p*.35;
      stars.rotation.y=t*.018+mouse.x*.04;
      // FIX #6: cap Z scale so geometry stays inside frustum (far=300)
      const warpT=Math.max(0,(p-.7)/.3);
      const scaleZ=Math.min(1+p*5+warpT*8, 18);
      galaxy.scale.set(1+p*.18+warpT*.4, 1+p*.18+warpT*.4, scaleZ);
      galaxyMat.opacity=Math.max(0,.9-p*1.6);
      coreMat.opacity=Math.max(0,.85-p*2);
      camera.position.z=6-p*4.5;
      if(p>.5)coreMat.color.setHex(p>.8?0xE8B923:0x7B5EA7);
      renderer.render(scene,camera);
    };
    tick();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());
      renderer.dispose();
    };
  },[]);

  useThree(canvasRef,setup);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE B: NEURAL NETWORK ──────────────────────────────────────────────────
function SceneNeural({progress}:{progress:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<any>({progress:0});
  stateRef.current.progress=progress;

  const setup=useCallback((THREE:any,canvas:HTMLCanvasElement)=>{
    const rect=canvas.getBoundingClientRect();
    const W=rect.width||window.innerWidth,H=rect.height||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(65,W/H,.1,500);
    camera.position.z=9;

    const geometries:any[]=[], materials:any[]=[];
    const tG=(g:any)=>{geometries.push(g);return g;};
    const tM=(m:any)=>{materials.push(m);return m;};

    const nodeColors=[0x00C4B4,0x7B5EA7,0xE8B923,0x4A9EFF,0xFF6B6B,0xA78BFA,0x00C4B4,0x7B5EA7,0xE8B923,0x4A9EFF,0xFF6B6B,0xA78BFA];
    const group=new THREE.Group();
    scene.add(group);
    const nodes:any[]=[];
    const phi=Math.PI*(3-Math.sqrt(5));

    for(let i=0;i<12;i++){
      const y=1-(i/11)*2;const r=Math.sqrt(1-y*y)*4;const theta=phi*i;
      const mesh=new THREE.Mesh(
        tG(new THREE.SphereGeometry(.2,20,20)),
        tM(new THREE.MeshStandardMaterial({color:nodeColors[i],emissive:nodeColors[i],emissiveIntensity:.4,roughness:.25,metalness:.7}))
      );
      mesh.position.set(Math.cos(theta)*r,y*2.6,Math.sin(theta)*r);
      mesh.userData={baseY:y*2.6,phase:i*.52};
      group.add(mesh);nodes.push(mesh);
    }

    const lineMat=tM(new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:.06}));
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      if(Math.random()>.45)continue;
      group.add(new THREE.Line(tG(new THREE.BufferGeometry().setFromPoints([nodes[i].position,nodes[j].position])),lineMat));
    }

    const pulses:any[]=[];
    const edgePairs:any[]=[];
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      if(Math.random()>.3)continue;
      edgePairs.push({a:nodes[i].position.clone(),b:nodes[j].position.clone(),t:Math.random()});
    }
    edgePairs.slice(0,16).forEach((ep,i)=>{
      const pulse=new THREE.Mesh(
        tG(new THREE.SphereGeometry(.045,8,8)),
        tM(new THREE.MeshBasicMaterial({color:nodeColors[i%12],transparent:true,opacity:.8}))
      );
      group.add(pulse);
      pulses.push({mesh:pulse,a:ep.a,b:ep.b,t:ep.t,speed:.008+Math.random()*.012});
    });

    const rings:any[]=[];
    nodes.forEach((n,i)=>{
      if(i%3!==0)return;
      const ring=new THREE.Mesh(
        tG(new THREE.TorusGeometry(.32,.013,8,36)),
        tM(new THREE.MeshBasicMaterial({color:nodeColors[i],transparent:true,opacity:0}))
      );
      ring.position.copy(n.position);ring.userData={phase:i*.8};
      group.add(ring);rings.push(ring);
    });

    const attM=tM(new THREE.MeshStandardMaterial({color:0x00C4B4,emissive:0x00C4B4,emissiveIntensity:.3,roughness:.1,metalness:.9,transparent:true,opacity:.3}));
    const attractor=new THREE.Mesh(tG(new THREE.SphereGeometry(.35,32,32)),attM);
    group.add(attractor);

    scene.add(new THREE.AmbientLight(0xffffff,.45));
    const pl1=new THREE.PointLight(0x00C4B4,2.5,22);pl1.position.set(4,4,4);scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,1.8,18);pl2.position.set(-4,-3,3);scene.add(pl2);
    const pl3=new THREE.PointLight(0xE8B923,1.2,14);pl3.position.set(0,5,-2);scene.add(pl3);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-.5)*2;mouse.y=-(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener("mousemove",onMouse,{passive:true});
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick);t+=.008;
      const p=stateRef.current.progress??0;
      group.rotation.y=t*.22+mouse.x*.38;
      group.rotation.x=mouse.y*.22+Math.sin(t*.15)*.06;
      nodes.forEach(n=>{
        n.position.y=n.userData.baseY+Math.sin(t+n.userData.phase)*.18;
        n.scale.setScalar(1+Math.sin(t*1.4+n.userData.phase)*.12);
        n.material.emissiveIntensity=.25+Math.sin(t+n.userData.phase)*.25;
      });
      pulses.forEach(pu=>{
        pu.t=(pu.t+pu.speed)%1;
        pu.mesh.position.lerpVectors(pu.a,pu.b,pu.t);
        pu.mesh.material.opacity=Math.sin(pu.t*Math.PI)*.8;
      });
      rings.forEach(r=>{
        const s=(Math.sin(t*1.1+r.userData.phase)+1)/2;
        r.scale.setScalar(1+s*.9);r.material.opacity=(1-s)*.42;
      });
      lineMat.opacity=.045+Math.sin(t*.6)*.035;
      attractor.rotation.y=t*.5;attM.opacity=.2+Math.sin(t*.8)*.1;
      pl1.position.set(Math.sin(t*.5)*6,Math.cos(t*.4)*5,3);
      group.scale.setScalar(Math.max(.01,1-Math.max(0,(p-.85)*5)));
      renderer.render(scene,camera);
    };
    tick();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());
      renderer.dispose();
    };
  },[]);

  useThree(canvasRef,setup);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE C: DNA HELIX ───────────────────────────────────────────────────────
function SceneDNA({progress}:{progress:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<any>({progress:0});
  stateRef.current.progress=progress;

  const setup=useCallback((THREE:any,canvas:HTMLCanvasElement)=>{
    const rect=canvas.getBoundingClientRect();
    const W=rect.width||window.innerWidth,H=rect.height||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(58,W/H,.1,200);
    camera.position.set(0,0,9);

    const geometries:any[]=[], materials:any[]=[];
    const tG=(g:any)=>{geometries.push(g);return g;};
    const tM=(m:any)=>{materials.push(m);return m;};

    const group=new THREE.Group();
    scene.add(group);

    const N=100;
    const helixA:any[]=[];const helixB:any[]=[];const rungs:any[]=[];
    // Share a single sphere geometry across all helix nodes
    const sphereGeo=tG(new THREE.SphereGeometry(.1,12,12));
    for(let i=0;i<N;i++){
      const t=(i/N)*Math.PI*8,y=(i/N)*10-5;
      const hue=i/N;
      const colA=new THREE.Color().setHSL(hue*.7,.8,.55);
      const colB=new THREE.Color().setHSL((hue+.5)%.7,.8,.55);
      const mA=tM(new THREE.MeshStandardMaterial({color:colA,emissive:colA,emissiveIntensity:.45,roughness:.3,metalness:.5}));
      const mB=tM(new THREE.MeshStandardMaterial({color:colB,emissive:colB,emissiveIntensity:.45,roughness:.3,metalness:.5}));
      const meshA=new THREE.Mesh(sphereGeo,mA);
      const meshB=new THREE.Mesh(sphereGeo,mB);
      meshA.position.set(Math.cos(t)*1.6,y,Math.sin(t)*1.6);
      meshB.position.set(Math.cos(t+Math.PI)*1.6,y,Math.sin(t+Math.PI)*1.6);
      group.add(meshA,meshB);helixA.push(meshA);helixB.push(meshB);
      if(i%4===0){
        const rungGeo=tG(new THREE.BufferGeometry().setFromPoints([meshA.position,meshB.position]));
        const rungMat=tM(new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:.35}));
        const rung=new THREE.Line(rungGeo,rungMat);
        group.add(rung);rungs.push(rung);
      }
    }

    const tubeMatA=tM(new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:.25}));
    const tubeMatB=tM(new THREE.LineBasicMaterial({color:0x7B5EA7,transparent:true,opacity:.25}));
    group.add(new THREE.Line(tG(new THREE.BufferGeometry().setFromPoints(helixA.map((m:any)=>m.position))),tubeMatA));
    group.add(new THREE.Line(tG(new THREE.BufferGeometry().setFromPoints(helixB.map((m:any)=>m.position))),tubeMatB));

    const labelColors=[0x00C4B4,0xE8B923,0x7B5EA7,0xFF6B6B];
    for(let i=0;i<8;i++){
      const plane=new THREE.Mesh(
        tG(new THREE.PlaneGeometry(.5,.18)),
        tM(new THREE.MeshBasicMaterial({color:labelColors[i%4],transparent:true,opacity:.18,side:THREE.DoubleSide}))
      );
      plane.position.set((Math.random()-.5)*5,(Math.random()-.5)*6,(Math.random()-.5)*2-1.5);
      scene.add(plane);
    }

    scene.add(new THREE.AmbientLight(0xffffff,.4));
    const pl1=new THREE.PointLight(0x00C4B4,2.2,18);pl1.position.set(3,3,3);scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,1.6,14);pl2.position.set(-3,-2,2);scene.add(pl2);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-.5)*2;mouse.y=-(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener("mousemove",onMouse,{passive:true});
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick);t+=.007;
      const p=stateRef.current.progress??0;
      group.rotation.y=t*.35+mouse.x*.32;
      group.rotation.x=mouse.y*.18;
      const breathe=1+Math.sin(t*.8)*.06;
      helixA.forEach((m:any,i:number)=>{m.scale.setScalar(breathe+Math.sin(t+i*.18)*.05);});
      helixB.forEach((m:any,i:number)=>{m.scale.setScalar(breathe+Math.cos(t+i*.18)*.05);});
      rungs.forEach((r:any,i:number)=>{(r.material as any).opacity=.2+Math.abs(Math.sin(t*.5+i*.3))*.3;});
      pl1.position.set(Math.sin(t*.4)*5,Math.cos(t*.3)*4,2);
      camera.position.y=Math.sin(t*.2)*1.2+mouse.y*.5;
      group.scale.setScalar(Math.max(.01,1-Math.max(0,(p-.85)*5)));
      renderer.render(scene,camera);
    };
    tick();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());
      renderer.dispose();
    };
  },[]);

  useThree(canvasRef,setup);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE D: CRYSTAL PRISM ───────────────────────────────────────────────────
function ScenePrism({progress}:{progress:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<any>({progress:0});
  stateRef.current.progress=progress;

  const setup=useCallback((THREE:any,canvas:HTMLCanvasElement)=>{
    const rect=canvas.getBoundingClientRect();
    const W=rect.width||window.innerWidth,H=rect.height||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(55,W/H,.1,200);
    camera.position.z=8;

    const geometries:any[]=[], materials:any[]=[];
    const tG=(g:any)=>{geometries.push(g);return g;};
    const tM=(m:any)=>{materials.push(m);return m;};

    const group=new THREE.Group();
    scene.add(group);

    const icoGeo=tG(new THREE.IcosahedronGeometry(2.2,1));
    const ico=new THREE.Mesh(icoGeo,tM(new THREE.MeshStandardMaterial({color:0x050f1e,roughness:.05,metalness:.95,transparent:true,opacity:.75})));
    group.add(ico);
    const wireframe=new THREE.LineSegments(tG(new THREE.EdgesGeometry(icoGeo)),tM(new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:.7})));
    group.add(wireframe);
    const innerMat=tM(new THREE.MeshStandardMaterial({color:0x00C4B4,emissive:0x00C4B4,emissiveIntensity:.4,roughness:.05,metalness:.9,transparent:true,opacity:.4}));
    const innerIco=new THREE.Mesh(tG(new THREE.IcosahedronGeometry(1.1,0)),innerMat);
    group.add(innerIco);

    const sats:any[]=[];
    ([[0x00C4B4,3.8,0],[0x7B5EA7,3.4,2.09],[0xE8B923,4.1,4.19],[0xFF6B6B,3.6,1.05],[0x4A9EFF,4.3,3.14]] as [number,number,number][]).forEach(([col,r,ang],i)=>{
      const sat=new THREE.Mesh(tG(new THREE.OctahedronGeometry(.32)),tM(new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.55,roughness:.2,metalness:.8})));
      sat.userData={r,ang,speed:.38+i*.11,y:Math.sin(i)*.9};
      group.add(sat);sats.push(sat);
    });

    const haloN=800;const hPos=new Float32Array(haloN*3);
    for(let i=0;i<haloN;i++){
      const ang=Math.random()*Math.PI*2,rad=3+Math.random()*.8;
      const tilt=(Math.random()-.5)*.5;
      hPos[i*3]=Math.cos(ang)*rad;hPos[i*3+1]=tilt*rad;hPos[i*3+2]=Math.sin(ang)*rad;
    }
    const haloGeo=tG(new THREE.BufferGeometry());haloGeo.setAttribute("position",new THREE.BufferAttribute(hPos,3));
    scene.add(new THREE.Points(haloGeo,tM(new THREE.PointsMaterial({color:0x00C4B4,size:.025,transparent:true,opacity:.5}))));

    scene.add(new THREE.AmbientLight(0xffffff,.35));
    const pl1=new THREE.PointLight(0x00C4B4,3,22);pl1.position.set(5,5,5);scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,2,18);pl2.position.set(-5,-4,4);scene.add(pl2);
    const pl3=new THREE.PointLight(0xE8B923,1.5,14);pl3.position.set(0,6,-3);scene.add(pl3);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-.5)*2;mouse.y=-(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener("mousemove",onMouse,{passive:true});
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick);t+=.009;
      const p=stateRef.current.progress??0;
      ico.rotation.x=t*.18+mouse.y*.28;
      ico.rotation.y=t*.25+mouse.x*.28;
      wireframe.rotation.copy(ico.rotation);
      innerIco.rotation.x=-t*.3+mouse.y*.2;
      innerIco.rotation.y=-t*.4+mouse.x*.2;
      innerMat.emissiveIntensity=.3+Math.sin(t*1.2)*.2;
      sats.forEach(sat=>{
        const a=sat.userData.ang+t*sat.userData.speed;
        sat.position.set(Math.cos(a)*sat.userData.r,sat.userData.y+Math.sin(t+sat.userData.ang)*.4,Math.sin(a)*sat.userData.r);
        sat.rotation.x+=.025;sat.rotation.y+=.018;
      });
      group.rotation.y=mouse.x*.14;group.rotation.x=mouse.y*.1;
      pl1.position.set(Math.sin(t*.45)*7,Math.cos(t*.35)*6,4);
      pl3.position.set(Math.cos(t*.5)*5,Math.sin(t*.4)*5,-2);
      group.scale.setScalar(Math.max(.01,1-Math.max(0,(p-.85)*5)));
      renderer.render(scene,camera);
    };
    tick();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());
      renderer.dispose();
    };
  },[]);

  useThree(canvasRef,setup);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── SCENE E: CONSTELLATION ───────────────────────────────────────────────────
function SceneConstellation({progress}:{progress:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<any>({progress:0});
  stateRef.current.progress=progress;

  const setup=useCallback((THREE:any,canvas:HTMLCanvasElement)=>{
    const rect=canvas.getBoundingClientRect();
    const W=rect.width||window.innerWidth,H=rect.height||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(60,W/H,.1,200);
    camera.position.z=8;

    const geometries:any[]=[], materials:any[]=[];
    const tG=(g:any)=>{geometries.push(g);return g;};
    const tM=(m:any)=>{materials.push(m);return m;};

    const SN=5000;const sPos=new Float32Array(SN*3),sCol=new Float32Array(SN*3);
    for(let i=0;i<SN;i++){
      const r=6+Math.random()*30,t2=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      sPos[i*3]=r*Math.sin(phi)*Math.cos(t2);sPos[i*3+1]=r*Math.sin(phi)*Math.sin(t2);sPos[i*3+2]=r*Math.cos(phi);
      const warm=Math.random()<.12,b=.25+Math.random()*.75;
      sCol[i*3]=warm?b*.9:b*.75;sCol[i*3+1]=warm?b*.7:b*.88;sCol[i*3+2]=warm?b*.15:b;
    }
    const sGeo=tG(new THREE.BufferGeometry());
    sGeo.setAttribute("position",new THREE.BufferAttribute(sPos,3));
    sGeo.setAttribute("color",new THREE.BufferAttribute(sCol,3));
    const starField=new THREE.Points(sGeo,tM(new THREE.PointsMaterial({size:.02,vertexColors:true,transparent:true,opacity:.8})));
    scene.add(starField);

    const pts=[
      [2.5,3.5],[-2.5,3],[-.5,2],[1.5,1],[0,0],
      [-1.5,-1],[.5,-2],[2.5,-3],[-2.5,-3.5],[0,-4.5],[1.8,-5.5],[-1.8,-5.5]
    ].map(([x,y])=>new THREE.Vector3(x,y,0));

    // Shared geometry for all constellation star meshes
    const starGeo=tG(new THREE.SphereGeometry(.12,14,14));
    const starMeshes:any[]=[];
    pts.forEach((pt,i)=>{
      const m=tM(new THREE.MeshBasicMaterial({color:i===0?0xE8B923:0x00C4B4,transparent:true,opacity:0}));
      const mesh=new THREE.Mesh(starGeo,m);
      mesh.position.copy(pt);mesh.userData={phase:i*.4};scene.add(mesh);starMeshes.push(mesh);
    });

    // Shared geometry for glow rings
    const ringGeo=tG(new THREE.TorusGeometry(.2,.015,8,32));
    const glowRings:any[]=[];
    pts.forEach((pt,i)=>{
      const m=tM(new THREE.MeshBasicMaterial({color:i===0?0xE8B923:0x00C4B4,transparent:true,opacity:0}));
      const ring=new THREE.Mesh(ringGeo,m);
      ring.position.copy(pt);ring.userData={phase:i*.6};scene.add(ring);glowRings.push(ring);
    });

    // FIX #3: guard BOTH pts[a] AND pts[b] before creating edges
    const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[9,11],[0,2],[3,5]];
    const constLines:any[]=[];
    edges.forEach(([a,b])=>{
      if(!pts[a]||!pts[b])return;
      const l=new THREE.Line(
        tG(new THREE.BufferGeometry().setFromPoints([pts[a],pts[b]])),
        tM(new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:0}))
      );
      scene.add(l);constLines.push(l);
    });

    // FIX #7: shVel and shPos scoped inside setup — reset cleanly on every mount
    const shN=600;
    const shPos=new Float32Array(shN*3);
    const shVel=new Float32Array(shN);
    for(let i=0;i<shN;i++){
      shPos[i*3]=(Math.random()-.5)*20;shPos[i*3+1]=14+Math.random()*16;shPos[i*3+2]=(Math.random()-.5)*6;
      shVel[i]=.04+Math.random()*.06;
    }
    const shGeo=tG(new THREE.BufferGeometry());shGeo.setAttribute("position",new THREE.BufferAttribute(shPos,3));
    const shMat=tM(new THREE.PointsMaterial({color:0xE8B923,size:.04,transparent:true,opacity:0}));
    const shower=new THREE.Points(shGeo,shMat);
    scene.add(shower);

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-.5)*2;mouse.y=-(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener("mousemove",onMouse,{passive:true});
    const onResize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onResize);

    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick);t+=.007;
      const p=stateRef.current.progress??0;
      starField.rotation.y=t*.015+mouse.x*.03;
      scene.rotation.y=mouse.x*.12;scene.rotation.x=mouse.y*.08;
      starMeshes.forEach((m,i)=>{
        const thresh=i/starMeshes.length*.7;
        const op=Math.min(1,Math.max(0,(p-thresh)/.15));
        (m.material as any).opacity=op;
        m.scale.setScalar(1+Math.sin(t*1.8+m.userData.phase)*.18);
      });
      glowRings.forEach((r,i)=>{
        const thresh=i/glowRings.length*.7;
        const op=Math.min(1,Math.max(0,(p-thresh)/.15));
        const pulse=(Math.sin(t*1.2+r.userData.phase)+1)/2;
        (r.material as any).opacity=op*(1-pulse)*.5;
        r.scale.setScalar(1+pulse*.7);
      });
      constLines.forEach((l,i)=>{
        const thresh=.3+i/constLines.length*.6;
        (l.material as any).opacity=Math.min(1,Math.max(0,(p-thresh)/.12))*.65;
      });
      shMat.opacity=Math.max(0,(p-.5)/.5)*.8;
      const shArr=shGeo.attributes.position.array as Float32Array;
      for(let i=0;i<shN;i++){shArr[i*3+1]-=shVel[i];if(shArr[i*3+1]<-10)shArr[i*3+1]=14+Math.random()*10;}
      shGeo.attributes.position.needsUpdate=true;
      renderer.render(scene,camera);
    };
    tick();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());
      renderer.dispose();
    };
  },[]);

  useThree(canvasRef,setup);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── WARP LINES overlay ───────────────────────────────────────────────────────
function WarpLines({opacity}:{opacity:number}){
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",opacity,transition:"opacity .3s"}}>
      {Array.from({length:28},(_,i)=>{
        const ang=(i/28)*360;
        const col=i%3===0?TEAL:i%3===1?PURPLE:GOLD;
        const len=25+Math.random()*45;
        return <div key={i} style={{position:"absolute",left:"50%",top:"50%",width:"1px",height:`${len}%`,
          background:`linear-gradient(${col},transparent)`,
          transformOrigin:"top center",transform:`rotate(${ang}deg) translateX(-50%)`,
          opacity:.18+Math.random()*.22,animation:`warp-flicker ${1.8+Math.random()*1.4}s ease-in-out ${Math.random()}s infinite`}}/>;
      })}
    </div>
  );
}

// ─── 3D JOURNEY SECTION ───────────────────────────────────────────────────────
function ThreeDJourneySection(){
  const outerRef=useRef<HTMLDivElement>(null);
  const [p,setP]=useState(0);

  useEffect(()=>{
    const h=()=>{
      const el=outerRef.current;if(!el)return;
      const rect=el.getBoundingClientRect();
      const scrollable=el.offsetHeight-window.innerHeight;
      const scrolled=Math.max(0,-rect.top);
      setP(scrollable>0?Math.min(1,scrolled/scrollable):0);
    };
    window.addEventListener("scroll",h,{passive:true});h();
    return ()=>window.removeEventListener("scroll",h);
  },[]);

  const scene=p<.2?0:p<.4?1:p<.6?2:p<.8?3:4;
  const sceneP=p<.2?p/.2:p<.4?(p-.2)/.2:p<.6?(p-.4)/.2:p<.8?(p-.6)/.2:(p-.8)/.2;

  const sceneData=[
    {label:"01 — The Universe",  title:"Enter a universe\nbuilt for learning",            sub:"A galaxy of 12 AI tools orbiting one mission — your breakthrough.",     color:TEAL,   accentLine:TEAL},
    {label:"02 — The Network",   title:"Intelligence that\nadapts to you",                 sub:"BrainBot learns your gaps. Neural pathways form. You level up.",         color:PURPLE, accentLine:PURPLE},
    {label:"03 — Study DNA",     title:"Every session\nrewrites your DNA",                 sub:"Your living learner profile adapts in real time. Patterns emerge.",       color:GOLD,   accentLine:GOLD},
    {label:"04 — The Method",    title:"A crystal-clear\npath to mastery",                 sub:"Flip between Recall, Cram, Feynman, High Yield — all in one flow.",       color:TEAL,   accentLine:TEAL},
    {label:"05 — The Result",    title:"Watch the\nconstellation form",                    sub:"Every concept mastered is a star connected. Your knowledge map grows.",    color:GOLD,   accentLine:GOLD},
  ];

  const cur=sceneData[scene];
  const textIn=Math.min(1,sceneP*3.5);
  const textOut=Math.max(0,1-Math.max(0,(sceneP-.72)*4.5));
  const textOp=textIn*textOut;
  const warpOp=sceneP>.75?Math.min(1,(sceneP-.75)/.25):0;

  return(
    <div ref={outerRef} style={{height:"550vh",position:"relative",background:VOID}}>
      <div style={{position:"sticky",top:0,height:"100vh",overflow:"hidden",background:VOID}}>

        {[SceneGalaxy,SceneNeural,SceneDNA,ScenePrism,SceneConstellation].map((SceneComp,i)=>(
          <div key={i} style={{position:"absolute",inset:0,opacity:i===scene?1:0,transition:"opacity 1.1s ease",pointerEvents:"none"}}>
            <SceneComp progress={i===scene?sceneP:0}/>
          </div>
        ))}

        <WarpLines opacity={warpOp}/>

        <div style={{position:"absolute",top:32,left:40,zIndex:10,pointerEvents:"none"}}>
          <div style={{...mono,fontSize:"9px",color:"rgba(255,255,255,.18)",letterSpacing:".22em",textTransform:"uppercase"}}>{cur.label}</div>
        </div>

        <div style={{position:"absolute",right:32,top:"50%",transform:"translateY(-50%)",zIndex:10,display:"flex",flexDirection:"column",gap:10}}>
          {sceneData.map((s,i)=>(
            <div key={i} style={{width:4,height:i===scene?24:4,borderRadius:2,
              background:i===scene?s.color:"rgba(255,255,255,.1)",
              transition:"height .5s ease,background .5s ease"}}/>
          ))}
        </div>

        <div style={{position:"absolute",left:24,bottom:"12%",zIndex:10,...mono,fontSize:"9px",
          color:"rgba(0,196,180,.28)",letterSpacing:".12em",lineHeight:2,
          opacity:p>.04&&p<.92?1:0,transition:"opacity .4s"}}>
          <div>SCENE {scene+1}/5</div>
          <div>PROGRESS {Math.round(sceneP*100)}%</div>
          <div>JOURNEY {Math.round(p*100)}%</div>
        </div>

        <div style={{position:"absolute",bottom:"14%",left:"50%",transform:"translateX(-50%)",
          textAlign:"center",zIndex:10,pointerEvents:"none",width:"min(660px,90vw)",
          opacity:textOp,transition:"opacity .12s"}}>
          <div style={{...mono,fontSize:"10px",color:cur.color,letterSpacing:".2em",textTransform:"uppercase",marginBottom:14,opacity:.75}}>{cur.label}</div>
          <h2 style={{fontSize:"clamp(26px,4.5vw,56px)",fontWeight:300,letterSpacing:"-.035em",
            lineHeight:1.08,color:"#F2F5F8",marginBottom:18,whiteSpace:"pre-line",
            textShadow:"0 0 80px rgba(0,0,0,.95)"}}>
            {cur.title}
          </h2>
          <p style={{fontSize:"14px",color:"rgba(255,255,255,.38)",maxWidth:"400px",margin:"0 auto",lineHeight:1.8,fontWeight:300}}>
            {cur.sub}
          </p>
          <div style={{width:48,height:1,background:cur.accentLine,margin:"22px auto 0",opacity:.55}}/>
        </div>

        <div style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",
          zIndex:10,textAlign:"center",opacity:p<.04?1:0,transition:"opacity .5s",pointerEvents:"none"}}>
          <div style={{...mono,fontSize:"9px",color:"rgba(255,255,255,.25)",letterSpacing:".2em",marginBottom:8}}>SCROLL TO EXPLORE</div>
          <div style={{width:1,height:28,background:`linear-gradient(${TEAL},transparent)`,margin:"0 auto",animation:"binary-fall 1.8s ease-in-out infinite"}}/>
        </div>

        <div style={{position:"absolute",bottom:0,left:0,right:0,height:1.5,zIndex:10,
          background:`linear-gradient(90deg,${TEAL},${PURPLE},${GOLD})`,
          transformOrigin:"left",transform:`scaleX(${p})`,transition:"transform .05s linear"}}/>
      </div>
    </div>
  );
}

// ─── HERO GALAXY BG ───────────────────────────────────────────────────────────
function HeroGalaxy(){
  const canvasRef=useRef<HTMLCanvasElement>(null);

  const setup=useCallback((THREE:any,canvas:HTMLCanvasElement)=>{
    const rect=canvas.getBoundingClientRect(); // FIX #5
    const W=rect.width||window.innerWidth,H=rect.height||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(70,W/H,.1,200);
    camera.position.set(0,1.5,6);camera.lookAt(0,0,0);

    const geometries:any[]=[], materials:any[]=[];
    const tG=(g:any)=>{geometries.push(g);return g;};
    const tM=(m:any)=>{materials.push(m);return m;};

    const N=5000;const pos=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const r=4+Math.random()*16,t=Math.random()*Math.PI*2,pp=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(pp)*Math.cos(t);pos[i*3+1]=r*Math.sin(pp)*Math.sin(t);pos[i*3+2]=r*Math.cos(pp);
      const warm=Math.random()<.12,b=.3+Math.random()*.7;
      col[i*3]=warm?b*.9:b*.75;col[i*3+1]=warm?b*.7:b*.88;col[i*3+2]=warm?b*.15:b;
    }
    const sGeo=tG(new THREE.BufferGeometry());sGeo.setAttribute("position",new THREE.BufferAttribute(pos,3));sGeo.setAttribute("color",new THREE.BufferAttribute(col,3));
    scene.add(new THREE.Points(sGeo,tM(new THREE.PointsMaterial({size:.024,vertexColors:true,transparent:true,opacity:.9}))));

    const GN=2500;const gPos=new Float32Array(GN*3),gCol=new Float32Array(GN*3);
    for(let i=0;i<GN;i++){
      const arm=i%2;const t=(i/GN)*Math.PI*5+(arm/2)*Math.PI;const r=.2+(i/GN)*2.6+Math.random()*.22;
      gPos[i*3]=Math.cos(t)*r*1.7+2.4+(Math.random()-.5)*.18;gPos[i*3+1]=(Math.random()-.5)*.16;gPos[i*3+2]=Math.sin(t)*r+(Math.random()-.5)*.18;
      const b=.5+Math.random()*.5;const tealArm=arm===0;
      gCol[i*3]=tealArm?0:b*.48;gCol[i*3+1]=tealArm?b*.77:b*.37;gCol[i*3+2]=tealArm?b*.71:b*.65;
    }
    const gGeo=tG(new THREE.BufferGeometry());gGeo.setAttribute("position",new THREE.BufferAttribute(gPos,3));gGeo.setAttribute("color",new THREE.BufferAttribute(gCol,3));
    scene.add(new THREE.Points(gGeo,tM(new THREE.PointsMaterial({size:.016,vertexColors:true,transparent:true,opacity:.7}))));

    ([[0x00C4B4,[-1.6,.5,-1],.13],[0x7B5EA7,[1.8,-.5,-1.5],.19],[0xE8B923,[.4,-1.1,-1.3],.08]] as [number,number[],number][]).forEach(([c,p2,r2])=>{
      const m=new THREE.Mesh(tG(new THREE.SphereGeometry(r2,16,16)),tM(new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7})));
      m.position.set(p2[0],p2[1],p2[2]);scene.add(m);
    });

    const mouse={x:0,y:0};
    const onMouse=(e:MouseEvent)=>{mouse.x=e.clientX/window.innerWidth-.5;mouse.y=-(e.clientY/window.innerHeight-.5);};
    window.addEventListener("mousemove",onMouse,{passive:true});
    const onResize=()=>{
      const r=canvas.getBoundingClientRect();
      const w=r.width||window.innerWidth,h=r.height||window.innerHeight;
      camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    };
    window.addEventListener("resize",onResize);
    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=.003;scene.rotation.y=t*.06+mouse.x*.12;scene.rotation.x=mouse.y*.07;renderer.render(scene,camera);};
    tick();

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",onMouse);
      window.removeEventListener("resize",onResize);
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());
      renderer.dispose();
    };
  },[]);

  useThree(canvasRef,setup);
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function GlitchText({text}:{text:string}){
  const [g,setG]=useState(false);
  useEffect(()=>{const id=setInterval(()=>{setG(true);setTimeout(()=>setG(false),160);},4200);return ()=>clearInterval(id);},[]);
  return(
    <span style={{position:"relative",display:"inline-block"}}>
      {text}
      {g&&<>
        <span style={{position:"absolute",left:0,top:0,color:TEAL,opacity:.75,animation:"glitch1 .16s steps(1) infinite"}}>{text}</span>
        <span style={{position:"absolute",left:0,top:0,color:GOLD,opacity:.55,animation:"glitch2 .16s steps(1) .05s infinite"}}>{text}</span>
      </>}
    </span>
  );
}

function AnimatedCounter({target,suffix="",label}:{target:number;suffix?:string;label:string}){
  const {ref,inView}=useInView(.5);const [n,setN]=useState(0);const done=useRef(false);
  useEffect(()=>{
    if(!inView||done.current)return;done.current=true;
    const dur=1600,start=performance.now();
    const tick=(now:number)=>{const t=Math.min((now-start)/dur,1);setN(Math.round((1-Math.pow(1-t,3))*target));if(t<1)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  },[inView,target]);
  return(
    <div ref={ref} style={{opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all .8s ease"}}>
      <div style={{...mono,fontSize:"clamp(20px,2.5vw,30px)",fontWeight:500,color:TEAL,letterSpacing:"-.02em"}}>{n}{suffix}</div>
      <div style={{fontSize:"10px",color:"#444",textTransform:"uppercase",letterSpacing:".1em",marginTop:4}}>{label}</div>
    </div>
  );
}

function ClipReveal({children,delay=0}:{children:React.ReactNode;delay?:number}){
  const {ref,inView}=useInView(.05);
  return <div ref={ref} className={`clip-reveal${inView?" in":""}`} style={{transitionDelay:`${delay}s`}}>{children}</div>;
}

function SectionParticles({count=25,color=TEAL}:{count?:number;color?:string}){
  const motes=Array.from({length:count},()=>({left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,r:Math.random()*3+1,dur:`${12+Math.random()*16}s`,delay:`${-Math.random()*12}s`,op:.05+Math.random()*.09}));
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      {motes.map((m,i)=>(
        <div key={i} style={{position:"absolute",left:m.left,top:m.top,width:`${m.r*2}px`,height:`${m.r*2}px`,borderRadius:"50%",
          background:`radial-gradient(circle,${color} 0%,transparent 80%)`,opacity:m.op,animation:`mote-drift ${m.dur} ease-in-out ${m.delay} infinite`}}/>
      ))}
    </div>
  );
}

function BinaryRain(){
  return(
    <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden",opacity:.05}}>
      {Array.from({length:8},(_,i)=>(
        <div key={i} style={{position:"absolute",left:`${i*12+5}%`,top:0,...mono,fontSize:"9px",color:TEAL,whiteSpace:"nowrap",
          animation:`binary-fall ${14+i*3}s linear ${-i*2}s infinite`}}>
          {Array.from({length:34},()=>Math.round(Math.random())).join("\n")}
        </div>
      ))}
    </div>
  );
}

function NebulaLayer(){
  const base:React.CSSProperties={position:"absolute",inset:"-20%",pointerEvents:"none",transformOrigin:"center"};
  return(
    <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
      <div style={{...base,background:"radial-gradient(ellipse 80% 60% at 22% 30%,rgba(180,40,160,.1) 0%,transparent 65%)",animation:"float-slow 24s ease-in-out infinite"}}/>
      <div style={{...base,background:"radial-gradient(ellipse 55% 70% at 15% 65%,rgba(0,196,180,.08) 0%,transparent 60%)",animation:"float-slow 30s ease-in-out 4s infinite"}}/>
      <div style={{...base,background:"radial-gradient(ellipse 45% 32% at 80% 30%,rgba(232,185,35,.06) 0%,transparent 50%)",animation:"float-slow 36s ease-in-out 8s infinite"}}/>
    </div>
  );
}

function OrbitalRings(){
  return(
    <div style={{position:"absolute",right:"-100px",top:"50%",transform:"translateY(-50%)",width:"500px",height:"500px",pointerEvents:"none",opacity:.1}}>
      {[{sz:280,dur:"13s",col:TEAL,a:"spin-slow"},{sz:400,dur:"21s",col:PURPLE,a:"spin-rev"},{sz:200,dur:"8s",col:GOLD,a:"spin-slow"}].map((r,i)=>(
        <div key={i} style={{position:"absolute",left:"50%",top:"50%",marginLeft:`-${r.sz/2}px`,marginTop:`-${r.sz/2}px`,
          width:r.sz,height:r.sz,borderRadius:"50%",border:`.8px solid ${r.col}`,animation:`${r.a} ${r.dur} linear infinite`}}/>
      ))}
    </div>
  );
}

function MarqueeRow({dir}:{dir:"left"|"right"}){
  const items=[...MARQUEE_ITEMS,...MARQUEE_ITEMS];
  return(
    <div className="mq-wrap" style={{padding:"12px 0"}}>
      <div className={dir==="left"?"mq-l":"mq-r"}>{items.map((item,i)=>(
        <span key={i} style={{...mono,fontSize:"10px",letterSpacing:".18em",textTransform:"uppercase",
          color:i%5===0?TEAL:i%7===0?GOLD:i%11===0?PURPLE:"#1a2440",
          marginRight:"44px",display:"inline-flex",alignItems:"center",gap:"14px"}}>
          {item}<span style={{width:"3px",height:"3px",borderRadius:"50%",background:"#1a2440",display:"inline-block"}}/>
        </span>
      ))}</div>
    </div>
  );
}
function MarqueeDivider(){
  return(
    <div style={{position:"relative",zIndex:3,background:"#03050f",borderTop:".5px solid #0d1220",borderBottom:".5px solid #0d1220"}}>
      <MarqueeRow dir="left"/>
      <div style={{height:".5px",background:"#0d1220"}}/>
      <MarqueeRow dir="right"/>
    </div>
  );
}

function StickyFeatureShowcase(){
  const [active,setActive]=useState(0);
  const itemRefs=useRef<(HTMLDivElement|null)[]>([]);
  const accentColors=[TEAL,PURPLE,GOLD,"#4A9EFF","#FF6B6B","#A78BFA",TEAL,PURPLE,GOLD,"#4A9EFF","#FF6B6B","#A78BFA"];
  useEffect(()=>{
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(e=>{if(e.isIntersecting){const idx=itemRefs.current.indexOf(e.target as HTMLDivElement);if(idx>=0)setActive(idx);}});
    },{rootMargin:"-40% 0px -40% 0px"});
    itemRefs.current.forEach(r=>{if(r)obs.observe(r);});
    return ()=>obs.disconnect();
  },[]);
  const f=features[active];const ac=accentColors[active];
  return(
    <div style={{maxWidth:"1100px",margin:"0 auto",padding:"40px 32px 80px",display:"flex",gap:"72px",alignItems:"flex-start",position:"relative",zIndex:1}}>
      <div className="sticky-left" style={{flex:"0 0 300px"}}>
        <div style={{marginBottom:28,minHeight:160}}>
          <div style={{fontSize:"44px",marginBottom:14,lineHeight:1}}>{f.icon}</div>
          <div style={{...mono,fontSize:"10px",color:ac,letterSpacing:".1em",marginBottom:8,transition:"color .4s"}}>{f.n}</div>
          <h3 style={{fontSize:"clamp(18px,1.8vw,24px)",fontWeight:300,letterSpacing:"-.02em",color:"#F2F5F8",marginBottom:10}}>{f.title}</h3>
          <p style={{fontSize:"12px",color:"#555",lineHeight:1.7,fontWeight:300}}>{f.desc}</p>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",maxWidth:160}}>
          {features.map((_,i)=>(
            <div key={i} style={{width:5,height:5,borderRadius:"50%",background:i===active?ac:"#1a2240",transition:"background .3s,transform .3s",transform:i===active?"scale(1.5)":"scale(1)"}}/>
          ))}
        </div>
        <div style={{position:"absolute",left:0,top:"10%",bottom:"10%",width:1,background:`linear-gradient(transparent,${ac},transparent)`,opacity:.25,transition:"background .5s"}}/>
      </div>
      <div style={{flex:1}}>
        {features.map((feat,i)=>(
          <div key={feat.n} ref={el=>{itemRefs.current[i]=el;}} style={{padding:"28px 0",borderBottom:".5px solid #0d1220",opacity:i===active?1:.25,transition:"opacity .45s ease"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:14}}>
              <span style={{...mono,fontSize:"10px",color:i===active?accentColors[i]:"#1e2838",transition:"color .4s"}}>{feat.n}</span>
              <span style={{fontSize:"15px",color:"#E0E8F0",fontWeight:300,letterSpacing:"-.01em"}}>{feat.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WordReveal(){
  const ref=useRef<HTMLDivElement>(null);const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const h=()=>{if(!ref.current)return;const rect=ref.current.getBoundingClientRect();setProgress(Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight*1.6))));};
    window.addEventListener("scroll",h,{passive:true});h();return ()=>window.removeEventListener("scroll",h);
  },[]);
  const words=MANIFESTO.split(" ");
  return(
    <div ref={ref} style={{position:"relative",zIndex:2,padding:"120px 32px",background:"#03050f",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 60% 50% at 50% 50%,rgba(0,196,180,.04) 0%,transparent 70%)"}}/>
      <div style={{maxWidth:"720px",margin:"0 auto",position:"relative"}}>
        <div style={{...mono,fontSize:"10px",color:"#282e42",letterSpacing:".18em",textTransform:"uppercase",marginBottom:36}}>— The Studenius Principle</div>
        <p style={{fontSize:"clamp(24px,3.8vw,44px)",fontWeight:300,letterSpacing:"-.025em",lineHeight:1.35}}>
          {words.map((word,i)=>{
            const thr=i/words.length;const lit=progress>=thr;const past=progress>=Math.min(1,thr+.12);
            return <span key={i} className={`wd${lit?(past?" wd-past":" wd-lit"):""}`}>{word}</span>;
          })}
        </p>
      </div>
    </div>
  );
}

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
function HeroSection(){
  const mouse=useMouseParallax();
  const layer=(mf:number,extra?:React.CSSProperties):React.CSSProperties=>({
    transform:`translate3d(${mouse.x*mf}px,${mouse.y*mf}px,0)`,willChange:"transform",...extra,
  });
  return(
    <section style={{padding:"110px 32px 90px",maxWidth:"720px",margin:"0 auto",width:"100%",position:"relative",zIndex:2}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={layer(14,{position:"absolute",right:"60px",top:120,width:2,height:2,borderRadius:"50%",background:TEAL,opacity:.5})}/>
        <div style={layer(22,{position:"absolute",right:130,top:180,width:3,height:3,borderRadius:"50%",background:GOLD,opacity:.4})}/>
        <div style={layer(9, {position:"absolute",right:90, top:230,width:2,height:2,borderRadius:"50%",background:PURPLE,opacity:.35})}/>
        <div style={layer(18,{position:"absolute",right:170,top:100,width:2,height:2,borderRadius:"50%",background:TEAL,opacity:.3})}/>
        <div style={layer(8,{position:"absolute",right:"-60px",top:"20%",width:260,height:260,borderRadius:"50%",
          background:"radial-gradient(ellipse,rgba(123,94,167,.05) 0%,transparent 70%)"})}/>
      </div>
      <OrbitalRings/>
      <p style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:".16em",textTransform:"uppercase",marginBottom:32,
        animation:"pulse-glow 3s ease-in-out infinite,hero-enter 1.4s ease .15s both"}}>
        AI-Powered Study Platform
      </p>
      <h1 style={{fontSize:"clamp(38px,6.5vw,72px)",fontWeight:300,letterSpacing:"-.04em",lineHeight:1.04,
        marginBottom:22,color:"#F2F5F8",animation:"hero-enter 1.4s ease .31s both"}}>
        <GlitchText text="Study smarter."/><br/>
        <span style={{background:`linear-gradient(135deg,${TEAL},${PURPLE})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
          Master it faster.
        </span>
      </h1>
      <p style={{fontSize:"15px",color:"#555",maxWidth:"480px",marginBottom:36,lineHeight:1.78,fontWeight:300,animation:"hero-enter 1.4s ease .47s both"}}>
        12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall, confidence tracking and more.
      </p>
      <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",animation:"hero-enter 1.4s ease .63s both"}}>
        <Link to="/signup">
          <button style={{fontSize:"13px",fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"12px 28px",cursor:"pointer",letterSpacing:".04em",transition:"opacity .15s,box-shadow .2s,transform .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.opacity=".82";e.currentTarget.style.boxShadow=`0 0 44px rgba(0,196,180,.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
            Start for free →
          </button>
        </Link>
        <Link to="/login">
          <button style={{fontSize:"13px",fontWeight:300,color:"#444",background:"transparent",border:"none",cursor:"pointer",transition:"color .15s"}}
            onMouseEnter={e=>(e.currentTarget.style.color="#E0E8F0")}
            onMouseLeave={e=>(e.currentTarget.style.color="#444")}>
            See Dashboard
          </button>
        </Link>
      </div>
      <p style={{...mono,fontSize:"10px",color:"#1e2a44",marginTop:18,letterSpacing:".06em",animation:"hero-enter 1.4s ease .79s both"}}>
        No credit card required · Free plan always available
      </p>
    </section>
  );
}

// ─── PARALLAX GEOMETRY SECTION ────────────────────────────────────────────────
function ParallaxGeometry(){
  const ref=useRef<HTMLDivElement>(null);const [p,setP]=useState(0);
  const {ref:inRef,inView}=useInView(.15);
  useEffect(()=>{
    const h=()=>{if(!ref.current)return;const rect=ref.current.getBoundingClientRect();setP(Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight+ref.current.offsetHeight))));};
    window.addEventListener("scroll",h,{passive:true});h();return ()=>window.removeEventListener("scroll",h);
  },[]);
  return(
    <div ref={ref} style={{position:"relative",height:480,overflow:"hidden",background:"#03050f"}}>
      <div style={{position:"absolute",inset:0,transform:`translateY(${p*-28}px)`,pointerEvents:"none"}}>
        <div style={{position:"absolute",left:"8%",top:"15%",width:280,height:280,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(123,94,167,.06) 0%,transparent 70%)"}}/>
      </div>
      <div style={{position:"absolute",inset:0,transform:`translateY(${p*-72}px)`,pointerEvents:"none"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.025}} preserveAspectRatio="none">
          {Array.from({length:10},(_,i)=><line key={`v${i}`} x1={`${i*11}%`} y1="0" x2={`${i*11}%`} y2="100%" stroke={TEAL} strokeWidth=".5"/>)}
          {Array.from({length:7},(_,i)=><line key={`h${i}`} x1="0" y1={`${i*16}%`} x2="100%" y2={`${i*16}%`} stroke={TEAL} strokeWidth=".5"/>)}
        </svg>
        {[{l:"14%",t:"28%",c:TEAL,a:"float-slow"},{l:"58%",t:"22%",c:PURPLE,a:"float-slow"},{l:"74%",t:"52%",c:TEAL,a:"float-slow"}].map((d,i)=>(
          <div key={i} style={{position:"absolute",left:d.l,top:d.t,width:4,height:4,borderRadius:"50%",background:d.c,opacity:.3,animation:`${d.a} ${7+i}s ease-in-out ${i*.8}s infinite`}}/>
        ))}
      </div>
      <div style={{position:"absolute",inset:0,transform:`translateY(${p*-145}px)`,pointerEvents:"none"}}>
        <div style={{position:"absolute",right:"18%",top:"28%",opacity:.09,animation:"spin-slow 28s linear infinite"}}>
          <svg width="58" height="58" viewBox="0 0 58 58"><polygon points="29,2 56,29 29,56 2,29" fill="none" stroke={GOLD} strokeWidth=".7"/></svg>
        </div>
        <div style={{position:"absolute",left:"22%",bottom:"24%",opacity:.07,animation:"spin-rev 22s linear infinite"}}>
          <svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="20" fill="none" stroke={TEAL} strokeWidth=".6" strokeDasharray="3 5"/></svg>
        </div>
        <div style={{position:"absolute",left:"62%",top:"42%",width:1,height:70,background:`linear-gradient(${PURPLE},transparent)`,opacity:.12,animation:"beam-sweep 14s ease-in-out 2s infinite"}}/>
      </div>
      <div ref={inRef} style={{position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px",textAlign:"center"}}>
        <div style={{...mono,fontSize:"10px",color:GOLD,letterSpacing:".2em",textTransform:"uppercase",marginBottom:18,transition:"all .8s ease",opacity:inView?.75:0,transform:inView?"translateY(0)":"translateY(24px)"}}>— Your Learning Universe</div>
        <h2 style={{fontSize:"clamp(22px,3vw,42px)",fontWeight:300,letterSpacing:"-.025em",color:"#F2F5F8",maxWidth:500,lineHeight:1.25,transition:"all .9s ease .12s",opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(32px)"}}>
          12 tools orbiting<br/>one goal: <span style={{color:TEAL}}>your mastery</span>
        </h2>
      </div>
    </div>
  );
}

function ScrollBar(){
  const p=useScrollProgress();
  return <div id="scroll-bar" style={{transform:`scaleX(${p})`}}/>;
}

const hairline:React.CSSProperties={height:".5px",background:"#0d1220"};
const sectionLabel:React.CSSProperties={...mono,fontSize:"10px",color:"#444",letterSpacing:".14em",textTransform:"uppercase",marginBottom:40,display:"flex",alignItems:"center",gap:12};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Landing(){
  const [navScrolled,setNavScrolled]=useState(false);
  useEffect(()=>{const h=()=>setNavScrolled(window.scrollY>20);window.addEventListener("scroll",h,{passive:true});return ()=>window.removeEventListener("scroll",h);},[]);

  return(
    <div style={{minHeight:"100vh",background:VOID,color:"#E0E8F0",fontFamily:"'Inter',system-ui,sans-serif",overflowX:"hidden"}}>
      <style>{CSS}</style>
      <ScrollBar/>

      <nav style={{position:"fixed",top:0,left:0,right:0,height:48,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 32px",zIndex:100,
        background:navScrolled?"rgba(3,5,15,.96)":"rgba(3,5,15,.75)",
        backdropFilter:"blur(22px)",borderBottom:navScrolled?".5px solid rgba(0,196,180,.15)":".5px solid #0d1220",transition:"all .3s"}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:".22em",color:"#E0E8F0",...mono}}>STUDENIUS</span>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {([["Pricing","/pricing"],["Login","/login"]] as [string,string][]).map(([lbl,href])=>(
            <Link key={href} to={href} style={{fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"#444",textDecoration:"none",transition:"color .2s"}}
              onMouseEnter={e=>(e.currentTarget.style.color="#E0E8F0")}
              onMouseLeave={e=>(e.currentTarget.style.color="#444")}>{lbl}</Link>
          ))}
          <Link to="/signup">
            <button style={{fontSize:11,fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"6px 16px",cursor:"pointer",letterSpacing:".06em",transition:"opacity .15s,box-shadow .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.opacity=".8";e.currentTarget.style.boxShadow=`0 0 28px rgba(0,196,180,.5)`;}}
              onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";}}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      <div style={{position:"relative",overflow:"hidden",background:VOID,minHeight:"100vh",paddingTop:48}}>
        <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}><HeroGalaxy/></div>
        <div style={{position:"absolute",inset:0,zIndex:1,pointerEvents:"none",opacity:.5}}><NebulaLayer/><BinaryRain/></div>
        <div style={{position:"absolute",inset:0,zIndex:1,pointerEvents:"none",background:"linear-gradient(to bottom,rgba(3,5,15,.2) 0%,rgba(3,5,15,.08) 50%,rgba(3,5,15,.9) 100%)"}}/>
        <div style={{position:"relative",zIndex:2}}><HeroSection/></div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:100,zIndex:3,pointerEvents:"none",background:`linear-gradient(to bottom,transparent,${VOID})`}}/>
      </div>

      <div style={hairline}/>
      <div style={{background:"rgba(6,8,18,.92)",borderBottom:".5px solid #0d1220",position:"relative",zIndex:2}}>
        <div style={{maxWidth:720,margin:"0 auto",padding:"28px 32px",display:"flex",gap:48,flexWrap:"wrap"}}>
          <AnimatedCounter target={12} suffix="+"  label="AI Study Tools"/>
          <AnimatedCounter target={50} suffix="k+" label="Students"/>
          <AnimatedCounter target={2}  suffix="M+" label="Questions Generated"/>
          <AnimatedCounter target={94} suffix="%"  label="Pass Rate"/>
        </div>
      </div>

      <div style={{position:"relative",zIndex:1}}>
        <ThreeDJourneySection/>
      </div>

      <MarqueeDivider/>

      <div style={{position:"relative",zIndex:2,background:"#05080f",overflow:"hidden"}}>

        <div style={{position:"relative"}}>
          <SectionParticles count={18} color={PURPLE}/>
          <ClipReveal>
            <div style={{maxWidth:1100,margin:"0 auto",padding:"60px 32px 0",position:"relative",zIndex:1}}>
              <div style={sectionLabel}><span>Tools</span><span style={{flex:1,height:".5px",background:"#0d1220",display:"block"}}/></div>
            </div>
          </ClipReveal>
          <StickyFeatureShowcase/>
        </div>

        <div style={hairline}/>
        <MarqueeDivider/>
        <WordReveal/>
        <div style={hairline}/>
        <ParallaxGeometry/>
        <div style={hairline}/>

        <div style={{maxWidth:720,margin:"0 auto",width:"100%",padding:"64px 32px",position:"relative"}}>
          <SectionParticles count={16} color={GOLD}/>
          <ClipReveal>
            <div style={sectionLabel}><span>Testimonials</span><span style={{flex:1,height:".5px",background:"#0d1220",display:"block"}}/></div>
          </ClipReveal>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:"#0d1220"}}>
            {testimonials.map((t,i)=>(
              <ClipReveal key={t.name} delay={i*.1}>
                <div style={{background:"#080d1a",padding:"20px 24px",transition:"background .2s"}}
                  onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="#0d1525")}
                  onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="#080d1a")}>
                  <div style={{...mono,fontSize:"10px",color:"#444",letterSpacing:".06em",marginBottom:10}}>{t.name} — {t.role}</div>
                  <p style={{fontSize:"13px",color:"#555",lineHeight:1.65,fontWeight:300}}>"{t.text}"</p>
                </div>
              </ClipReveal>
            ))}
          </div>
        </div>

        <div style={hairline}/>

        <div style={{maxWidth:720,margin:"0 auto",width:"100%",padding:"80px 32px",position:"relative"}}>
          <SectionParticles count={30} color={TEAL}/>
          <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 60% 40% at 50% 50%,rgba(0,196,180,.05) 0%,transparent 70%)"}}/>
          <ClipReveal><h2 style={{fontSize:"clamp(22px,3vw,40px)",fontWeight:300,letterSpacing:"-.02em",marginBottom:8}}>Ready to study smarter?</h2></ClipReveal>
          <ClipReveal delay={.08}><p style={{fontSize:"14px",color:"#555",marginBottom:28,fontWeight:300}}>Start free. No credit card required.</p></ClipReveal>
          <ClipReveal delay={.16}>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <Link to="/signup">
                <button style={{fontSize:"13px",fontWeight:600,color:"#05080f",background:TEAL,border:"none",padding:"12px 28px",cursor:"pointer",letterSpacing:".04em",transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.opacity=".82";e.currentTarget.style.boxShadow=`0 0 48px rgba(0,196,180,.55)`;e.currentTarget.style.transform="translateY(-2px)";}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
                  Get started free →
                </button>
              </Link>
              <Link to="/pricing">
                <button style={{fontSize:"13px",fontWeight:300,color:"#555",background:"transparent",border:".5px solid #1a2440",padding:"12px 22px",cursor:"pointer",transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="#E0E8F0";e.currentTarget.style.borderColor="#555";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#1a2440";}}>
                  View pricing
                </button>
              </Link>
            </div>
          </ClipReveal>
        </div>

        <footer style={{borderTop:".5px solid #0d1220",background:"#020408"}}>
          <div style={{maxWidth:720,margin:"0 auto",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{...mono,fontSize:"10px",color:"#1e2838",letterSpacing:".06em"}}>STUDENIUS © {new Date().getFullYear()}</span>
            <div style={{display:"flex",gap:20}}>
              {([["Pricing","/pricing"],["Login","/login"],["Sign Up","/signup"]] as [string,string][]).map(([lbl,href])=>(
                <Link key={href} to={href} style={{fontSize:"11px",color:"#333",textDecoration:"none",transition:"color .15s"}}
                  onMouseEnter={e=>((e.currentTarget as HTMLElement).style.color="#666")}
                  onMouseLeave={e=>((e.currentTarget as HTMLElement).style.color="#333")}>{lbl}</Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
