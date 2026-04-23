import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy"
import Terms from "./pages/Terms"

const supabase = createClient(
  "https://sieizvhprgcqrkalnkht.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZWl6dmhwcmdjcXJrYWxua2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTg2NDksImV4cCI6MjA5MjMzNDY0OX0.-U8zu8Midq8PGaUPSRqhC-vVU1RnCH4yPOs_ZuppC_8"
);

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <img src="/icon-512.png" alt="PrepZap" style={{ width: 120, height: 120, opacity: 0.9 }} />
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
    <div style={{ position: "fixed", bottom: 72, left: 12, right: 12, zIndex: 9998, background: "var(--pz-surface, #111)", border: "1px solid var(--pz-gold, #C0A060)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pz-gold, #C0A060)", fontFamily: "'Geist', sans-serif" }}>Install PrepZap</span>
        <span style={{ fontSize: 11, color: "var(--pz-text-2, rgba(240,232,212,0.55))", marginTop: 2, fontFamily: "'Geist', sans-serif" }}>Add to Home Screen for the full app experience</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={handleInstall} style={{ background: "var(--pz-gold, #C0A060)", color: "#000", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Geist', sans-serif", cursor: "pointer" }}>Install</button>
        <button onClick={handleDismiss} style={{ background: "transparent", color: "var(--pz-text-muted, rgba(240,232,212,0.28))", border: "none", padding: "6px 8px", fontSize: 14, cursor: "pointer" }}>✕</button>
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

function isMobile() { return window.innerWidth < 768; }

function ProtectedRoute({ session, loading, children }: { session: Session | null; loading: boolean; children: React.ReactNode }) {
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function MobileRootRedirect({ session, loading }: { session: Session | null; loading: boolean }) {
  if (loading) return null;
  if (!isMobile()) return <Index />;
  return <Navigate to={session ? "/dashboard" : "/login"} replace />;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(isMobile());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SourceBreadcrumb />
          <PWAInstallBanner />
          <Routes>
            <Route path="/" element={<MobileRootRedirect session={session} loading={authLoading} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<ProtectedRoute session={session} loading={authLoading}><Dashboard /></ProtectedRoute>} />
            <Route path="/practice" element={<ProtectedRoute session={session} loading={authLoading}><Practice /></ProtectedRoute>} />
            <Route path="/flashcards" element={<ProtectedRoute session={session} loading={authLoading}><Flashcards /></ProtectedRoute>} />
            <Route path="/timer" element={<ProtectedRoute session={session} loading={authLoading}><FocusTimer /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute session={session} loading={authLoading}><Analytics /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute session={session} loading={authLoading}><StudyPlanner /></ProtectedRoute>} />
            <Route path="/ai-tutor" element={<ProtectedRoute session={session} loading={authLoading}><AiTutor /></ProtectedRoute>} />
            <Route path="/feynman" element={<ProtectedRoute session={session} loading={authLoading}><FeynmanMode /></ProtectedRoute>} />
            <Route path="/tool-architect" element={<ProtectedRoute session={session} loading={authLoading}><ToolArchitect /></ProtectedRoute>} />
            <Route path="/synthesis" element={<ProtectedRoute session={session} loading={authLoading}><SynthesisLab /></ProtectedRoute>} />
            <Route path="/why-engine" element={<ProtectedRoute session={session} loading={authLoading}><WhyEngine /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute session={session} loading={authLoading}><UploadMaterials /></ProtectedRoute>} />
            <Route path="/suggestions" element={<ProtectedRoute session={session} loading={authLoading}><Suggestions /></ProtectedRoute>} />
            <Route path="/math" element={<ProtectedRoute session={session} loading={authLoading}><MathSolver /></ProtectedRoute>} />
            <Route path="/quiz-builder" element={<ProtectedRoute session={session} loading={authLoading}><QuizBuilder /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute session={session} loading={authLoading}><Settings /></ProtectedRoute>} />
            <Route path="/essay" element={<ProtectedRoute session={session} loading={authLoading}><EssayWriter /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute session={session} loading={authLoading}><Community /></ProtectedRoute>} />
            <Route path="/daily5" element={<ProtectedRoute session={session} loading={authLoading}><Daily5 /></ProtectedRoute>} />
            <Route path="/flip-script" element={<ProtectedRoute session={session} loading={authLoading}><FlipScript /></ProtectedRoute>} />
            <Route path="/spot-error" element={<ProtectedRoute session={session} loading={authLoading}><SpotError /></ProtectedRoute>} />
            <Route path="/build-def" element={<ProtectedRoute session={session} loading={authLoading}><BuildDef /></ProtectedRoute>} />
            <Route path="/blank-map" element={<ProtectedRoute session={session} loading={authLoading}><BlankMap /></ProtectedRoute>} />
            <Route path="/boss-round" element={<ProtectedRoute session={session} loading={authLoading}><BossRound /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute session={session} loading={authLoading}><Admin /></ProtectedRoute>} />
            <Route path="/sources" element={<ProtectedRoute session={session} loading={authLoading}><SourceLibrary /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
