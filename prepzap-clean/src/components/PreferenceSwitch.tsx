import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** A native button keeps Space/Enter support and a full-sized touch target. */
export function PreferenceSwitch({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  const reduced = usePrefersReducedMotion();
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={on} onClick={onChange}
      style={{ width: 44, height: 44, padding: 2, background: "transparent", border: 0, cursor: "pointer", flexShrink: 0, display: "grid", placeItems: "center" }}>
      <span aria-hidden="true" style={{ display: "block", width: 40, height: 22, position: "relative", background: on ? "#ae2925" : "hsl(var(--muted))", border: "2px solid var(--pz-border, #000000)", borderRadius: 4 }}>
        <span style={{ position: "absolute", top: 2, left: 2, width: 14, height: 14, background: "#fff", border: "1.5px solid #000000", transform: `translateX(${on ? 16 : 0}px)`, transition: reduced ? "none" : "transform var(--motion-quick) var(--motion-ease)" }} />
      </span>
    </button>
  );
}
