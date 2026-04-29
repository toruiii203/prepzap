type LogoSize = number | "sm" | "md" | "lg" | "xl"

function resolveSize(size: LogoSize): number {
  if (typeof size === "number") return size
  return { sm: 22, md: 28, lg: 40, xl: 52 }[size] ?? 28
}

export function Logo({ size = "md" }: { size?: LogoSize }) {
  const px = resolveSize(size)
  const fontSize = px < 28 ? "11px" : px < 40 ? "13px" : px < 52 ? "16px" : "20px"
  const spacing = px < 28 ? "0.22em" : "0.28em"

  return (
    <div style={{ display: "flex", alignItems: "center", gap: px * 0.35 }}>
      <div style={{
        width: px, height: px,
        background: "var(--pz-text)",
        borderRadius: px * 0.2,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden",
      }}>
        <svg
          width={px * 0.74}
          height={px * 0.74}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21 3 C21 3, 10 3, 9.5 8.5 C9 14, 15 16, 19 17.5 C23 19, 26 21, 25.5 25 C25 29, 20 30.5, 16 30.5 C12 30.5, 9 28.5, 9 28.5"
            stroke="var(--pz-bg)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="25.5" cy="5.5" r="1.6" fill="var(--pz-bg)" />
          <line x1="25.5" y1="2.5" x2="25.5" y2="1.2" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="25.5" y1="8.5" x2="25.5" y2="9.8" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="22.5" y1="5.5" x2="21.2" y2="5.5" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="28.5" y1="5.5" x2="29.8" y2="5.5" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="23.4" y1="3.4" x2="22.4" y2="2.4" stroke="var(--pz-bg)" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="27.6" y1="7.6" x2="28.6" y2="8.6" stroke="var(--pz-bg)" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="27.6" y1="3.4" x2="28.6" y2="2.4" stroke="var(--pz-bg)" strokeWidth="0.8" strokeLinecap="round" />
          <line x1="23.4" y1="7.6" x2="22.4" y2="8.6" stroke="var(--pz-bg)" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{
        fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', Calibri, sans-serif",
        fontSize, fontWeight: 300,
        letterSpacing: spacing,
        color: "var(--pz-text)",
        textTransform: "uppercase",
        lineHeight: 1,
        userSelect: "none",
      }}>
        Studenius
      </span>
    </div>
  )
}
