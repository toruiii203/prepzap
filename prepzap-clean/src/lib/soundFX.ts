import { saveInterfacePreferences, vibrationEnabled } from "@/lib/interfacePreferences";
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
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  if (typeof navigator === "undefined" || !navigator.vibrate || !vibrationEnabled()) return;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Satisfying bubble pop when tapping buttons, cards, or checkboxes
 */
export function playPop(pitch: number = 1.0) {
  triggerHaptic("light");
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Crisp mechanical switch tap for toggling tabs or checkboxes
 */
export function playTap() {
  triggerHaptic("light");
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Ascending chime when completing a quest or scoring points
 */
export function playSuccess() {
  triggerHaptic("success");
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Celebratory fanfare for level up or streak milestone
 */
export function playCelebration() {
  triggerHaptic("celebrate");
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Duolingo-style soft, encouraging clunk for mistakes (not harsh or buzzing)
 */
export function playIncorrect() {
  triggerHaptic("medium");
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Ascending pitch combo chime for consecutive correct answers (Duolingo style)
 */
export function playComboStreak(streak: number = 1) {
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Swift tactile paper whoosh when flipping a flashcard (3D flip sound)
 */
export function playCardFlip() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.07);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);

    triggerHaptic("light");
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

/**
 * Resonant crystalline chime when a previously missed card reaches 100% Mastery
 */
export function playMastery() {
  triggerHaptic("celebrate");
  if (!isSoundEnabled()) return;
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
  } catch { /* Optional audio/vibration must never interrupt studying. */ }
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  saveInterfacePreferences({ sound: enabled });
}

export function isSoundEnabled(): boolean {
  try { return soundEnabled && localStorage.getItem("pz_sound_muted") !== "true"; }
  catch { return soundEnabled; }
}
