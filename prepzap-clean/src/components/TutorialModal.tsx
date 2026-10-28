import { useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motionVariables } from "@/lib/motionTokens";
import type { TutorialFeature } from "@/lib/tutorialContent";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "@/styles/page-guide.css";

interface TutorialModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  features: TutorialFeature[];
  title?: string;
}
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** The existing page tutorial, upgraded to a focused, replayable control tour. */
export function TutorialModal({
  isOpen,
  onDismiss,
  features,
  title = "How it works",
}: TutorialModalProps) {
  const [index, setIndex] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const mask = useId().replace(/:/g, "");
  const reduced = usePrefersReducedMotion();
  const steps = features.length
    ? features
    : [
        {
          icon: "explore",
          title: "Start with one action",
          desc: "Choose what you want to work on. You can return to this page guide whenever you need it.",
        },
      ];
  const current = steps[Math.min(index, steps.length - 1)];
  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen, title]);
  useEffect(() => {
    if (!isOpen) {
      setAnchor(null);
      setPosition(null);
      return;
    }
    let element: HTMLElement | null = null;
    try {
      element = current.target
        ? document.querySelector<HTMLElement>(current.target)
        : null;
    } catch {
      element = null;
    }
    element?.scrollIntoView?.({ block: "center", behavior: "instant" });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.min(400, window.innerWidth - 32),
          height = card.current?.getBoundingClientRect().height || 300;
        const rect = element?.getBoundingClientRect();
        if (!rect || rect.width < 1 || rect.height < 1) {
          setAnchor(null);
          setPosition(null);
          return;
        }
        const x = Math.max(8, rect.left - 6),
          y = Math.max(8, rect.top - 6),
          w = Math.min(rect.width + 12, window.innerWidth - x - 8),
          h = Math.min(rect.height + 12, window.innerHeight - y - 8);
        setAnchor({ x, y, width: w, height: Math.max(0, h) });
        const below = rect.bottom + 14;
        const top =
          below + height <= window.innerHeight - 16
            ? below
            : rect.top - height - 14 >= 16
              ? rect.top - height - 14
              : Math.max(16, (window.innerHeight - height) / 2);
        setPosition({
          left: Math.min(
            Math.max(16, rect.left),
            window.innerWidth - width - 16,
          ),
          top: Math.min(top, Math.max(16, window.innerHeight - height - 16)),
        });
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (element) observer?.observe(element);
    if (card.current) observer?.observe(card.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer?.disconnect();
    };
  }, [isOpen, current.target, index]);
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="page-guide-overlay">
          <svg
            aria-hidden="true"
            className="page-guide-spotlight"
            width="100%"
            height="100%"
          >
            <defs>
              <mask id={mask}>
                <rect width="100%" height="100%" fill="#FFF" />
                {anchor && (
                  <rect
                    x={anchor.x}
                    y={anchor.y}
                    width={anchor.width}
                    height={anchor.height}
                    rx="14"
                    fill="#000"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="#000"
              opacity=".58"
              mask={`url(#${mask})`}
            />
            {anchor && (
              <rect
                x={anchor.x}
                y={anchor.y}
                width={anchor.width}
                height={anchor.height}
                rx="14"
                stroke="#FFD13B"
                strokeWidth="3"
                fill="none"
              />
            )}
          </svg>
        </Dialog.Overlay>
        <Dialog.Content
          ref={card}
          className="page-guide-card"
          style={{ ...motionVariables, ...position }}
          data-anchored={!!position}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            next.current?.focus({ preventScroll: true });
          }}
        >
          <div className="page-guide-top">
            <span>{title} guide</span>
            <button aria-label="Dismiss page guide" onClick={onDismiss}>
              ×
            </button>
          </div>
          <div key={index} className="page-guide-step">
            <div className="page-guide-art" aria-hidden="true">
              <Mascot
                mood="encouraging"
                movement={index % 2 === 0 ? "wave" : "curious"}
                animate={!reduced}
                pauseWhenHidden
                size="sm"
              />
              <span className="material-symbols-outlined">{current.icon}</span>
            </div>
            <Dialog.Title>{current.title}</Dialog.Title>
            <Dialog.Description>{current.desc}</Dialog.Description>
          </div>
          <footer>
            <span aria-live="polite">
              {index + 1} of {steps.length}
            </span>
            <div>
              {index > 0 && (
                <button
                  aria-label="Previous guide step"
                  onClick={() => setIndex((value) => value - 1)}
                  className="page-guide-back"
                >
                  Back
                </button>
              )}
              <SpringButton
                ref={next}
                soundEnabled={false}
                className="page-guide-next"
                onClick={() => {
                  if (index === steps.length - 1) onDismiss();
                  else setIndex((value) => value + 1);
                }}
              >
                {index === steps.length - 1 ? "Got it" : "Next"}
                <span aria-hidden="true">→</span>
              </SpringButton>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
