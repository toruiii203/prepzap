interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const dim = size === "lg" ? 32 : size === "md" ? 26 : 20;
  const fontSize = size === "lg" ? "15px" : size === "md" ? "13px" : "11px";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {/* Multi-line Z mark — matches the brand logo */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Top bar — 5 parallel lines */}
        <line x1="14" y1="16" x2="86" y2="16" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="24" x2="86" y2="24" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="32" x2="86" y2="32" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="40" x2="86" y2="40" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="48" x2="86" y2="48" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        {/* Diagonal — 5 lines from top-right to bottom-left */}
        <line x1="86" y1="48" x2="14" y2="60" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="86" y1="40" x2="14" y2="52" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="86" y1="32" x2="14" y2="44" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="86" y1="24" x2="14" y2="36" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="86" y1="16" x2="14" y2="28" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        {/* Bottom bar — 5 parallel lines */}
        <line x1="14" y1="60" x2="86" y2="60" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="68" x2="86" y2="68" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="76" x2="86" y2="76" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
        <line x1="14" y1="84" x2="86" y2="84" stroke="white" strokeWidth="4.2" strokeLinecap="round"/>
      </svg>

      {/* Wordmark */}
      <span style={{
        fontFamily: "'Geist Mono', monospace",
        fontSize,
        fontWeight: 500,
        color: "var(--pz-text)",
        letterSpacing: "0.06em",
      }}>
        PREPZAP
      </span>
    </div>
  );
}
