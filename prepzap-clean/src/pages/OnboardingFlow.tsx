import { useState, useEffect, useRef } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "intro"
  | "featureTeaser"
  | "accountGateway"
  | "nameInput"
  | "subjectSelection"
  | "subjectReaction"
  | "goalSelection"
  | "goalReaction"
  | "learningStyle"
  | "finalTransition"

// ─── Fox image paths (from /public/fox/) ─────────────────────────────────────
const FOX = {
  neutral:   "/fox/fox-neutral.png",
  happy:     "/fox/fox-happy.png",
  excited:   "/fox/fox-excited.png",
  surprised: "/fox/fox-surprised.png",
  thinking:  "/fox/fox-thinking.png",
  peeking:   "/fox/fox-peeking.png",
  laughing:  "/fox/fox-laughing.png",
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const CREAM   = "#FAF7F2"
const SURFACE = "#F0EDE0"
const BLACK   = "#1A1A1A"
const CTA     = "#FF4D2E"
const YELLOW  = "#FFE566"
const WHITE   = "#FFFFFF"

// ─── Shared styles ────────────────────────────────────────────────────────────
const s = {
  screen: {
    width: "100%",
    maxWidth: 428,
    minHeight: "100dvh",
    background: CREAM,
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "'Quicksand', sans-serif",
    position: "relative" as const,
    overflow: "hidden",
    margin: "0 auto",
  },
  header: {
    height: 52,
    background: CREAM,
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: 12,
    position: "sticky" as const,
    top: 0,
    zIndex: 40,
  },
  backBtn: {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontSize: 24,
    color: BLACK,
    fontFamily: "Material Symbols Outlined",
    display: "flex",
    alignItems: "center",
  },
  progressBar: (pct: number) => ({
    flex: 1,
    height: 4,
    background: SURFACE,
    borderRadius: 9999,
    overflow: "hidden",
    margin: "0 8px",
  }),
  progressFill: (pct: number) => ({
    width: `${pct}%`,
    height: "100%",
    background: BLACK,
    borderRadius: 9999,
    transition: "width 0.4s ease",
  }),
  helpBtn: {
    width: 26,
    height: 26,
    background: CTA,
    borderRadius: "50%",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: CREAM,
    fontWeight: 700,
    fontSize: 13,
    fontFamily: "'Quicksand', sans-serif",
    flexShrink: 0,
  },
  bottomBar: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 428,
    display: "flex",
    gap: 16,
    padding: "16px 24px 32px 24px",
    background: CREAM,
    borderTop: `2px solid ${BLACK}`,
    zIndex: 50,
    boxSizing: "border-box" as const,
  },
  skipBtn: {
    flex: 1,
    padding: "16px 0",
    borderRadius: 9999,
    color: BLACK,
    fontWeight: 700,
    fontSize: 16,
    border: `2px solid ${BLACK}`,
    background: WHITE,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    boxShadow: `4px 4px 0px ${BLACK}`,
    fontFamily: "'Quicksand', sans-serif",
  },
  continueBtn: {
    flex: 1,
    padding: "16px 0",
    borderRadius: 9999,
    background: BLACK,
    color: WHITE,
    fontWeight: 700,
    fontSize: 16,
    border: `2px solid ${BLACK}`,
    boxShadow: `4px 4px 0px ${BLACK}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontFamily: "'Quicksand', sans-serif",
  },
  mascotBubble: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 10,
    padding: "16px 20px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  mascotCircle: {
    width: 60,
    height: 60,
    minWidth: 60,
    borderRadius: "50%",
    border: `2.5px solid ${BLACK}`,
    overflow: "hidden",
    flexShrink: 0,
    background: "#FF9F1C",
  },
  mascotImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  speechBubble: {
    background: WHITE,
    border: `2px solid ${BLACK}`,
    borderRadius: "4px 14px 14px 14px",
    padding: "10px 12px",
    maxWidth: 220,
  },
  optionCard: (selected: boolean) => ({
    width: "100%",
    padding: "16px",
    border: `2px solid ${BLACK}`,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    background: selected ? YELLOW : SURFACE,
    transform: selected ? "scale(0.97)" : "scale(1)",
    boxShadow: selected ? "inset 0 2px 6px rgba(0,0,0,0.15)" : `0 3px 0 ${BLACK}`,
    transition: "all 0.15s ease",
    fontFamily: "'Quicksand', sans-serif",
    textAlign: "left" as const,
    boxSizing: "border-box" as const,
  }),
}

// ─── Shared Header ────────────────────────────────────────────────────────────
function Header({ progress, onBack }: { progress?: number; onBack?: () => void }) {
  return (
    <header style={s.header}>
      <button style={s.backBtn} onClick={onBack} aria-label="Go back">
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
      </button>
      {progress !== undefined && (
        <div style={s.progressBar(progress)}>
          <div style={s.progressFill(progress)} />
        </div>
      )}
      <button style={s.helpBtn}>?</button>
    </header>
  )
}

// ─── Mascot Row ───────────────────────────────────────────────────────────────
function MascotRow({ src, dialogue, subtitle }: { src: string; dialogue: string; subtitle?: string }) {
  return (
    <div style={s.mascotBubble}>
      <div style={s.mascotCircle}>
        <img src={src} alt="Rex the Fox" style={s.mascotImg} />
      </div>
      <div style={s.speechBubble}>
        <p style={{ fontSize: 15, fontWeight: 700, color: BLACK, lineHeight: 1.3, margin: 0 }}>{dialogue}</p>
        {subtitle && (
          <p style={{ fontSize: 12, fontWeight: 500, color: BLACK, opacity: 0.45, marginTop: 3, marginBottom: 0 }}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}

// ─── Bottom Bar ───────────────────────────────────────────────────────────────
function BottomBar({ onSkip, onContinue, continueLabel = "Continue" }: {
  onSkip?: () => void
  onContinue?: () => void
  continueLabel?: string
}) {
  return (
    <div style={s.bottomBar}>
      <button style={s.skipBtn} onClick={onSkip}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        Skip
      </button>
      <button style={s.continueBtn} onClick={onContinue}>
        {continueLabel}
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
      </button>
    </div>
  )
}

// ─── SCREEN 1: Intro Hook ─────────────────────────────────────────────────────
function IntroHook({ onNext }: { onNext: () => void }) {
  const [slide, setSlide] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setSlide(s => (s + 1) % 3)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: sliderRef.current.offsetWidth * slide, behavior: "smooth" })
    }
  }, [slide])

  return (
    <div style={s.screen}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 24px 0", position: "relative", justifyContent: "space-between" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: 80, left: -40, width: 160, height: 160, border: "3px dashed rgba(26,26,26,0.1)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 160, right: -40, width: 128, height: 128, border: "3px solid rgba(26,26,26,0.08)", borderRadius: "50%", transform: "rotate(45deg)", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", zIndex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: BLACK, opacity: 0.4, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Studenius</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: BLACK, lineHeight: 1.2, margin: "16px 0 0" }}>The Tool built<br />for students</h1>
        </div>

        {/* Slider */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "45vh" }}>
          <div ref={sliderRef} style={{ width: "100%", maxWidth: 340, display: "flex", overflowX: "hidden", scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}>
            {/* Slide 1 */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center" }}>
              <div style={{ background: SURFACE, border: `2.5px solid ${BLACK}`, borderRadius: 24, padding: 16, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: `1.5px solid ${BLACK}`, marginBottom: 12 }}>AI Chat</span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: BLACK, color: WHITE, borderRadius: "14px 14px 4px 14px", padding: "8px 14px", maxWidth: "85%", fontSize: 14 }}>Explain Newton's 3rd Law</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
                  <div style={{ background: WHITE, color: BLACK, border: `1.5px solid ${BLACK}`, borderRadius: "4px 14px 14px 14px", padding: "8px 14px", maxWidth: "95%", fontSize: 14, lineHeight: 1.5 }}>For every action, there is an equal and opposite reaction. Like jumping off a skateboard!</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {["Math", "Science", "English"].map(t => (
                    <span key={t} style={{ background: WHITE, border: `1.5px solid ${BLACK}`, borderRadius: 9999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Slide 2 */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center" }}>
              <div style={{ background: SURFACE, border: `2.5px solid ${BLACK}`, borderRadius: 24, padding: 16, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: `1.5px solid ${BLACK}`, marginBottom: 12 }}>Practice Mode</span>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: BLACK, margin: "0 0 14px" }}>What is Newton's 3rd Law?</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { l: "A", t: "Every action has an equal reaction.", sel: true },
                    { l: "B", t: "Objects in motion stay in motion.", sel: false },
                    { l: "C", t: "Force equals mass times acceleration.", sel: false },
                    { l: "D", t: "Energy cannot be created or destroyed.", sel: false },
                  ].map(o => (
                    <div key={o.l} style={{ background: o.sel ? BLACK : WHITE, color: o.sel ? WHITE : BLACK, borderRadius: 14, padding: "10px 12px", border: `1.5px solid ${BLACK}`, display: "flex", gap: 10, fontSize: 14, alignItems: "center" }}>
                      <span style={{ fontWeight: 700, minWidth: 20 }}>{o.l}</span>
                      <span>{o.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Slide 3 */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center" }}>
              <div style={{ background: SURFACE, border: `2.5px solid ${BLACK}`, borderRadius: 24, padding: 16, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <span style={{ display: "inline-block", background: YELLOW, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 9999, border: `1.5px solid ${BLACK}`, marginBottom: 14 }}>Students Love It</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { stars: "★★★★★", quote: '"Finally an app that actually helps me study."', name: "Mia R." },
                    { stars: "★★★★★", quote: '"Grades ko tumaas in just 2 weeks!"', name: "Carlo T." },
                  ].map((r, i) => (
                    <div key={i} style={{ background: WHITE, border: `1.5px solid ${BLACK}`, borderRadius: 14, padding: 12 }}>
                      <div style={{ color: CTA, fontSize: 14, letterSpacing: 2, marginBottom: 4 }}>{r.stars}</div>
                      <p style={{ fontSize: 14, fontStyle: "italic", opacity: 0.8, margin: "0 0 8px" }}>{r.quote}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: YELLOW, border: `1.5px solid ${BLACK}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{r.name.split(" ").map(w => w[0]).join("")}</div>
                        <span style={{ fontSize: 12, opacity: 0.8 }}>{r.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setSlide(i)} style={{ width: 12, height: 12, borderRadius: "50%", background: i === slide ? CTA : "transparent", border: `2px solid ${CTA}`, padding: 0, cursor: "pointer", transition: "all 0.3s" }} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingBottom: 32, zIndex: 1 }}>
          <p style={{ textAlign: "center", fontSize: 11, color: BLACK, opacity: 0.35, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>join thousands of students today</p>
          <button onClick={onNext} style={{ width: "100%", height: 52, background: CTA, color: WHITE, fontWeight: 700, fontSize: 16, borderRadius: 9999, border: `2.5px solid ${BLACK}`, boxShadow: `4px 4px 0 ${BLACK}`, cursor: "pointer", fontFamily: "'Quicksand', sans-serif", animation: "pulse 2s infinite" }}>
            Create Free Account
          </button>
          <a href="#" style={{ display: "block", textAlign: "center", fontSize: 13, color: BLACK, marginTop: 12, textDecoration: "none" }}>
            I already have an account → <strong>Log In</strong>
          </a>
          <p style={{ textAlign: "center", fontSize: 10, color: BLACK, opacity: 0.3, marginTop: 10 }}>By joining, you agree to our Terms</p>
        </div>
      </main>
    </div>
  )
}

