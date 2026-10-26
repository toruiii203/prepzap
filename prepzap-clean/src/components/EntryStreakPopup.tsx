import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Mascot } from "@/components/Mascot";
import { seedlingArtwork } from "@/components/mascot/seedlingRig";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { SpringButton } from "@/components/ui/SpringButton";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { localDayKey, type EntryStreakEvent } from "@/lib/progressPopupPolicy";
import { motionTokens } from "@/lib/motionTokens";
import "@/styles/entryStreak.css";

export interface EntryStreakPopupProps { event: EntryStreakEvent; onDismiss: () => void; }

/** Non-modal: navigation remains clickable and Tab can leave the panel. */
export function EntryStreakPopup({ event, onDismiss }: EntryStreakPopupProps) {
  const reduced = usePrefersReducedMotion();
  const previousFocus = useRef(document.activeElement);
  const restoreFocus = useRef(true);
  const today = new Date(`${event.day}T12:00:00`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6 + index);
    return { key: localDayKey(date), label: date.toLocaleDateString(undefined, { weekday: "short" }) };
  });
  return <Dialog.Root open modal={false} onOpenChange={open => { if (!open) onDismiss(); }}>
    <Dialog.Portal>
      <Dialog.Content asChild onInteractOutside={() => { restoreFocus.current = false; }} onCloseAutoFocus={event => {
        event.preventDefault();
        if (!restoreFocus.current) return;
        if (previousFocus.current instanceof HTMLElement && previousFocus.current !== document.body && previousFocus.current.isConnected) previousFocus.current.focus({ preventScroll: true });
        else {
          const main = document.querySelector<HTMLElement>("main");
          if (main) {
            const tabIndex = main.getAttribute("tabindex");
            main.setAttribute("tabindex", "-1");
            main.focus({ preventScroll: true });
            main.addEventListener("blur", () => { if (tabIndex === null) main.removeAttribute("tabindex"); else main.setAttribute("tabindex", tabIndex); }, { once: true });
          }
        }
      }}>
        <motion.section className="entry-streak-panel" data-entry-streak-popup aria-modal="false"
          initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={reduced ? { duration: 0 } : motionTokens.sheet}>
          <Dialog.Close className="entry-streak-close" aria-label="Dismiss streak update">×</Dialog.Close>
          <div className="entry-streak-hero">
            <Mascot mood="encourage" artwork={seedlingArtwork} size="md" />
            <div><p className="entry-streak-eyebrow">You made time to study</p>
              <Dialog.Title className="entry-streak-title"><AnimatedNumber value={event.streakDays} /> day streak</Dialog.Title>
              <Dialog.Description>A little practice, day after day.</Dialog.Description>
            </div>
          </div>
          <ul className="entry-streak-calendar" aria-label="Confirmed study days this week">
            {days.map(day => {
              const confirmed = event.studyDays.includes(day.key);
              return <li key={day.key} aria-label={`${day.key}: ${confirmed ? "studied" : "no confirmed activity"}`} aria-current={day.key === event.day ? "date" : undefined}>
                <span>{day.label}</span><span className="entry-streak-day" data-confirmed={confirmed} aria-hidden="true">{confirmed ? "✓" : "·"}</span>
              </li>;
            })}
          </ul>
          <p className="entry-streak-note">Only confirmed study days are marked.</p>
          <SpringButton className="entry-streak-continue" onClick={onDismiss}>Continue</SpringButton>
        </motion.section>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
