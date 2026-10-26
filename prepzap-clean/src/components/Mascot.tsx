import { useEffect, useRef, useState, type CSSProperties, type MouseEventHandler, type PointerEvent } from "react";
import { useReducedMotion } from "framer-motion";
import { playPop } from "@/lib/soundFX";
import { motionTokens, motionVariables } from "@/lib/motionTokens";
import "@/styles/mascot.css";

export type MascotMood = "idle" | "happy" | "celebrate" | "sad" | "thinking" | "sleepy" | "cheering" | "encouraging";
export type MascotSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
const sizes: Record<MascotSize, number> = { xs: 52, sm: 80, md: 128, lg: 184, xl: 240, hero: 300 };
export interface MascotProps {
  mood?: MascotMood;
  size?: MascotSize;
  interactive?: boolean;
  className?: string;
  /** Omit for a decorative mascot. An interactive mascot has a named button. */
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

/** Original compact Rex: individually rigged SVG parts, no raster or video assets. */
export function Mascot({ mood = "idle", size = "md", interactive = false, className = "", label, onClick }: MascotProps) {
  const reduced = useReducedMotion();
  const [blink, setBlink] = useState(false);
  const [sleepy, setSleepy] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const visible = inView && tabVisible;
  const root = useRef<HTMLDivElement>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout>>();
  const effectiveMood = tapped ? "happy" : mood === "idle" && sleepy ? "sleepy" : mood;

  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    let timer: ReturnType<typeof setTimeout>;
    let openTimer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        openTimer = setTimeout(() => { setBlink(false); schedule(); }, motionTokens.instant * 1000);
      }, 2000 + Math.random() * 3000);
    };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(openTimer); };
  }, [reduced, visible]);

  useEffect(() => {
    if (mood !== "idle" || !visible) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setSleepy(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setSleepy(true), 60000);
    };

    wake();
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);

    };
  }, [mood, visible]);
  useEffect(() => {
    const visibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => () => clearTimeout(reactionTimer.current), []);

  const look = (event: PointerEvent<HTMLElement>) => {
    if (reduced || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) / rect.width * 6));
    const y = Math.max(-2, Math.min(2, (event.clientY - rect.top - rect.height / 2) / rect.height * 4));
    root.current.style.setProperty("--look-x", `${x}px`);
    root.current.style.setProperty("--look-y", `${y}px`);
  };
  const resetLook = () => { root.current?.style.setProperty("--look-x", "0px"); root.current?.style.setProperty("--look-y", "0px"); };
  const closed = effectiveMood === "sleepy" || blink && !reduced;
  const happy = ["happy", "celebrate", "cheering", "encouraging"].includes(effectiveMood);
  const body = (
    <svg viewBox="0 0 240 250" fill="none" aria-hidden="true" focusable="false" className="mascot-art">
      <ellipse cx="120" cy="234" rx="60" ry="7" fill="#000000" opacity=".13" />
      <g className="mascot-rig" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <g data-part="tail" className="mascot-tail">
          <path d="M148 211C190 220 226 191 215 151C210 163 192 166 182 174C165 186 160 199 148 211Z" fill="#FF7A32" />
          <path d="M199 163C205 160 211 156 215 151C219 167 216 181 209 192L190 178Z" fill="#FFF2D8" />
        </g>
        <g data-part="body" className="mascot-body">
          <path d="M91 216L88 231H109L111 214M134 214L134 231H155L151 215" fill="#FF7A32" />
          <path d="M85 228H110V237H80Q77 231 85 228ZM133 228H155Q165 231 159 237H133Z" fill="#000000" />
          <path d="M88 141Q120 130 152 141L164 216Q120 234 76 216Z" fill="#24222D" />
          <path d="M89 142L120 165L151 142L145 168L120 183L95 168Z" fill="#FFF2D8" />
          <path d="M120 169V222" stroke="#FFD13B" />
          <path d="M103 193H137V213H103Z" fill="#FFD13B" />
          <path d="M120 195V211M107 198H116M124 198H133" strokeWidth="2" />
        </g>
        <g data-part="left-arm" className="mascot-arm-left">
          <path d="M90 148Q69 151 65 178L74 184L94 168" fill="#24222D" />
          <path d="M65 176Q54 179 60 188Q70 197 77 184L74 180Z" fill="#FF7A32" />
          <path d="M65 174L77 179L74 186L62 181Z" fill="#FFF2D8" />
        </g>
        <g data-part="right-arm" className="mascot-arm-right">
          <path d="M150 148Q171 151 175 178L166 184L146 168" fill="#24222D" />
          <path d="M175 176Q186 179 180 188Q170 197 163 184L166 180Z" fill="#FF7A32" />
          <path d="M175 174L163 179L166 186L178 181Z" fill="#FFF2D8" />
        </g>
        <g data-part="head" className="mascot-head">
          <g data-part="ears"><path d="M65 92Q43 64 50 35Q73 39 88 65M152 65Q170 40 192 35Q198 68 176 94" fill="#FF7A32" /><path d="M61 53L68 79L79 67ZM179 53L164 67L175 80Z" fill="#FFB08A" strokeWidth="2" /></g>
          <path d="M63 78Q86 58 120 63Q154 58 177 78L183 112L195 126L177 128L184 139Q156 154 120 153Q84 154 56 139L63 128L45 126L57 112Z" fill="#FF7A32" />
          <path d="M66 113Q90 112 120 131Q149 112 175 113Q174 141 120 148Q67 141 66 113Z" fill="#FFF2D8" stroke="none" />
          <g data-part="glasses" fill="#FFF2D8" fillOpacity=".85"><circle cx="90" cy="106" r="24" /><circle cx="150" cy="106" r="24" /><path d="M114 104Q120 99 126 104M66 103L58 101M174 103L182 101" /></g>
          <g data-part="eyes" className="mascot-eyes" strokeWidth="3">
            {closed ? <path d="M79 108Q90 116 101 108M139 108Q150 116 161 108" /> : happy ? <path d="M80 109Q90 98 100 109M140 109Q150 98 160 109" /> : <g className="mascot-pupils" fill="#000000" stroke="none"><ellipse cx="91" cy="107" rx="5" ry={effectiveMood === "sad" ? 5 : 7} /><ellipse cx="149" cy="107" rx="5" ry={effectiveMood === "sad" ? 5 : 7} /><circle cx="93" cy="105" r="1.5" fill="#FFFFFF" /><circle cx="151" cy="105" r="1.5" fill="#FFFFFF" /></g>}
          </g>
          <g data-part="eyelids" opacity={effectiveMood === "sleepy" ? 1 : 0}><path d="M78 102H102M138 102H162" stroke="#FF7A32" strokeWidth="9" /></g>
          <g data-part="eyebrows"><path d={effectiveMood === "sad" ? "M79 81L98 86M142 86L161 81" : effectiveMood === "thinking" ? "M80 85L98 79M142 83H160" : "M81 82Q90 78 99 82M141 82Q150 78 159 82"} strokeWidth="4" /></g>
          <path d="M113 124Q120 120 127 124L120 131Z" fill="#000000" />
          <g data-part="mouth">{effectiveMood === "sleepy" ? <ellipse cx="120" cy="138" rx="4" ry="5" fill="#24222D" /> : <path d={effectiveMood === "sad" ? "M109 140Q120 130 131 140" : happy ? "M106 135Q120 152 134 135Z" : "M109 136Q120 143 131 136"} fill={happy ? "#24222D" : "none"} strokeWidth="2.5" />}</g>
          <g data-part="cap" className="mascot-cap"><path d="M87 55V70Q120 82 153 70V55Z" fill="#24222D" /><path d="M120 26L169 45L120 63L71 45Z" fill="#24222D" /><path d="M120 43L166 46V73" stroke="#FFD13B" strokeWidth="3" /><path d="M162 73H170L173 89H159Z" fill="#FFD13B" /></g>
        </g>
      </g>
      {effectiveMood === "thinking" && <g data-part="thought" fill="#FFD13B" stroke="#000000" strokeWidth="2"><circle cx="197" cy="61" r="3" /><circle cx="205" cy="48" r="5" /><circle cx="216" cy="30" r="9" /></g>}
      {effectiveMood === "cheering" && <g data-part="flame" stroke="#000000" strokeWidth="2"><path d="M208 111Q192 95 209 73Q209 86 217 89Q228 104 208 111Z" fill="#FF4D2E" /><path d="M208 107Q201 101 209 94Q216 102 208 107Z" fill="#FFD13B" /></g>}
      {effectiveMood === "celebrate" && <g data-part="confetti" className="mascot-confetti"><path d="M30 59L36 52M198 27L205 20M32 153L25 146" stroke="#FF4D2E" strokeWidth="5" /><path d="M25 99L33 97M203 134L211 139M52 22L57 29" stroke="#FFD13B" strokeWidth="5" /></g>}
    </svg>
  );
  const style: CSSProperties = { ...motionVariables, width: sizes[size], maxWidth: "100%", aspectRatio: "240 / 250" };
  return (
    <div ref={root} data-mascot="rex" data-mood={effectiveMood} data-reduced-motion={!!reduced} data-paused={!visible} className={`mascot ${className}`} style={style} onPointerMove={look} onPointerLeave={resetLook}>
      {interactive ? <button type="button" className="mascot-tap" aria-label={label || "Say hello to Rex"} onClick={event => {
        clearTimeout(reactionTimer.current);
        setTapped(true);
        playPop(1.15);
        reactionTimer.current = setTimeout(() => setTapped(false), motionTokens.reaction * 1000);
        onClick?.(event);
      }}>{body}</button> : <div aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>{body}</div>}
    </div>
  );
}
