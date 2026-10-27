import { useState, type CSSProperties } from "react";
import { Mascot } from "@/components/Mascot";
import { motionVariables } from "@/lib/motionTokens";
import type { MascotMovement } from "@/lib/mascotMovement";
import { StudyObject } from "./StudyObject";

const greeting: readonly MascotMovement[] = ["peek-in", "wave", "dance"];
/** Original SVG study garden: one entrance, then a quiet breathing composition. */
export function WelcomeArtwork({ still, visit }: { still: boolean; visit: number }) {
  const [phase, setPhase] = useState(0);
  const movement = greeting[phase];
  return <div className="welcome-canvas" aria-hidden="true" style={motionVariables} data-still={still}>
    <svg className="welcome-garden" viewBox="0 0 600 440" fill="none">
      <g className="welcome-arch"><path d="M148 396V220a152 152 0 0 1 304 0v176Z" fill="#9BC464"/><path d="M175 396V222a125 125 0 0 1 250 0v174" stroke="#245C3B" strokeWidth="2" opacity=".4"/></g>
      <g className="welcome-sun"><circle cx="451" cy="90" r="42" fill="#FFD13B" stroke="#000" strokeWidth="2"/><path d="M451 66v10m0 28v10m-24-24h10m28 0h10m-41-17 7 7m20 20 7 7m0-34-7 7m-20 20-7 7" stroke="#000" strokeWidth="2" strokeLinecap="round"/></g>
      <g className="welcome-leaves" fill="#245C3B"><path d="M110 351c-46-25-49-59-35-79 31 5 48 34 35 79Z"/><path d="M109 351c-7-43 12-67 36-66 17 26 6 51-36 66Z"/><path d="M486 348c-20-45-7-75 18-81 23 20 17 49-18 81Z"/></g>
      <g className="welcome-trail" stroke="#245C3B" strokeWidth="3" strokeLinecap="round"><path d="m114 114 12-8m-1 25 12-2m-28-31 6-12"/><path d="m485 181 11 6m-14 7 6 9"/></g>
      <g className="welcome-dot"><circle cx="115" cy="212" r="10" fill="#FFD13B" stroke="#000" strokeWidth="2"/><circle cx="492" cy="235" r="6" fill="#9BC464" stroke="#000" strokeWidth="2"/></g>
      <ellipse cx="300" cy="399" rx="174" ry="9" fill="#245C3B" opacity=".1"/>
    </svg>
    {(["book", "cards", "blocks"] as const).map((kind,index)=><div key={kind} className={`welcome-object welcome-object-${kind}`} style={{"--object-index":index} as CSSProperties}><StudyObject kind={kind} accent="#9BC464"/></div>)}
    <div className="welcome-character"><Mascot key={visit} mood={movement ? "happy" : "idle"} movement={still ? undefined : movement} reactionKey={`${visit}-${phase}`} animate={!still} size="hero" pauseWhenHidden onMovementComplete={movement ? ()=>setPhase(value=>value+1) : undefined}/></div>
  </div>;
}

export function GoogleMark() {
  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"/></svg>;
}
