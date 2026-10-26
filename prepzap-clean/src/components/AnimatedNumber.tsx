import { useEffect, useState } from "react";
import { motionTokens } from "@/lib/motionTokens";
import { useReducedMotion } from "framer-motion";

/** The accessible value is stable while the visual counter catches up. */
export function AnimatedNumber({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (reduced) return;
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (motionTokens.count * 1000));
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return <span className="inline-block tabular-nums text-right" style={{ minWidth: `${String(value).length}ch` }}><span className="sr-only">{value}</span><span aria-hidden="true">{reduced ? value : display}</span></span>;
}
