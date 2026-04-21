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
// Shows a dismissible "Add to Home Screen" nudge on mobile only.
// Uses the beforeinstallprompt event (Chrome/Android).
// iOS users see it too but must use Safari Share > Add to Home Screen manually.
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
// Checks if there's any active session from any supported login provider.
// Extend this as you add more auth methods.
function isAuthenticated(): boolean {
  // PocketBase token (if you use PocketBase)
  if (localStorage.getItem("pocketbase_auth")) return true;
  // Supabase session
  const supaKey = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
  if (supaKey && localStorage.getItem(supaKey)) return true;
  // Firebase / generic token fallback
  if (localStorage.getItem("pb_token") || localStorage.getItem("auth_token")) return true;
  // GitHub OAuth token (if you add GitHub login)
  if (localStorage.getItem("github_token")) return true;
  return false;
}

// ─── Mobile root redirect ─────────────────────────────────────────────────────
// On mobile: send authenticated users to /dashboard, unauthenticated to /login.
// On desktop: show the landing page (Index).
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
          {/* PWA install banner — only renders on mobile, dismissed per session */}
          <PWAInstallBanner />
          <Routes>
            <Route path="/" element={<MobileRootRedirect />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/timer" element={<FocusTimer />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/planner" element={<StudyPlanner />} />
            <Route path="/ai-tutor" element={<AiTutor />} />
            <Route path="/feynman" element={<FeynmanMode />} />
            <Route path="/tool-architect" element={<ToolArchitect />} />
            <Route path="/synthesis" element={<SynthesisLab />} />
            <Route path="/why-engine" element={<WhyEngine />} />
            <Route path="/upload" element={<UploadMaterials />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/math" element={<MathSolver />} />
            <Route path="/quiz-builder" element={<QuizBuilder />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/essay" element={<EssayWriter />} />
            <Route path="/community" element={<Community />} />
            <Route path="/daily5" element={<Daily5 />} />
            <Route path="/flip-script" element={<FlipScript />} />
            <Route path="/spot-error" element={<SpotError />} />
            <Route path="/build-def" element={<BuildDef />} />
            <Route path="/blank-map" element={<BlankMap />} />
            <Route path="/boss-round" element={<BossRound />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/sources" element={<SourceLibrary />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
