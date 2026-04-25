export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {/* Icon: black square with white S + neural spark — fixed viewBox */}
      <div
        style={{
          width: size,
          height: size,
          background: "var(--pz-text)",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width={size * 0.72}
          height={size * 0.72}
          viewBox="0 0 36 42"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Curved S — fully contained within viewBox 0 0 36 42 */}
          <path
            d="M24 5
               C24 5, 10 5, 9 13
               C8 21, 16 24.5, 22 27
               C28 29.5, 35 32.5, 34 39
               C33 45, 25 48, 18 48
               C11 48, 6 44, 6 44"
            stroke="var(--pz-bg)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Neural spark node — top right */}
          <circle cx="32" cy="8" r="2.5" fill="var(--pz-bg)" />
          <line x1="32" y1="3.5" x2="32" y2="1.5" stroke="var(--pz-bg)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="32" y1="12.5" x2="32" y2="14.5" stroke="var(--pz-bg)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="27.5" y1="8" x2="25.5" y2="8" stroke="var(--pz-bg)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="36.5" y1="8" x2="38.5" y2="8" stroke="var(--pz-bg)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="28.9" y1="4.9" x2="27.5" y2="3.5" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="35.1" y1="11.1" x2="36.5" y2="12.5" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="35.1" y1="4.9" x2="36.5" y2="3.5" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
          <line x1="28.9" y1="11.1" x2="27.5" y2="12.5" stroke="var(--pz-bg)" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {/* Wordmark — Option D: ultra-spaced light sans */}
      <span
        style={{
          fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', Calibri, sans-serif",
          fontSize: "13px",
          fontWeight: 300,
          letterSpacing: "0.28em",
          color: "var(--pz-text)",
          textTransform: "uppercase",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        Studenius
      </span>
    </div>
  );
}
