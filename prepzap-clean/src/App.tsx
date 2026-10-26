import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { setSourceContextUser } from "@/lib/sourceContext";
import { setHistoryUser } from "@/lib/historyStore";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { AppSkeleton } from "@/components/AppSkeleton";
import { StudeniusLayout } from "@/components/StudeniusLayout";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CommandPalette } from "@/components/CommandPalette";
import { supabase } from "@/lib/supabase";


function useMinimumLoading(loading: boolean, minDuration: number = 350) {
  const [isMinLoading, setIsMinLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!loading) {
      const elapsed = Date.now() - startTime;
      if (elapsed < minDuration) {
        const timer = setTimeout(() => setIsMinLoading(false), minDuration - elapsed);
        return () => clearTimeout(timer);
      } else {
        setIsMinLoading(false);
      }
    } else {
      setIsMinLoading(true);
    }
  }, [loading, minDuration, startTime]);

  return isMinLoading;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#FAF7F2" }}><AppSkeleton /></div>
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
import { applyOnboardingDraftIfAny, clearOnboardingDraft } from "./lib/onboardingBank";
import Admin from "./pages/Admin";
import SourceLibrary from "./pages/SourceLibrary";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Flashcards from "./pages/Flashcards";
import FlashcardsShared from "./pages/FlashcardsShared";
import FocusTimer from "./pages/FocusTimer";
import Analytics from "./pages/Analytics";
import StudyPlanner from "./pages/StudyPlanner";
import AITutor from "./pages/AITutor";
import CallWithRex from "./pages/CallWithRex";
import ToolsHub from "./pages/ToolsHub";
import StudentProfile from "./pages/StudentProfile";
import Challenges from "./pages/Challenges";
import TeachIt from "./pages/TeachIt";
import QuickStudy from "./pages/QuickStudy";
import Community from "./pages/Community";
import Friends from "./pages/Friends";
import CampusVault from "./pages/CampusVault";



import MathSolver from "./pages/MathSolver";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CramMode from "./pages/CramMode";
import RecallMode from "./pages/RecallMode";
import VisualLearner from "./pages/VisualLearner";
import NotesWorkspace from "./pages/NotesWorkspace";
import Avatar from "./pages/Avatar";

import Shop from "./pages/Shop";
import UsePro from "./pages/UsePro";
import HighYieldDetector from "./pages/HighYieldDetector";
import MistakeJournal from "./pages/MistakeJournal";

// ── Arena ────────────────────────────────────────────────────────────────────
import Arena from "./pages/Arena";
import Arcade from "./pages/Arcade";
import MemoryMatch from "./pages/arcade/MemoryMatch";
import TrueFalseBlitz from "./pages/arcade/TrueFalseBlitz";
import Termle from "./pages/arcade/Termle";
import AnagramSprint from "./pages/arcade/AnagramSprint";
import WhackAMole from "./pages/arcade/WhackAMole";
import OddOneOut from "./pages/arcade/OddOneOut";

