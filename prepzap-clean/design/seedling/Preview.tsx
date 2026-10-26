import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Mascot, type MascotArtwork, type MascotMood } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
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
  return <main data-theme={dark ? "dark" : "light"}>
    <header><p>Studenius / Character study</p><h1>A little room to grow.</h1><p>Approved option A. The entry-streak popup is the first app integration.</p>
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
    <section className="comparison" aria-labelledby="contrast-title"><h2 id="contrast-title">Contrast comparison — A approved</h2><p>A is approved with no ground shadow. B remains here only for comparison.</p>
      <div className="comparison-grid">
        <figure><Mascot size="lg" mood="idle" animate={false} artwork={seedlingArtwork} /><figcaption>A / Reference colors, no shadow</figcaption></figure>
        <figure><Mascot size="lg" mood="idle" animate={false} artwork={shadowArtwork} /><figcaption>B / Optional warm peach ground shadow</figcaption></figure>
      </div>
    </section><footer>Hand-structured inline SVG. No illustration downloads. No account, rewards or app data used here.</footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
