/**
 * Studenius Offline Ambient Focus Sound Engine (Phase 5B)
 * Generates soothing ambient rain & brown noise using the Web Audio API.
 * Requires 0 audio assets, works 100% offline, and auto-pauses when tab blurs.
 */

let ambientCtx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let isPlaying = false;
let pausedByVisibility = false;

function createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 4; // 4 seconds looped
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
    b6 = white * 0.115926;
  }
  return buffer;
}

export function startAmbientSound(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!ambientCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;
      ambientCtx = new AudioCtxClass();
    }

    if (ambientCtx.state === "suspended") {
      ambientCtx.resume().catch(() => {});
    }

    if (isPlaying) return true;

    const buffer = createPinkNoiseBuffer(ambientCtx);
    noiseSource = ambientCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Filter to simulate soft rainfall / library ambiance
    const filter = ambientCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(650, ambientCtx.currentTime);

    gainNode = ambientCtx.createGain();
    gainNode.gain.setValueAtTime(0.001, ambientCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.12, ambientCtx.currentTime + 1.2);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ambientCtx.destination);

    noiseSource.start();
    isPlaying = true;
    pausedByVisibility = false;

    // Listen to tab visibility
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return true;
  } catch (err) {
    console.warn("Ambient sound start failed:", err);
    return false;
  }
}

export function stopAmbientSound() {
  if (!isPlaying || !ambientCtx) return;
  try {
    if (gainNode) {
      gainNode.gain.setValueAtTime(gainNode.gain.value, ambientCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ambientCtx.currentTime + 0.5);
    }
    setTimeout(() => {
      try {
        if (noiseSource) {
          noiseSource.stop();
          noiseSource.disconnect();
          noiseSource = null;
        }
      } catch {}
      isPlaying = false;
      pausedByVisibility = false;
    }, 550);
  } catch {
    isPlaying = false;
  }
}

function handleVisibility() {
  if (typeof document === "undefined") return;
  if (document.hidden) {
    if (isPlaying) {
      pausedByVisibility = true;
      stopAmbientSound();
    }
  } else {
    if (pausedByVisibility) {
      pausedByVisibility = false;
      startAmbientSound();
    }
  }
}

export function isAmbientPlaying(): boolean {
  return isPlaying;
}