// ─── SCREEN 2: Feature Teaser ─────────────────────────────────────────────────
function FeatureTeaser({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const features = [
    { icon: "style", label: "Flashcards", desc: "Master concepts quickly", bg: "#FEF9C3" },
    { icon: "robot_2", label: "AI Tutor", desc: "Ready to help 24/7", bg: "#FFEDD5" },
    { icon: "assignment", label: "Practice Tests", desc: "Prepare for the real thing", bg: "#FEE2E2" },
  ]
  return (
    <div style={s.screen}>
      <Header onBack={onBack} progress={0} />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 120px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ background: WHITE, border: `2.5px solid ${BLACK}`, borderRadius: 18, padding: 16, boxShadow: `4px 4px 0 ${BLACK}`, maxWidth: 280, margin: "0 auto", position: "relative" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: BLACK, margin: 0, lineHeight: 1.3 }}>Multiple tools in One place. Let's go!</p>
            <div style={{ position: "absolute", bottom: -15, left: "50%", marginLeft: -10, width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: `15px solid ${BLACK}` }} />
            <div style={{ position: "absolute", bottom: -11, left: "50%", marginLeft: -8, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: `12px solid ${WHITE}`, zIndex: 1 }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: -12, position: "relative" }}>
          {features.map((f, i) => (
            <div key={f.label} style={{ transform: `rotate(${[2, -3, 1.5][i]}deg)`, marginBottom: i < 2 ? -12 : 0, zIndex: 3 - i, position: "relative" }}>
              <div style={{ background: f.bg, border: `2.5px solid ${BLACK}`, borderRadius: 14, padding: "14px 16px", minWidth: 280, display: "flex", alignItems: "center", gap: 14, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <div style={{ width: 40, height: 40, background: BLACK, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: WHITE, fontSize: 20 }}>{f.icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: BLACK, margin: 0 }}>{f.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: BLACK, opacity: 0.6, margin: 0 }}>{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomBar onSkip={onNext} onContinue={onNext} />
    </div>
  )
}

// ─── SCREEN 3: Account Gateway ────────────────────────────────────────────────
function AccountGateway({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  return (
    <div style={s.screen}>
      <Header onBack={onBack} />
      <main style={{ flex: 1, padding: "32px 24px 160px", maxWidth: 428, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: BLACK, letterSpacing: "-0.02em", margin: "0 0 8px" }}>Let's Get You In</h2>
          <p style={{ fontSize: 17, color: BLACK, opacity: 0.8, margin: 0 }}>Join thousands of students today</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, height: 52, background: WHITE, border: `2.5px solid ${BLACK}`, borderRadius: 9999, cursor: "pointer", width: "100%", fontFamily: "'Quicksand', sans-serif" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span style={{ color: BLACK, fontSize: 15, fontWeight: 700 }}>Continue with Google</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: BLACK, opacity: 0.12 }} />
          <span style={{ fontSize: 13, color: BLACK, opacity: 0.4 }}>or</span>
          <div style={{ flex: 1, height: 1, background: BLACK, opacity: 0.12 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Your study email address" style={{ width: "100%", background: WHITE, color: BLACK, padding: "18px 20px", borderRadius: 14, border: `2.5px solid ${BLACK}`, fontSize: 17, fontFamily: "'Quicksand', sans-serif", outline: "none", boxSizing: "border-box" }} />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Create a strong password" style={{ width: "100%", background: WHITE, color: BLACK, padding: "18px 20px", borderRadius: 14, border: `2.5px solid ${BLACK}`, fontSize: 17, fontFamily: "'Quicksand', sans-serif", outline: "none", boxSizing: "border-box" }} />
          <button onClick={onNext} style={{ width: "100%", background: BLACK, color: WHITE, fontSize: 20, fontWeight: 700, padding: "16px 0", borderRadius: 9999, border: `2.5px solid ${BLACK}`, cursor: "pointer", fontFamily: "'Quicksand', sans-serif" }}>
            Create Free Account
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: BLACK, opacity: 0.7 }}>By joining, you agree to our <a href="#" style={{ color: BLACK, fontWeight: 700 }}>Terms</a></p>
      </main>
    </div>
  )
}

// ─── SCREEN 4: Name Input ─────────────────────────────────────────────────────
function NameInput({ onNext, onBack }: { onNext: (name: string) => void; onBack: () => void }) {
  const [name, setName] = useState("")
  const dialogue = name.length > 2 ? `${name}! Love it. 😄` : "What should I call you?"
  const fox = name.length > 2 ? FOX.happy : FOX.neutral

  return (
    <div style={s.screen}>
      <Header onBack={onBack} />
      <main style={{ flex: 1, padding: "32px 24px", maxWidth: 428, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: BLACK, letterSpacing: "-0.02em", lineHeight: 1.25, margin: "0 0 8px" }}>{dialogue}</h2>
        <p style={{ fontSize: 17, color: "#555", margin: "0 0 32px" }}>You can always change this later</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your name"
          style={{ width: "100%", background: WHITE, border: `2.5px solid ${BLACK}`, borderRadius: 14, padding: "20px 20px", fontSize: 22, fontWeight: 700, color: BLACK, fontFamily: "'Quicksand', sans-serif", outline: "none", boxSizing: "border-box" }}
        />
        <button
          onClick={() => name.trim() && onNext(name.trim())}
          disabled={!name.trim()}
          style={{ marginTop: 32, width: "100%", background: CTA, color: WHITE, fontSize: 22, fontWeight: 700, padding: "16px 0", borderRadius: 9999, border: "none", cursor: name.trim() ? "pointer" : "default", opacity: name.trim() ? 1 : 0.5, fontFamily: "'Quicksand', sans-serif", transition: "opacity 0.2s" }}
        >
          Go
        </button>
      </main>
    </div>
  )
}

// ─── SCREEN 5: Subject Selection ──────────────────────────────────────────────
const subjects = [
  { id: "math", name: "Mathematics", icon: "calculate", text: "Math? Number cruncher!" },
  { id: "science", name: "Science", icon: "science", text: "Science rules!" },
  { id: "english", name: "English", icon: "menu_book", text: "A reader, I see." },
  { id: "history", name: "History", icon: "account_balance", text: "Learning from the past." },
  { id: "programming", name: "Programming", icon: "code", text: "Hello, World!" },
  { id: "arts", name: "Arts", icon: "palette", text: "Getting creative!" },
  { id: "other", name: "Other", icon: "apps", text: "Something unique!" },
]

function SubjectSelection({ onNext, onBack }: { onNext: (selected: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [hovering, setHovering] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const foxSrc = hovering
    ? FOX.thinking
    : selected.length === 0 ? FOX.neutral
    : selected.length === 1 ? FOX.happy
    : selected.length === 2 ? FOX.excited
    : FOX.surprised

  const dialogue = selected.length === 0 ? "What are you studying?"
    : selected.length === 1 ? (subjects.find(s => s.id === selected[0])?.text ?? "Nice choice!")
    : selected.length === 2 ? "Good combo."
    : "Okay. You're not playing."

  return (
    <div style={s.screen}>
      <Header onBack={onBack} progress={60} />
      <main style={{ flex: 1, padding: "0 24px 120px", overflowY: "auto" }}>
        <MascotRow src={foxSrc} dialogue={dialogue} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map(subject => {
            const isSel = selected.includes(subject.id)
            return (
              <button
                key={subject.id}
                style={s.optionCard(isSel)}
                onClick={() => toggle(subject.id)}
                onMouseEnter={() => setHovering(subject.id)}
                onMouseLeave={() => setHovering(null)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: BLACK, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: WHITE }}>{subject.icon}</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: BLACK }}>{subject.name}</span>
                </div>
                <div style={{ width: 24, height: 24, border: `2px solid ${BLACK}`, borderRadius: "50%", background: isSel ? BLACK : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSel && <span className="material-symbols-outlined" style={{ fontSize: 14, color: YELLOW }}>check</span>}
                </div>
              </button>
            )
          })}
        </div>
      </main>
      <BottomBar onSkip={() => onNext([])} onContinue={() => onNext(selected)} />
    </div>
  )
}

