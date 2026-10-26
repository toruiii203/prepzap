import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
const original = window.matchMedia;
afterEach(()=>{cleanup();window.matchMedia=original;});
function Probe(){const reduced=usePrefersReducedMotion();return <p>{reduced?'Still':'Moving'}</p>;}
describe('live reduced-motion preference',()=>{
  it('responds while open and removes its listener on unmount',()=>{
    let matches=false;
    const listeners=new Set<()=>void>();
    window.matchMedia=query=>({...original(query),get matches(){return matches;},addEventListener:(_event,listener)=>{if(typeof listener==='function')listeners.add(listener as ()=>void);},removeEventListener:(_event,listener)=>{if(typeof listener==='function')listeners.delete(listener as ()=>void);}});
    const {unmount}=render(<Probe />);
    expect(screen.getByText('Moving')).toBeInTheDocument();
    act(()=>{matches=true;listeners.forEach(listener=>listener());});
    expect(screen.getByText('Still')).toBeInTheDocument();
    unmount();expect(listeners.size).toBe(0);
  });
});
