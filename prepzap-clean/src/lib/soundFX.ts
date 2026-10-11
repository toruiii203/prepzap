/**
 * Studenius Tactile Sound & Haptic FX Engine
 * Synthesizes crisp micro-interactions via the Web Audio API.
 * Requires 0 external sound files, 0 latency, and works completely offline.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Trigger subtle mobile haptic vibrations if supported
 */
export function triggerHaptic(type: "light" | "medium" | "success" | "celebrate" = "light") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    switch (type) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "success":
        navigator.vibrate([15, 40, 20]);
        break;
      case "celebrate":
        navigator.vibrate([30, 60, 30, 60, 50]);
        break;
    }
  } catch {}
}

/**
 * Satisfying bubble pop when tapping buttons, cards, or checkboxes
 */
export function playPop(pitch: number = 1.0) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Quick pitch drop creates the bubble pop sound
    const startFreq = 480 * pitch;
    const endFreq = 220 * pitch;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);

    triggerHaptic("light");
  } catch {}
}

/**
 * Crisp mechanical switch tap for toggling tabs or checkboxes
 */
export function playTap() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);

    triggerHaptic("light");
  } catch {}
}

/**
 * Ascending chime when completing a quest or scoring points
 */
export function playSuccess() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Major triad arpeggio: C5, E5, G5
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });

    triggerHaptic("success");
  } catch {}
}

/**
 * Celebratory fanfare for level up or streak milestone
 */
export function playCelebration() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // C5, E5, G5, C6 triumph
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });

    triggerHaptic("celebrate");
  } catch {}
}