// ─── SCREEN 6: Subject Reaction ───────────────────────────────────────────────
function SubjectReaction({ selected, onNext }: { selected: string[]; onNext: () => void }) {
  const [phase, setPhase] = useState(0)
  const [foxSrc, setFoxSrc] = useState(FOX.peeking)
  const [foxY, setFoxY] = useState(100)
  const [textOpacity, setTextOpacity] = useState(0)
  const [chipsVisible, setChipsVisible] = useState(false)

  const texts = ["Good combo.", "Interesting.", "We'll keep that in mind.", "Let's keep going."]

  useEffect(() => {
    const t1 = setTimeout(() => setFoxY(0), 100)
    const t2 = setTimeout(() => setTextOpacity(1), 800)
    const t3 = setTimeout(() => { setFoxSrc(FOX.surprised); setChipsVisible(true) }, 1500)
    const t4 = setTimeout(() => setFoxSrc(FOX.neutral), 3000)
    const t5 = setTimeout(() => setFoxSrc(FOX.excited), 4500)
    const t6 = setTimeout(() => { setFoxSrc(FOX.happy); onNext() }, 6000)
    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout)
  }, [])

  const phaseText = phase < texts.length ? texts[phase] : texts[texts.length - 1]

  return (
    <div style={{ ...s.screen, background: CREAM, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "25%", left: 0, width: "100%", textAlign: "center", zIndex: 10, transition: "opacity 0.5s", opacity: textOpacity }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: BLACK, margin: 0 }}>Good combo.</h1>
      </div>
      {chipsVisible && (
        <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {selected.slice(0, 3).map((id, i) => {
            const s = subjects.find(s => s.id === id)
            return s ? (
              <span key={id} style={{ background: WHITE, border: `2px solid #EAEAEA`, borderBottom: `4px solid #EAEAEA`, borderRadius: 99, padding: "8px 16px", fontWeight: 700, fontSize: 14, color: BLACK }}>
                {s.name}
              </span>
            ) : null
          })}
        </div>
      )}
      <div style={{ position: "absolute", bottom: -50, left: "50%", transform: `translateX(-50%) translateY(${foxY}%)`, transition: "transform 1.2s cubic-bezier(0.34,1.56,0.64,1)", width: 300, height: 300, zIndex: 5 }}>
        <img src={foxSrc} alt="Rex" style={{ width: "100%", height: "auto", objectFit: "contain", transition: "opacity 0.3s" }} />
      </div>
    </div>
  )
}

