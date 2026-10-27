import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import "@/styles/study-generation.css";

export type StudyGenerationStage = "preparing" | "generating" | "checking" | "ready";
const stages: { id: StudyGenerationStage; label: string }[] = [
  { id: "preparing", label: "Preparing your topic and source" },
  { id: "generating", label: "Creating practice questions" },
  { id: "checking", label: "Reading the response and arranging questions" },
  { id: "ready", label: "Your quiz is ready" },
];

/** Progress comes from the caller's real work, never an elapsed-time simulation. */
export function StudyPlanGeneratorModal({ isOpen, stage }: { isOpen: boolean; stage: StudyGenerationStage }) {
  const [dismissed, setDismissed] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => { if (!isOpen) setDismissed(false); }, [isOpen]);
  const current = stages.findIndex(item => item.id === stage);
  return <Dialog.Root open={isOpen && !dismissed} onOpenChange={open => { if (!open) setDismissed(true); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="study-generation-overlay" />
      <Dialog.Content className="study-generation-dialog" onOpenAutoFocus={event => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; event.preventDefault(); title.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected && !opener.current.matches(":disabled")) opener.current.focus(); }}>
        <Mascot mood={stage === "ready" ? "happy" : "thinking"} size="md" />
        <Dialog.Title ref={title} tabIndex={-1}>Getting your quiz ready</Dialog.Title>
        <Dialog.Description>Take a breath. You can learn one question at a time.</Dialog.Description>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{stages[current].label}</p>
        <ol aria-label="Quiz preparation" aria-busy={stage !== "ready"}>
          {stages.map((item, index) => <li key={item.id} data-state={index < current || stage === "ready" ? "done" : index === current ? "current" : "waiting"} aria-current={index === current ? "step" : undefined}>
            <span className="material-symbols-outlined" aria-hidden="true">{index < current || stage === "ready" ? "check_circle" : index === current ? "pending" : "radio_button_unchecked"}</span>
            <span>{item.label}<span className="sr-only">{index < current || stage === "ready" ? ": complete" : index === current ? ": in progress" : ": waiting"}</span></span>
          </li>)}
        </ol>
        <p className="study-generation-note">Retrieving an answer from memory is practice, even when it takes a few tries.</p>
        <SpringButton className="study-generation-background" onClick={() => setDismissed(true)}>Keep waiting in background</SpringButton>
        <p className="study-generation-note">Closing this window won’t cancel generation.</p>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
