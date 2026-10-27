import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Mascot, type MascotArtwork, type MascotMood } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { mascotMovements, type MascotMovement } from "@/lib/mascotMovement";
import { motionTokens } from "@/lib/motionTokens";
import { SeedlingArtwork } from "@/components/mascot/SeedlingArtwork";
import "./preview.css";

const seedlingArtwork: MascotArtwork = {
  render: state => <SeedlingArtwork {...state} />,
  aspectRatio: "1 / 1",
  blinkInterval: motionTokens.seedlingBlink,
};
const shadowArtwork: MascotArtwork = { ...seedlingArtwork, render: state => <SeedlingArtwork {...state} underShadow /> };
const moods: { mood: MascotMood; note: string }[] = [
  { mood: "idle", note: "Breathing, blinking, a little leaf sway." },
  { mood: "happy", note: "A small hop. A little win." },
  { mood: "thinking", note: "Looking up while the dots wait." },
  { mood: "celebrate", note: "A bigger jump for real achievements." },
  { mood: "sleepy", note: "Half-closed eyes and a drooping leaf." },
  { mood: "encourage", note: "A nod and a friendly leaf wave." },
  { mood: "peek", note: "A quiet appearance from the edge." },
];
export function Preview() {
  const [dark, setDark] = useState(false);
  const [still, setStill] = useState(false);
  const [replay, setReplay] = useState(0);
  const [face, setFace] = useState<MascotMood>("idle");
  const [gestures, setGestures] = useState<Record<string, number>>({});
  return <main data-theme={dark ? "dark" : "light"}>
    <header><p>Studenius / Character study</p><h1>A little room to grow.</h1><p>Approved Seedling. Independent expressions and one-shot movements.</p>
      <div className="controls">
        <label><input type="checkbox" checked={dark} onChange={event => setDark(event.target.checked)} /> Dark background</label>
        <label><input type="checkbox" checked={still} onChange={event => setStill(event.target.checked)} /> Static poses</label>
        <SpringButton soundEnabled={false} onClick={() => setReplay(value => value + 1)}>Replay reactions</SpringButton>
      </div><p className="hint">Your system’s reduced-motion preference always takes priority. Tap a character to say hello; sound follows your existing setting.</p>
    </header>
    <section aria-label="Seven mascot moods" className="mood-grid">
      {moods.map(({ mood, note }) => <article key={`${mood}-${replay}`} data-preview-mood={mood}>
        <div className="stage"><Mascot mood={mood} size="xl" artwork={seedlingArtwork} animate={!still} interactive label={`Say hello to the ${mood} seedling`} /></div>
        <h2>{mood}</h2><p>{note}</p>
      </article>)}
    </section>
    <section aria-labelledby="movement-title"><h2 id="movement-title">Movement studio</h2><p>Choose an expression, then replay a gesture. Each finishes and settles into idle.</p>
      <label>Expression <select aria-label="Movement expression" value={face} onChange={event => setFace(event.target.value as MascotMood)}><option value="idle">Soft smile</option><option value="happy">Happy</option><option value="thinking">Thoughtful</option></select></label>
      <div className="mood-grid">{(Object.keys(mascotMovements) as MascotMovement[]).map(movement => <article key={movement} data-preview-movement={movement}>
        <div className="stage"><Mascot movement={movement} reactionKey={`${replay}-${gestures[movement] || 0}`} mood={face} size="xl" animate={!still} /></div>
        <h3>{mascotMovements[movement].label}</h3><p>{mascotMovements[movement].duration} seconds · one shot</p>
        <SpringButton soundEnabled={false} onClick={() => setGestures(previous => ({ ...previous, [movement]: (previous[movement] || 0) + 1 }))}>Replay {mascotMovements[movement].label.toLowerCase()}</SpringButton>
      </article>)}</div>
    </section>
    <section className="comparison" aria-labelledby="contrast-title"><h2 id="contrast-title">Contrast comparison — A approved</h2><p>A is approved with no ground shadow. B remains here only for comparison.</p>
      <div className="comparison-grid">
        <figure><Mascot size="lg" mood="idle" animate={false} artwork={seedlingArtwork} /><figcaption>A / Reference colors, no shadow</figcaption></figure>
        <figure><Mascot size="lg" mood="idle" animate={false} artwork={shadowArtwork} /><figcaption>B / Optional warm peach ground shadow</figcaption></figure>
      </div>
    </section><footer>Hand-structured inline SVG. No illustration downloads. No account, rewards or app data used here.</footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