// ─── SCREEN 7: Goal Selection ─────────────────────────────────────────────────
const goals = [
  { id: "grades", name: "Improve Grades", icon: "trending_up", text: "Got it. Grades first." },
  { id: "faster", name: "Study Faster", icon: "bolt", text: "Speed + retention. Let's go." },
  { id: "habits", name: "Build Habits", icon: "autorenew", text: "Habits over motivation. Smart." },
  { id: "college", name: "Prepare for College", icon: "school", text: "College bound. Big move." },
  { id: "skill", name: "Learn a Skill", icon: "psychology", text: "Always learning. Love that." },
]

function GoalSelection({ onNext, onBack }: { onNext: (goal: string) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovering, setHovering] = useState<string | null>(null)

  const foxSrc = hovering ? FOX.thinking : selected ? FOX.happy : FOX.neutral
  const dialogue = selected ? (goals.find(g => g.id === selected)?.text ?? "Got it.") : "What's your main goal?"

  return (
    <div style={s.screen}>
      <Header onBack={onBack} progress={80} />
      <main style={{ flex: 1, padding: "0 24px 120px", overflowY: "auto" }}>
        <MascotRow src={foxSrc} dialogue={dialogue} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {goals.map(goal => {
            const isSel = selected === goal.id
            return (
              <button
                key={goal.id}
                style={s.optionCard(isSel)}
                onClick={() => setSelected(isSel ? null : goal.id)}
                onMouseEnter={() => setHovering(goal.id)}
                onMouseLeave={() => setHovering(null)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: BLACK, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: WHITE }}>{goal.icon}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: BLACK }}>{goal.name}</span>
                </div>
                <div style={{ width: 22, height: 22, border: `2px solid ${BLACK}`, borderRadius: "50%", background: isSel ? BLACK : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSel && (
                    <svg fill="none" height="11" viewBox="0 0 11 11" width="11"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke={YELLOW} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </main>
      <BottomBar onSkip={() => onNext("")} onContinue={() => onNext(selected ?? "")} />
    </div>
  )
}

// ─── SCREEN 8: Goal Reaction ──────────────────────────────────────────────────
function GoalReaction({ goal, onNext }: { goal: string; onNext: () => void }) {
  const [foxSrc, setFoxSrc] = useState(FOX.peeking)
  const [foxY, setFoxY] = useState(100)
  const [text, setText] = useState("")
  const [textOpacity, setTextOpacity] = useState(0)
  const [chipVisible, setChipVisible] = useState(false)

  const goalName = goals.find(g => g.id === goal)?.name ?? "Your Goal"

  useEffect(() => {
    const t1 = setTimeout(() => setFoxY(0), 100)
    const t2 = setTimeout(() => { setText("Noted."); setTextOpacity(1); setChipVisible(true) }, 800)
    const t3 = setTimeout(() => { setFoxSrc(FOX.thinking) }, 1500)
    const t4 = setTimeout(() => { setTextOpacity(0) }, 2200)
    const t5 = setTimeout(() => { setText("We'll make it work."); setTextOpacity(1); setFoxSrc(FOX.surprised) }, 2800)
    const t6 = setTimeout(() => { setTextOpacity(0) }, 3800)
    const t7 = setTimeout(() => { setText("Let's keep going."); setTextOpacity(1); setFoxSrc(FOX.excited); setChipVisible(false) }, 4400)
    const t8 = setTimeout(() => { setFoxSrc(FOX.happy); onNext() }, 6000)
    return () => [t1, t2, t3, t4, t5, t6, t7, t8].forEach(clearTimeout)
  }, [])

  return (
    <div style={{ ...s.screen, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "25%", left: 0, width: "100%", textAlign: "center", zIndex: 10, transition: "opacity 0.5s", opacity: textOpacity, padding: "0 24px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: BLACK, margin: "0 0 20px" }}>{text}</h1>
        {chipVisible && goalName && (
          <span style={{ display: "inline-block", background: CREAM, border: `2px solid ${BLACK}`, borderRadius: 9999, padding: "8px 20px", fontWeight: 700, fontSize: 15, color: BLACK }}>
            {goalName}
          </span>
        )}
      </div>
      <div style={{ position: "absolute", bottom: -50, left: "50%", transform: `translateX(-50%) translateY(${foxY}%)`, transition: "transform 1.2s cubic-bezier(0.34,1.56,0.64,1)", width: 300, height: 300, zIndex: 5 }}>
        <img src={foxSrc} alt="Rex" style={{ width: "100%", height: "auto", objectFit: "contain", transition: "opacity 0.4s" }} />
      </div>
    </div>
  )
}

// ─── SCREEN 9: Learning Style ─────────────────────────────────────────────────
const learningStyles = [
  { id: "visual", label: "Visual", icon: "visibility", text: "I see what you mean!" },
  { id: "tests", label: "Practice Tests", icon: "content_paste", text: "Practice makes perfect." },
  { id: "flashcards", label: "Flashcards", icon: "dynamic_feed", text: "Flipping good choice." },
  { id: "reading", label: "Reading", icon: "menu_book", text: "Bookworm mode: ON." },
  { id: "listening", label: "Listening", icon: "headphones", text: "Loud and clear." },
  { id: "mixed", label: "Mixed", icon: "shuffle", text: "A little bit of everything." },
]

function LearningStyle({ onNext, onBack }: { onNext: (styles: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [hovering, setHovering] = useState(false)

  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const foxSrc = hovering ? FOX.thinking : selected.length > 0 ? FOX.excited : FOX.neutral
  const dialogue = selected.length > 0
    ? (learningStyles.find(s => s.id === selected[selected.length - 1])?.text ?? "How do you learn best?")
    : "How do you learn best?"

  return (
    <div style={s.screen}>
      <Header onBack={onBack} progress={100} />
      <main style={{ flex: 1, padding: "0 24px 140px", overflowY: "auto" }}>
        <MascotRow src={foxSrc} dialogue={dialogue} subtitle="Select all that apply." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
          {learningStyles.map(style => {
            const isSel = selected.includes(style.id)
            return (
              <label
                key={style.id}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, border: `2.5px solid ${BLACK}`, borderRadius: 14, cursor: "pointer", padding: 16, boxSizing: "border-box", background: isSel ? YELLOW : SURFACE, boxShadow: isSel ? "inset 0 2px 6px rgba(0,0,0,0.15)" : `0 3px 0 ${BLACK}`, transform: isSel ? "scale(0.97)" : "scale(1)", transition: "all 0.15s ease" }}
              >
                <input type="checkbox" checked={isSel} onChange={() => toggle(style.id)} style={{ position: "absolute", opacity: 0, height: 0, width: 0 }} />
                <div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, border: `2px solid ${BLACK}`, borderRadius: "50%", background: isSel ? BLACK : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSel && <svg fill="none" height="11" viewBox="0 0 11 11" width="11"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>}
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 28, marginBottom: 8 }}>{style.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: BLACK }}>{style.label}</span>
              </label>
            )
          })}
        </div>
      </main>
      <BottomBar onSkip={() => onNext([])} onContinue={() => onNext(selected)} />
    </div>
  )
}

// ─── SCREEN 10: Final Transition ──────────────────────────────────────────────
function FinalTransition({ onDone }: { onDone: () => void }) {
  const [foxSrc, setFoxSrc] = useState(FOX.peeking)
  const [foxY, setFoxY] = useState(100)
  const [text, setText] = useState("")
  const [textOpacity, setTextOpacity] = useState(0)
  const [subVisible, setSubVisible] = useState(false)
  const [checklistVisible, setChecklistVisible] = useState(false)
  const [checks, setChecks] = useState([false, false, false, false])
  const [progressWidth, setProgressWidth] = useState(0)
  const [progressVisible, setProgressVisible] = useState(false)

  useEffect(() => {
    const show = (t: string) => { setTextOpacity(0); setTimeout(() => { setText(t); setTextOpacity(1) }, 600) }

    const t1  = setTimeout(() => setFoxY(0), 100)
    const t2  = setTimeout(() => show("Got your style."), 1000)
    const t3  = setTimeout(() => setFoxSrc(FOX.thinking), 3000)
    const t4  = setTimeout(() => show("We'll teach your way."), 4000)
    const t5  = setTimeout(() => setFoxSrc(FOX.surprised), 5500)
    const t6  = setTimeout(() => { show("Building your setup..."); setFoxSrc(FOX.neutral) }, 7000)
    const t7  = setTimeout(() => { setChecklistVisible(true); setProgressVisible(true); setProgressWidth(90) }, 8500)
    const t8  = setTimeout(() => setChecks(c => [true, ...c.slice(1)]), 9000)
    const t9  = setTimeout(() => setChecks(c => [c[0], true, ...c.slice(2)]), 9800)
    const t10 = setTimeout(() => { setChecks(c => [...c.slice(0,2), true, c[3]]); setFoxSrc(FOX.excited) }, 10600)
    const t11 = setTimeout(() => setChecks(c => [...c.slice(0,3), true]), 11400)
    const t12 = setTimeout(() => setChecklistVisible(false), 12800)
    const t13 = setTimeout(() => { setProgressWidth(100); show("You're all set."); setFoxSrc(FOX.excited) }, 13500)
    const t14 = setTimeout(() => setSubVisible(true), 14600)
    const t15 = setTimeout(() => setProgressVisible(false), 14500)
    const t16 = setTimeout(() => { setFoxSrc(FOX.happy) }, 15000)
    const t17 = setTimeout(() => onDone(), 17000)

    return () => [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12,t13,t14,t15,t16,t17].forEach(clearTimeout)
  }, [])

  const checkItems = ["Preparing AI Tutor", "Creating Practice Tests", "Building Study Roadmap", "Personalizing Recommendations"]

  return (
    <div style={{ ...s.screen, overflow: "hidden" }}>
      {/* Text area */}
      <div style={{ position: "absolute", top: "20%", left: 0, width: "100%", textAlign: "center", zIndex: 10, padding: "0 24px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: BLACK, margin: "0 0 8px", transition: "opacity 0.7s", opacity: textOpacity }}>{text}</h1>
        {subVisible && <p style={{ fontSize: 16, color: BLACK, opacity: 0.6, margin: 0 }}>Your journey starts now.</p>}
      </div>

      {/* Checklist */}
      {checklistVisible && (
        <div style={{ position: "absolute", top: "38%", left: "50%", transform: "translateX(-50%)", zIndex: 10, width: "80%" }}>
          {checkItems.map((item, i) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, opacity: checks[i] ? 1 : 0, transition: "opacity 0.8s" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: BLACK }}>check</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: BLACK }}>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {progressVisible && (
        <div style={{ position: "absolute", top: "68%", left: "50%", transform: "translateX(-50%)", width: "70%", height: 4, background: SURFACE, borderRadius: 9999, zIndex: 10 }}>
          <div style={{ height: "100%", background: BLACK, borderRadius: 9999, width: `${progressWidth}%`, transition: "width 3s ease-out" }} />
        </div>
      )}

      {/* Fox */}
      <div style={{ position: "absolute", bottom: -50, left: "50%", transform: `translateX(-50%) translateY(${foxY}%)`, transition: "transform 2s cubic-bezier(0.22,1,0.36,1)", width: 320, height: 320, zIndex: 5 }}>
        <img src={foxSrc} alt="Rex" style={{ width: "100%", height: "auto", objectFit: "contain", transition: "opacity 0.6s" }} />
      </div>
    </div>
  )
}

// ─── Main Onboarding Flow ─────────────────────────────────────────────────────
export default function Onboarding() {
  const [screen, setScreen] = useState<Screen>("intro")
  const [userName, setUserName] = useState("")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedGoal, setSelectedGoal] = useState("")
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])

  const go = (s: Screen) => setScreen(s)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #FAF7F2; }
        @keyframes pulse {
          0% { box-shadow: 4px 4px 0px 0px #1A1A1A; }
          50% { box-shadow: 6px 6px 0px 0px #FF4D2E; }
          100% { box-shadow: 4px 4px 0px 0px #1A1A1A; }
        }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      {screen === "intro"            && <IntroHook onNext={() => go("featureTeaser")} />}
      {screen === "featureTeaser"    && <FeatureTeaser onNext={() => go("accountGateway")} onBack={() => go("intro")} />}
      {screen === "accountGateway"   && <AccountGateway onNext={() => go("nameInput")} onBack={() => go("featureTeaser")} />}
      {screen === "nameInput"        && <NameInput onNext={n => { setUserName(n); go("subjectSelection") }} onBack={() => go("accountGateway")} />}
      {screen === "subjectSelection" && <SubjectSelection onNext={s => { setSelectedSubjects(s); go("subjectReaction") }} onBack={() => go("nameInput")} />}
      {screen === "subjectReaction"  && <SubjectReaction selected={selectedSubjects} onNext={() => go("goalSelection")} />}
      {screen === "goalSelection"    && <GoalSelection onNext={g => { setSelectedGoal(g); go("goalReaction") }} onBack={() => go("subjectSelection")} />}
      {screen === "goalReaction"     && <GoalReaction goal={selectedGoal} onNext={() => go("learningStyle")} />}
      {screen === "learningStyle"    && <LearningStyle onNext={s => { setSelectedStyles(s); go("finalTransition") }} onBack={() => go("goalSelection")} />}
      {screen === "finalTransition"  && <FinalTransition onDone={() => { /* navigate to dashboard */ window.location.href = "/dashboard" }} />}
    </>
  )
}
