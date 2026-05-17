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
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pz-gold, #f0a040)", fontFamily: "'Fredoka One', cursive" }}>Install PrepZap</span>
        <span style={{ fontSize: 11, color: "var(--pz-text-2, rgba(245,237,232,0.55))", marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>Add to Home Screen for the full app experience</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={handleInstall} style={{ background: "var(--pz-gold, #f0a040)", color: "var(--pz-bg, #160810)", border: "2px solid var(--pz-gold, #f0a040)", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif", cursor: "pointer" }}>Install</button>
        <button onClick={handleDismiss} style={{ background: "transparent", color: "var(--pz-text-muted, rgba(245,237,232,0.28))", border: "2px solid var(--pz-border, rgba(139,26,42,0.35))", borderRadius: 10, padding: "6px 8px", fontSize: 13, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Onboarding from "./pages/Onboarding";
import Admin from "./pages/Admin";
import SourceLibrary from "./pages/SourceLibrary";
import { SourceBreadcrumb } from "./components/SourceBreadcrumb";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Flashcards from "./pages/Flashcards";
import FocusTimer from "./pages/FocusTimer";
import Analytics from "./pages/Analytics";
import StudyPlanner from "./pages/StudyPlanner";
import AiTutor from "./pages/AiTutor";
import FeynmanMode from "./pages/FeynmanMode";
import ToolArchitect from "./pages/ToolArchitect";
import Pricing from "./pages/Pricing";
import MathSolver from "./pages/MathSolver";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Daily5 from "./pages/Daily5";
import FlipScript from "./pages/FlipScript";
import SpotError from "./pages/SpotError";
import BuildDef from "./pages/BuildDef";
import BlankMap from "./pages/BlankMap";
import BossRound from "./pages/BossRound";
import CramMode from "./pages/CramMode";
import ConfidenceCalibration from "./pages/ConfidenceCalibration";
import HighYieldDetector from "./pages/HighYieldDetector";
import MistakeJournal from "./pages/MistakeJournal";
import RecallMode from "./pages/RecallMode";
import StudyDNA from "./pages/StudyDNA";
import FocusState from "./pages/FocusState";
import VisualLearner from "./pages/VisualLearner";
import PomodoroArea from "./pages/PomodoroArea";
import Avatar from "./pages/Avatar";
import Shop from "./pages/Shop";

const queryClient = new QueryClient();

function isMobile() { return window.innerWidth < 768; }

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, needsOnboarding } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(245,237,232,0.75)",
          fontSize: 14,
        }}
      >
        Loading page...
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  // New Google OAuth users have no profile row → send to onboarding
  if (needsOnboarding && window.location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function MobileRootRedirect() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!isMobile()) return <Landing />;
  return <Navigate to={session ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(isMobile());

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
          <div
            style={{
              minHeight: "100vh",
              background: "#1a0a0a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(245,237,232,0.75)",
              fontSize: 14,
            }}
          >
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
        <Route path="/" element={safe(<MobileRootRedirect />)} />
        <Route path="/landing" element={safe(<Landing />)} />
        <Route path="/login" element={safe(<Login />)} />
        <Route path="/signup" element={safe(<Signup />)} />
        <Route path="/pricing" element={safe(<Pricing />)} />
        <Route path="/privacy" element={safe(<Privacy />)} />
        <Route path="/terms" element={safe(<Terms />)} />
        <Route path="/onboarding" element={safe(<Onboarding />)} />
        <Route path="/dashboard" element={safe(<ProtectedRoute><Dashboard /></ProtectedRoute>)} />
        <Route path="/practice" element={safe(<ProtectedRoute><Practice /></ProtectedRoute>)} />
        <Route path="/flashcards" element={safe(<ProtectedRoute><Flashcards /></ProtectedRoute>)} />
        <Route path="/timer" element={safe(<ProtectedRoute><FocusTimer /></ProtectedRoute>)} />
        <Route path="/pomodoro-area" element={safe(<ProtectedRoute><PomodoroArea /></ProtectedRoute>)} />
        <Route path="/analytics" element={safe(<ProtectedRoute><Analytics /></ProtectedRoute>)} />
        <Route path="/planner" element={safe(<ProtectedRoute><StudyPlanner /></ProtectedRoute>)} />
        <Route path="/ai-tutor" element={safe(<ProtectedRoute><AiTutor /></ProtectedRoute>)} />
        <Route path="/feynman" element={safe(<ProtectedRoute><FeynmanMode /></ProtectedRoute>)} />
        <Route path="/tool-architect" element={safe(<ProtectedRoute><ToolArchitect /></ProtectedRoute>)} />
        <Route path="/math" element={safe(<ProtectedRoute><MathSolver /></ProtectedRoute>)} />
        <Route path="/settings" element={safe(<ProtectedRoute><Settings /></ProtectedRoute>)} />
        <Route path="/daily5" element={safe(<ProtectedRoute><Daily5 /></ProtectedRoute>)} />
        <Route path="/flip-script" element={safe(<ProtectedRoute><FlipScript /></ProtectedRoute>)} />
        <Route path="/spot-error" element={safe(<ProtectedRoute><SpotError /></ProtectedRoute>)} />
        <Route path="/build-def" element={safe(<ProtectedRoute><BuildDef /></ProtectedRoute>)} />
        <Route path="/blank-map" element={safe(<ProtectedRoute><BlankMap /></ProtectedRoute>)} />
        <Route path="/boss-round" element={safe(<ProtectedRoute><BossRound /></ProtectedRoute>)} />
        <Route path="/cram" element={safe(<ProtectedRoute><CramMode /></ProtectedRoute>)} />
        <Route path="/confidence" element={safe(<ProtectedRoute><ConfidenceCalibration /></ProtectedRoute>)} />
        <Route path="/high-yield" element={safe(<ProtectedRoute><HighYieldDetector /></ProtectedRoute>)} />
        <Route path="/mistakes" element={safe(<ProtectedRoute><MistakeJournal /></ProtectedRoute>)} />
        <Route path="/recall" element={safe(<ProtectedRoute><RecallMode /></ProtectedRoute>)} />
        <Route path="/study-dna" element={safe(<ProtectedRoute><StudyDNA /></ProtectedRoute>)} />
        <Route path="/focus-state" element={safe(<ProtectedRoute><FocusState /></ProtectedRoute>)} />
        <Route path="/visual-learner" element={safe(<ProtectedRoute><VisualLearner /></ProtectedRoute>)} />
        <Route path="/avatar" element={safe(<ProtectedRoute><Avatar /></ProtectedRoute>)} />
        <Route path="/shop" element={safe(<ProtectedRoute><Shop /></ProtectedRoute>)} />
        <Route path="/admin" element={safe(<ProtectedRoute><Admin /></ProtectedRoute>)} />
        <Route path="/sources" element={safe(<ProtectedRoute><SourceLibrary /></ProtectedRoute>)} />
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
