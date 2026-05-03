/**
 * STUDENIUS — Full 3D Immersive Landing Page
 * One continuous scroll = one cinematic journey through 3D space.
 * Camera travels through 7 scenes driven purely by scroll position.
 * Three.js loads from CDN, zero extra deps.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

const TEAL   = "#00C4B4";
const GOLD   = "#E8B923";
const PURPLE = "#7B5EA7";
const VOID   = "#03050F";
const mono: React.CSSProperties = { fontFamily:"'Geist Mono','Courier New',monospace" };

const features = [
  {n:"01",title:"AI Tutor (BrainBot)",    desc:"Ask anything — Explain, ELI5, Analogy, Quiz, Debate, Summary",      icon:"🧠", color:TEAL},
  {n:"02",title:"Practice & Flashcards",  desc:"AI-generated questions and spaced-repetition from your materials",   icon:"🃏", color:PURPLE},
  {n:"03",title:"Cram Mode",              desc:"Emergency timed session — AI breaks subjects into prioritised topics",icon:"⚡", color:GOLD},
  {n:"04",title:"High Yield Detector",    desc:"Identifies the most testable concepts and drills you instantly",      icon:"🎯", color:"#4A9EFF"},
  {n:"05",title:"Recall Mode",            desc:"Type from memory and get scored — the hardest way to study",          icon:"🔁", color:"#FF6B6B"},
  {n:"06",title:"Confidence Calibration", desc:"Sort every concept into Know / Shaky / No idea",                     icon:"📊", color:"#A78BFA"},
  {n:"07",title:"Mistake Journal",        desc:"Log errors with spaced-repetition — overdue items resurface",        icon:"📓", color:TEAL},
  {n:"08",title:"Roadmap Generator",      desc:"Zero-to-mastery plan for any subject, broken into phases",           icon:"🗺️", color:PURPLE},
  {n:"09",title:"Feynman Mode",           desc:"Teach the AI — it pokes holes until you truly understand",           icon:"💡", color:GOLD},
  {n:"10",title:"Source Library",         desc:"Upload PDFs, images, or notes — every tool reads them",              icon:"📚", color:"#4A9EFF"},
  {n:"11",title:"Study DNA",              desc:"Your living learner profile — adapts and reveals your patterns",     icon:"🧬", color:"#FF6B6B"},
  {n:"12",title:"Focus Timer + Progress", desc:"Built-in Pomodoro with activity tracking and session analytics",     icon:"⏱️", color:"#A78BFA"},
];

const testimonials = [
  {name:"Maria S.", role:"Nursing Student",     text:"Uploaded my lecture notes and got 200 practice questions instantly. Passed my boards first try."},
  {name:"James W.", role:"Medical Student",      text:"Cram Mode the night before exams is genuinely a lifesaver. It structures everything perfectly."},
  {name:"Sarah C.", role:"Teacher",             text:"Feynman Mode exposed every gap in my knowledge. Not just for exams — for any subject."},
  {name:"Ahmed R.", role:"Engineering Student", text:"High Yield Detector told me exactly what to study before finals. Went from C to A."},
];

const MARQUEE = ["BrainBot","Cram Mode","Flashcards","Recall Mode","Feynman Mode","High Yield","Roadmap","Study DNA","Mistake Journal","Focus Timer","Source Library","Confidence","Practice","Spaced Rep","Pomodoro"];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:auto;}
  body{overflow-x:hidden;}
  ::selection{background:rgba(0,196,180,0.25);}

  @keyframes pulse-glow{0%,100%{opacity:.55;}50%{opacity:1;}}
  @keyframes hero-enter{from{opacity:0;transform:translateY(40px);filter:blur(6px);}to{opacity:1;transform:translateY(0);filter:blur(0);}}
  @keyframes glitch1{0%,100%{clip-path:inset(20% 0 55% 0);transform:translate(-2px,0);}50%{clip-path:inset(35% 0 15% 0);transform:translate(3px,0);}}
  @keyframes glitch2{0%,100%{clip-path:inset(65% 0 8% 0);transform:translate(2px,0);}50%{clip-path:inset(5% 0 70% 0);transform:translate(-1px,0);}}
  @keyframes fade-up{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}
  @keyframes mq-left{from{transform:translateX(0);}to{transform:translateX(-50%);}}
  @keyframes mq-right{from{transform:translateX(-50%);}to{transform:translateX(0);}}
  @keyframes count-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
  @keyframes warp-line{0%{opacity:0;transform:scaleY(0);}20%{opacity:1;}80%{opacity:1;}100%{opacity:0;transform:scaleY(1) translateY(-100vh);}}
  @keyframes scene-in{from{opacity:0;transform:scale(0.96) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}

  .mq-wrap{overflow:hidden;position:relative;}
  .mq-wrap::before,.mq-wrap::after{content:'';position:absolute;top:0;bottom:0;width:120px;z-index:2;pointer-events:none;}
  .mq-wrap::before{left:0;background:linear-gradient(90deg,#03050f,transparent);}
  .mq-wrap::after{right:0;background:linear-gradient(-90deg,#03050f,transparent);}
  .mq-l{display:flex;width:max-content;white-space:nowrap;animation:mq-left 28s linear infinite;}
  .mq-r{display:flex;width:max-content;white-space:nowrap;animation:mq-right 38s linear infinite;}

  #scroll-bar{position:fixed;top:0;left:0;width:100%;height:1.5px;z-index:9999;
    background:linear-gradient(90deg,#00C4B4,#7B5EA7,#E8B923);
    transform-origin:left;pointer-events:none;}

  .wd{color:rgba(255,255,255,0.08);transition:color 0.4s,text-shadow 0.4s;display:inline-block;margin-right:.28em;}
  .wd-lit{color:#F2F5F8!important;text-shadow:0 0 40px rgba(0,196,180,0.5);}
  .wd-past{color:rgba(255,255,255,0.2)!important;}
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

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

// ─── THREE.JS LOADER ──────────────────────────────────────────────────────────
function useThree(canvasRef:React.RefObject<HTMLCanvasElement>, setup:(T:any,c:HTMLCanvasElement)=>()=>void){
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    let alive=true;
    let cleanup:(()=>void)|undefined;
    const run=(T:any)=>{ if(!alive) return; cleanup=setup(T,canvas); };
    if((window as any).THREE){run((window as any).THREE);return ()=>{alive=false;cleanup?.();};}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload=()=>run((window as any).THREE);
    document.head.appendChild(s);
    return ()=>{alive=false;cleanup?.();};
  },[]);
}

// ─── GLITCH TEXT ──────────────────────────────────────────────────────────────
function Glitch({text}:{text:string}){
  const [g,setG]=useState(false);
  useEffect(()=>{const id=setInterval(()=>{setG(true);setTimeout(()=>setG(false),160);},4500);return ()=>clearInterval(id);},[]);
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

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function Counter({target,suffix="",label}:{target:number;suffix?:string;label:string}){
  const {ref,inView}=useInView(0.5);
  const [n,setN]=useState(0);
  const done=useRef(false);
  useEffect(()=>{
    if(!inView||done.current)return; done.current=true;
    const dur=1600;const start=performance.now();
    const tick=(now:number)=>{const t=Math.min((now-start)/dur,1);setN(Math.round((1-Math.pow(1-t,3))*target));if(t<1)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  },[inView,target]);
  return(
    <div ref={ref} style={{opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all .8s ease",textAlign:"center"}}>
      <div style={{...mono,fontSize:"clamp(22px,3vw,36px)",fontWeight:500,color:TEAL,letterSpacing:"-.02em"}}>{n}{suffix}</div>
      <div style={{fontSize:"10px",color:"#444",textTransform:"uppercase",letterSpacing:".12em",marginTop:"4px"}}>{label}</div>
    </div>
  );
}

// ─── MARQUEE ─────────────────────────────────────────────────────────────────
function Marquee(){
  const items=[...MARQUEE,...MARQUEE];
  return(
    <div style={{background:"#03050f",borderTop:".5px solid #0d1220",borderBottom:".5px solid #0d1220",position:"relative",zIndex:3}}>
      <div className="mq-wrap" style={{padding:"11px 0"}}>
        <div className="mq-l">{items.map((x,i)=>(
          <span key={i} style={{...mono,fontSize:"10px",letterSpacing:".18em",textTransform:"uppercase",
            color:i%5===0?TEAL:i%7===0?GOLD:i%11===0?PURPLE:"#1a2440",marginRight:"44px",
            display:"inline-flex",alignItems:"center",gap:"14px"}}>
            {x}<span style={{width:"3px",height:"3px",borderRadius:"50%",background:"#1a2440",display:"inline-block"}}/>
          </span>
        ))}</div>
      </div>
      <div style={{height:".5px",background:"#0d1220"}}/>
      <div className="mq-wrap" style={{padding:"11px 0"}}>
        <div className="mq-r">{[...items].reverse().map((x,i)=>(
          <span key={i} style={{...mono,fontSize:"10px",letterSpacing:".18em",textTransform:"uppercase",
            color:i%4===0?PURPLE:i%6===0?GOLD:"#1a2440",marginRight:"44px",
            display:"inline-flex",alignItems:"center",gap:"14px"}}>
            {x}<span style={{width:"3px",height:"3px",borderRadius:"50%",background:"#1a2440",display:"inline-block"}}/>
          </span>
        ))}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE MAIN 3D JOURNEY — one canvas, one camera, scroll drives everything
// ═══════════════════════════════════════════════════════════════════════════════
function Journey3D(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const outerRef =useRef<HTMLDivElement>(null);
  const pRef     =useRef(0);

  // Text overlays — driven by scroll, no re-renders
  const overlay1Ref=useRef<HTMLDivElement>(null);
  const overlay2Ref=useRef<HTMLDivElement>(null);
  const overlay3Ref=useRef<HTMLDivElement>(null);
  const overlay4Ref=useRef<HTMLDivElement>(null);
  const overlay5Ref=useRef<HTMLDivElement>(null);
  const warpRef    =useRef<HTMLDivElement>(null);
  const hudRef     =useRef<HTMLDivElement>(null);
  const dotRefs    =useRef<(HTMLDivElement|null)[]>([]);
  const progressRef=useRef<HTMLDivElement>(null);

  // Scroll → pRef
  useEffect(()=>{
    const h=()=>{
      const el=outerRef.current; if(!el)return;
      const rect=el.getBoundingClientRect();
      const scrollable=el.offsetHeight-window.innerHeight;
      const scrolled=Math.max(0,-rect.top);
      pRef.current=scrollable>0?Math.min(1,scrolled/scrollable):0;
    };
    window.addEventListener("scroll",h,{passive:true});
    h();
    return ()=>window.removeEventListener("scroll",h);
  },[]);

  useThree(canvasRef,(THREE,canvas)=>{
    // ── Renderer ──
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor(0x03050f,1);
    const W=canvas.clientWidth||window.innerWidth;
    const H=canvas.clientHeight||window.innerHeight;
    renderer.setSize(W,H,false);

    const scene =new THREE.Scene();
    scene.fog   =new THREE.FogExp2(0x03050f,0.012);
    const camera=new THREE.PerspectiveCamera(65,W/H,0.01,300);
    camera.position.set(0,0,10);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(0xffffff,.35));
    const pl1=new THREE.PointLight(0x00C4B4,3,40); pl1.position.set(5,5,5); scene.add(pl1);
    const pl2=new THREE.PointLight(0x7B5EA7,2,30); pl2.position.set(-5,-3,3); scene.add(pl2);
    const pl3=new THREE.PointLight(0xE8B923,1.5,25); pl3.position.set(0,8,-5); scene.add(pl3);

    // ── STARFIELD — persistent background ──
    const starGeo=new THREE.BufferGeometry();
    const sPos=new Float32Array(8000*3),sCol=new Float32Array(8000*3);
    for(let i=0;i<8000;i++){
      const r=20+Math.random()*80,t=Math.random()*Math.PI*2,p2=Math.acos(2*Math.random()-1);
      sPos[i*3]=r*Math.sin(p2)*Math.cos(t);sPos[i*3+1]=r*Math.sin(p2)*Math.sin(t);sPos[i*3+2]=r*Math.cos(p2);
      const warm=Math.random()<.1,b=.3+Math.random()*.7;
      sCol[i*3]=warm?b*.9:b*.75;sCol[i*3+1]=warm?b*.65:b*.88;sCol[i*3+2]=warm?b*.2:b;
    }
    starGeo.setAttribute("position",new THREE.BufferAttribute(sPos,3));
    starGeo.setAttribute("color",new THREE.BufferAttribute(sCol,3));
    const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({size:.04,vertexColors:true,transparent:true,opacity:.9}));
    scene.add(stars);

    // ══════════════════════════════════════════
    // SCENE 0 — VOID (p: 0→0.08)
    // Big bang: particles burst from center
    // ══════════════════════════════════════════
    const bangGroup=new THREE.Group();
    const bangN=3000;
    const bangPos=new Float32Array(bangN*3),bangVel=new Float32Array(bangN*3),bangCol=new Float32Array(bangN*3);
    const bangColors=[new THREE.Color(TEAL),new THREE.Color(PURPLE),new THREE.Color(GOLD)];
    for(let i=0;i<bangN;i++){
      bangPos[i*3]=0;bangPos[i*3+1]=0;bangPos[i*3+2]=0;
      const spd=.5+Math.random()*2;
      const theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      bangVel[i*3]=Math.sin(phi)*Math.cos(theta)*spd;
      bangVel[i*3+1]=Math.sin(phi)*Math.sin(theta)*spd;
      bangVel[i*3+2]=Math.cos(phi)*spd;
      const c=bangColors[i%3];
      bangCol[i*3]=c.r;bangCol[i*3+1]=c.g;bangCol[i*3+2]=c.b;
    }
    const bangGeo=new THREE.BufferGeometry();
    bangGeo.setAttribute("position",new THREE.BufferAttribute(new Float32Array(bangN*3),3));
    bangGeo.setAttribute("color",new THREE.BufferAttribute(bangCol,3));
    const bangMesh=new THREE.Points(bangGeo,new THREE.PointsMaterial({size:.025,vertexColors:true,transparent:true,opacity:0}));
    bangGroup.add(bangMesh);
    scene.add(bangGroup);

    // ══════════════════════════════════════════
    // SCENE 1 — GALAXY (p: 0.08→0.25)
    // Spiral galaxy forms, camera flies through
    // ══════════════════════════════════════════
    const galaxyGroup=new THREE.Group();
    galaxyGroup.position.set(0,0,-20);
    const GN=7000,arms=3;
    const gPos=new Float32Array(GN*3),gCol=new Float32Array(GN*3);
    const palette=[[0,0.77,0.71],[0.48,0.37,0.65],[0.91,0.73,0.14]];
    for(let i=0;i<GN;i++){
      const arm=i%arms;const t=(i/GN)*Math.PI*8+(arm/arms)*Math.PI*2;
      const r=.3+(i/GN)*5+Math.random()*.5;const spread=.1+(i/GN)*.5;
      gPos[i*3]=Math.cos(t)*r+(Math.random()-.5)*spread;
      gPos[i*3+1]=(Math.random()-.5)*spread*.4;
      gPos[i*3+2]=Math.sin(t)*r+(Math.random()-.5)*spread;
      const [cr,cg,cb]=palette[arm];const b=.5+Math.random()*.5;
      gCol[i*3]=cr*b;gCol[i*3+1]=cg*b;gCol[i*3+2]=cb*b;
    }
    const gGeo=new THREE.BufferGeometry();
    gGeo.setAttribute("position",new THREE.BufferAttribute(gPos,3));
    gGeo.setAttribute("color",new THREE.BufferAttribute(gCol,3));
    const galaxyMesh=new THREE.Points(gGeo,new THREE.PointsMaterial({size:.025,vertexColors:true,transparent:true,opacity:0}));
    galaxyGroup.add(galaxyMesh);
    // Galaxy core
    const core=new THREE.Mesh(new THREE.SphereGeometry(.4,32,32),new THREE.MeshBasicMaterial({color:0x00C4B4,transparent:true,opacity:0}));
    galaxyGroup.add(core);
    scene.add(galaxyGroup);

    // ══════════════════════════════════════════
    // SCENE 2 — WARP TUNNEL (p: 0.25→0.38)
    // Hyperspace: streaking lines
    // ══════════════════════════════════════════
    const warpGroup=new THREE.Group();
    const warpLines:any[]=[];
    for(let i=0;i<120;i++){
      const ang=Math.random()*Math.PI*2;
      const rad=.2+Math.random()*2.5;
      const len=8+Math.random()*20;
      const pts=[new THREE.Vector3(Math.cos(ang)*rad,Math.sin(ang)*rad,-2),new THREE.Vector3(Math.cos(ang)*rad*1.02,Math.sin(ang)*rad*1.02,-2-len)];
      const geo=new THREE.BufferGeometry().setFromPoints(pts);
      const col=i%3===0?0x00C4B4:i%3===1?0x7B5EA7:0xE8B923;
      const mat=new THREE.LineBasicMaterial({color:col,transparent:true,opacity:0});
      const line=new THREE.Line(geo,mat);
      warpGroup.add(line);
      warpLines.push({line,mat,ang,rad,offset:Math.random()});
    }
    warpGroup.position.z=30;
    scene.add(warpGroup);

    // ══════════════════════════════════════════
    // SCENE 3 — NEURAL NETWORK (p: 0.38→0.55)
    // Nodes pulse, synapses fire
    // ══════════════════════════════════════════
    const neuralGroup=new THREE.Group();
    neuralGroup.position.set(0,0,-60);
    const nodeColors=[0x00C4B4,0x7B5EA7,0xE8B923,0x4A9EFF,0xFF6B6B,0xA78BFA,0x00C4B4,0x7B5EA7,0xE8B923,0x4A9EFF,0xFF6B6B,0xA78BFA];
    const nodes:any[]=[];
    const phi2=Math.PI*(3-Math.sqrt(5));
    for(let i=0;i<12;i++){
      const y=1-(i/11)*2;const r2=Math.sqrt(1-y*y)*4;const theta2=phi2*i;
      const mat=new THREE.MeshStandardMaterial({color:nodeColors[i],emissive:nodeColors[i],emissiveIntensity:.4,roughness:.2,metalness:.7,transparent:true,opacity:0});
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(.22,20,20),mat);
      mesh.position.set(Math.cos(theta2)*r2,y*2.8,Math.sin(theta2)*r2);
      mesh.userData={basePos:mesh.position.clone(),phase:i*.55,baseScale:1};
      neuralGroup.add(mesh);
      nodes.push(mesh);
    }
    // Edges
    const edgeMat=new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:0});
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      if(Math.random()>.5)continue;
      neuralGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([nodes[i].position,nodes[j].position]),edgeMat));
    }
    // Pulse rings
    const rings:any[]=[];
    nodes.forEach((n,i)=>{
      if(i%3!==0)return;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.015,8,40),new THREE.MeshBasicMaterial({color:nodeColors[i],transparent:true,opacity:0}));
      ring.position.copy(n.position);ring.userData={phase:i*.8};
      neuralGroup.add(ring);rings.push(ring);
    });
    scene.add(neuralGroup);

    // ══════════════════════════════════════════
    // SCENE 4 — DNA HELIX (p: 0.55→0.70)
    // Study DNA transforms
    // ══════════════════════════════════════════
    const dnaGroup=new THREE.Group();
    dnaGroup.position.set(0,0,-110);
    const helixN=80;
    const helixA:THREE.Mesh[]=[], helixB:THREE.Mesh[]=[], rungs:THREE.Line[]=[];
    for(let i=0;i<helixN;i++){
      const t=(i/helixN)*Math.PI*8, y=(i/helixN)*12-6;
      const mA=new THREE.Mesh(new THREE.SphereGeometry(.1,12,12),
        new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(i/helixN,.8,.55),emissive:new THREE.Color().setHSL(i/helixN,.8,.3),emissiveIntensity:.5,roughness:.3,metalness:.5,transparent:true,opacity:0}));
      mA.position.set(Math.cos(t)*1.5,y,Math.sin(t)*1.5);
      const mB=new THREE.Mesh(new THREE.SphereGeometry(.1,12,12),
        new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL((i/helixN+.5)%1,.8,.55),emissive:new THREE.Color().setHSL((i/helixN+.5)%1,.8,.3),emissiveIntensity:.5,roughness:.3,metalness:.5,transparent:true,opacity:0}));
      mB.position.set(Math.cos(t+Math.PI)*1.5,y,Math.sin(t+Math.PI)*1.5);
      dnaGroup.add(mA,mB);helixA.push(mA);helixB.push(mB);
      if(i%5===0){
        const rGeo=new THREE.BufferGeometry().setFromPoints([mA.position,mB.position]);
        const rLine=new THREE.Line(rGeo,new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:0}));
        dnaGroup.add(rLine);rungs.push(rLine);
      }
    }
    scene.add(dnaGroup);

    // ══════════════════════════════════════════
    // SCENE 5 — CRYSTAL PRISM (p: 0.70→0.85)
    // Icosahedron shatters/assembles
    // ══════════════════════════════════════════
    const prismGroup=new THREE.Group();
    prismGroup.position.set(0,0,-160);
    const ico=new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.5,1),
      new THREE.MeshStandardMaterial({color:0x0a1a2e,roughness:.05,metalness:.95,transparent:true,opacity:0,wireframe:false})
    );
    prismGroup.add(ico);
    const icoEdge=new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.5,1)),
      new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:0})
    );
    prismGroup.add(icoEdge);
    // Orbiting satellites
    const sats:any[]=[];
    [[0x00C4B4,4,0],[0x7B5EA7,3.5,2.09],[0xE8B923,4.2,4.19],[0xFF6B6B,3.8,1.05],[0x4A9EFF,4.5,3.14]].forEach(([col,r,ang],i)=>{
      const sat=new THREE.Mesh(new THREE.OctahedronGeometry(.35),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.5,roughness:.2,metalness:.8}));
      sat.userData={r,ang,speed:.4+i*.12,y:Math.sin(i)*1.2};
      prismGroup.add(sat);sats.push(sat);
    });
    scene.add(prismGroup);

    // ══════════════════════════════════════════
    // SCENE 6 — CONSTELLATION CTA (p: 0.85→1.0)
    // Stars connect, form arrow
    // ══════════════════════════════════════════
    const ctaGroup=new THREE.Group();
    ctaGroup.position.set(0,0,-220);
    const starPoints=[
      [0,4],[2,2],[1,2],[-1,2],[-2,2],
      [0,0],[1.5,-1.5],[-1.5,-1.5],[0,-3.5],[2.5,-4],[-2.5,-4]
    ].map(([x,y])=>new THREE.Vector3(x,y,0));
    const ctaStars:THREE.Mesh[]=[];
    starPoints.forEach((pt,i)=>{
      const m=new THREE.Mesh(new THREE.SphereGeometry(.08,10,10),new THREE.MeshBasicMaterial({color:i===0?0xE8B923:0x00C4B4,transparent:true,opacity:0}));
      m.position.copy(pt);ctaGroup.add(m);ctaStars.push(m);
    });
    // Constellation lines
    const constLines:THREE.Line[]=[];
    [[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[5,6],[5,7],[6,8],[7,8],[8,9],[8,10]].forEach(([a,b])=>{
      if(!starPoints[b])return;
      const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([starPoints[a],starPoints[b]]),new THREE.LineBasicMaterial({color:0x00C4B4,transparent:true,opacity:0}));
      ctaGroup.add(l);constLines.push(l);
    });
    // Particle shower
    const showerGeo=new THREE.BufferGeometry();
    const shPos=new Float32Array(500*3),shVel=new Float32Array(500*3);
    for(let i=0;i<500;i++){shPos[i*3]=(Math.random()-.5)*20;shPos[i*3+1]=10+Math.random()*20;shPos[i*3+2]=(Math.random()-.5)*8;shVel[i*3+1]=-(Math.random()*.08+.04);}
    showerGeo.setAttribute("position",new THREE.BufferAttribute(shPos,3));
    const shower=new THREE.Points(showerGeo,new THREE.PointsMaterial({color:0xE8B923,size:.05,transparent:true,opacity:0}));
    ctaGroup.add(shower);
    scene.add(ctaGroup);

    // ── Mouse ──
    const mouse={x:0,y:0,tx:0,ty:0};
    const onMouse=(e:MouseEvent)=>{mouse.tx=(e.clientX/window.innerWidth-.5)*2;mouse.ty=-(e.clientY/window.innerHeight-.5)*2;};
    window.addEventListener("mousemove",onMouse,{passive:true});

    // ── Resize ──
    const onResize=()=>{
      const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;
      camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    };
    window.addEventListener("resize",onResize);

    // ── Text overlay helper ──
    const setOverlay=(ref:React.RefObject<HTMLDivElement>,op:number,y=0)=>{
      const el=ref.current; if(!el)return;
      el.style.opacity=String(Math.max(0,Math.min(1,op)));
      el.style.transform=`translateX(-50%) translateY(${y}px)`;
    };

    // ── Main RAF ──
    let raf:number,t=0;
    const tick=()=>{
      raf=requestAnimationFrame(tick); t+=.008;
      const p=pRef.current;

      // Smooth mouse
      mouse.x=lerp(mouse.x,mouse.tx,.06);
      mouse.y=lerp(mouse.y,mouse.ty,.06);

      // Global star rotation
      stars.rotation.y=t*.02+mouse.x*.05;
      stars.rotation.x=mouse.y*.03;

      // Progress bar
      if(progressRef.current)progressRef.current.style.transform=`scaleX(${p})`;

      // Scene dots
      const sceneIdx=p<.12?0:p<.28?1:p<.42?2:p<.58?3:p<.72?4:p<.86?5:6;
      dotRefs.current.forEach((d,i)=>{
        if(!d)return;
        d.style.height=i===sceneIdx?"22px":"4px";
        d.style.background=i===sceneIdx?[TEAL,TEAL,PURPLE,PURPLE,GOLD,TEAL,GOLD][i]:"rgba(255,255,255,0.12)";
      });

      // ── p: 0→0.12  SCENE 0: BIG BANG ──
      {
        const sp=Math.min(1,p/.12);const ep=sp<.5?sp*2:1;
        bangMesh.material.opacity=ep*.85*(1-Math.max(0,(sp-.7)/.3));
        const bpos=bangGeo.attributes.position.array as Float32Array;
        for(let i=0;i<bangN;i++){
          bpos[i*3]=bangVel[i*3]*ep*5;bpos[i*3+1]=bangVel[i*3+1]*ep*5;bpos[i*3+2]=bangVel[i*3+2]*ep*3;
        }
        bangGeo.attributes.position.needsUpdate=true;
        bangGroup.rotation.y=t*.3+mouse.x*.2;
        // Camera: stationary, looking at bang
        camera.position.set(mouse.x*.3,mouse.y*.2,10);camera.lookAt(0,0,0);
        // Overlay 1
        const textP=sp>.15?Math.min(1,(sp-.15)/.4)*(1-Math.max(0,(sp-.7)/.3)):0;
        setOverlay(overlay1Ref,textP,(1-sp)*30);
      }

      // ── p: 0.12→0.28  SCENE 1: GALAXY ──
      {
        const sp=Math.max(0,Math.min(1,(p-.12)/.16));const ep=1-Math.pow(1-sp,3);
        galaxyMesh.material.opacity=ep*.8*(1-Math.max(0,(sp-.8)/.2));
        core.material.opacity=ep*.7*(1-Math.max(0,(sp-.85)/.15));
        galaxyGroup.rotation.y=t*.12+mouse.x*.3+sp*Math.PI;
        galaxyGroup.rotation.x=mouse.y*.1+sp*.15;
        // Camera flies INTO galaxy
        camera.position.set(mouse.x*.8+sp*2,mouse.y*.5+sp*.5,10-sp*18);
        camera.lookAt(mouse.x*.3,mouse.y*.2,-20);
        // Overlay
        const textP=sp>.1?Math.min(1,(sp-.1)/.35)*(1-Math.max(0,(sp-.75)/.25)):0;
        setOverlay(overlay2Ref,textP,(1-sp)*20);
      }

      // ── p: 0.28→0.42  SCENE 2: WARP ──
      {
        const sp=Math.max(0,Math.min(1,(p-.28)/.14));const ep=1-Math.pow(1-sp,2);
        camera.position.set(mouse.x*.2,mouse.y*.2,-8-sp*18);camera.lookAt(mouse.x*.1,mouse.y*.1,-100);
        warpGroup.position.z=camera.position.z+5;
        warpLines.forEach(({mat,offset})=>{
          const phase=(sp+offset)%1;
          mat.opacity=Math.sin(phase*Math.PI)*.85*ep;
        });
        // Warp DOM effect
        if(warpRef.current)warpRef.current.style.opacity=String(ep*(1-Math.max(0,(sp-.8)/.2)));
        setOverlay(overlay3Ref,sp>.1?Math.min(1,(sp-.1)/.35)*(1-Math.max(0,(sp-.75)/.25)):0,0);
      }

      // ── p: 0.42→0.58  SCENE 3: NEURAL ──
      {
        const sp=Math.max(0,Math.min(1,(p-.42)/.16));const ep=1-Math.pow(1-sp,3);
        // Fade in nodes
        nodes.forEach(n=>{
          n.material.opacity=ep;
          n.material.emissiveIntensity=.2+Math.sin(t+n.userData.phase)*.3;
          n.scale.setScalar(1+Math.sin(t*1.5+n.userData.phase)*.12);
        });
        edgeMat.opacity=ep*.12*(1-Math.max(0,(sp-.8)/.2));
        rings.forEach(r=>{const s=(Math.sin(t*1.2+r.userData.phase)+1)/2;r.scale.setScalar(1+s*.9);r.material.opacity=ep*(1-s)*.45;});
        neuralGroup.rotation.y=t*.18+mouse.x*.35;neuralGroup.rotation.x=mouse.y*.2;
        // Camera orbits
        camera.position.set(Math.sin(t*.12)*3+mouse.x*1.5,-mouse.y*1.5,-60+Math.cos(t*.1)*2);
        camera.lookAt(0,0,-60);
        setOverlay(overlay4Ref,sp>.1?Math.min(1,(sp-.1)/.35)*(1-Math.max(0,(sp-.75)/.25)):0,0);
      }

      // ── p: 0.58→0.72  SCENE 4: DNA ──
      {
        const sp=Math.max(0,Math.min(1,(p-.58)/.14));const ep=1-Math.pow(1-sp,3);
        helixA.forEach((m,i)=>{(m.material as any).opacity=ep;m.scale.setScalar(.8+Math.sin(t*.8+i*.2)*.2);});
        helixB.forEach((m,i)=>{(m.material as any).opacity=ep;m.scale.setScalar(.8+Math.cos(t*.8+i*.2)*.2);});
        rungs.forEach(r=>{(r.material as any).opacity=ep*.6;});
        dnaGroup.rotation.y=t*.25+mouse.x*.3;
        // Camera spirals around helix
        camera.position.set(Math.cos(t*.3+sp*Math.PI)*5+mouse.x,Math.sin(t*.2)*2+mouse.y,-110);
        camera.lookAt(0,0,-110);
        // Overlay 5 — Study DNA scene
        setOverlay(overlay5Ref,sp>.1?Math.min(1,(sp-.1)/.35)*(1-Math.max(0,(sp-.75)/.25)):0,0);
      }

      // ── p: 0.72→0.86  SCENE 5: PRISM ──
      {
        const sp=Math.max(0,Math.min(1,(p-.72)/.14));const ep=1-Math.pow(1-sp,3);
        ico.material.opacity=ep*.85;icoEdge.material.opacity=ep;
        ico.rotation.x=t*.2+mouse.y*.3;ico.rotation.y=t*.3+mouse.x*.3;
        sats.forEach(sat=>{
          const a=sat.userData.ang+t*sat.userData.speed;
          sat.position.set(Math.cos(a)*sat.userData.r,sat.userData.y+Math.sin(t+sat.userData.ang)*.5,Math.sin(a)*sat.userData.r);
          sat.rotation.x+=.02;sat.rotation.y+=.03;
        });
        prismGroup.rotation.y=mouse.x*.2;prismGroup.rotation.x=mouse.y*.15;
        camera.position.set(mouse.x*2,mouse.y*2,-160+Math.sin(t*.2)*3);
        camera.lookAt(0,0,-160);
        pl3.position.set(Math.cos(t*.5)*6,Math.sin(t*.3)*6,-155);
      }

      // ── p: 0.86→1.0  SCENE 6: CONSTELLATION ──
      {
        const sp=Math.max(0,Math.min(1,(p-.86)/.14));const ep=1-Math.pow(1-sp,3);
        ctaStars.forEach((m,i)=>{(m.material as any).opacity=ep*Math.min(1,sp*6-i*.3);m.scale.setScalar(1+Math.sin(t*2+i)*.2);});
        constLines.forEach((l,i)=>{(l.material as any).opacity=ep*Math.min(1,Math.max(0,sp*8-i*.5));});
        shower.material.opacity=ep*.8;
        const shPos2=showerGeo.attributes.position.array as Float32Array;
        for(let i=0;i<500;i++){shPos2[i*3+1]+=shVel[i*3+1];if(shPos2[i*3+1]<-8)shPos2[i*3+1]=10+Math.random()*10;}
        showerGeo.attributes.position.needsUpdate=true;
        ctaGroup.rotation.y=mouse.x*.15;ctaGroup.rotation.x=mouse.y*.1;
        camera.position.set(mouse.x*1.5,mouse.y*1.5,-220+sp*3);camera.lookAt(0,0,-220);
      }

      // HUD coordinates
      if(hudRef.current){
        hudRef.current.style.opacity=p>.05&&p<.92?"1":"0";
        const cp=camera.position;
        hudRef.current.innerHTML=`<div>X ${cp.x.toFixed(2)}</div><div>Y ${cp.y.toFixed(2)}</div><div>Z ${Math.abs(cp.z).toFixed(1)}</div>`;
      }

      pl1.position.set(Math.sin(t*.4)*8,Math.cos(t*.3)*6,camera.position.z+3);
      pl2.position.set(Math.cos(t*.5)*6,-Math.sin(t*.4)*5,camera.position.z+2);

      renderer.render(scene,camera);
    };
    tick();

    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouse);window.removeEventListener("resize",onResize);renderer.dispose();};
  });

  const ov:React.CSSProperties={position:"absolute",bottom:"15%",left:"50%",transform:"translateX(-50%)",
    textAlign:"center",zIndex:10,pointerEvents:"none",width:"min(640px,90vw)",transition:"opacity .12s",opacity:0};
  const h2s:React.CSSProperties={fontSize:"clamp(26px,4.5vw,58px)",fontWeight:300,letterSpacing:"-.035em",
    lineHeight:1.1,color:"#F2F5F8",marginBottom:"18px",whiteSpace:"pre-line",textShadow:"0 0 80px rgba(0,0,0,.95)"};
  const ps:React.CSSProperties={fontSize:"15px",color:"rgba(255,255,255,.4)",maxWidth:"420px",
    margin:"0 auto",lineHeight:1.75,fontWeight:300,textShadow:"0 0 30px rgba(0,0,0,.9)"};
  const tags:React.CSSProperties={...mono,fontSize:"10px",color:TEAL,letterSpacing:".22em",
    textTransform:"uppercase",marginBottom:"18px",opacity:.8};

  return(
    <div ref={outerRef} style={{height:"1400vh",position:"relative",background:VOID}}>
      <div style={{position:"sticky",top:0,height:"100vh",overflow:"hidden"}}>
        <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>

        {/* Warp DOM lines */}
        <div ref={warpRef} style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",opacity:0}}>
          {Array.from({length:16},(_,i)=>{
            const ang=(i/16)*360;
            return <div key={i} style={{position:"absolute",left:"50%",top:"50%",width:"1px",height:"60%",
              background:`linear-gradient(${i%3===0?TEAL:i%3===1?PURPLE:GOLD},transparent)`,
              transformOrigin:"top center",transform:`rotate(${ang}deg) translateX(-50%)`,opacity:.3+Math.random()*.4}}/>;
          })}
        </div>

        {/* Text overlays */}
        <div ref={overlay1Ref} style={ov}>
          <div style={tags}>00 — Genesis</div>
          <h2 style={h2s}>{"A new universe\nof learning begins"}</h2>
          <p style={ps}>From the void, knowledge takes form. 12 AI tools ignite.</p>
        </div>
        <div ref={overlay2Ref} style={ov}>
          <div style={{...tags,color:TEAL}}>01 — The Galaxy</div>
          <h2 style={h2s}>{"Enter a universe\nbuilt for learning"}</h2>
          <p style={ps}>12 AI tools orbiting one mission — your academic breakthrough.</p>
        </div>
        <div ref={overlay3Ref} style={ov}>
          <div style={{...tags,color:PURPLE}}>02 — Warp Speed</div>
          <h2 style={{...h2s,color:"#F2F5F8"}}>{"Knowledge at\nthe speed of thought"}</h2>
          <p style={ps}>Break through the limits of traditional studying. Enter a new dimension.</p>
        </div>
        <div ref={overlay4Ref} style={ov}>
          <div style={{...tags,color:PURPLE}}>03 — Neural</div>
          <h2 style={h2s}>{"Intelligence\nthat adapts to you"}</h2>
          <p style={ps}>BrainBot learns your gaps. Neural pathways form with every session.</p>
        </div>
        <div ref={overlay5Ref} style={ov}>
          <div style={{...tags,color:GOLD}}>04 — Study DNA</div>
          <h2 style={h2s}>{"Your unique\nlearner profile"}</h2>
          <p style={ps}>Every study session rewrites your DNA. Patterns emerge. Mastery follows.</p>
        </div>

        {/* Scene dots */}
        <div style={{position:"absolute",right:"28px",top:"50%",transform:"translateY(-50%)",zIndex:10,display:"flex",flexDirection:"column",gap:"8px"}}>
          {[TEAL,TEAL,PURPLE,PURPLE,GOLD,TEAL,GOLD].map((c,i)=>(
            <div key={i} ref={el=>{dotRefs.current[i]=el;}} style={{width:"4px",height:"4px",borderRadius:"2px",
              background:"rgba(255,255,255,0.12)",transition:"height .4s ease,background .4s ease"}}/>
          ))}
        </div>

        {/* HUD */}
        <div ref={hudRef} style={{position:"absolute",left:"24px",bottom:"12%",...mono,fontSize:"9px",
          color:"rgba(0,196,180,.3)",letterSpacing:".12em",lineHeight:2,transition:"opacity .4s",opacity:0}}/>

        {/* Scroll hint */}
        <div style={{position:"absolute",bottom:"32px",left:"50%",transform:"translateX(-50%)",
          zIndex:10,textAlign:"center",pointerEvents:"none"}}>
          <div style={{...mono,fontSize:"9px",color:"rgba(255,255,255,.2)",letterSpacing:".2em",marginBottom:"8px"}}>SCROLL</div>
          <div style={{width:"1px",height:"24px",background:`linear-gradient(${TEAL},transparent)`,margin:"0 auto"}}/>
        </div>

        {/* Progress */}
        <div ref={progressRef} style={{position:"absolute",bottom:0,left:0,right:0,height:"1.5px",
          background:`linear-gradient(90deg,${TEAL},${PURPLE},${GOLD})`,transformOrigin:"left",transform:"scaleX(0)"}}/>
      </div>
    </div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero(){
  return(
    <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",textAlign:"center",padding:"120px 32px 80px",position:"relative",zIndex:2}}>
      <div style={{...mono,fontSize:"10px",color:TEAL,letterSpacing:".18em",textTransform:"uppercase",
        marginBottom:"32px",animation:"hero-enter 1.2s ease .1s both",opacity:.8}}>AI-Powered Study Platform</div>
      <h1 style={{fontSize:"clamp(44px,7vw,96px)",fontWeight:300,letterSpacing:"-.04em",lineHeight:1.0,
        marginBottom:"24px",color:"#F2F5F8",animation:"hero-enter 1.2s ease .25s both",maxWidth:"900px"}}>
        <Glitch text="Study smarter."/><br/>
        <span style={{background:`linear-gradient(135deg,${TEAL},${PURPLE})`,WebkitBackgroundClip:"text",
          WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Master it faster.</span>
      </h1>
      <p style={{fontSize:"clamp(15px,2vw,18px)",color:"#444",maxWidth:"520px",marginBottom:"44px",
        lineHeight:1.75,fontWeight:300,animation:"hero-enter 1.2s ease .4s both"}}>
        12 AI-powered study tools in one platform — flashcards, cram mode, tutor, recall, confidence tracking and more.
      </p>
      <div style={{display:"flex",gap:"16px",flexWrap:"wrap",justifyContent:"center",animation:"hero-enter 1.2s ease .55s both"}}>
        <Link to="/signup">
          <button style={{fontSize:"13px",fontWeight:600,color:VOID,background:TEAL,border:"none",
            padding:"14px 32px",cursor:"pointer",letterSpacing:".04em",
            transition:"opacity .15s,box-shadow .2s,transform .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.opacity=".82";e.currentTarget.style.boxShadow=`0 0 48px rgba(0,196,180,.6)`;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
            Start for free →
          </button>
        </Link>
        <Link to="/login">
          <button style={{fontSize:"13px",fontWeight:400,color:"#888",background:"transparent",
            border:".5px solid #1a2440",padding:"14px 32px",cursor:"pointer",letterSpacing:".04em",
            transition:"color .2s,border-color .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="#E0E8F0";e.currentTarget.style.borderColor="#444";}}
            onMouseLeave={e=>{e.currentTarget.style.color="#888";e.currentTarget.style.borderColor="#1a2440";}}>
            See dashboard
          </button>
        </Link>
      </div>
      <div style={{position:"absolute",bottom:"40px",left:"50%",transform:"translateX(-50%)",
        ...mono,fontSize:"9px",color:"rgba(255,255,255,.15)",letterSpacing:".2em",textAlign:"center"}}>
        <div style={{marginBottom:"8px"}}>SCROLL TO EXPLORE THE UNIVERSE</div>
        <div style={{width:"1px",height:"28px",background:`linear-gradient(${TEAL},transparent)`,margin:"0 auto"}}/>
      </div>
    </section>
  );
}

// ─── HERO 3D BG ───────────────────────────────────────────────────────────────
function HeroBg(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useThree(canvasRef,(THREE,canvas)=>{
    const W=canvas.clientWidth||window.innerWidth,H=canvas.clientHeight||window.innerHeight;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setSize(W,H,false);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(70,W/H,.1,200);
    camera.position.set(0,1.5,7);camera.lookAt(0,0,0);

    // Stars
    const N=5000,pos=new Float32Array(N*3),col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const r=5+Math.random()*18,t=Math.random()*Math.PI*2,p=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(p)*Math.cos(t);pos[i*3+1]=r*Math.sin(p)*Math.sin(t);pos[i*3+2]=r*Math.cos(p);
      const warm=Math.random()<.1,b=.25+Math.random()*.75;
      col[i*3]=warm?b*.9:b*.75;col[i*3+1]=warm?b*.65:b*.9;col[i*3+2]=warm?b*.15:b;
    }
    const sGeo=new THREE.BufferGeometry();
    sGeo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    sGeo.setAttribute("color",new THREE.BufferAttribute(col,3));
    scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({size:.022,vertexColors:true,transparent:true,opacity:.85})));

    // Planet
    const planet=new THREE.Mesh(new THREE.SphereGeometry(1.8,64,64),
      new THREE.MeshStandardMaterial({color:0x0d1b6e,roughness:.7,metalness:.2}));
    planet.position.set(3.5,1,-3);scene.add(planet);
    [[480,8,"rgba(200,220,255,0.15)"],[560,4,"rgba(232,185,35,0.08)"],[640,2,"rgba(0,196,180,0.05)"]].forEach(([w,bw,col2]:any,i)=>{
      const ring=new THREE.Mesh(new THREE.TorusGeometry(w*.004,bw*.001,3,80),
        new THREE.MeshBasicMaterial({color:i===0?0xc8dcff:i===1?0xe8b923:0x00c4b4,transparent:true,opacity:i===0?.18:i===1?.08:.05}));
      ring.rotation.x=Math.PI/2.4;ring.position.set(3.5,1,-3);scene.add(ring);
    });

    // Small orbs
    [[0x00C4B4,[-2,.5,-1],.12],[0x7B5EA7,[1.5,-.5,-2],.18],[0xE8B923,[-.5,-1,-1.5],.09]].forEach(([c,p2,r2]:any)=>{
      const m=new THREE.Mesh(new THREE.SphereGeometry(r2,16,16),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.7}));
      m.position.set(...p2);scene.add(m);
    });

    scene.add(new THREE.AmbientLight(0xffffff,.4));
    const pl=new THREE.PointLight(0x7B5EA7,1.5,20);pl.position.set(-3,-2,3);scene.add(pl);

    const mouse={x:0,y:0};
    const onM=(e:MouseEvent)=>{mouse.x=(e.clientX/window.innerWidth-.5);mouse.y=-(e.clientY/window.innerHeight-.5);};
    window.addEventListener("mousemove",onM,{passive:true});

    let raf:number,t=0;
    const tick=()=>{raf=requestAnimationFrame(tick);t+=.003;scene.rotation.y=t*.04+mouse.x*.08;scene.rotation.x=mouse.y*.05;renderer.render(scene,camera);};
    tick();

    const onR=()=>{const w=canvas.clientWidth||window.innerWidth,h=canvas.clientHeight||window.innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    window.addEventListener("resize",onR);

    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onM);window.removeEventListener("resize",onR);renderer.dispose();};
  });
  return <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>;
}

