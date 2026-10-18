import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { getCachedSession } from "@/lib/authSession"
import { saveUserPreferences, generateSmartQuests, GOAL_METADATA, SUBJECT_METADATA, type ExamTarget, type UserStudyPreferences } from "@/lib/userPreferences"
import { playPop, playTap, playSuccess, playCelebration } from "@/lib/soundFX"

type Screen =
  | "intro"
  | "nameInput"
  | "subjectSelection"
  | "subjectReaction"
  | "goalSelection"
  | "goalReaction"
  | "learningStyle"
  | "examTarget"
  | "finalTransition"

const FOX = {
  neutral:   "/fox/fox-neutral.png",
  happy:     "/fox/fox-happy.png",
  excited:   "/fox/fox-excited.png",
  surprised: "/fox/fox-surprised.png",
  thinking:  "/fox/fox-thinking.png",
  peeking:   "/fox/fox-peeking.png",
  laughing:  "/fox/fox-laughing.png",
}

// Background: #FFFBEA (Stitch source of truth, not #FAF7F2)
const BG      = "#FFFBEA"
const SURFACE = "#F0EDE0"
const BLACK   = "#1A1A1A"
const CTA     = "#FF4D2E"
const YELLOW  = "#FFE566"
const WHITE   = "#FFFFFF"

// Header stretches to 800px on desktop; content column is 420px centered
const HEADER_MAX  = 800
const CONTENT_MAX = 420

const s = {
  // Full-page wrapper — fixed to viewport so nothing bleeds outside on mobile
  page: {
    position: "fixed" as const,
    inset: 0,
    background: BG,
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "'Quicksand', sans-serif",
    alignItems: "center",
    overflowY: "hidden" as const,
    overflowX: "hidden" as const,
  },
  // Sticky header — spans full width but inner flex row is capped at HEADER_MAX
  header: {
    height: 52,
    background: BG,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 16px",
    position: "sticky" as const,
    top: 0,
    zIndex: 40,
    width: "100%",
    boxSizing: "border-box" as const,
  },
  headerInner: {
    maxWidth: HEADER_MAX,
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
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
  progressBar: {
    flex: 1,
    height: 3,
    background: "rgba(0,0,0,0.05)",
    borderRadius: 9999,
    overflow: "hidden",
  },
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
    color: BG,
    fontWeight: 700,
    fontSize: 13,
    fontFamily: "'Quicksand', sans-serif",
    flexShrink: 0,
  },
  // Content column — 420px max, centered
  content: {
    maxWidth: CONTENT_MAX,
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    position: "relative" as const,
    background: BG,
  },
  // Fixed bottom bar — 420px max, centered
  bottomBar: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: CONTENT_MAX,
    display: "flex",
    gap: 16,
    padding: "16px 24px 32px 24px",
    background: BG,
    borderTop: `2.5px solid ${BLACK}`,
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mascotImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    objectPosition: "top center",
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
    border: `2.5px solid ${BLACK}`,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    background: selected ? YELLOW : SURFACE,
    transform: selected ? "translateY(3px)" : "scale(1)",
    boxShadow: selected ? "none" : `0 3px 0 ${BLACK}`,
    transition: "all 0.15s ease",
    fontFamily: "'Quicksand', sans-serif",
    textAlign: "left" as const,
    boxSizing: "border-box" as const,
  }),
}

function Header({ progress, onBack }: { progress?: number; onBack?: () => void }) {
  return (
    <header style={s.header}>
      <div style={s.headerInner}>
        <button style={s.backBtn} onClick={onBack} aria-label="Go back">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        {progress !== undefined && (
          <div style={s.progressBar}>
            <div style={s.progressFill(progress)} />
          </div>
        )}
        <button style={s.helpBtn}>?</button>
      </div>
    </header>
  )
}

