import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getCachedSession } from "@/lib/authSession";
import {
  saveUserPreferences,
  generateSmartQuests,
  GOAL_METADATA,
  SUBJECT_METADATA,
  type ExamTarget,
  type UserStudyPreferences,
} from "@/lib/userPreferences";
import { playPop, playTap, playSuccess, playCelebration, triggerHaptic } from "@/lib/soundFX";
import { AnimatedRex, type RexState } from "@/components/AnimatedRex";

type Screen =
  | "intro"
  | "nameInput"
  | "subjectSelection"
  | "goalSelection"
  | "firstWinChallenge"
  | "learningStyle"
  | "examTarget"
  | "finalTransition";

// Neobrutalist Palette
const BG          = "#FFFBEA";
const SURFACE     = "#F0EDE0";
const BLACK       = "#1A1A1A";
const CTA         = "#FF4D2E";
const YELLOW      = "#FFE566";
const GREEN       = "#10B981";
const GREEN_LIGHT = "#D1FAE5";
const WHITE       = "#FFFFFF";

const HEADER_MAX  = 800;
const CONTENT_MAX = 430;

const s = {
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
  header: {
    height: 54,
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
    padding: "6px",
    cursor: "pointer",
    fontSize: 24,
    color: BLACK,
    fontFamily: "Material Symbols Outlined",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  headerSkipBtn: {
    background: "transparent",
    border: "none",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    color: BLACK,
    opacity: 0.7,
    fontFamily: "'Quicksand', sans-serif",
  },
  progressBar: {
    flex: 1,
    height: 8,
    background: "rgba(26,26,26,0.08)",
    borderRadius: 9999,
    overflow: "hidden",
    border: `1.5px solid ${BLACK}`,
  },
  progressFill: (pct: number) => ({
    width: `${pct}%`,
    height: "100%",
    background: CTA,
    borderRadius: 9999,
    transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
  }),
  content: {
    maxWidth: CONTENT_MAX,
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    position: "relative" as const,
    background: BG,
    boxSizing: "border-box" as const,
  },
  bottomBar: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: CONTENT_MAX,
    display: "flex",
    gap: 12,
    padding: "16px 20px calc(16px + env(safe-area-inset-bottom))",
    background: BG,
    borderTop: `2px solid ${BLACK}`,
    zIndex: 50,
    boxSizing: "border-box" as const,
  },
  skipBtn: {
    padding: "14px 18px",
    borderRadius: 16,
    color: BLACK,
    fontWeight: 700,
    fontSize: 15,
    border: `2px solid ${BLACK}`,
    borderBottom: `4px solid ${BLACK}`,
    background: WHITE,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontFamily: "'Quicksand', sans-serif",
    transition: "all 0.1s ease",
  },
  continueBtn: {
    flex: 1,
    padding: "15px 0",
    borderRadius: 16,
    background: CTA,
    color: WHITE,
    fontWeight: 800,
    fontSize: 16,
    border: `2.5px solid ${BLACK}`,
    borderBottom: `5px solid ${BLACK}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontFamily: "'Quicksand', sans-serif",
    boxShadow: `0 3px 0 rgba(0,0,0,0.15)`,
    transition: "all 0.1s ease",
  },
  continueBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    borderBottom: `2.5px solid ${BLACK}`,
    transform: "none",
    boxShadow: "none",
  },
  continueBtnSuccess: {
    flex: 1,
    padding: "15px 0",
    borderRadius: 16,
    background: GREEN,
    color: WHITE,
    fontWeight: 800,
    fontSize: 16,
    border: `2.5px solid ${BLACK}`,
    borderBottom: `5px solid ${BLACK}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontFamily: "'Quicksand', sans-serif",
    boxShadow: `0 3px 0 rgba(0,0,0,0.15)`,
    transition: "all 0.1s ease",
  },
  mascotBubble: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    gap: 14,
    padding: "10px 0 16px",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  speechBubble: {
    position: "relative" as const,
    background: WHITE,
    border: `2.5px solid ${BLACK}`,
    borderRadius: 18,
    padding: "12px 16px",
    flex: 1,
    boxShadow: `0 3px 0 ${BLACK}`,
  },
  speechTailBorder: {
    position: "absolute" as const,
    left: -10,
    top: 22,
    width: 0,
    height: 0,
    borderTop: "7px solid transparent",
    borderBottom: "7px solid transparent",
    borderRight: `10px solid ${BLACK}`,
  },
  speechTailFill: {
    position: "absolute" as const,
    left: -7,
    top: 22,
    width: 0,
    height: 0,
    borderTop: "7px solid transparent",
    borderBottom: "7px solid transparent",
    borderRight: `10px solid ${WHITE}`,
  },
  optionCard: (selected: boolean) => ({
    width: "100%",
    padding: "14px 16px",
    border: `2.5px solid ${BLACK}`,
    borderBottom: selected ? `2.5px solid ${BLACK}` : `4.5px solid ${BLACK}`,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    background: selected ? YELLOW : WHITE,
    transform: selected ? "translateY(2px)" : "translateY(0)",
    boxShadow: selected ? "none" : `0 2px 0 rgba(0,0,0,0.1)`,
    transition: "all 0.12s cubic-bezier(0.2, 0, 0, 1)",
    fontFamily: "'Quicksand', sans-serif",
    textAlign: "left" as const,
    boxSizing: "border-box" as const,
  }),
  challengeCard: {
    width: "100%",
    padding: "14px 16px",
    border: `2.5px solid ${BLACK}`,
    borderBottom: `4.5px solid ${BLACK}`,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    background: WHITE,
    transition: "all 0.15s ease",
    fontFamily: "'Quicksand', sans-serif",
    textAlign: "left" as const,
    boxSizing: "border-box" as const,
  },
  challengeCardCorrect: {
    background: GREEN_LIGHT,
    borderColor: BLACK,
    borderBottom: `2.5px solid ${BLACK}`,
    transform: "translateY(2px)",
  },
  challengeCardIncorrect: {
    background: "#FEE2E2",
    borderColor: BLACK,
    borderBottom: `2.5px solid ${BLACK}`,
    transform: "translateY(2px)",
  },
  challengeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: SURFACE,
    border: `2px solid ${BLACK}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  celebrationDrawer: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: CONTENT_MAX,
    background: GREEN_LIGHT,
    borderTop: `2.5px solid ${BLACK}`,
    padding: "18px 20px calc(20px + env(safe-area-inset-bottom))",
    zIndex: 60,
    boxSizing: "border-box" as const,
    boxShadow: "0 -4px 12px rgba(0,0,0,0.06)",
  },
  celebrationBadge: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: GREEN,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px solid ${BLACK}`,
  },
};

