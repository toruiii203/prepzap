import { useEffect } from "react";

const overlaySelector = '[class~="fixed"][class~="inset-0"][class*="bg-black/"]';
const focusableSelector = 'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]';

/** Progressive enhancement for legacy modal markup; Radix dialogs manage themselves. */
export function LegacyDialogAccessibility() {
  useEffect(() => {
    const dialogs = new Map<HTMLElement, { previous: HTMLElement | null; cleanup: () => void }>();
    const enhance = (overlay: HTMLElement) => {
      if (dialogs.has(overlay) || overlay.closest('[role="dialog"]')) return;
      const panel = overlay.querySelector<HTMLElement>('[class*="rounded"],[class*="max-w-"]');
      if (!panel || panel.matches('[role="dialog"]')) return;
      const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const originalLabel = panel.getAttribute('aria-label');
      panel.setAttribute('role','dialog');
      panel.setAttribute('aria-modal','true');
      panel.setAttribute('aria-label',panel.querySelector('h1,h2,h3')?.textContent || originalLabel || 'Study dialog');
      panel.tabIndex = -1;
      const close = [...panel.querySelectorAll<HTMLButtonElement>('button')].find(button => /^(close|cancel|✕|×)$/i.test(button.textContent?.trim() || ''));
      if (close && !close.getAttribute('aria-label')) close.setAttribute('aria-label','Close dialog');
      const keydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && close) { event.preventDefault(); close.click(); }
        if (event.key !== 'Tab') return;
        const controls = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(control => !control.hidden && control.getAttribute('aria-hidden') !== 'true');
        const first = controls[0] || panel, last = controls[controls.length - 1] || panel;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
      };
      panel.addEventListener('keydown',keydown);
      (panel.querySelector<HTMLElement>(focusableSelector) || panel).focus({preventScroll:true});
      dialogs.set(overlay,{previous,cleanup:()=>panel.removeEventListener('keydown',keydown)});
    };
    const inspect = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(overlaySelector)) enhance(node);
      node.querySelectorAll<HTMLElement>(overlaySelector).forEach(enhance);
    };
    inspect(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) record.addedNodes.forEach(inspect);
      for (const [overlay, state] of dialogs) if (!overlay.isConnected) {
        state.cleanup();
        if (state.previous?.isConnected) state.previous.focus({preventScroll:true});
        dialogs.delete(overlay);
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    return () => { observer.disconnect(); dialogs.forEach(state=>state.cleanup()); };
  },[]);
  return null;
}
