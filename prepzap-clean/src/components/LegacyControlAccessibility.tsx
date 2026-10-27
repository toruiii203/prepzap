import { useEffect } from "react";

const iconNames: Record<string, string> = {
  arrow_back: "Go back", arrow_back_ios: "Go back", arrow_back_ios_new: "Go back", "arrow-left": "Go back",
  close: "Close", x: "Close", cancel: "Close", "×": "Close", "✕": "Close",
  search: "Search", add: "Add item", plus: "Add item", "+": "Add item", add_circle: "Add item",
  chevron_left: "Previous", chevron_right: "Next", "chevron-left": "Previous", "chevron-right": "Next",
  more_vert: "More options", more_horiz: "More options", "ellipsis-vertical": "More options", menu: "Open menu",
  refresh: "Refresh", restart_alt: "Reset timer", replay: "Restart", skip_next: "Skip", skip_previous: "Previous",
  play_arrow: "Start", pause: "Pause", stop: "Stop", timer: "Timer settings", settings: "Settings", tune: "Options",
  camera: "Capture notes", photo_camera: "Capture notes", paperclip: "Upload a file", attach_file: "Attach a file",
  mic: "Use microphone", mic_off: "Turn microphone on", send: "Send message", help: "Help", help_outline: "Help",
  library_books: "Choose study sources",
  history: "View history", download: "Download", upload: "Upload", delete: "Delete item", "trash-2": "Delete item", trash2: "Delete item",
  edit: "Edit", check: "Confirm", done: "Confirm", logout: "Sign out", volume_up: "Mute sound", volume_off: "Unmute sound",
  fullscreen: "Enter full screen", fullscreen_exit: "Leave full screen", "maximize-2": "Enter full screen",
};

/** Compatibility bridge for legacy pages. Authored labels always take priority. */
export function LegacyControlAccessibility() {
  useEffect(() => {
    const managed = new WeakMap<Element, string>();
    const selector = "button,input,textarea,select";
    const enhance = (element: Element) => {
      const current = element.getAttribute("aria-label");
      if (current && current !== managed.get(element)) return;
      if (element.hasAttribute("aria-labelledby") || element.closest("label") || (element.id && [...document.querySelectorAll("label[for]")].some(label => label.getAttribute("for") === element.id))) return;
      let label: string | undefined;
      if (element.matches("input,textarea")) label = element.getAttribute("placeholder") || undefined;
      else if (element.tagName === "BUTTON") {
        const copy = element.cloneNode(true) as Element;
        copy.querySelectorAll('[aria-hidden="true"],.material-symbols-outlined,svg').forEach(node => node.remove());
        const text = element.matches(".material-symbols-outlined") ? "" : copy.textContent?.trim();
        const icon = element.matches(".material-symbols-outlined") ? element.textContent?.trim() : element.querySelector(".material-symbols-outlined")?.textContent?.trim();
        const svgClasses = element.querySelector("svg")?.getAttribute("class")?.split(/\s+/) || [];
        if (text && !iconNames[text] && managed.has(element)) { element.removeAttribute("aria-label"); managed.delete(element); return; }
        if (!text || iconNames[text]) label = element.getAttribute("title")?.trim() || iconNames[icon || text || ""] || svgClasses.map(name => iconNames[name.replace(/^lucide-/, "")]).find(Boolean);
      }
      if (label && current !== label) { element.setAttribute("aria-label", label); managed.set(element, label); }
    };
    const scan = (root: Element | Document) => {
      if (root instanceof Element) { if (root.matches(selector)) enhance(root); const parent = root.closest(selector); if (parent) enhance(parent); }
      root.querySelectorAll(selector).forEach(enhance);
    };
    scan(document);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const owner = record.target instanceof Element ? record.target.closest(selector) : record.target.parentElement?.closest(selector);
        if (owner) enhance(owner);
        for (const node of record.addedNodes) if (node instanceof Element) scan(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder"] });
    return () => {
      observer.disconnect();
      document.querySelectorAll(selector).forEach(element => { if (managed.get(element) === element.getAttribute("aria-label")) element.removeAttribute("aria-label"); });
    };
  }, []);
  return null;
}
