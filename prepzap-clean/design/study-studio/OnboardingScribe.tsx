import { useEffect, useState } from "react";
import { Mascot, type ScribeAction } from "@/components/Mascot";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { motionTokens } from "@/lib/motionTokens";
import { StudyObject, type StudyObjectKind } from "./StudyObject";
export interface ScribeInput { id: number; kind: "select" | "change" | "check" | "skip"; }
export function OnboardingScribe({ input, selected, kind, quiet, still, visible, bubble, allowGlance, onGlance }: { input: ScribeInput; selected: boolean; kind?: StudyObjectKind; quiet: boolean; still: boolean; visible: boolean; bubble: string; allowGlance: boolean; onGlance: () => void }) {
  const reduced = usePrefersReducedMotion() || still;
  const [ambient, setAmbient] = useState<ScribeAction>("rest");
  const [pulse, setPulse] = useState<ScribeAction | null>(null);
  useEffect(() => {
    if (quiet || reduced || !visible) return;
    let timer: ReturnType<typeof setTimeout>;
    const write = () => { setAmbient("write"); timer = setTimeout(() => { setAmbient("rest"); timer = setTimeout(write, (motionTokens.scribePause[0] + Math.random() * (motionTokens.scribePause[1] - motionTokens.scribePause[0])) * 1000); }, motionTokens.scribeWrite * 1000); };
    write(); return () => clearTimeout(timer);
  }, [quiet, reduced, visible]);
  useEffect(() => {
    if (!input.id || quiet || reduced || !visible) { setPulse(null); return; }
    const action = input.kind === "check" ? "lift" : input.kind === "skip" ? "close" : input.kind === "change" ? "rewrite" : "quick";
    setPulse(action); const timer = setTimeout(() => setPulse(null), (action === "lift" ? motionTokens.scribeLift : motionTokens.scribeQuick) * 1000);
    return () => clearTimeout(timer);
  }, [input.id, input.kind, quiet, reduced, visible]);
  useEffect(() => {
    if (selected || quiet || reduced || !visible || !allowGlance) return;
    let settle: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => { onGlance(); setPulse("glance"); settle = setTimeout(() => setPulse(null), motionTokens.scribeQuick * 1000); }, motionTokens.scribeInactivity * 1000);
    return () => { clearTimeout(timer); clearTimeout(settle); };
  }, [selected, quiet, reduced, visible, allowGlance, onGlance]);
  return <div className={`story-scribe ${quiet ? "is-quiet" : ""}`} aria-hidden="true" data-input={input.kind}>
    {quiet ? <StudyObject kind={kind || "book"}/> : <><Mascot variant="scribe" mood="idle" scribeAction={reduced ? "rest" : pulse || ambient} reactionKey={`${input.id}-${pulse || ambient}`} animate={!still} size="md"/>{kind && <StudyObject className="scribe-flavor" kind={kind}/>}<span className="scribe-bubble">{selected ? bubble : ""}</span></>}
  </div>;
}