import ArenaRoom from "./pages/ArenaRoom";
import ArenaQuiz from "./pages/ArenaQuiz";
import ArenaResults from "./pages/ArenaResults";
import ArenaInvite from "./pages/ArenaInvite";
import LiveBattle from "./pages/LiveBattle";
import PublicShareView from "./pages/PublicShareView";

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
  const { session, loading, needsOnboarding } = useAuth();
  const minLoading = useMinimumLoading(loading, 350);
  if (minLoading) return <AppSkeleton />;

  if (!session) return <Navigate to="/login" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function MobileRootRedirect() {
  const { session, loading } = useAuth();
  const minLoading = useMinimumLoading(loading, 350);
  if (minLoading) return <AppSkeleton />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function AppRoutes() {
  const { user } = useAuth();
  const [showSplash, setShowSplash] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const hideBottomNav = 
    location.pathname.startsWith('/onboarding') ||
    location.pathname.startsWith('/auth/callback') ||
    location.pathname.startsWith('/landing') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/signup') ||
    location.pathname.startsWith('/arena/quiz/') ||
    location.pathname.startsWith('/ai-tutor') ||
    location.pathname.startsWith('/timer') ||
    location.pathname.startsWith('/pomodoro-area');

  useEffect(() => {
    if (user?.id) {
      setSourceContextUser(user.id);
      setHistoryUser(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    let handled = false;

    const handleUrl = async (rawUrl: string) => {
      if (!rawUrl || handled) return;
      console.log("[DeepLink] Received URL:", rawUrl);

      try {
        // Convert custom scheme (studenius://auth/callback?code=xxx) to parseable URL
        const normalized = rawUrl.replace(/^studenius:\/\//, "https://localhost/");
        const parsed = new URL(normalized);

        // 1. PKCE Flow: code in search params
        const code = parsed.searchParams.get("code");
        if (code) {
          handled = true;
          console.log("[DeepLink] Exchanging PKCE code for session...");
          try { await Browser.close(); } catch {}
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[DeepLink] Code exchange error:", error.message);
          } else if (data?.session) {
            console.log("[DeepLink] Auth successful!");
            try {
              const { data: prof } = await supabase
                .from("profiles")
                .select("onboarding_complete")
                .eq("id", data.session.user.id)
                .maybeSingle();
              if (prof?.onboarding_complete) {
                clearOnboardingDraft();
                navigate("/dashboard", { replace: true });
              } else {
                await applyOnboardingDraftIfAny(data.session.user);
                navigate("/dashboard", { replace: true });
              }
            } catch {
              navigate("/dashboard", { replace: true });
            }
            return;
          }
        }

        // 2. Implicit Flow: access_token in hash
        if (parsed.hash) {
          const hashParams = new URLSearchParams(parsed.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            handled = true;
            console.log("[DeepLink] Setting session from hash tokens...");
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.error("[DeepLink] SetSession error:", error.message);
            } else if (data?.session) {
              console.log("[DeepLink] Auth successful from hash!");
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("onboarding_complete")
                  .eq("id", data.session.user.id)
                  .maybeSingle();
                if (prof?.onboarding_complete) {
                  clearOnboardingDraft();
                  navigate("/dashboard", { replace: true });
                } else {
                  await applyOnboardingDraftIfAny(data.session.user);
                  navigate("/dashboard", { replace: true });
                }
              } catch {
                navigate("/dashboard", { replace: true });
              }
              return;
            }
          }
        }

        // 3. Fallback: navigate route if not already handled
        if (rawUrl.includes("studenius://")) {
          const path = rawUrl.split("studenius://")[1];
          if (path) {
            const cleanPath = "/" + path.split("?")[0].split("#")[0];
            navigate(cleanPath, { replace: true });
          }
        }
      } catch (err) {
        console.error("[DeepLink] URL parse error:", err);
      }
    };

    // Check if app was launched via deep link
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        handleUrl(launchUrl.url);
      }
    });

    // Handle Android/iOS deep links while app is running
    const sub = CapApp.addListener("appUrlOpen", (event) => {
      if (event && event.url) {
        handleUrl(event.url);
      }
    });

    return () => {
      sub.then(listener => listener.remove()).catch(() => {});
    };
  }, [navigate]);

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  const safe = (node: React.ReactNode) => (
    <PageErrorBoundary>
      <Suspense fallback={<AppSkeleton />}
      >
        {node}
      </Suspense>
    </PageErrorBoundary>
  );

  return (
    <>
      <PWAInstallBanner />
      <MobileBottomNav hide={hideBottomNav} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={safe(<MobileRootRedirect />)} />
        <Route path="/landing" element={safe(<Landing />)} />
        <Route path="/login" element={safe(<Navigate to="/onboarding" replace />)} />
        <Route path="/signup" element={<Navigate to="/onboarding" replace />} />
        
        <Route path="/privacy" element={safe(<Privacy />)} />
        <Route path="/terms" element={safe(<Terms />)} />
        <Route path="/onboarding" element={safe(<Onboarding />)} />
        <Route path="/auth/callback" element={safe(<AuthCallback />)} />
        
        <Route path="/invite/:code" element={safe(<ArenaInvite />)} />
        <Route path="/flashcards/shared/:id" element={safe(<FlashcardsShared />)} />
        <Route path="/share/:type/:slug" element={safe(<PublicShareView />)} />

        {/* Protected — inside shell layout */}
        <Route element={safe(<ProtectedStudeniusLayout />)}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/timer" element={<FocusTimer />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/planner" element={<StudyPlanner />} />
          <Route path="/ai-tutor" element={<AITutor />} />
          <Route path="/call" element={<CallWithRex />} />
          <Route path="/tools" element={<ToolsHub />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/leaderboard" element={<Arena />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/community" element={<Community />} />
          <Route path="/campus-vault" element={<CampusVault />} />
          <Route path="/vault" element={<Navigate to="/campus-vault" replace />} />
          <Route path="/teach-it" element={<TeachIt />} />
          <Route path="/quick-study" element={<QuickStudy />} />
          
          <Route path="/math" element={<MathSolver />} />
          <Route path="/sources" element={<SourceLibrary />} />
          <Route path="/source-library" element={<SourceLibrary />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/cram" element={<Navigate to="/quick-study" replace />} />
          <Route path="/recall" element={<Navigate to="/quick-study" replace />} />
          <Route path="/visual-learner" element={<VisualLearner />} />
          <Route path="/notes" element={<NotesWorkspace />} />
          <Route path="/avatar" element={<Avatar />} />
          
          <Route path="/shop" element={<Shop />} />
          <Route path="/pro" element={<UsePro />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/high-yield" element={<Navigate to="/quick-study" replace />} />
          <Route path="/mistakes" element={<MistakeJournal />} />

          {/* Arena & Live Battle */}
          <Route path="/rooms" element={<LiveBattle />} />
          <Route path="/live-battle" element={<Navigate to="/rooms" replace />} />
          <Route path="/arena" element={<Arena />} />
          <Route path="/arena/room/:code" element={<ArenaRoom />} />
          <Route path="/arena/quiz/:code" element={<ArenaQuiz />} />
          <Route path="/arena/results/:code" element={<ArenaResults />} />
          <Route path="/arcade" element={<Arcade />} />
          <Route path="/arcade/memory-match" element={<MemoryMatch />} />
          <Route path="/arcade/true-false" element={<TrueFalseBlitz />} />
          <Route path="/arcade/termle" element={<Termle />} />
          <Route path="/arcade/anagram-sprint" element={<AnagramSprint />} />
          <Route path="/arcade/whack-a-mole" element={<WhackAMole />} />
          <Route path="/arcade/odd-one-out" element={<OddOneOut />} />

        </Route>

        {/* Catch-all */}
        <Route path="*" element={safe(<NotFound />)} />
      </Routes>
        </AnimatePresence>
    </>
  );
}

const App = () => (
  <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CommandPalette />
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </MotionConfig>
);

export default App;

