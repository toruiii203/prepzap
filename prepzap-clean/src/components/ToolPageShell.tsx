import { BuddyCompanion } from "@/components/BuddyCompanion";
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";
import { ChevronDown, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadLibrary,
  getActiveSource,
  saveContext,
  onSourceChange,
  type SourceFile,
} from "@/lib/sourceContext";

const GOLD = "#f0a040";
const BG = "#160810";
const SURF = "#1f0b13";
const BORDER = "rgba(139,26,42,0.35)";
const TEXT = "#f5ede8";
const TEXT2 = "rgba(245,237,232,0.55)";
const TEXT3 = "rgba(245,237,232,0.28)";

export type BgTheme = "fox";
export type ModelId = "default";
export const MODEL_KEY = "studenius_selected_model";
export const AI_MODELS = [{ id: "default", label: "Studenius AI", provider: "internal", badge: "" }] as const;

export function useModel() {
  const [model] = useState<ModelId>("default");
  const setModel = (_id: ModelId) => {};
  return { model, setModel };
}

export function ModelPicker(_props: { model: ModelId; setModel: (id: ModelId) => void }) {
  return null;
}

function SourceSelectorPill() {
  const [sources, setSources] = useState<SourceFile[]>(() => loadLibrary());
  const [active, setActive] = useState<SourceFile | null>(() => getActiveSource());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = onSourceChange(() => {
      setSources(loadLibrary());
      setActive(getActiveSource());
    });
    return unsub;
  }, []);

  const select = (s: SourceFile | null) => {
    saveContext(s ? { mode: "selected", selectedIds: [s.id] } : { mode: "none", selectedIds: [] });
    setActive(s);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          background: SURF,
          border: `1.5px solid ${active ? "rgba(240,160,64,0.55)" : BORDER}`,
          borderRadius: 10,
          color: active ? GOLD : TEXT2,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "'Nunito',sans-serif",
          maxWidth: 220,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active ? active.name : "Source Library"}
        </span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 280,
            background: SURF,
            border: `1.5px solid ${BORDER}`,
            borderRadius: 12,
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: TEXT3, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Source Library</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer" }}><X size={12} /></button>
          </div>
          <button onClick={() => select(null)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, color: !active ? GOLD : TEXT2, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            General AI (no source)
          </button>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {sources.map((s) => (
              <button key={s.id} onClick={() => select(s)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, color: active?.id === s.id ? GOLD : TEXT2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const QUICK_TOOLS = [
  { href: "/ai-tutor", label: "BrainBot" },
  { href: "/practice", label: "Practice" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/daily5", label: "Daily Quiz" },
  { href: "/math", label: "Math Solver" },
  { href: "/spot-error", label: "Error Hunt" },
  { href: "/timer", label: "Pomodoro" },
  { href: "/feynman", label: "Feynman Mode" },
  { href: "/cram", label: "Cram Mode" },
  { href: "/recall", label: "Recall Mode" },
  { href: "/high-yield", label: "High Yield Detector" },
  { href: "/visual-learner", label: "Visual Learner" },
  { href: "/flip-script", label: "Flip Script" },
  { href: "/build-def", label: "Concept Builder" },
  { href: "/blank-map", label: "Blank Map" },
  { href: "/confidence", label: "Confidence Calibrator" },
  { href: "/tool-architect", label: "Tool Architect" },
  { href: "/mistakes", label: "Mistake Journal" },
  { href: "/boss-round", label: "Boss Round" },
];

function StudyToolsDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: TEXT2, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}
      >
        Study Tools <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, width: 230, background: SURF, border: `1.5px solid ${BORDER}`, borderRadius: 12, zIndex: 100, overflow: "hidden" }}>
            {QUICK_TOOLS.map((t) => (
              <Link key={t.href} to={t.href} onClick={() => setOpen(false)} style={{ display: "block", padding: "9px 10px", borderBottom: `1px solid ${BORDER}`, color: TEXT2, textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                {t.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ToolPageShellProps {
  children: React.ReactNode;
  showModelPicker?: boolean;
  model?: ModelId;
  setModel?: (id: ModelId) => void;
}

export function ToolPageShell({ children }: ToolPageShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const tutorial = useTutorialModal(location.pathname);
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "S").slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Nunito',system-ui,sans-serif" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 50, height: 54, borderBottom: `2px solid ${BORDER}`, background: SURF, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link to="/dashboard" style={{ textDecoration: "none", color: GOLD, fontFamily: "'Fredoka One',cursive", fontSize: 18 }}>STUDENIUS</Link>
          <StudyToolsDropdown />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SourceSelectorPill />
            <span className="material-symbols-outlined" style={{ fontSize: 20, cursor: "pointer", color: TEXT2 }} onClick={() => tutorial.show()}>help</span>
          <Link to="/pro" style={{ color: TEXT2, textDecoration: "none", fontSize: 11, fontWeight: 700 }}>Pricing</Link>
          <div onClick={() => navigate("/settings")} style={{ width: 28, height: 28, borderRadius: "50%", background: "#8b1a2a", border: `2px solid ${GOLD}`, color: GOLD, fontWeight: 800, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {displayName}
          </div>
        </div>
      </nav>
      <div>{children}</div>
        <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT[location.pathname] || []} title="How it works" />
    </div>
  );
}


