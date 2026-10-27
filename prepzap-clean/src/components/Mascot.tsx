import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useEffect, useRef, useState, type CSSProperties, type MouseEventHandler, type PointerEvent, type ReactNode } from "react";

import { playPop } from "@/lib/soundFX";
import { motionTokens, motionVariables } from "@/lib/motionTokens";
import "@/styles/mascot.css";
import { mascotMovements, nextTapMovement, type MascotMovement, type MascotMovementPose } from "@/lib/mascotMovement";
import { seedlingArtwork } from "@/components/mascot/seedlingRig";

export type MascotMood = "idle" | "happy" | "celebrate" | "sad" | "thinking" | "sleepy" | "cheering" | "encouraging" | "encourage" | "peek";
export type MascotSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";
const sizes: Record<MascotSize, number> = { xs: 52, sm: 80, md: 128, lg: 184, xl: 240, hero: 300 };
export interface MascotArtworkState { mood: MascotMood; blink: boolean; reduced: boolean; movement?: MascotMovementPose; movementKey?: string | number; }
export interface MascotArtwork {
  render: (state: MascotArtworkState) => ReactNode;
  aspectRatio: string;
  blinkInterval?: readonly [number, number];
}
export interface MascotProps {
  /** Optional artwork override; the approved seedling is the app default. */
  artwork?: MascotArtwork;
  mood?: MascotMood;
  size?: MascotSize;
  movement?: MascotMovement;
  pauseWhenHidden?: boolean;
  onMovementComplete?: () => void;
  /** Increment to replay the same movement without remounting the mascot. */
  reactionKey?: string | number;
  interactive?: boolean;
  animate?: boolean;
  className?: string;
  /** Omit for a decorative mascot. An interactive mascot has a named button. */
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

/** Shared seedling lifecycle and support for isolated artwork previews. */
export function Mascot({ mood = "idle", size = "md", movement, pauseWhenHidden = false, onMovementComplete, reactionKey = 0, interactive = false, animate = true, className = "", label, onClick, artwork = seedlingArtwork }: MascotProps) {
  const reduced = usePrefersReducedMotion() || !animate;
  const [blink, setBlink] = useState(false);
  const [sleepy, setSleepy] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [tapMovement, setTapMovement] = useState<MascotMovement>();
  const [tapKey, setTapKey] = useState(0);
  const lastTap = useRef<MascotMovement>();
  const requestedMovement = movement ?? (mood === "cheering" ? "cheer" : mood === "happy" ? "hop" : undefined);
  const [movementEnded, setMovementEnded] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const visible = inView && tabVisible;
  const movementVisible = !pauseWhenHidden || visible;
  const remaining = useRef(0);
  const completion = useRef(onMovementComplete);
  completion.current = onMovementComplete;
  useEffect(() => {
    setMovementEnded(false);
    remaining.current = requestedMovement ? mascotMovements[requestedMovement].duration * 1000 : 0;
  }, [requestedMovement, reactionKey, reduced]);
  useEffect(() => {
    if (!requestedMovement || reduced || !movementVisible || remaining.current <= 0) return;
    const started = performance.now();
    const timer = setTimeout(() => { remaining.current = 0; setMovementEnded(true); completion.current?.(); }, remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (performance.now() - started)); };
  }, [requestedMovement, reactionKey, reduced, movementVisible]);
  const blinkMin = artwork?.blinkInterval?.[0] ?? motionTokens.blinkMin;
  const blinkMax = artwork?.blinkInterval?.[1] ?? motionTokens.blinkMax;
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
      }, (blinkMin + Math.random() * (blinkMax - blinkMin)) * 1000);
    };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(openTimer); };
  }, [reduced, visible, blinkMin, blinkMax]);

  useEffect(() => {
    if (mood !== "idle" || !visible) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setSleepy(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setSleepy(true), motionTokens.inactivity * 1000);
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
  const activeMovement: MascotMovementPose | undefined = tapped ? tapMovement : requestedMovement ? movementEnded || reduced ? "rest" : requestedMovement : undefined;
  const body = artwork.render({ mood: effectiveMood, blink: blink && !reduced, reduced, movement: activeMovement, movementKey: tapped ? `tap-${tapKey}` : reactionKey });
  const style: CSSProperties & { "--gesture-duration": string } = { ...motionVariables, "--gesture-duration": `${mascotMovements[tapped && tapMovement ? tapMovement : requestedMovement || "hop"].duration}s`, width: sizes[size], maxWidth: "100%", aspectRatio: artwork.aspectRatio };
  return (
    <div ref={root} data-mascot={artwork === seedlingArtwork ? "seedling" : "custom"} data-mood={effectiveMood} data-reduced-motion={!!reduced} data-paused={!visible} className={`mascot ${className}`} style={style} onPointerMove={look} onPointerLeave={resetLook}>
      {interactive ? <button type="button" className="mascot-tap" aria-label={label || "Say hello to Studenius mascot"} onClick={event => {
        clearTimeout(reactionTimer.current);
        const next = nextTapMovement(lastTap.current);
        lastTap.current = next;
        setTapMovement(next);
        setTapKey(key => key + 1);
        setTapped(true);
        playPop(1.15);
        reactionTimer.current = setTimeout(() => setTapped(false), mascotMovements[next].duration * 1000);
        onClick?.(event);
      }}>{body}</button> : <div aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}>{body}</div>}
    </div>
  );
}