// ─── FEATURES GRID ────────────────────────────────────────────────────────────
function FeaturesSection(){
  const {ref,inView}=useInView(.05);
  return(
    <div ref={ref} style={{background:"#03050f",padding:"80px 32px",position:"relative",zIndex:2}}>
      <div style={{maxWidth:"1100px",margin:"0 auto"}}>
        <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:".16em",textTransform:"uppercase",marginBottom:"12px"}}>Tools</div>
        <h2 style={{fontSize:"clamp(24px,3.5vw,44px)",fontWeight:300,letterSpacing:"-.03em",color:"#F2F5F8",marginBottom:"48px",maxWidth:"480px",lineHeight:1.2}}>12 tools. One mission.</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"1px",background:"#0d1220"}}>
          {features.map((f,i)=>(
            <div key={f.n}
              style={{background:"#03050f",padding:"24px",
                opacity:inView?1:0,
                transform:inView?"translateY(0)":"translateY(24px)",
                transition:`opacity .6s ease ${i*.04}s, transform .6s ease ${i*.04}s, background .2s`}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#07101f";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="#03050f";}}>
              <div style={{fontSize:"24px",marginBottom:"12px"}}>{f.icon}</div>
              <div style={{...mono,fontSize:"9px",color:f.color,letterSpacing:".1em",marginBottom:"6px"}}>{f.n}</div>
              <div style={{fontSize:"14px",color:"#E0E8F0",fontWeight:400,marginBottom:"6px",letterSpacing:"-.01em"}}>{f.title}</div>
              <div style={{fontSize:"12px",color:"#444",lineHeight:1.65,fontWeight:300}}>{f.desc}</div>
              <div style={{width:"24px",height:"1px",background:f.color,marginTop:"14px",opacity:.5}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MANIFESTO ────────────────────────────────────────────────────────────────
const MANIFESTO="Stop highlighting. Stop re-reading. Start recalling. Build understanding that lasts past the exam and stays with you forever.";
function Manifesto(){
  const ref=useRef<HTMLDivElement>(null);
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const h=()=>{if(!ref.current)return;const rect=ref.current.getBoundingClientRect();setProgress(Math.max(0,Math.min(1,(window.innerHeight-rect.top)/(window.innerHeight*1.6))));};
    window.addEventListener("scroll",h,{passive:true});h();return ()=>window.removeEventListener("scroll",h);
  },[]);
  const words=MANIFESTO.split(" ");
  return(
    <div ref={ref} style={{background:"#03050f",padding:"120px 32px",position:"relative",zIndex:2}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 50% 40% at 50% 50%,rgba(0,196,180,.04) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{maxWidth:"720px",margin:"0 auto"}}>
        <div style={{...mono,fontSize:"10px",color:"#252d40",letterSpacing:".18em",textTransform:"uppercase",marginBottom:"36px"}}>— The Studenius Principle</div>
        <p style={{fontSize:"clamp(22px,3.5vw,40px)",fontWeight:300,letterSpacing:"-.025em",lineHeight:1.4}}>
          {words.map((w,i)=>{
            const threshold=i/words.length;
            const lit=progress>=threshold;
            const past=progress>=Math.min(1,threshold+.12);
            return <span key={i} className={`wd${lit?(past?" wd-past":" wd-lit"):""}`}>{w}</span>;
          })}
        </p>
      </div>
    </div>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
function Testimonials(){
  const {ref,inView}=useInView(.1);
  return(
    <div ref={ref} style={{background:"#03050f",padding:"80px 32px",zIndex:2,position:"relative"}}>
      <div style={{maxWidth:"720px",margin:"0 auto"}}>
        <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:".16em",textTransform:"uppercase",marginBottom:"40px"}}>Testimonials</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1px",background:"#0d1220"}}>
          {testimonials.map((t,i)=>(
            <div key={t.name} style={{background:"#080d1a",padding:"22px 26px",
              opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",
              transition:`all .7s ease ${i*.1}s`}}>
              <div style={{...mono,fontSize:"10px",color:"#333",letterSpacing:".06em",marginBottom:"10px"}}>{t.name} — {t.role}</div>
              <p style={{fontSize:"13px",color:"#555",lineHeight:1.7,fontWeight:300}}>"{t.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA(){
  const {ref,inView}=useInView(.2);
  return(
    <div ref={ref} style={{background:"#03050f",padding:"100px 32px",textAlign:"center",position:"relative",zIndex:2}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 50% at 50% 50%,rgba(0,196,180,.06) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{maxWidth:"560px",margin:"0 auto",position:"relative"}}>
        <h2 style={{fontSize:"clamp(28px,4vw,52px)",fontWeight:300,letterSpacing:"-.03em",marginBottom:"16px",
          opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(30px)",transition:"all .8s ease"}}>
          Ready to study smarter?
        </h2>
        <p style={{fontSize:"15px",color:"#444",marginBottom:"36px",fontWeight:300,
          opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all .8s ease .1s"}}>
          Start free. No credit card required.
        </p>
        <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap",
          opacity:inView?1:0,transform:inView?"translateY(0)":"translateY(20px)",transition:"all .8s ease .2s"}}>
          <Link to="/signup">
            <button style={{fontSize:"13px",fontWeight:600,color:VOID,background:TEAL,border:"none",
              padding:"14px 36px",cursor:"pointer",letterSpacing:".04em",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.opacity=".82";e.currentTarget.style.boxShadow=`0 0 56px rgba(0,196,180,.6)`;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";}}>
              Get started free →
            </button>
          </Link>
          <Link to="/pricing">
            <button style={{fontSize:"13px",fontWeight:400,color:"#555",background:"transparent",
              border:".5px solid #1a2440",padding:"14px 28px",cursor:"pointer",letterSpacing:".04em",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.color="#E0E8F0";e.currentTarget.style.borderColor="#555";}}
              onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#1a2440";}}>
              View pricing
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── COUNTERS ─────────────────────────────────────────────────────────────────
function Stats(){
  return(
    <div style={{background:"rgba(6,8,18,.95)",borderTop:".5px solid #0d1220",borderBottom:".5px solid #0d1220",zIndex:2,position:"relative"}}>
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"32px",display:"flex",gap:"48px",flexWrap:"wrap",justifyContent:"center"}}>
        <Counter target={12} suffix="+" label="AI Study Tools"/>
        <Counter target={50} suffix="k+" label="Students"/>
        <Counter target={2}  suffix="M+" label="Questions Generated"/>
        <Counter target={94} suffix="%" label="Pass Rate"/>
      </div>
    </div>
  );
}

// ─── SCROLL BAR ───────────────────────────────────────────────────────────────
function ScrollBar(){
  const p=useScrollProgress();
  return <div id="scroll-bar" style={{transform:`scaleX(${p})`}}/>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Landing(){
  const [navScrolled,setNavScrolled]=useState(false);
  useEffect(()=>{const h=()=>setNavScrolled(window.scrollY>20);window.addEventListener("scroll",h,{passive:true});return ()=>window.removeEventListener("scroll",h);},[]);

  return(
    <div style={{minHeight:"100vh",background:VOID,color:"#E0E8F0",fontFamily:"'Inter',system-ui,sans-serif",overflowX:"hidden"}}>
      <style>{CSS}</style>
      <ScrollBar/>

      {/* Nav */}
      <nav style={{position:"fixed",top:0,left:0,right:0,height:48,display:"flex",alignItems:"center",
        justifyContent:"space-between",padding:"0 32px",zIndex:100,
        background:navScrolled?"rgba(3,5,15,.96)":"rgba(3,5,15,.7)",
        backdropFilter:"blur(20px)",borderBottom:navScrolled?".5px solid rgba(0,196,180,.12)":".5px solid transparent",
        transition:"all .3s"}}>
        <span style={{fontSize:13,fontWeight:700,letterSpacing:".22em",color:"#E0E8F0",...mono}}>STUDENIUS</span>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {([["Pricing","/pricing"],["Login","/login"]] as [string,string][]).map(([lbl,href])=>(
            <Link key={href} to={href} style={{fontSize:10,fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"#444",textDecoration:"none",transition:"color .2s"}}
              onMouseEnter={e=>(e.currentTarget.style.color="#E0E8F0")}
              onMouseLeave={e=>(e.currentTarget.style.color="#444")}>{lbl}</Link>
          ))}
          <Link to="/signup">
            <button style={{fontSize:11,fontWeight:600,color:VOID,background:TEAL,border:"none",padding:"6px 18px",cursor:"pointer",letterSpacing:".06em",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.opacity=".8";e.currentTarget.style.boxShadow=`0 0 28px rgba(0,196,180,.5)`;}}
              onMouseLeave={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="none";}}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero — 3D bg + content */}
      <div style={{position:"relative",overflow:"hidden",background:VOID,minHeight:"100vh"}}>
        <div style={{position:"absolute",inset:0,zIndex:0}}><HeroBg/></div>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(3,5,15,.3) 0%,rgba(3,5,15,.1) 50%,rgba(3,5,15,.9) 100%)",zIndex:1,pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:2}}><Hero/></div>
      </div>

      {/* Stats bar */}
      <Stats/>

      {/* THE 3D JOURNEY */}
      <Journey3D/>

      {/* Marquee */}
      <Marquee/>

      {/* Features grid */}
      <FeaturesSection/>

      {/* Manifesto */}
      <Manifesto/>

      {/* Testimonials */}
      <Testimonials/>

      {/* CTA */}
      <CTA/>

      {/* Footer */}
      <footer style={{borderTop:".5px solid #0d1220",background:"#020408"}}>
        <div style={{maxWidth:"720px",margin:"0 auto",padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{...mono,fontSize:"10px",color:"#1e2838",letterSpacing:".06em"}}>STUDENIUS © {new Date().getFullYear()}</span>
          <div style={{display:"flex",gap:"20px"}}>
            {([["Pricing","/pricing"],["Login","/login"],["Sign Up","/signup"]] as [string,string][]).map(([lbl,href])=>(
              <Link key={href} to={href} style={{fontSize:"11px",color:"#333",textDecoration:"none",transition:"color .15s"}}
                onMouseEnter={e=>((e.currentTarget as HTMLElement).style.color="#666")}
                onMouseLeave={e=>((e.currentTarget as HTMLElement).style.color="#333")}>{lbl}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