function MascotRow({ src, dialogue, subtitle }: { src: string; dialogue: string; subtitle?: string }) {
  return (
    <div style={s.mascotBubble}>
      <div style={s.mascotCircle}>
        <img
          src={src}
          alt="Rex the Fox"
          style={s.mascotImg}
          onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
        />
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

function IntroHook({ onNext }: { onNext: () => void }) {
  const navigate = useNavigate()
  const [slide, setSlide] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => setSlide(s => (s + 1) % 3), 3500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: sliderRef.current.offsetWidth * slide, behavior: "smooth" })
    }
  }, [slide])

  const handleGoogle = async () => {
    if ((import.meta.env.VITE_SUPABASE_URL || "").includes("your-project-id")) {
      navigate("/dashboard", { replace: true });
      return;
    }

    setLoading(true);
    setError(null);

    // Safety timeout: reset button after 10s if user cancels browser
    const timer = setTimeout(() => {
      setLoading(false);
    }, 10000);

    try {
      if (Capacitor.isNativePlatform()) {
        const { data, error: e } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: "studenius://auth/callback",
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
          },
        });

        if (e) throw e;

        if (data?.url) {
          await Browser.open({ url: data.url, windowName: "_self" });
        }
      } else {
        const { error: e } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: { prompt: "select_account" },
          },
        });
        if (e) throw e;
      }
    } catch (e: any) {
      console.error("Google sign-in error:", e);
      setError(e.message || "Google sign-in failed. Please try again.");
      setLoading(false);
      clearTimeout(timer);
    }
  };

  return (
    <div style={s.page}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", maxWidth: CONTENT_MAX, padding: "clamp(20px, 3vh, 36px) 24px clamp(16px, 3vh, 28px)", position: "relative", justifyContent: "space-between", overflowY: "auto", boxSizing: "border-box" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: 60, left: -40, width: 140, height: 140, border: "3px dashed rgba(26,26,26,0.1)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 180, right: -40, width: 120, height: 120, border: "3px solid rgba(26,26,26,0.08)", borderRadius: "50%", transform: "rotate(45deg)", pointerEvents: "none" }} />

        <div style={{ textAlign: "center", zIndex: 1, flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: BLACK, opacity: 0.5, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Studenius</p>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 36px)", fontWeight: 800, color: BLACK, lineHeight: 1.15, margin: "10px 0 0" }}>The Tool built<br />for students</h1>
        </div>

        {/* Slider */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 0", minHeight: 0 }}>
          <div ref={sliderRef} style={{ width: "100%", maxWidth: 340, display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollBehavior: "smooth", scrollbarWidth: "none" }}>
            {/* Slide 1 */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center", boxSizing: "border-box" }}>
              <div style={{ background: SURFACE, border: `2.5px solid ${BLACK}`, borderRadius: 20, padding: 14, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <span style={{ display: "inline-block", background: YELLOW, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 9999, border: `1.5px solid ${BLACK}`, marginBottom: 10 }}>Rex Tutor</span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ background: BLACK, color: WHITE, borderRadius: "14px 14px 4px 14px", padding: "7px 12px", maxWidth: "85%", fontSize: 13, fontWeight: 600 }}>Explain Newton's 3rd Law</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
                  <div style={{ background: WHITE, color: BLACK, border: `1.5px solid ${BLACK}`, borderRadius: "4px 14px 14px 14px", padding: "7px 12px", maxWidth: "95%", fontSize: 13, lineHeight: 1.45, fontWeight: 600 }}>When you push off a wall or ground, it pushes back with equal force — Newton's 3rd Law in action.</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {["Math", "Science", "English"].map(t => (
                    <span key={t} style={{ background: WHITE, border: `1.5px solid ${BLACK}`, borderRadius: 9999, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: BLACK }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Slide 2 */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center", boxSizing: "border-box" }}>
              <div style={{ background: SURFACE, border: `2.5px solid ${BLACK}`, borderRadius: 20, padding: 14, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <span style={{ display: "inline-block", background: YELLOW, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 9999, border: `1.5px solid ${BLACK}`, marginBottom: 10 }}>Practice Mode</span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: BLACK, margin: "0 0 10px" }}>What is Newton's 3rd Law?</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { l: "A", t: "Every action has an equal reaction.", sel: true },
                    { l: "B", t: "Objects in motion stay in motion.", sel: false },
                    { l: "C", t: "Force equals mass times acceleration.", sel: false },
                    { l: "D", t: "Energy cannot be created or destroyed.", sel: false },
                  ].map(o => (
                    <div key={o.l} style={{ background: o.sel ? BLACK : WHITE, color: o.sel ? WHITE : BLACK, borderRadius: 10, padding: "7px 10px", border: `1.5px solid ${BLACK}`, display: "flex", gap: 8, fontSize: 12, alignItems: "center", fontWeight: 600 }}>
                      <span style={{ fontWeight: 800, minWidth: 16 }}>{o.l}</span>
                      <span>{o.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Slide 3 */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center", boxSizing: "border-box" }}>
              <div style={{ background: SURFACE, border: `2.5px solid ${BLACK}`, borderRadius: 20, padding: 14, boxShadow: `4px 4px 0 ${BLACK}` }}>
                <span style={{ display: "inline-block", background: YELLOW, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 9999, border: `1.5px solid ${BLACK}`, marginBottom: 10 }}>Your Ultimate Study Toolkit</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { icon: "psychology", quote: "Stuck on a concept? Rex explains complex topics instantly so you never fall behind.", title: "Smart Tutor" },
                    { icon: "edit_note", quote: "Turn messy notes into structured, high-retention flashcards with spaced repetition.", title: "AI Flashcards" },
                  ].map((r, i) => (
                    <div key={i} style={{ background: WHITE, border: `1.5px solid ${BLACK}`, borderRadius: 12, padding: 10 }}>
                      <div style={{ color: CTA, fontSize: 20, marginBottom: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20 }}>{r.icon}</span>
                      </div>
                      <p style={{ fontSize: 12, color: BLACK, opacity: 0.75, margin: "0 0 4px", lineHeight: 1.35, fontWeight: 600 }}>{r.quote}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: BLACK, opacity: 1, fontWeight: 800 }}>{r.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Go to slide ${i + 1}`} style={{ width: 10, height: 10, borderRadius: "50%", background: i === slide ? CTA : "transparent", border: `2px solid ${CTA}`, padding: 0, cursor: "pointer", transition: "all 0.3s" }} />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 10, marginTop: "auto", flexShrink: 0, width: "100%" }}>
          {error && (
            <div style={{ background: "#FFF0F0", border: `2px solid ${CTA}`, borderRadius: 12, padding: "8px 12px", fontSize: 12, color: CTA, fontWeight: 700, marginBottom: 10, textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* Primary Action: Continue with Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%",
              height: 52,
              background: WHITE,
              color: BLACK,
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 9999,
              border: `2.5px solid ${BLACK}`,
              boxShadow: `4px 4px 0 ${BLACK}`,
              cursor: loading ? "default" : "pointer",
              fontFamily: "'Quicksand', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              position: "relative",
              zIndex: 20,
              opacity: loading ? 0.7 : 1,
              boxSizing: "border-box",
            }}
            className="active:translate-y-0.5 active:shadow-[2px_2px_0_#1A1A1A] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: BLACK, opacity: 0.45, marginTop: 14, marginBottom: 0, fontWeight: 600 }}>
            By continuing, you agree to our <a href="/terms" style={{ color: BLACK, fontWeight: 700, textDecoration: "underline" }}>Terms</a>
          </p>
        </div>
      </main>
    </div>
  )
}

// Stitch design: no fox row — just headline + input + Go button
function NameInput({ onNext, onBack }: { onNext: (name: string) => void; onBack: () => void }) {
  const [name, setName] = useState("")
  const headlineText = name.length > 2 ? `${name}! Love it.` : "What should I call you?"

  return (
    <div style={s.page}>
      <Header onBack={onBack} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "32px 24px", boxSizing: "border-box" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: BLACK, letterSpacing: "-0.02em", lineHeight: 1.25, margin: "0 0 8px" }}>{headlineText}</h2>
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
            style={{ marginTop: 32, width: "100%", background: CTA, color: WHITE, fontSize: 22, fontWeight: 700, padding: "16px 0", borderRadius: 9999, border: "none", cursor: name.trim() ? "pointer" : "default", opacity: name.trim() ? 1 : 0.5, fontFamily: "'Quicksand', sans-serif", transition: "opacity 0.2s" }}>
            Go
          </button>
        </main>
      </div>
    </div>
  )
}

const subjects = [
  { id: "math",        name: "Mathematics", icon: "calculate",       text: "Math? Number cruncher!" },
  { id: "science",     name: "Science",     icon: "science",         text: "Science rules!" },
  { id: "english",     name: "English",     icon: "menu_book",       text: "A reader, I see." },
  { id: "history",     name: "History",     icon: "account_balance", text: "Learning from the past." },
  { id: "programming", name: "Programming", icon: "code",            text: "Hello, World!" },
  { id: "arts",        name: "Arts",        icon: "palette",         text: "Getting creative!" },
  { id: "other",       name: "Other",       icon: "apps",            text: "Something unique!" },
]

function SubjectSelection({ onNext, onBack }: { onNext: (selected: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [hovering, setHovering] = useState<string | null>(null)

  const toggle = (id: string) => {
    playPop();
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const foxSrc = hovering ? FOX.thinking
    : selected.length === 0 ? FOX.neutral
    : selected.length === 1 ? FOX.happy
    : selected.length === 2 ? FOX.excited
    : FOX.surprised

  const dialogue = selected.length === 0 ? "What are you studying?"
    : selected.length === 1 ? (subjects.find(s => s.id === selected[0])?.text ?? "Nice choice!")
    : selected.length === 2 ? "Good combo."
    : "Okay. You're not playing."

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={60} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 160px", overflowY: "auto" }}>
          <MascotRow src={foxSrc} dialogue={dialogue} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subjects.map(subject => {
              const isSel = selected.includes(subject.id)
              return (
                <button key={subject.id} style={s.optionCard(isSel)} onClick={() => toggle(subject.id)}
                  onMouseEnter={() => setHovering(subject.id)} onMouseLeave={() => setHovering(null)}>
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
    </div>
  )
}

function SubjectReaction({ selected, onNext }: { selected: string[]; onNext: () => void }) {
  const [foxSrc, setFoxSrc]             = useState(FOX.peeking)
  const [foxY, setFoxY]                 = useState(110)
  const [foxScale, setFoxScale]         = useState(0.85)
  const [textPhase, setTextPhase]       = useState<"hidden"|"in"|"visible"|"out">("hidden")
  const [chipPhase, setChipPhase]       = useState<"hidden"|"in"|"visible">("hidden")
  const [visibleChips, setVisibleChips] = useState<number>(0)
  const [bgFlash, setBgFlash]           = useState(false)
  const onNextRef = useRef(onNext)
  useEffect(() => { onNextRef.current = onNext }, [onNext])

  useEffect(() => {
    // Fox slides up with spring overshoot
    const t1 = setTimeout(() => { setFoxY(0); setFoxScale(1) }, 80)
    // Headline fades+slides in
    const t2 = setTimeout(() => setTextPhase("in"), 700)
    const t3 = setTimeout(() => setTextPhase("visible"), 1100)
    // Fox reacts
    const t4 = setTimeout(() => { setFoxSrc(FOX.surprised); setBgFlash(true) }, 1400)
    const t5 = setTimeout(() => setBgFlash(false), 1700)
    // Chips stagger in one by one
    const t6 = setTimeout(() => setChipPhase("in"), 1600)
    const t7 = setTimeout(() => setVisibleChips(1), 1700)
    const t8 = setTimeout(() => setVisibleChips(2), 2000)
    const t9 = setTimeout(() => setVisibleChips(3), 2300)
    // Fox settles
    const t10 = setTimeout(() => setFoxSrc(FOX.excited), 3200)
    // Text fades out
    const t11 = setTimeout(() => setTextPhase("out"), 4200)
    const t12 = setTimeout(() => { setFoxSrc(FOX.happy); onNextRef.current() }, 5200)
    return () => [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12].forEach(clearTimeout)
  }, [])

  const textStyle: React.CSSProperties = {
    fontSize: 36, fontWeight: 800, color: BLACK, margin: 0,
    fontFamily: "'Quicksand', sans-serif",
    transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    opacity: textPhase === "visible" ? 1 : 0,
    transform: textPhase === "in" || textPhase === "visible" ? "translateY(0px)" : textPhase === "out" ? "translateY(-16px)" : "translateY(24px)",
  }

  return (
    <div style={{ ...s.page, justifyContent: "center", transition: "background 0.2s", background: bgFlash ? YELLOW : BG }}>
      <div style={{ width: "100%", maxWidth: CONTENT_MAX, padding: "0 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 28, zIndex: 10 }}>
        <h1 style={textStyle}>Good combo.</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {selected.slice(0, 3).map((id, i) => {
            const subj = subjects.find(s => s.id === id)
            const visible = i < visibleChips
            return subj ? (
              <span key={id} style={{
                background: i === 0 ? YELLOW : i === 1 ? "#FFE0D6" : "#D6F0FF",
                border: `2.5px solid ${BLACK}`,
                borderBottom: `4px solid ${BLACK}`,
                borderRadius: 99, padding: "10px 20px",
                fontWeight: 800, fontSize: 15, color: BLACK,
                fontFamily: "'Quicksand', sans-serif",
                transition: "opacity 0.35s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.85)",
                display: "inline-block",
              }}>
                {subj.name}
              </span>
            ) : null
          })}
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: -60, left: "50%",
        transform: `translateX(-50%) translateY(${foxY}%) scale(${foxScale})`,
        transition: "transform 1.4s cubic-bezier(0.34,1.56,0.64,1)",
        width: 300, height: 300, zIndex: 5,
      }}>
        <img src={foxSrc} alt="Rex" style={{ width: "100%", height: "auto", objectFit: "contain", transition: "opacity 0.25s" }} />
      </div>
    </div>
  )
}

const goals = [
  { id: "grades",  name: "Improve Grades",     icon: "trending_up", text: "Got it. Grades first." },
  { id: "faster",  name: "Study Faster",        icon: "edit_note",        text: "Speed + retention. Let's go." },
  { id: "habits",  name: "Build Habits",        icon: "autorenew",   text: "Habits over motivation. Smart." },
  { id: "college", name: "Prepare for College", icon: "school",      text: "College bound. Big move." },
  { id: "skill",   name: "Learn a Skill",       icon: "psychology",  text: "Always learning. Love that." },
]

function GoalSelection({ onNext, onBack }: { onNext: (goal: string) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovering, setHovering] = useState<string | null>(null)

  const foxSrc  = hovering ? FOX.thinking : selected ? FOX.happy : FOX.neutral
  const dialogue = selected ? (goals.find(g => g.id === selected)?.text ?? "Got it.") : "What's your main goal?"

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={80} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 120px", overflowY: "auto" }}>
          <MascotRow src={foxSrc} dialogue={dialogue} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {goals.map(goal => {
              const isSel = selected === goal.id
              return (
                <button key={goal.id} style={s.optionCard(isSel)}
                  onClick={() => {
                    playPop();
                    setSelected(isSel ? null : goal.id);
                  }}
                  onMouseEnter={() => setHovering(goal.id)} onMouseLeave={() => setHovering(null)}>
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
    </div>
  )
}

function GoalReaction({ goal, onNext }: { goal: string; onNext: () => void }) {
  const [foxSrc, setFoxSrc]         = useState(FOX.peeking)
  const [foxY, setFoxY]             = useState(110)
  const [foxScale, setFoxScale]     = useState(0.85)
  const [line1Phase, setLine1Phase] = useState<"hidden"|"in"|"out">("hidden")
  const [line2Phase, setLine2Phase] = useState<"hidden"|"in"|"out">("hidden")
  const [line3Phase, setLine3Phase] = useState<"hidden"|"in"|"out">("hidden")
  const [chipVisible, setChipVisible] = useState(false)
  const [bgFlash, setBgFlash]       = useState(false)
  const onNextRef = useRef(onNext)
  useEffect(() => { onNextRef.current = onNext }, [onNext])

  const goalName = goals.find(g => g.id === goal)?.name ?? "Your Goal"

  const phaseStyle = (phase: "hidden"|"in"|"out"): React.CSSProperties => ({
    transition: "opacity 0.45s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    opacity: phase === "in" ? 1 : 0,
    transform: phase === "hidden" ? "translateY(20px) scale(0.95)" : phase === "out" ? "translateY(-20px) scale(0.95)" : "translateY(0) scale(1)",
  })

  useEffect(() => {
    const t1  = setTimeout(() => { setFoxY(0); setFoxScale(1) }, 80)
    const t2  = setTimeout(() => setLine1Phase("in"), 700)
    const t3  = setTimeout(() => setChipVisible(true), 1000)
    const t4  = setTimeout(() => { setFoxSrc(FOX.thinking); setBgFlash(true) }, 1200)
    const t5  = setTimeout(() => setBgFlash(false), 1500)
    const t6  = setTimeout(() => setLine1Phase("out"), 2000)
    const t7  = setTimeout(() => setLine2Phase("in"), 2400)
    const t8  = setTimeout(() => { setFoxSrc(FOX.surprised) }, 2600)
    const t9  = setTimeout(() => setLine2Phase("out"), 3600)
    const t10 = setTimeout(() => { setChipVisible(false); setLine3Phase("in") }, 4000)
    const t11 = setTimeout(() => setFoxSrc(FOX.excited), 4100)
    const t12 = setTimeout(() => { setFoxSrc(FOX.happy); onNextRef.current() }, 5600)
    return () => [t1,t2,t3,t4,t5,t6,t7,t8,t9,t10,t11,t12].forEach(clearTimeout)
  }, [])

  return (
    <div style={{ ...s.page, justifyContent: "center", transition: "background 0.25s", background: bgFlash ? "#FFF0D6" : BG }}>
      <div style={{ width: "100%", maxWidth: CONTENT_MAX, padding: "0 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, zIndex: 10, minHeight: 160, justifyContent: "center" }}>

        <div style={{ textAlign: "center", position: "relative", minHeight: 52 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: BLACK, margin: 0, fontFamily: "'Quicksand', sans-serif", position: "absolute", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", ...phaseStyle(line1Phase) }}>Noted.</h1>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: BLACK, margin: 0, fontFamily: "'Quicksand', sans-serif", position: "absolute", left: "50%", transform: `translateX(-50%) ${line2Phase === "hidden" ? "translateY(20px) scale(0.95)" : line2Phase === "out" ? "translateY(-20px) scale(0.95)" : "translateY(0) scale(1)"}`, opacity: line2Phase === "in" ? 1 : 0, transition: "opacity 0.45s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)", whiteSpace: "nowrap" }}>We'll make it work.</h1>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: BLACK, margin: 0, fontFamily: "'Quicksand', sans-serif", position: "absolute", left: "50%", transform: `translateX(-50%) ${line3Phase === "hidden" ? "translateY(20px) scale(0.95)" : "translateY(0) scale(1)"}`, opacity: line3Phase === "in" ? 1 : 0, transition: "opacity 0.45s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)", whiteSpace: "nowrap" }}>Let's keep going.</h1>
          {/* spacer so container doesn't collapse */}
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, visibility: "hidden", whiteSpace: "nowrap" }}>We'll make it work.</h1>
        </div>

        <div style={{
          transition: "opacity 0.4s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          opacity: chipVisible ? 1 : 0,
          transform: chipVisible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.9)",
        }}>
          <span style={{ display: "inline-block", background: YELLOW, border: `2.5px solid ${BLACK}`, borderBottom: `4px solid ${BLACK}`, borderRadius: 9999, padding: "10px 24px", fontWeight: 800, fontSize: 15, color: BLACK, fontFamily: "'Quicksand', sans-serif" }}>
            {goalName}
          </span>
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: -60, left: "50%",
        transform: `translateX(-50%) translateY(${foxY}%) scale(${foxScale})`,
        transition: "transform 1.4s cubic-bezier(0.34,1.56,0.64,1)",
        width: 300, height: 300, zIndex: 5,
      }}>
        <img src={foxSrc} alt="Rex" style={{ width: "100%", height: "auto", objectFit: "contain", transition: "opacity 0.25s" }} />
      </div>
    </div>
  )
}

const learningStyles = [
  { id: "visual",     label: "Visual",         icon: "visibility",    text: "I see what you mean!" },
  { id: "tests",      label: "Practice Tests", icon: "content_paste", text: "Practice makes perfect." },
  { id: "flashcards", label: "Flashcards",     icon: "dynamic_feed",  text: "Flipping good choice." },
  { id: "reading",    label: "Reading",        icon: "menu_book",     text: "Bookworm mode: ON." },
  { id: "listening",  label: "Listening",      icon: "headphones",    text: "Loud and clear." },
  { id: "mixed",      label: "Mixed",          icon: "shuffle",       text: "A little bit of everything." },
]

function LearningStyle({ onNext, onBack }: { onNext: (styles: string[]) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([])
  const [hovering, setHovering] = useState(false)

  const toggle = (id: string) => {
    playPop();
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const foxSrc  = hovering ? FOX.thinking : selected.length > 0 ? FOX.excited : FOX.neutral
  const dialogue = selected.length > 0
    ? (learningStyles.find(s => s.id === selected[selected.length - 1])?.text ?? "How do you learn best?")
    : "How do you learn best?"

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={80} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 160px", overflowY: "auto" }}>
          <MascotRow src={foxSrc} dialogue={dialogue} subtitle="Select all that apply." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
            {learningStyles.map(style => {
              const isSel = selected.includes(style.id)
              return (
                <label key={style.id}
                  onMouseEnter={() => setHovering(true)}
                  onMouseLeave={() => setHovering(false)}
                  style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 120, border: `2.5px solid ${BLACK}`, borderRadius: 14, cursor: "pointer", padding: 16, boxSizing: "border-box", background: isSel ? YELLOW : SURFACE, boxShadow: isSel ? "inset 0 2px 6px rgba(0,0,0,0.15)" : `0 3px 0 ${BLACK}`, transform: isSel ? "scale(0.97)" : "scale(1)", transition: "all 0.15s ease" }}>
                  <input type="checkbox" checked={isSel} onChange={() => toggle(style.id)} style={{ position: "absolute", opacity: 0, height: 0, width: 0 }} />
                  <div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, border: `2px solid ${BLACK}`, borderRadius: "50%", background: isSel ? BLACK : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isSel && <svg fill="none" height="11" viewBox="0 0 11 11" width="11"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>}
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, marginBottom: 8, color: BLACK }}>{style.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: BLACK }}>{style.label}</span>
                </label>
              )
            })}
          </div>
        </main>
        <BottomBar onSkip={() => onNext([])} onContinue={() => onNext(selected)} />
      </div>
    </div>
  )
}

function ExamTargetStep({
  onNext,
  onBack,
  selectedSubjects,
}: {
  onNext: (target: ExamTarget | null) => void;
  onBack: () => void;
  selectedSubjects: string[];
}) {
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subject, setSubject] = useState(selectedSubjects[0] || "other");

  const todayStr = new Date().toISOString().split("T")[0];
  const PRESET_CHIPS = ["Midterm", "Finals", "Unit Test", "SAT / ACT", "AP Exam"];

  const handleChipClick = (chip: string) => {
    playPop();
    const primarySubName = SUBJECT_METADATA[subject]?.name || "Exam";
    setExamTitle(`${primarySubName} ${chip}`);
  };

  const handleContinue = () => {
    if (!examTitle.trim() || !examDate) {
      onNext(null);
      return;
    }
    playSuccess();
    onNext({
      examTitle: examTitle.trim(),
      examDate,
      subject,
    });
  };

  const handleSkip = () => {
    playTap();
    onNext(null);
  };

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={95} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 160px", overflowY: "auto" }}>
          <MascotRow
            src={examTitle ? FOX.excited : FOX.peeking}
            dialogue={examTitle ? `Locked in! Rex will track ${examTitle}.` : "Got an upcoming exam or test?"}
            subtitle="Optional — we'll set up your live countdown & readiness tracker."
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.6, marginBottom: 8 }}>
                Quick Exam Types
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRESET_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: `2px solid ${BLACK}`,
                      background: examTitle.includes(chip) ? YELLOW : WHITE,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                      boxShadow: `2px 2px 0px ${BLACK}`,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.6, marginBottom: 6 }}>
                Exam Title
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. Biology Midterm, Calculus Final"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `2.5px solid ${BLACK}`,
                  background: WHITE,
                  fontSize: 14,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.6, marginBottom: 6 }}>
                Target Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `2.5px solid ${BLACK}`,
                  background: WHITE,
                  fontSize: 14,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.6, marginBottom: 6 }}>
                Subject Category
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `2.5px solid ${BLACK}`,
                  background: WHITE,
                  fontSize: 14,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              >
                {Object.entries(SUBJECT_METADATA).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </main>
        <BottomBar
          onSkip={handleSkip}
          onContinue={handleContinue}
          continueLabel={examTitle && examDate ? "Set Target" : "Continue"}
        />
      </div>
    </div>
  );
}

function FinalTransition({
  onDone,
  userName,
  selectedSubjects,
  selectedGoal,
  selectedStyles,
  examTarget,
}: {
  onDone: () => void;
  userName: string;
  selectedSubjects: string[];
  selectedGoal: string;
  selectedStyles: string[];
  examTarget?: ExamTarget | null;
}) {
  const { refreshProfile, completeOnboarding } = useAuth()
  const [foxSrc, setFoxSrc]               = useState(FOX.peeking)
  const [foxY, setFoxY]                   = useState(110)
  const [foxScale, setFoxScale]           = useState(0.85)
  const [headlineKey, setHeadlineKey]     = useState(0)
  const [headline, setHeadline]           = useState("")
  const [headlinePhase, setHeadlinePhase] = useState<"hidden"|"in"|"out">("hidden")
  const [subVisible, setSubVisible]       = useState(false)
  const [checklistVisible, setChecklistVisible] = useState(false)
  const [checks, setChecks]               = useState([false,false,false,false])
  const [progressWidth, setProgressWidth] = useState(0)
  const [progressVisible, setProgressVisible] = useState(false)
  const [bgColor, setBgColor]             = useState(BG)

  // Save name, preferences + mark onboarding complete
  const markComplete = async () => {
    const session = getCachedSession()
    const userId = session?.user?.id
    const dailyMinutes = GOAL_METADATA[selectedGoal]?.dailyMinutes || 30

    const prefs: UserStudyPreferences = {
      name: userName || session?.user?.user_metadata?.full_name || "Scholar",
      subjects: selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : ["other"],
      goal: selectedGoal || "grades",
      learningStyles: selectedStyles && selectedStyles.length > 0 ? selectedStyles : ["mixed"],
      dailyGoalMinutes: dailyMinutes,
      completedAt: new Date().toISOString(),
      examTarget: examTarget || null,
    }

    saveUserPreferences(prefs, userId)

    // Generate initial tailored quest log for the user's checklist
    const smartQuests = generateSmartQuests(prefs)
    try {
      localStorage.setItem("pz_checklist", JSON.stringify(smartQuests))
      if (userId) {
        localStorage.setItem(`pz_${userId}_checklist`, JSON.stringify(smartQuests))
      }
    } catch {}

    if (!session) return
    await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        email: session.user.email,
        full_name: userName || session.user.user_metadata?.full_name || session.user.user_metadata?.name || "",
        daily_goal_minutes: dailyMinutes,
        avatar_config: {
          study_preferences: prefs,
        },
        onboarding_complete: true,
      }, { onConflict: "id" })
  }

  const showLine = (text: string, delay: number, outDelay: number) => {
    setTimeout(() => {
      setHeadline(text)
      setHeadlineKey(k => k + 1)
      setHeadlinePhase("hidden")
      setTimeout(() => setHeadlinePhase("in"), 40)
    }, delay)
    if (outDelay > 0) setTimeout(() => setHeadlinePhase("out"), outDelay)
  }

  useEffect(() => {
    const t1  = setTimeout(() => { setFoxY(0); setFoxScale(1) }, 80)
    showLine("Got your style.", 700, 2600)
    const t3  = setTimeout(() => setFoxSrc(FOX.thinking), 2200)
    showLine("We'll teach your way.", 3200, 4800)
    const t5  = setTimeout(() => { setFoxSrc(FOX.surprised); setBgColor(YELLOW) }, 3400)
    const t6  = setTimeout(() => setBgColor(BG), 3900)
    showLine("Building your setup...", 5400, 0)
    const t7  = setTimeout(() => setFoxSrc(FOX.neutral), 5400)
    const t8  = setTimeout(() => { setChecklistVisible(true); setProgressVisible(true) }, 6800)
    const t8b = setTimeout(() => setProgressWidth(85), 6900)
    const t9  = setTimeout(() => { setChecks(c => [true,...c.slice(1)]); playPop(1.1); }, 7300)
    const t10 = setTimeout(() => { setChecks(c => [c[0],true,...c.slice(2)]); playPop(1.2); }, 8200)
    const t11 = setTimeout(() => { setChecks(c => [...c.slice(0,2),true,c[3]]); setFoxSrc(FOX.excited); playPop(1.3); }, 9100)
    const t12 = setTimeout(() => { setChecks(c => [...c.slice(0,3),true]); playSuccess(); }, 10000)
    const t13 = setTimeout(() => { setHeadlinePhase("out"); }, 10800)
    const t14 = setTimeout(() => setChecklistVisible(false), 11200)
    const t15 = setTimeout(() => { setProgressWidth(100); setBgColor(YELLOW) }, 11600)
    const t16 = setTimeout(() => setBgColor(BG), 12200)
    showLine("You're all set.", 11800, 0)
    const t17 = setTimeout(() => setHeadlinePhase("in"), 11840)
    const t18 = setTimeout(() => { setProgressVisible(false); setSubVisible(true) }, 13000)
    const t19 = setTimeout(() => { setFoxSrc(FOX.happy); playCelebration(); }, 13200)
    // Start the DB write early, then navigate after it completes.
    // IMPORTANT: Always navigate regardless of whether refreshProfile()
    // succeeds — a stale profile is fine, the dashboard will re-fetch.
    const t20 = setTimeout(async () => {
      try {
        await markComplete()
      } catch (e) {
        console.error("[onboarding] markComplete failed:", e)
      }
      completeOnboarding()
      // Navigate immediately — don't wait for refreshProfile which can
      // hit the auth lock and stall forever
      onDone()
      // Best-effort profile refresh in the background after navigation
      try { await refreshProfile() } catch {}
    }, 14500)
    // Hard deadline: if something above stalls for > 18s, navigate anyway
    const tFallback = setTimeout(() => { completeOnboarding(); onDone() }, 18000)
    return () => [t1,t3,t5,t6,t7,t8,t8b,t9,t10,t11,t12,t13,t14,t15,t16,t17,t18,t19,t20,tFallback].forEach(clearTimeout)
  }, [])

  const checkItems = ["Preparing Rex Tutor", "Creating Practice Tests", "Building Study Roadmap", "Personalizing Recommendations"]

  return (
    <div style={{ ...s.page, justifyContent: "center", transition: "background 0.4s ease", background: bgColor }}>
      <div style={{ width: "100%", maxWidth: CONTENT_MAX, padding: "0 24px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 10, gap: 32 }}>

        {/* Animated headline */}
        <div style={{ textAlign: "center", minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h1 key={headlineKey} style={{
            fontSize: 36, fontWeight: 800, color: BLACK, margin: "0 0 6px",
            fontFamily: "'Quicksand', sans-serif",
            transition: "opacity 0.45s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: headlinePhase === "in" ? 1 : 0,
            transform: headlinePhase === "hidden" ? "translateY(22px) scale(0.94)" : headlinePhase === "out" ? "translateY(-18px) scale(0.94)" : "translateY(0) scale(1)",
          }}>{headline}</h1>
          <p style={{
            fontSize: 16, color: BLACK, margin: 0, fontFamily: "'Quicksand', sans-serif",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            opacity: subVisible ? 0.6 : 0,
            transform: subVisible ? "translateY(0)" : "translateY(10px)",
          }}>Your journey starts now.</p>
        </div>

        {/* Checklist with stagger */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0 }}>
          {checklistVisible && checkItems.map((item, i) => (
            <div key={item} style={{
              display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
              transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              opacity: checks[i] ? 1 : 0,
              transform: checks[i] ? "translateX(0) scale(1)" : "translateX(-16px) scale(0.97)",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: checks[i] ? BLACK : "transparent",
                border: `2.5px solid ${BLACK}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.3s ease",
                boxShadow: checks[i] ? `2px 2px 0 ${BLACK}` : "none",
              }}>
                <svg fill="none" height="12" viewBox="0 0 12 12" width="12"><path d="M2 6l3 3 5-5" stroke={WHITE} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"/></svg>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: BLACK, fontFamily: "'Quicksand', sans-serif" }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {progressVisible && (
          <div style={{ width: "100%", position: "relative" }}>
            <div style={{ width: "100%", height: 8, background: SURFACE, border: `2px solid ${BLACK}`, borderRadius: 9999, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: BLACK, borderRadius: 9999,
                width: `${progressWidth}%`, transition: "width 2.5s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>

          </div>
        )}
      </div>

      {/* Fox */}
      <div style={{
        position: "absolute", bottom: -60, left: "50%",
        transform: `translateX(-50%) translateY(${foxY}%) scale(${foxScale})`,
        transition: "transform 1.6s cubic-bezier(0.34,1.56,0.64,1)",
        width: 280, height: 280, zIndex: 5, pointerEvents: "none",
      }}>
        <img src={foxSrc} alt="Rex" style={{ width: "100%", height: "auto", objectFit: "contain", transition: "opacity 0.3s" }} />
      </div>
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { session, user } = useAuth()
  const location = useLocation();

  // ── Read ?step synchronously so the correct screen renders on frame 1.
  const [screen, setScreen] = useState<Screen>(() => {
    const p = new URLSearchParams(location.search)
    if (p.get("step") === "nameInput") return "nameInput"
    return "intro"
  })

  const [userName, setUserName]                 = useState("")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedGoal, setSelectedGoal]         = useState("")
  const [selectedStyles, setSelectedStyles]     = useState<string[]>([])
  const [selectedExamTarget, setSelectedExamTarget] = useState<ExamTarget | null>(null)

  const go = (s: Screen) => setScreen(s)

  useEffect(() => {
    // Clean URL params immediately so refresh doesn't re-trigger
    const params = new URLSearchParams(location.search)
    if (params.toString()) {
      navigate("/onboarding", { replace: true })
    }
  }, [])

  // Reactive auth check: if user is logged in, redirect them to dashboard (or nameInput)
  useEffect(() => {
    // Preload fox images for smooth animations
    Object.values(FOX).forEach(src => {
      const img = new Image();
      img.src = src;
    });

    if (!user || !session) return

    // If currently progressing through the onboarding questionnaire steps, don't interrupt
    if (screen !== "intro") {
      return
    }

    let isMounted = true
    supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (!isMounted) return
        if (profile?.onboarding_complete === false) {
          setScreen("nameInput")
        } else {
          navigate("/dashboard", { replace: true })
        }
      })
      .catch(() => {
        if (isMounted) navigate("/dashboard", { replace: true })
      })

    return () => { isMounted = false }
  }, [user, session, screen, navigate])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: ${BG}; }
        @keyframes pulse {
          0%   { box-shadow: 4px 4px 0px 0px #1A1A1A; }
          50%  { box-shadow: 6px 6px 0px 0px #FF4D2E; }
          100% { box-shadow: 4px 4px 0px 0px #1A1A1A; }
        }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      {screen === "intro"            && <IntroHook onNext={() => go("nameInput")} />}
      {screen === "nameInput"        && <NameInput onNext={n => { setUserName(n); go("subjectSelection") }} onBack={() => go("intro")} />}
      {screen === "subjectSelection" && <SubjectSelection onNext={s => { setSelectedSubjects(s); go("subjectReaction") }} onBack={() => go("nameInput")} />}
      {screen === "subjectReaction"  && <SubjectReaction selected={selectedSubjects} onNext={() => go("goalSelection")} />}
      {screen === "goalSelection"    && <GoalSelection onNext={g => { setSelectedGoal(g); go("goalReaction") }} onBack={() => go("subjectSelection")} />}
      {screen === "goalReaction"     && <GoalReaction goal={selectedGoal} onNext={() => go("learningStyle")} />}
      {screen === "learningStyle"    && <LearningStyle onNext={s => { setSelectedStyles(s); go("examTarget") }} onBack={() => go("goalSelection")} />}
      {screen === "examTarget"       && (
        <ExamTargetStep
          onNext={t => { setSelectedExamTarget(t); go("finalTransition") }}
          onBack={() => go("learningStyle")}
          selectedSubjects={selectedSubjects}
        />
      )}
      {screen === "finalTransition"  && (
        <FinalTransition
          onDone={() => navigate("/dashboard", { replace: true })}
          userName={userName}
          selectedSubjects={selectedSubjects}
          selectedGoal={selectedGoal}
          selectedStyles={selectedStyles}
          examTarget={selectedExamTarget}
        />
      )}
    </>
  )
}

