import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import Index from "./pages/Index";

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      <img src="/icon-512.png" alt="PrepZap" style={{ width: 120, height: 120, opacity: 0.9 }} />
    </div>
  );
}

// ─── PWA Install Banner ───────────────────────────────────────────────────────
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

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
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

  const handleDismiss = () => {
    sessionStorage.setItem("pz_banner_dismissed", "1");
    setVisible(false);
  };

  return (
    <div style={{
      position: "fixed", bottom: 72, left: 12, right: 12, zIndex: 9998,
      background: "var(--pz-surface, #111)",
      border: "1px solid var(--pz-gold, #C0A060)",
      borderRadius: 8, padding: "12px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pz-gold, #C0A060)", fontFamily: "'Geist', sans-serif" }}>
          Install PrepZap
        </span>
        <span style={{ fontSize: 11, color: "var(--pz-text-2, rgba(240,232,212,0.55))", marginTop: 2, fontFamily: "'Geist', sans-serif" }}>
          Add to Home Screen for the full app experience
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={handleInstall} style={{
          background: "var(--pz-gold, #C0A060)", color: "#000",
          border: "none", borderRadius: 6, padding: "6px 14px",
          fontSize: 12, fontWeight: 700, fontFamily: "'Geist', sans-serif", cursor: "pointer",
        }}>
          Install
        </button>
        <button onClick={handleDismiss} style={{
          background: "transparent", color: "var(--pz-text-muted, rgba(240,232,212,0.28))",
          border: "none", padding: "6px 8px", fontSize: 14, cursor: "pointer",
        }}>
          ✕
        </button>
      </div>
    </div>
  );
}

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
import SynthesisLab from "./pages/SynthesisLab";
import WhyEngine from "./pages/WhyEngine";
import UploadMaterials from "./pages/UploadMaterials";
import Pricing from "./pages/Pricing";
import Suggestions from "./pages/Suggestions";
import MathSolver from "./pages/MathSolver";
import QuizBuilder from "./pages/QuizBuilder";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import EssayWriter from "./pages/EssayWriter";
import Community from "./pages/Community";
import NotFound from "./pages/NotFound";
import Daily5 from "./pages/Daily5";
import FlipScript from "./pages/FlipScript";
import SpotError from "./pages/SpotError";
import BuildDef from "./pages/BuildDef";
import BlankMap from "./pages/BlankMap";
import BossRound from "./pages/BossRound";

const queryClient = new QueryClient();

function isMobile() {
  return window.innerWidth < 768;
}

// ─── Auth check ───────────────────────────────────────────────────────────────
function isAuthenticated(): boolean {
  if (localStorage.getItem("pocketbase_auth")) return true;
  const supaKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
  if (supaKey && localStorage.getItem(supaKey)) return true;
  if (localStorage.getItem("pb_token") || localStorage.getItem("auth_token")) return true;
  if (localStorage.getItem("github_token")) return true;
  return false;
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─── Mobile root redirect ─────────────────────────────────────────────────────
function MobileRootRedirect() {
  if (!isMobile()) return <Index />;
  return <Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(isMobile());

  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SourceBreadcrumb />
          <PWAInstallBanner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<MobileRootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
            <Route path="/timer" element={<ProtectedRoute><FocusTimer /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute><StudyPlanner /></ProtectedRoute>} />
            <Route path="/ai-tutor" element={<ProtectedRoute><AiTutor /></ProtectedRoute>} />
            <Route path="/feynman" element={<ProtectedRoute><FeynmanMode /></ProtectedRoute>} />
            <Route path="/tool-architect" element={<ProtectedRoute><ToolArchitect /></ProtectedRoute>} />
            <Route path="/synthesis" element={<ProtectedRoute><SynthesisLab /></ProtectedRoute>} />
            <Route path="/why-engine" element={<ProtectedRoute><WhyEngine /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadMaterials /></ProtectedRoute>} />
            <Route path="/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
            <Route path="/math" element={<ProtectedRoute><MathSolver /></ProtectedRoute>} />
            <Route path="/quiz-builder" element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/essay" element={<ProtectedRoute><EssayWriter /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/daily5" element={<ProtectedRoute><Daily5 /></ProtectedRoute>} />
            <Route path="/flip-script" element={<ProtectedRoute><FlipScript /></ProtectedRoute>} />
            <Route path="/spot-error" element={<ProtectedRoute><SpotError /></ProtectedRoute>} />
            <Route path="/build-def" element={<ProtectedRoute><BuildDef /></ProtectedRoute>} />
            <Route path="/blank-map" element={<ProtectedRoute><BlankMap /></ProtectedRoute>} />
            <Route path="/boss-round" element={<ProtectedRoute><BossRound /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/sources" element={<ProtectedRoute><SourceLibrary /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