function Header({
  progress,
  onBack,
  onSkip,
}: {
  progress?: number;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  return (
    <header style={s.header}>
      <div style={s.headerInner}>
        {onBack ? (
          <button
            style={s.backBtn}
            onClick={() => {
              playTap();
              onBack();
            }}
            aria-label="Go back"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
              arrow_back
            </span>
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
        {progress !== undefined && (
          <div style={s.progressBar}>
            <div style={s.progressFill(progress)} />
          </div>
        )}
        {onSkip ? (
          <button
            onClick={() => {
              playTap();
              onSkip();
            }}
            style={s.headerSkipBtn}
          >
            Skip
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>
    </header>
  );
}

function MascotBubble({
  mood = "idle",
  dialogue,
  subtitle,
}: {
  mood?: RexState;
  dialogue: string;
  subtitle?: string;
}) {
  return (
    <div style={s.mascotBubble}>
      <div style={{ flexShrink: 0 }}>
        <AnimatedRex size="md" state={mood} interactive={true} />
      </div>
      <div style={s.speechBubble}>
        <div style={s.speechTailBorder} />
        <div style={s.speechTailFill} />
        <p style={{ fontSize: 16, fontWeight: 800, color: BLACK, lineHeight: 1.3, margin: 0 }}>
          {dialogue}
        </p>
        {subtitle && (
          <p style={{ fontSize: 13, fontWeight: 600, color: BLACK, opacity: 0.6, marginTop: 4, marginBottom: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function BottomBar({
  onSkip,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
  continueLoading = false,
  variant = "cta",
}: {
  onSkip?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  variant?: "cta" | "success";
}) {
  return (
    <div style={s.bottomBar}>
      {onSkip && (
        <button
          style={s.skipBtn}
          onClick={() => {
            playTap();
            onSkip();
          }}
        >
          Skip
        </button>
      )}
      <button
        style={{
          ...(variant === "success" ? s.continueBtnSuccess : s.continueBtn),
          ...(continueDisabled ? s.continueBtnDisabled : {}),
        }}
        disabled={continueDisabled || continueLoading}
        onClick={() => {
          if (continueDisabled || continueLoading) return;
          playPop();
          triggerHaptic("medium");
          onContinue?.();
        }}
      >
        <span>{continueLoading ? "Please wait..." : continueLabel}</span>
        {!continueLoading && (
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_forward
          </span>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 1: Intro Hook with Animated Rex & Google Auth
// ─────────────────────────────────────────────────────────────────────────────
function IntroHook({ onNext }: { onNext: () => void }) {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % 3), 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        left: sliderRef.current.offsetWidth * slide,
        behavior: "smooth",
      });
    }
  }, [slide]);

  const handleAuth = async () => {
    // If the user is already authenticated in this session (e.g. testing onboarding),
    // smoothly advance directly to the onboarding questionnaire without kicking to dashboard!
    if (user && session) {
      playPop();
      onNext();
      return;
    }

    if ((import.meta.env.VITE_SUPABASE_URL || "").includes("your-project-id")) {
      onNext();
      return;
    }

    setLoading(true);
    setError(null);

    // Save intent to continue onboarding after returning from Google
    try {
      sessionStorage.setItem("post_auth_redirect", "/onboarding?step=nameInput");
    } catch {}

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

  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.user_metadata?.name?.split(" ")[0] ||
    "Scholar";

  return (
    <div style={s.page}>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: CONTENT_MAX,
          padding: "clamp(16px, 2.5vh, 28px) 24px clamp(16px, 2.5vh, 24px)",
          position: "relative",
          justifyContent: "space-between",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {/* Animated Rex Hero & Headline */}
        <div style={{ textAlign: "center", zIndex: 1, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Animated Rex Mascot Hero */}
          <div style={{ marginBottom: 4, cursor: "pointer" }} onClick={() => playPop(1.2)}>
            <AnimatedRex size="lg" state="idle" interactive={true} />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: YELLOW,
              border: `2px solid ${BLACK}`,
              borderRadius: 9999,
              padding: "3px 12px",
              marginBottom: 8,
              boxShadow: `2px 2px 0 ${BLACK}`,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: BLACK, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Studenius
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(26px, 6vw, 34px)",
              fontWeight: 800,
              color: BLACK,
              lineHeight: 1.15,
              margin: "4px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            Study Smarter.<br />Ace Your Classes.
          </h1>
          <p style={{ fontSize: 14, fontWeight: 600, color: BLACK, opacity: 0.65, margin: "6px 0 0" }}>
            The fun, active-recall study companion with Rex.
          </p>
        </div>

        {/* Carousel Feature Preview */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 0",
            minHeight: 0,
          }}
        >
          <div
            ref={sliderRef}
            style={{
              width: "100%",
              maxWidth: 340,
              display: "flex",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              scrollbarWidth: "none",
            }}
          >
            {/* Slide 1: Rex Tutor */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center", boxSizing: "border-box" }}>
              <div
                style={{
                  background: SURFACE,
                  border: `2.5px solid ${BLACK}`,
                  borderBottom: `5px solid ${BLACK}`,
                  borderRadius: 20,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span
                    style={{
                      background: YELLOW,
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 9999,
                      border: `1.5px solid ${BLACK}`,
                    }}
                  >
                    Rex AI Tutor
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: BLACK }}>
                    psychology
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      background: BLACK,
                      color: WHITE,
                      borderRadius: "14px 14px 4px 14px",
                      padding: "8px 12px",
                      maxWidth: "85%",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Break down Newton's 3rd Law
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
                  <div
                    style={{
                      background: WHITE,
                      color: BLACK,
                      border: `1.5px solid ${BLACK}`,
                      borderRadius: "4px 14px 14px 14px",
                      padding: "8px 12px",
                      maxWidth: "95%",
                      fontSize: 13,
                      lineHeight: 1.4,
                      fontWeight: 600,
                    }}
                  >
                    Every push creates an equal push back! When a swimmer kicks water back, water pushes them forward.
                  </div>
                </div>
              </div>
            </div>

            {/* Slide 2: Active Recall */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center", boxSizing: "border-box" }}>
              <div
                style={{
                  background: SURFACE,
                  border: `2.5px solid ${BLACK}`,
                  borderBottom: `5px solid ${BLACK}`,
                  borderRadius: 20,
                  padding: 16,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: YELLOW,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    border: `1.5px solid ${BLACK}`,
                    marginBottom: 10,
                  }}
                >
                  Active Recall Practice
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: BLACK, margin: "0 0 10px" }}>
                  What creates long-term exam retention?
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { text: "Testing yourself frequently", sel: true },
                    { text: "Passive re-reading", sel: false },
                  ].map((o) => (
                    <div
                      key={o.text}
                      style={{
                        background: o.sel ? GREEN_LIGHT : WHITE,
                        color: BLACK,
                        borderRadius: 10,
                        padding: "8px 12px",
                        border: `2px solid ${BLACK}`,
                        borderBottom: o.sel ? `2px solid ${BLACK}` : `3px solid ${BLACK}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <span>{o.text}</span>
                      {o.sel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: GREEN }}>check</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide 3: Smart Roadmap */}
            <div style={{ flex: "0 0 100%", padding: 4, scrollSnapAlign: "center", boxSizing: "border-box" }}>
              <div
                style={{
                  background: SURFACE,
                  border: `2.5px solid ${BLACK}`,
                  borderBottom: `5px solid ${BLACK}`,
                  borderRadius: 20,
                  padding: 16,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: YELLOW,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 9999,
                    border: `1.5px solid ${BLACK}`,
                    marginBottom: 10,
                  }}
                >
                  Personalized Study Sprints
                </span>
                <p style={{ fontSize: 14, fontWeight: 700, color: BLACK, margin: "0 0 8px", lineHeight: 1.3 }}>
                  No more aimless cramming. Turn lecture notes into smart flashcards and 15-minute daily wins.
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {["Spaced Repetition", "1v1 Duels", "Daily Streak"].map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: WHITE,
                        border: `1.5px solid ${BLACK}`,
                        borderRadius: 9999,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === slide ? 22 : 9,
                  height: 9,
                  borderRadius: 9999,
                  background: i === slide ? CTA : "rgba(26,26,26,0.2)",
                  border: `1.5px solid ${BLACK}`,
                  padding: 0,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions — Single Primary Button */}
        <div style={{ zIndex: 10, marginTop: "auto", flexShrink: 0, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          {error && (
            <div
              style={{
                background: "#FFF0F0",
                border: `2px solid ${CTA}`,
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 12,
                color: CTA,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Primary Action: Google Auth */}
          <button
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: "100%",
              height: 54,
              background: WHITE,
              color: BLACK,
              fontWeight: 800,
              fontSize: 16,
              borderRadius: 16,
              border: `2.5px solid ${BLACK}`,
              borderBottom: `5px solid ${BLACK}`,
              cursor: loading ? "default" : "pointer",
              fontFamily: "'Quicksand', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: loading ? 0.7 : 1,
              boxSizing: "border-box",
              boxShadow: `0 3px 0 rgba(0,0,0,0.15)`,
              transition: "all 0.1s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>
              {loading
                ? "Connecting..."
                : user
                ? `Continue as ${displayName}`
                : "Continue with Google"}
            </span>
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: BLACK, opacity: 0.5, margin: "4px 0 0", fontWeight: 600 }}>
            By continuing, you agree to our <a href="/terms" style={{ color: BLACK, fontWeight: 700, textDecoration: "underline" }}>Terms</a>
          </p>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 2: Name Input
// ─────────────────────────────────────────────────────────────────────────────
function NameInput({
  onNext,
  onBack,
  initialName = "",
}: {
  onNext: (name: string) => void;
  onBack: () => void;
  initialName?: string;
}) {
  const [name, setName] = useState(initialName);

  const mood: RexState = name.trim().length > 1 ? "excited" : "idle";
  const dialogue = name.trim().length > 1
    ? `${name.trim()}! Awesome name.`
    : "Hey! What should Rex call you?";

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={15} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 140px", overflowY: "auto" }}>
          <MascotBubble
            mood={mood}
            dialogue={dialogue}
            subtitle="You can change this anytime in your student profile."
          />

          <div style={{ marginTop: 24 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: BLACK,
                opacity: 0.7,
                marginBottom: 8,
              }}
            >
              Your Name or Nickname
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  playPop();
                  onNext(name.trim());
                }
              }}
              placeholder="e.g. Alex, Sam, Jordan"
              style={{
                width: "100%",
                background: WHITE,
                border: `2.5px solid ${BLACK}`,
                borderBottom: `4.5px solid ${BLACK}`,
                borderRadius: 16,
                padding: "16px 18px",
                fontSize: 20,
                fontWeight: 800,
                color: BLACK,
                fontFamily: "'Quicksand', sans-serif",
                outline: "none",
                boxSizing: "border-box",
                transition: "border 0.2s ease",
              }}
            />
          </div>
        </main>

        <BottomBar
          onContinue={() => name.trim() && onNext(name.trim())}
          continueLabel="Continue"
          continueDisabled={!name.trim()}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 3: Subjects
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_OPTIONS = [
  { id: "math",        name: "Mathematics", icon: "calculate",       text: "Math? Number crunching superpower!" },
  { id: "science",     name: "Science",     icon: "science",         text: "Science! Let's explore how things work." },
  { id: "english",     name: "English",     icon: "menu_book",       text: "Literature & writing master!" },
  { id: "history",     name: "History",     icon: "account_balance", text: "History! Learning from the greats." },
  { id: "programming", name: "Programming", icon: "code",            text: "Hello, World! Building the future." },
  { id: "arts",        name: "Arts & Design", icon: "palette",       text: "Creative spark activated!" },
  { id: "other",       name: "General Studies", icon: "apps",        text: "Well rounded scholar!" },
];

function SubjectSelection({
  onNext,
  onBack,
  initialSelected = [],
}: {
  onNext: (selected: string[]) => void;
  onBack: () => void;
  initialSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const toggle = (id: string) => {
    playPop();
    triggerHaptic("light");
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const mood: RexState =
    selected.length === 0
      ? "idle"
      : selected.length === 1
      ? "responding"
      : selected.length === 2
      ? "excited"
      : "dancing";

  const dialogue =
    selected.length === 0
      ? "What subjects are you conquering?"
      : selected.length === 1
      ? (SUBJECT_OPTIONS.find((s) => s.id === selected[0])?.text ?? "Nice choice!")
      : selected.length === 2
      ? "Solid combination! We'll tailor your cards."
      : "You're taking on big challenges! Love the ambition.";

  return (
    <div style={s.page}>
      <Header onBack={onBack} onSkip={() => onNext([])} progress={35} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 140px", overflowY: "auto" }}>
          <MascotBubble
            mood={mood}
            dialogue={dialogue}
            subtitle="Pick all that apply to set up your starter decks."
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SUBJECT_OPTIONS.map((subject) => {
              const isSel = selected.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  style={s.optionCard(isSel)}
                  onClick={() => toggle(subject.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        background: isSel ? BLACK : SURFACE,
                        borderRadius: 12,
                        border: `2px solid ${BLACK}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color: isSel ? YELLOW : BLACK }}
                      >
                        {subject.icon}
                      </span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: BLACK }}>
                      {subject.name}
                    </span>
                  </div>

                  <div
                    style={{
                      width: 24,
                      height: 24,
                      border: `2px solid ${BLACK}`,
                      borderRadius: "50%",
                      background: isSel ? BLACK : WHITE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSel && (
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: YELLOW }}>
                        check
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        <BottomBar
          onContinue={() => onNext(selected.length > 0 ? selected : ["other"])}
          continueLabel={selected.length > 0 ? `Continue (${selected.length})` : "Continue"}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 4: Goal Selection
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_OPTIONS = [
  {
    id: "habits",
    name: "Build a Daily Habit",
    time: "15 min / day",
    icon: "autorenew",
    text: "Consistency beats intensity every single time!",
  },
  {
    id: "faster",
    name: "Study Faster & Retain More",
    time: "20 min / day",
    icon: "bolt",
    text: "High-yield sprints for 2x retention. Let's go!",
  },
  {
    id: "skill",
    name: "Master New Skills",
    time: "30 min / day",
    icon: "psychology",
    text: "Curiosity is your superpower. We'll build your toolkit.",
  },
  {
    id: "grades",
    name: "Boost Exam Grades",
    time: "45 min / day",
    icon: "trending_up",
    text: "GPA mission locked in! High-yield mastery starts here.",
  },
];

function GoalSelection({
  onNext,
  onBack,
  initialGoal = "",
}: {
  onNext: (goal: string) => void;
  onBack: () => void;
  initialGoal?: string;
}) {
  const [selected, setSelected] = useState<string>(initialGoal || "faster");

  const mood: RexState = selected ? "excited" : "idle";
  const dialogue = selected
    ? (GOAL_OPTIONS.find((g) => g.id === selected)?.text ?? "Great goal!")
    : "What's your primary study mission?";

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={55} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 140px", overflowY: "auto" }}>
          <MascotBubble
            mood={mood}
            dialogue={dialogue}
            subtitle="Rex uses this to set your daily focus target and streak rewards."
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {GOAL_OPTIONS.map((goal) => {
              const isSel = selected === goal.id;
              return (
                <button
                  key={goal.id}
                  style={s.optionCard(isSel)}
                  onClick={() => {
                    playPop();
                    triggerHaptic("light");
                    setSelected(goal.id);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        background: isSel ? BLACK : SURFACE,
                        borderRadius: 12,
                        border: `2px solid ${BLACK}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color: isSel ? YELLOW : BLACK }}
                      >
                        {goal.icon}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: BLACK }}>{goal.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: BLACK, opacity: 0.6 }}>{goal.time}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      width: 22,
                      height: 22,
                      border: `2px solid ${BLACK}`,
                      borderRadius: "50%",
                      background: isSel ? BLACK : WHITE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSel && (
                      <span className="material-symbols-outlined" style={{ fontSize: 13, color: YELLOW }}>
                        check
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        <BottomBar
          onContinue={() => onNext(selected || "faster")}
          continueLabel="Continue"
          continueDisabled={!selected}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 5: Duolingo Hook — Interactive First Win Challenge (Rex Celebrates!)
// ─────────────────────────────────────────────────────────────────────────────
function FirstWinChallenge({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  const CHALLENGE_OPTIONS = [
    {
      id: 1,
      text: "Re-reading notes 5 times passively",
      icon: "auto_stories",
      isCorrect: false,
      hint: "Close! Re-reading creates an 'illusion of competence', but active testing is what makes memory permanent. Try again!",
    },
    {
      id: 2,
      text: "Active Recall & Testing Yourself",
      icon: "psychology",
      isCorrect: true,
      hint: "Spot on! Active retrieval strengthens neural connections up to 150% more than re-reading.",
    },
    {
      id: 3,
      text: "Highlighting every single sentence",
      icon: "border_color",
      isCorrect: false,
      hint: "Studies prove highlighting alone yields low exam recall. Look for the cognitive science winner!",
    },
    {
      id: 4,
      text: "All-night cramming with energy drinks",
      icon: "bolt",
      isCorrect: false,
      hint: "Sleep is when memory actually consolidates! Look for the active recall superpower.",
    },
  ];

  const handleSelect = (option: typeof CHALLENGE_OPTIONS[0]) => {
    setSelectedId(option.id);
    if (option.isCorrect) {
      playSuccess();
      triggerHaptic("success");
      setShowBanner(true);
      setHintMessage(null);
    } else {
      playTap();
      triggerHaptic("light");
      setShowBanner(false);
      setHintMessage(option.hint);
    }
  };

  const mood: RexState = showBanner ? "dancing" : hintMessage ? "processing" : "idle";
  const dialogue = showBanner
    ? "EXCELLENT! You nailed the cognitive science!"
    : hintMessage || "Quick warmup! Which technique creates the highest retention on exam day?";

  return (
    <div style={s.page}>
      <Header onBack={onBack} progress={75} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 180px", overflowY: "auto" }}>
          <MascotBubble
            mood={mood}
            dialogue={dialogue}
            subtitle={showBanner ? "Active recall is the core engine of Studenius." : "Tap the superpower study technique:"}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 10 }}>
            {CHALLENGE_OPTIONS.map((opt) => {
              const isSelected = selectedId === opt.id;
              const isCorrectSelection = isSelected && opt.isCorrect;
              const isIncorrectSelection = isSelected && !opt.isCorrect;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  style={{
                    ...s.challengeCard,
                    ...(isCorrectSelection ? s.challengeCardCorrect : {}),
                    ...(isIncorrectSelection ? s.challengeCardIncorrect : {}),
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        ...s.challengeIconBox,
                        ...(isCorrectSelection ? { background: GREEN, color: WHITE } : {}),
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        {isCorrectSelection ? "check" : opt.icon}
                      </span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: BLACK }}>
                      {opt.text}
                    </span>
                  </div>

                  {isCorrectSelection && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        background: GREEN,
                        color: WHITE,
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: `1.5px solid ${BLACK}`,
                        flexShrink: 0,
                      }}
                    >
                      WINNER!
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </main>

        {/* Duolingo-style Celebration Bottom Drawer */}
        {showBanner ? (
          <div style={s.celebrationDrawer}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={s.celebrationBadge}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: WHITE }}>
                  check
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: BLACK, margin: 0 }}>
                SPOT ON! 🎯
              </h3>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: BLACK, opacity: 0.85, margin: "0 0 14px", lineHeight: 1.4 }}>
              Testing yourself forces memory retrieval and boosts exam retention up to 150%. Studenius builds your entire daily study habit around it!
            </p>
            <button
              onClick={() => {
                playSuccess();
                triggerHaptic("medium");
                onNext();
              }}
              style={s.continueBtnSuccess}
            >
              <span>CONTINUE</span>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
            </button>
          </div>
        ) : (
          <BottomBar
            onContinue={onNext}
            continueLabel="Continue"
            continueDisabled={!selectedId}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 6: Learning Style
// ─────────────────────────────────────────────────────────────────────────────
const LEARNING_STYLES = [
  { id: "visual",     label: "Visual Learner",  icon: "visibility",    desc: "Diagrams & mental maps" },
  { id: "tests",      label: "Practice Tests",  icon: "content_paste", desc: "Mock exams & active recall" },
  { id: "flashcards", label: "Flashcards",      icon: "dynamic_feed",  desc: "Flipping & spaced repetition" },
  { id: "reading",    label: "Deep Reading",    icon: "menu_book",     desc: "Structured notes & outlines" },
  { id: "listening",  label: "Auditory / Talk", icon: "headphones",    desc: "Rex AI voice & discussions" },
  { id: "mixed",      label: "Mixed Cocktails", icon: "shuffle",       desc: "A bit of everything" },
];

function LearningStyleStep({
  onNext,
  onBack,
  initialStyles = [],
}: {
  onNext: (styles: string[]) => void;
  onBack: () => void;
  initialStyles?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialStyles.length > 0 ? initialStyles : ["flashcards"]);

  const toggle = (id: string) => {
    playPop();
    triggerHaptic("light");
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const mood: RexState = selected.length > 0 ? "excited" : "idle";

  return (
    <div style={s.page}>
      <Header onBack={onBack} onSkip={() => onNext(["mixed"])} progress={85} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 140px", overflowY: "auto" }}>
          <MascotBubble
            mood={mood}
            dialogue="How do you absorb concepts best?"
            subtitle="Pick your favorites — Rex will personalize your tool shortcuts."
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
            {LEARNING_STYLES.map((style) => {
              const isSel = selected.includes(style.id);
              return (
                <button
                  key={style.id}
                  onClick={() => toggle(style.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    minHeight: 110,
                    border: `2.5px solid ${BLACK}`,
                    borderBottom: isSel ? `2.5px solid ${BLACK}` : `4.5px solid ${BLACK}`,
                    borderRadius: 16,
                    cursor: "pointer",
                    padding: 14,
                    boxSizing: "border-box",
                    background: isSel ? YELLOW : WHITE,
                    transform: isSel ? "translateY(2px)" : "none",
                    boxShadow: isSel ? "none" : `0 2px 0 rgba(0,0,0,0.1)`,
                    transition: "all 0.12s ease",
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: isSel ? BLACK : SURFACE,
                        border: `1.5px solid ${BLACK}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color: isSel ? YELLOW : BLACK }}
                      >
                        {style.icon}
                      </span>
                    </div>

                    <div
                      style={{
                        width: 20,
                        height: 20,
                        border: `2px solid ${BLACK}`,
                        borderRadius: "50%",
                        background: isSel ? BLACK : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isSel && (
                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: YELLOW }}>
                          check
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: BLACK }}>{style.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: BLACK, opacity: 0.6, marginTop: 2 }}>{style.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        <BottomBar
          onContinue={() => onNext(selected.length > 0 ? selected : ["mixed"])}
          continueLabel="Continue"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen 7: Optional Exam Target
// ─────────────────────────────────────────────────────────────────────────────
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

  const mood: RexState = examTitle ? "excited" : "idle";

  return (
    <div style={s.page}>
      <Header onBack={onBack} onSkip={handleSkip} progress={95} />
      <div style={s.content}>
        <main style={{ flex: 1, padding: "0 24px 140px", overflowY: "auto" }}>
          <MascotBubble
            mood={mood}
            dialogue={examTitle ? `Locked in! Rex will track ${examTitle}.` : "Got an upcoming exam or test?"}
            subtitle="Optional — we'll set up your countdown and daily question goals."
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: BLACK,
                  opacity: 0.6,
                  marginBottom: 8,
                }}
              >
                Quick Presets
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRESET_CHIPS.map((chip) => {
                  const isMatch = examTitle.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: `2px solid ${BLACK}`,
                        borderBottom: isMatch ? `2px solid ${BLACK}` : `3.5px solid ${BLACK}`,
                        background: isMatch ? YELLOW : WHITE,
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: "pointer",
                        transform: isMatch ? "translateY(1.5px)" : "none",
                        transition: "all 0.1s ease",
                      }}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: BLACK,
                  opacity: 0.6,
                  marginBottom: 6,
                }}
              >
                Exam or Test Name
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. Biology Midterm, Calculus Final"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `2.5px solid ${BLACK}`,
                  borderBottom: `4px solid ${BLACK}`,
                  background: WHITE,
                  fontSize: 15,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: BLACK,
                  opacity: 0.6,
                  marginBottom: 6,
                }}
              >
                Target Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `2.5px solid ${BLACK}`,
                  borderBottom: `4px solid ${BLACK}`,
                  background: WHITE,
                  fontSize: 15,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: BLACK,
                  opacity: 0.6,
                  marginBottom: 6,
                }}
              >
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: `2.5px solid ${BLACK}`,
                  borderBottom: `4px solid ${BLACK}`,
                  background: WHITE,
                  fontSize: 15,
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

// ─────────────────────────────────────────────────────────────────────────────
// Screen 8: Final Synthesis & Dashboard Launch (Rex Celebrates!)
// ─────────────────────────────────────────────────────────────────────────────
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
  const { refreshProfile, completeOnboarding } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [doneReady, setDoneReady] = useState(false);
  const hasFinishedRef = useRef(false);

  // Trigger persistence immediately in parallel on mount
  useEffect(() => {
    const session = getCachedSession();
    const userId = session?.user?.id;
    const dailyMinutes = GOAL_METADATA[selectedGoal]?.dailyMinutes || 30;

    const prefs: UserStudyPreferences = {
      name: userName || session?.user?.user_metadata?.full_name || "Scholar",
      subjects: selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : ["other"],
      goal: selectedGoal || "grades",
      learningStyles: selectedStyles && selectedStyles.length > 0 ? selectedStyles : ["mixed"],
      dailyGoalMinutes: dailyMinutes,
      completedAt: new Date().toISOString(),
      examTarget: examTarget || null,
    };

    saveUserPreferences(prefs, userId);

    const smartQuests = generateSmartQuests(prefs);
    try {
      localStorage.setItem("pz_checklist", JSON.stringify(smartQuests));
      if (userId) {
        localStorage.setItem(`pz_${userId}_checklist`, JSON.stringify(smartQuests));
      }
    } catch {}

    if (session) {
      supabase
        .from("profiles")
        .upsert(
          {
            id: session.user.id,
            email: session.user.email,
            full_name: userName || session.user.user_metadata?.full_name || session.user.user_metadata?.name || "",
            daily_goal_minutes: dailyMinutes,
            avatar_config: { study_preferences: prefs },
            onboarding_complete: true,
          },
          { onConflict: "id" }
        )
        .then(() => {});
    }
  }, []);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    completeOnboarding();
    onDone();
    try {
      refreshProfile();
    } catch {}
  };

  // Snappy Duolingo-style staged checklist (total ~1.8 seconds)
  useEffect(() => {
    const t1 = setTimeout(() => {
      setStepIndex(1);
      playPop(1.1);
    }, 450);

    const t2 = setTimeout(() => {
      setStepIndex(2);
      playPop(1.25);
    }, 950);

    const t3 = setTimeout(() => {
      setStepIndex(3);
      playCelebration();
      triggerHaptic("celebrate");
      setDoneReady(true);
    }, 1550);

    // Auto-proceed after 3.2s if user hasn't clicked
    const t4 = setTimeout(() => {
      handleFinish();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const CHECK_STEPS = [
    { title: "Configuring daily study goal", icon: "timer" },
    { title: "Calibrating Rex AI Tutor", icon: "psychology" },
    { title: "Personalizing active recall decks", icon: "school" },
  ];

  return (
    <div style={s.page}>
      <Header progress={100} />
      <div style={s.content}>
        <main
          style={{
            flex: 1,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            boxSizing: "border-box",
          }}
        >
          {/* Animated Rex Hero with celebration dance & sparkles */}
          <div style={{ cursor: "pointer" }} onClick={() => playPop(1.2)}>
            <AnimatedRex
              size="lg"
              state={doneReady ? "dancing" : "processing"}
              interactive={true}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: BLACK, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
              {doneReady ? "You're All Set!" : "Building Your Study Plan..."}
            </h1>
            <p style={{ fontSize: 14, fontWeight: 600, color: BLACK, opacity: 0.65, margin: 0 }}>
              {doneReady
                ? "Welcome to Studenius. Let's make study sessions stick."
                : "Personalizing your daily sprints and flashcards."}
            </p>
          </div>

          {/* Staged Checklist */}
          <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 10 }}>
            {CHECK_STEPS.map((step, idx) => {
              const isDone = stepIndex > idx;
              return (
                <div
                  key={step.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: `2px solid ${BLACK}`,
                    background: isDone ? YELLOW : WHITE,
                    boxShadow: isDone ? `0 2px 0 ${BLACK}` : "none",
                    transform: isDone ? "scale(1)" : "scale(0.98)",
                    opacity: isDone ? 1 : 0.45,
                    transition: "all 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      border: `2px solid ${BLACK}`,
                      background: isDone ? GREEN : "transparent",
                      color: WHITE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? (
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: BLACK }}>{step.icon}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: BLACK }}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action button */}
          <button
            onClick={() => {
              playTap();
              handleFinish();
            }}
            style={{
              ...s.continueBtnSuccess,
              marginTop: 12,
              width: "100%",
              maxWidth: 360,
              opacity: doneReady ? 1 : 0.6,
            }}
          >
            <span>START STUDYING 🚀</span>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Onboarding Container
// ─────────────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const location = useLocation();

  const [screen, setScreen] = useState<Screen>(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("step") === "nameInput") return "nameInput";
    return "intro";
  });

  const [userName, setUserName] = useState(() => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedExamTarget, setSelectedExamTarget] = useState<ExamTarget | null>(null);

  const go = (s: Screen) => setScreen(s);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("step") === "nameInput") {
      setScreen("nameInput");
    }
  }, [location.search]);

  // If newly authenticated user comes with onboarding incomplete, advance to nameInput
  useEffect(() => {
    if (!user || !session) return;
    if (screen !== "intro") return;

    let isMounted = true;
    supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: profile }) => {
        if (!isMounted) return;
        // Only auto-advance if onboarding is explicitly not complete
        if (profile?.onboarding_complete === false) {
          setScreen("nameInput");
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user, session, screen]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: ${BG}; }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      {screen === "intro" && (
        <IntroHook onNext={() => go("nameInput")} />
      )}

      {screen === "nameInput" && (
        <NameInput
          initialName={userName}
          onNext={(n) => {
            setUserName(n);
            go("subjectSelection");
          }}
          onBack={() => go("intro")}
        />
      )}

      {screen === "subjectSelection" && (
        <SubjectSelection
          initialSelected={selectedSubjects}
          onNext={(subs) => {
            setSelectedSubjects(subs);
            go("goalSelection");
          }}
          onBack={() => go("nameInput")}
        />
      )}

      {screen === "goalSelection" && (
        <GoalSelection
          initialGoal={selectedGoal}
          onNext={(goal) => {
            setSelectedGoal(goal);
            go("firstWinChallenge");
          }}
          onBack={() => go("subjectSelection")}
        />
      )}

      {screen === "firstWinChallenge" && (
        <FirstWinChallenge
          onNext={() => go("learningStyle")}
          onBack={() => go("goalSelection")}
        />
      )}

      {screen === "learningStyle" && (
        <LearningStyleStep
          initialStyles={selectedStyles}
          onNext={(styles) => {
            setSelectedStyles(styles);
            go("examTarget");
          }}
          onBack={() => go("firstWinChallenge")}
        />
      )}

      {screen === "examTarget" && (
        <ExamTargetStep
          selectedSubjects={selectedSubjects}
          onNext={(target) => {
            setSelectedExamTarget(target);
            go("finalTransition");
          }}
          onBack={() => go("learningStyle")}
        />
      )}

      {screen === "finalTransition" && (
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
  );
}
