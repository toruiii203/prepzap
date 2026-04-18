import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SourceBreadcrumb />
        <Routes>
          <Route path="/" element={<Index />} />
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

export default App;
