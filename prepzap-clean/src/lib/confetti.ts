import confetti from "canvas-confetti";

export function fireConfetti() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const count = 60;
  const defaults = {
    origin: { y: 0.2 },
    zIndex: 10000,
    disableForReducedMotion: true,
    colors: ["#FFD13B", "#FF4D2E", "#10B981"],
    ticks: 90
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio)
    }));
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

export function stopConfetti() { confetti.reset(); }
