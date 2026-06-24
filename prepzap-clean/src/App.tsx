import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { setSourceContextUser } from "@/lib/sourceContext";
import { setHistoryUser } from "@/lib/historyStore";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { StudeniusLayout } from "@/components/StudeniusLayout";

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--pz-bg, #160810)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <img src="/icon-512.png" alt="PrepZap" style={{ width: 120, height: 120, opacity: 0.95 }} />
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!isMobile) return;
    if (sessionStorage.getItem("pz_banner_dismissed")) return;
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent); setVisible(true); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!visible) return null;
  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setPrompt(null);
  };
  const handleDismiss = () => { sessionStorage.setItem("pz_banner_dismissed", "1"); setVisible(false); };
  return (
    <div style={{ position: "fixed", bottom: 72, left: 12, right: 12, zIndex: 9998, background: "var(--pz-surface2, #1f0b13)", border: "2px solid var(--pz-border, rgba(139,26,42,0.35))", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "none" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pz-gold, #f0a040)", fontFamily: "'Fredoka One', cursive" }}>Install Studenius</span>
        <span style={{ fontSize: 11, color: "var(--pz-text-2, rgba(245,237,232,0.55))", marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>Add to Home Screen for the full app experience</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={handleInstall} style={{ background: "var(--pz-gold, #f0a040)", color: "var(--pz-bg, #160810)", border: "2px solid var(--pz-gold, #f0a040)", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: "pointer" }}>Install</button>
        <button onClick={handleDismiss} style={{ background: "transparent", color: "var(--pz-text-muted, rgba(245,237,232,0.28))", border: "2px solid var(--pz-border, rgba(139,26,42,0.35))", borderRadius: 10, padding: "6px 8px", fontSize: 13, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

// ── Pages ────────────────────────────────────────────────────────────────────
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Onboarding from "./pages/OnboardingFlow";
import AuthCallback from "./pages/AuthCallback";
import Admin from "./pages/Admin";
import SourceLibrary from "./pages/SourceLibrary";
import { SourceBreadcrumb } from "./components/SourceBreadcrumb";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Flashcards from "./pages/Flashcards";
import FlashcardsShared from "./pages/FlashcardsShared";
import FocusTimer from "./pages/FocusTimer";
import Analytics from "./pages/Analytics";
import StudyPlanner from "./pages/StudyPlanner";
import AITutor from "./pages/AITutor";
import ToolsHub from "./pages/ToolsHub";
import StudentProfile from "./pages/StudentProfile";
import Challenges from "./pages/Challenges";
import TeachIt from "./pages/TeachIt";
import QuickStudy from "./pages/QuickStudy";
import GoProPricing from "./pages/GoProPricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import Pricing from "./pages/Pricing";
import MathSolver from "./pages/MathSolver";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CramMode from "./pages/CramMode";
import RecallMode from "./pages/RecallMode";
import VisualLearner from "./pages/VisualLearner";
import Avatar from "./pages/Avatar";
import Shop from "./pages/Shop";
import HighYieldDetector from "./pages/HighYieldDetector";
import MistakeJournal from "./pages/MistakeJournal";

// ── Arena ────────────────────────────────────────────────────────────────────
import Arena from "./pages/Arena";
import ArenaRoom from "./pages/ArenaRoom";
import ArenaQuiz from "./pages/ArenaQuiz";
import ArenaResults from "./pages/ArenaResults";
import ArenaInvite from "./pages/ArenaInvite";

// ── Still removed (files deleted): ───────────────────────────────────────────
// FeynmanMode, ToolArchitect, Daily5, FlipScript, SpotError, BuildDef,
// BlankMap, BossRound, ConfidenceCalibration, StudyDNA, FocusState,
// PomodoroArea, Login
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

function isMobile() { return window.innerWidth < 768; }

function ProtectedStudeniusLayout() {
  return (
    <ProtectedRoute>
      <StudeniusLayout />
    </ProtectedRoute>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  // FIX: only block on loading and session — never redirect to /onboarding here.
  // AuthCallback handles post-OAuth routing (dashboard vs onboarding).
  // OnboardingFlow handles post-email-signup routing via onNext().
  // Adding a needsOnboarding redirect here creates a navigation loop:
  // onboarding navigates → /dashboard → ProtectedRoute redirects → /onboarding → repeat.
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,237,232,0.75)", fontSize: 14 }}>
        Loading page...
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function MobileRootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/icon-512.png" alt="Loading" style={{ width: 72, height: 72, opacity: 0.7 }} />
    </div>
  );
  if (session) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function AppRoutes() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setSourceContextUser(user.id);
      setHistoryUser(user.id);
    }
  }, [user?.id]);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  const safe = (node: React.ReactNode) => (
    <PageErrorBoundary>
      <Suspense
        fallback={
          <div style={{ minHeight: "100vh", background: "#1a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(245,237,232,0.75)", fontSize: 14 }}>
            Loading page...
          </div>
        }
      >
        {node}
      </Suspense>
    </PageErrorBoundary>
  );

  return (
    <>
      <SourceBreadcrumb />
      <PWAInstallBanner />
      <Routes>
        {/* Public */}
        <Route path="/" element={safe(<MobileRootRedirect />)} />
        <Route path="/landing" element={safe(<Landing />)} />
        <Route path="/login" element={safe(<Navigate to="/onboarding" replace />)} />
        <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
        <Route path="/pricing" element={safe(<Pricing />)} />
        <Route path="/privacy" element={safe(<Privacy />)} />
        <Route path="/terms" element={safe(<Terms />)} />
        <Route path="/onboarding" element={safe(<Onboarding />)} />
        <Route path="/auth/callback" element={safe(<AuthCallback />)} />
        <Route path="/payment-success" element={safe(<PaymentSuccess />)} />
        <Route path="/invite/:code" element={safe(<ArenaInvite />)} />
        <Route path="/flashcards/shared/:id" element={safe(<FlashcardsShared />)} />

        {/* Protected — inside shell layout */}
        <Route element={safe(<ProtectedStudeniusLayout />)}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/timer" element={<FocusTimer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/planner" element={<StudyPlanner />} />
          <Route path="/ai-tutor" element={<AITutor />} />
          <Route path="/tools" element={<ToolsHub />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/leaderboard" element={<Arena />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/teach-it" element={<TeachIt />} />
          <Route path="/quick-study" element={<QuickStudy />} />
          <Route path="/go-pro" element={<GoProPricing />} />
          <Route path="/math" element={<MathSolver />} />
          <Route path="/sources" element={<SourceLibrary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/cram" element={<Navigate to="/quick-study" replace />} />
          <Route path="/recall" element={<Navigate to="/quick-study" replace />} />
          <Route path="/visual-learner" element={<VisualLearner />} />
          <Route path="/avatar" element={<Avatar />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/high-yield" element={<Navigate to="/quick-study" replace />} />
          <Route path="/mistakes" element={<MistakeJournal />} />

          {/* Arena */}
          <Route path="/arena" element={<Arena />} />
          <Route path="/arena/room/:code" element={<ArenaRoom />} />
          <Route path="/arena/quiz/:code" element={<ArenaQuiz />} />
          <Route path="/arena/results/:code" element={<ArenaResults />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={safe(<NotFound />)} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
