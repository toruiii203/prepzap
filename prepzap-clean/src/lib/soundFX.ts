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

/**
 * Duolingo-style soft, encouraging clunk for mistakes (not harsh or buzzing)
 */
export function playIncorrect() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
    triggerHaptic("medium");
  } catch {}
}

/**
 * Ascending pitch combo chime for consecutive correct answers (Duolingo style)
 */
export function playComboStreak(streak: number = 1) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Pitch multiplier increases per streak up to 10
    const pitchMultiplier = Math.min(1.8, 1 + (streak - 1) * 0.08);
    const baseNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const count = streak >= 3 ? 4 : 3;

    for (let i = 0; i < count; i++) {
      const freq = baseNotes[i] * pitchMultiplier;
      const noteTime = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = streak >= 5 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.22);
    }

    if (streak >= 5) {
      triggerHaptic("celebrate");
    } else {
      triggerHaptic("success");
    }
  } catch {}
}

/**
 * Resonant crystalline chime when a previously missed card reaches 100% Mastery
 */
export function playMastery() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // F#5, A#5, C#6, F#6 sparkling arpeggio
    const notes = [739.99, 932.33, 1108.73, 1479.98];
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.22, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.35);
    });

    triggerHaptic("celebrate");
  } catch {}
}
