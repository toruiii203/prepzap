import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SharedSidebar } from "@/components/SharedSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useStudySession } from "@/hooks/useStudySession";
import { callGroq, safeParseJSON } from "@/lib/groq";
import { buildAIContext, getActiveSource, onSourceChange } from "@/lib/sourceContext";
import { loadHistory, addHistoryEntry, saveHistory } from "@/lib/historyStore";
import type { HistoryEntry } from "@/components/ToolShell";
import { useTutorialModal } from "@/hooks/useTutorialModal";
import { TutorialModal } from "@/components/TutorialModal";
import { TUTORIAL_CONTENT } from "@/lib/tutorialContent";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Scene {
  id: string;
  title: string;
  anchorPhrase: string;
  whyItWorks: string;
  unsplashQuery: string;
  exactWikipediaTitle?: string;
}

interface StoryboardResult {
  concept: string;
  scenes: Scene[];
}

interface SceneWithPhoto extends Scene {
  candidateUrls: string[];
  photoAlt?: string;
  photoLoading: boolean;
}

interface SavedVisualItem {
  id: string;
  url: string;
  concept: string;
  title: string;
  anchor: string;
  savedAt: string;
}

// ── Preset Concepts ──────────────────────────────────────────────────────────
const PRESET_CONCEPTS = [
  { label: "Organ Systems", tag: "Bio" },
  { label: "Keynesian Economics", tag: "Econ" },
  { label: "Mitosis", tag: "Bio" },
  { label: "The Immune System", tag: "Bio" },
  { label: "Supply & Demand", tag: "Econ" },
  { label: "Black Holes", tag: "Physics" },
  { label: "Neural Networks", tag: "CS" },
  { label: "The Krebs Cycle", tag: "Chem" },
  { label: "The Water Cycle", tag: "Earth" },
];

// ── Educational SVG Generator ────────────────────────────────────────────────
function generateThematicSvg(concept: string, scene: Scene, index: number): string {
  const palettes = [
    { bg: "#FDF8F0", card: "#FFF9E6", accent: "#f0a040", icon: "🔬" },
    { bg: "#F0F7FF", card: "#E6F0FF", accent: "#38bdf8", icon: "⚡" },
    { bg: "#F2FBF5", card: "#E6F7ED", accent: "#34d399", icon: "🌱" },
    { bg: "#FFF4F5", card: "#FFE6E8", accent: "#f43f5e", icon: "💡" },
  ];
  const p = palettes[index % palettes.length];

  const svg = `<svg width="100%" height="100%" viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${p.bg}"/>
    <rect x="12" y="12" width="376" height="216" fill="${p.card}" stroke="#000" stroke-width="2.5" rx="6"/>
    
    <!-- Accent Badge Circle -->
    <circle cx="200" cy="75" r="38" fill="${p.accent}" stroke="#000" stroke-width="2.5"/>
    <text x="200" y="86" font-family="'Fredoka One', cursive, sans-serif" font-size="28" text-anchor="middle">${p.icon}</text>
    
    <!-- Title Text -->
    <text x="200" y="145" font-family="system-ui, sans-serif" font-weight="900" font-size="15" text-anchor="middle" fill="#000">${scene.title.slice(0, 36)}</text>
    <text x="200" y="172" font-family="system-ui, sans-serif" font-weight="700" font-size="11" text-anchor="middle" fill="#8b1a2a">${concept.slice(0, 38)}</text>
    
    <!-- Visual Deck Indicator -->
    <rect x="160" y="195" width="80" height="12" fill="#000" rx="3"/>
    <text x="200" y="204" font-family="system-ui, sans-serif" font-weight="800" font-size="8" text-anchor="middle" fill="#fff">SCENE ${index + 1} ANCHOR</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ── Wikipedia Educational Image Fetcher ──────────────────────────────────────
async function fetchWikipediaImage(query: string): Promise<string | null> {
  try {
    const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=600&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&origin=*`;
    const res = await fetch(endpoint, { headers: { "User-Agent": "Studenius/1.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (pages) {
      for (const pid of Object.keys(pages)) {
        const thumb = pages[pid]?.thumbnail?.source;
        if (thumb) return thumb;
      }
    }
  } catch {
    // Ignore CORS / network errors
  }
  return null;
}

// ── Smart Local Dual-Coding Storyboard Generator ─────────────────────────────
function generateLocalStoryboard(concept: string): StoryboardResult {
  const c = concept.trim();
  return {
    concept: c,
    scenes: [
      {
        id: "s1",
        title: "The Core Foundation",
        anchorPhrase: `Picture the starting trigger that activates ${c}.`,
        whyItWorks: "Anchors the abstract principle to a concrete physical starting point.",
        unsplashQuery: `${c} core start`,
        exactWikipediaTitle: c,
      },
      {
        id: "s2",
        title: "The Driving Mechanism",
        anchorPhrase: `Watch how the components interlock like gears in a clock.`,
        whyItWorks: "Dual-coding transforms logical relationships into spatial machinery.",
        unsplashQuery: `${c} mechanism system`,
        exactWikipediaTitle: c,
      },
      {
        id: "s3",
        title: "The Turning Point",
        anchorPhrase: `See the critical tipping point where everything balances or shifts.`,
        whyItWorks: "Associates conditional rules with a dramatic visual transition.",
        unsplashQuery: `${c} reaction balance`,
        exactWikipediaTitle: c,
      },
      {
        id: "s4",
        title: "The Real-World Impact",
        anchorPhrase: `Look at the lasting ripple effect across the surrounding system.`,
        whyItWorks: "Reinforces retention by showing the ultimate outcome in reality.",
        unsplashQuery: `${c} result impact`,
        exactWikipediaTitle: c,
      },
    ],
  };
}

// ── Storyboard Image with Native Fallback Ladder ─────────────────────────────
function StoryboardImage({
  candidates,
  alt,
  onImageLoaded,
}: {
  candidates: string[];
  alt: string;
  onImageLoaded?: (url: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const currentUrl = candidates[index] || candidates[candidates.length - 1];

  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      setLoaded(false);
    }
  };

  const handleLoad = () => {
    setLoaded(true);
    onImageLoaded?.(currentUrl);
  };

  if (!currentUrl) return null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#FAF7F2] flex items-center justify-center">
      {!loaded && !currentUrl.startsWith("data:image/svg") && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAF7F2]">
          <div className="w-6 h-6 border-2 border-black border-t-[#f0a040] rounded-full animate-spin" />
        </div>
      )}
      <img
        src={currentUrl}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded || currentUrl.startsWith("data:image/svg") ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

export default function VisualLearner() {
  const navigate = useNavigate();
  const tutorial = useTutorialModal("/visual-learner");
  const { isPro, canUse, logUsage } = usePlan();
  const { logSession } = useStudySession();

  // State
  const [conceptInput, setConceptInput] = useState("");
  const [activeConcept, setActiveConcept] = useState("");
  const [phase, setPhase] = useState<"setup" | "loading" | "result" | "gallery">("setup");
  const [scenes, setScenes] = useState<SceneWithPhoto[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; anchor: string } | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(() => getActiveSource()?.name ?? null);

  // History & Saved Images
  const [toolHistory, setToolHistory] = useState<HistoryEntry[]>(() => loadHistory("visual"));
  const [savedImages, setSavedImages] = useState<SavedVisualItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pz_visual_saved") || "[]");
    } catch {
      return [];
    }
  });

  // Sync active source
  useEffect(() => {
    const sync = () => setActiveSource(getActiveSource()?.name ?? null);
    sync();
    const unsub = onSourceChange(sync);
    return unsub;
  }, []);

  // QuickLaunch prefill
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    if (prefill && prefill.trim()) {
      setConceptInput(prefill.trim());
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  }, []);

  // Save anchor to gallery
  const handleSaveScene = (scene: SceneWithPhoto) => {
    const url = scene.candidateUrls[0] || "";
    if (!url) return;
    const item: SavedVisualItem = {
      id: `${scene.id}-${Date.now()}`,
      url,
      concept: activeConcept,
      title: scene.title,
      anchor: scene.anchorPhrase,
      savedAt: new Date().toISOString(),
    };
    setSavedImages((prev) => {
      const next = [item, ...prev.filter((i) => i.url !== url)];
      localStorage.setItem("pz_visual_saved", JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveSaved = (id: string) => {
    setSavedImages((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem("pz_visual_saved", JSON.stringify(next));
      return next;
    });
  };

  // Restore past session
  const handleHistorySelect = (entry: HistoryEntry) => {
    try {
      const parsed: StoryboardResult = typeof entry.data === "string" ? JSON.parse(entry.data) : (entry.data as StoryboardResult);
      if (!parsed || !parsed.scenes) return;
      setActiveConcept(parsed.concept);
      const restored: SceneWithPhoto[] = parsed.scenes.map((s, idx) => ({
        ...s,
        candidateUrls: [generateThematicSvg(parsed.concept, s, idx)],
        photoAlt: `${parsed.concept} — ${s.title}`,
        photoLoading: false,
      }));
      setScenes(restored);
      setPhase("result");
      setSidebarOpen(false);
    } catch {}
  };

  // Build candidate image ladder for a scene
  const buildCandidateUrls = async (concept: string, scene: Scene, index: number): Promise<string[]> => {
    const svgFallback = generateThematicSvg(concept, scene, index);
    const candidates: string[] = [];

    // 1. Try exact Wikipedia article or query via Wikimedia Search API
    const wikiQuery = scene.exactWikipediaTitle || scene.title || concept;
    try {
      const wikiThumb = await fetchWikipediaImage(wikiQuery);
      if (wikiThumb) candidates.push(wikiThumb);
    } catch {}

    // 2. Try concept Wikipedia query
    if (candidates.length === 0 && concept !== wikiQuery) {
      try {
        const conceptThumb = await fetchWikipediaImage(concept);
        if (conceptThumb) candidates.push(conceptThumb);
      } catch {}
    }

    // 3. Fallback to Thematic SVG (guaranteed 100% reliable)
    candidates.push(svgFallback);

    return candidates;
  };

  // Main Storyboard Generator
  const handleGenerate = async (targetOverride?: string) => {
    const target = (targetOverride ?? conceptInput).trim();
    if (!target) return;

    if (!isPro) {
      try {
        const allowed = await canUse("visual");
        if (!allowed) return;
      } catch {}
    }

    setActiveConcept(target);
    setPhase("loading");

    const sourceContext = buildAIContext();
    const systemPrompt = `You are a visual memory expert trained in cognitive dual-coding theory.
Create 4 vivid, photographable scene associations that make abstract concepts permanently memorable.
Each scene must be grounded in an intuitive real-world moment or concrete physical visual.

Return ONLY a raw JSON object (no markdown, no backticks):
{
  "concept": "${target}",
  "scenes": [
    {
      "id": "s1",
      "title": "<3-5 word scene title>",
      "anchorPhrase": "<1 clear sentence the student repeats when visualizing this moment>",
      "whyItWorks": "<1 sentence explaining why this visual triggers recall>",
      "unsplashQuery": "<2-4 word specific photography search terms>",
      "exactWikipediaTitle": "<exact Wikipedia article title for image lookup>"
    }
  ]
}`;

    let parsed: StoryboardResult | null = null;

    try {
      const raw = await callGroq(
        [{ role: "user", content: `Generate a 4-scene visual memory storyboard for: "${target}"\n${sourceContext ? `Source Context:\n${sourceContext}` : ""}` }],
        systemPrompt,
        "openai/gpt-oss-20b",
        2048,
        "visual_learner"
      );

      parsed = safeParseJSON<StoryboardResult>(raw);
    } catch (err: any) {
      console.warn("[VisualLearner] Groq error or 503 hit, using intelligent local dual-coding storyboard:", err);
      parsed = generateLocalStoryboard(target);
    }

    if (!parsed || !parsed.scenes || parsed.scenes.length === 0) {
      parsed = generateLocalStoryboard(target);
    }

    // Initialize scenes with instant SVGs so the screen is never blank
    const initialScenes: SceneWithPhoto[] = parsed.scenes.map((s, idx) => ({
      ...s,
      candidateUrls: [generateThematicSvg(parsed.concept, s, idx)],
      photoLoading: true,
    }));
    setScenes(initialScenes);
    setPhase("result");

    // Save history
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      title: target,
      subtitle: parsed.scenes[0]?.anchorPhrase ?? target,
      timestamp: new Date(),
      data: parsed,
    };
    const nextHist = addHistoryEntry("visual", entry, toolHistory);
    setToolHistory(nextHist);

    // Log study session
    await logSession({ title: `Visual Story: ${target}`, durationMinutes: 6 });
    try {
      await logUsage("visual");
    } catch {}

    // Resolve Wikipedia educational images in background
    for (let i = 0; i < parsed.scenes.length; i++) {
      const scene = parsed.scenes[i];
      buildCandidateUrls(parsed.concept, scene, i).then((urls) => {
        setScenes((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  candidateUrls: urls,
                  photoAlt: `${target} - ${scene.title}`,
                  photoLoading: false,
                }
              : s
          )
        );
      });
    }
  };

  const handleRegenerateScene = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;
    setScenes((prev) => prev.map((s, idx) => (idx === index ? { ...s, photoLoading: true } : s)));
    const urls = await buildCandidateUrls(activeConcept, scene, index);
    setScenes((prev) =>
      prev.map((s, idx) =>
        idx === index
          ? {
              ...s,
              candidateUrls: urls,
              photoLoading: false,
            }
          : s
      )
    );
  };

  return (
    <div className="w-full bg-[#FAF7F2] min-h-screen flex flex-col font-['Nunito',system-ui,sans-serif] text-black">
      <TutorialModal isOpen={tutorial.isOpen} onDismiss={tutorial.dismiss} features={TUTORIAL_CONTENT["/visual-learner"] || []} title="Visual Learner" />

      {/* Shared Sidebar for Desktop */}
      <SharedSidebar active="/visual-learner" />

      {/* Mobile Top Header (Compact & Clean) */}
      <header className="md:hidden flex items-center justify-between px-3 py-2.5 border-b-2 border-black bg-[#FAF7F2] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[18px] block">arrow_back</span>
          </button>
          <span className="font-['Fredoka_One',cursive] text-base text-[#8b1a2a]">Visual Learner</span>
        </div>
        <div className="flex items-center gap-1.5">
          {savedImages.length > 0 && (
            <button
              onClick={() => setPhase(phase === "gallery" ? "setup" : "gallery")}
              className={`px-2.5 py-1 text-[11px] font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                phase === "gallery" ? "bg-[#8b1a2a] text-white" : "bg-white text-black"
              }`}
            >
              Saved ({savedImages.length})
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000]"
          >
            <span className="material-symbols-outlined text-[18px] block">history</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="md:ml-64 flex flex-col flex-1 pb-20 md:pb-12">
        {/* Desktop Header */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-black/50 uppercase tracking-widest">
                <span>Tools</span>
                <span>/</span>
                <span className="text-black font-extrabold">Visual Learner</span>
              </div>
              <h1 className="text-[20px] font-black tracking-tight leading-none text-black">Dual-Coding Memory Lab</h1>
            </div>

            {activeSource && (
              <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1 bg-[#FFFDF5] shadow-[2px_2px_0px_0px_#000]">
                <span className="material-symbols-outlined text-[16px] text-[#8b1a2a]">description</span>
                <span className="text-[12px] font-bold truncate max-w-[200px]">{activeSource}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => tutorial.show()}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors font-bold text-xs shadow-[2px_2px_0px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              <span>Guide</span>
            </button>

            <button
              onClick={() => setPhase(phase === "gallery" ? "setup" : "gallery")}
              className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black font-bold text-xs shadow-[2px_2px_0px_0px_#000] transition-colors ${
                phase === "gallery" ? "bg-[#8b1a2a] text-white" : "bg-[#FFFDF5] hover:bg-[#FAF7F2]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">photo_library</span>
              <span>Saved Gallery ({savedImages.length})</span>
            </button>

            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-[#f0a040] hover:bg-[#e09030] font-black text-xs shadow-[2px_2px_0px_0px_#000]"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>History ({toolHistory.length})</span>
            </button>
          </div>
        </header>

        {/* ── Main Container (Compact & Responsive on Mobile) ── */}
        <main className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
          {/* ═══════════════════════════════════════════════════════════════
              GALLERY VIEW
              ═══════════════════════════════════════════════════════════════ */}
          {phase === "gallery" && (
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black">Saved Memory Gallery</h2>
                  <p className="text-xs sm:text-sm font-bold text-black/60">Your saved visual anchors and scene snapshots</p>
                </div>
                <button
                  onClick={() => setPhase(scenes.length > 0 ? "result" : "setup")}
                  className="px-3 py-1.5 border-2 border-black bg-white font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-black hover:text-white transition-colors"
                >
                  Back to Storyboard
                </button>
              </div>

              {savedImages.length === 0 ? (
                <div className="border-3 border-dashed border-black/30 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-4xl text-black/40">photo_library</span>
                  <p className="font-black text-base">No saved images yet</p>
                  <p className="text-xs font-bold text-black/60 max-w-sm">Hit "Save Anchor" on any scene card during your storyboard review to pin it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedImages.map((item) => (
                    <div key={item.id} className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] flex flex-col overflow-hidden">
                      <div className="h-36 w-full bg-black/5 overflow-hidden relative border-b-2 border-black">
                        {item.url.startsWith("data:image/svg") ? (
                          <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(item.url.replace("data:image/svg+xml;utf8,", "")) }} className="w-full h-full" />
                        ) : (
                          <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#8b1a2a] bg-[#8b1a2a]/10 px-1.5 py-0.5 rounded border border-[#8b1a2a]/30">
                            {item.concept}
                          </span>
                          <h4 className="font-black text-xs sm:text-sm mt-1">{item.title}</h4>
                          <p className="text-[11px] font-bold text-black/70 italic mt-1 bg-[#FFF9E6] p-1.5 border border-black/20">"{item.anchor}"</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-black/10">
                          <button
                            onClick={() => setZoomImage({ url: item.url, title: item.title, anchor: item.anchor })}
                            className="text-xs font-black flex items-center gap-1 hover:text-[#8b1a2a]"
                          >
                            <span className="material-symbols-outlined text-[15px]">zoom_in</span> Zoom
                          </button>
                          <button
                            onClick={() => handleRemoveSaved(item.id)}
                            className="text-[11px] font-bold text-black/40 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SETUP HERO CARD (Compact & Mobile-Optimized)
              ═══════════════════════════════════════════════════════════════ */}
          {phase !== "gallery" && (
            <div className="bg-white border-2 sm:border-4 border-black shadow-[3px_3px_0px_0px_#000] sm:shadow-[5px_5px_0px_0px_#000] p-3.5 sm:p-6 flex flex-col gap-3.5 sm:gap-5">
              {/* Badge & Title */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 bg-[#f0a040] border-2 border-black font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_#000]">
                  Vision Dual-Coding
                </span>
                {activeSource && (
                  <button
                    onClick={() => setConceptInput(activeSource.replace(/\.[^/.]+$/, ""))}
                    className="text-[11px] font-bold border-2 border-black px-2 py-0.5 bg-[#FAF7F2] hover:bg-[#8b1a2a] hover:text-white transition-colors"
                  >
                    Paste Active Source
                  </button>
                )}
              </div>

              <div>
                <h2 className="text-lg sm:text-2xl font-black text-black tracking-tight leading-snug">
                  What concept do you want to visualize?
                </h2>
                <p className="text-xs sm:text-sm font-bold text-black/60 mt-0.5">
                  Rex breaks down any lesson into 4 photographic mnemonic scenes linked with memorable memory anchor phrases.
                </p>
              </div>

              {/* Input Bar */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={conceptInput}
                    onChange={(e) => setConceptInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="e.g. Organ Systems, Mitosis, Supply & Demand..."
                    className="w-full bg-[#FAF7F2] border-2 border-black px-3.5 py-2.5 text-sm sm:text-base font-extrabold focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#000] transition-all placeholder:text-black/35"
                  />
                  {conceptInput && (
                    <button
                      onClick={() => setConceptInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/10 flex items-center justify-center hover:bg-black hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleGenerate()}
                  disabled={!conceptInput.trim() || phase === "loading"}
                  className="bg-[#f0a040] hover:bg-[#e09030] disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black px-6 py-2.5 font-black uppercase tracking-wider text-xs sm:text-sm shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">movie</span>
                  <span>{phase === "loading" ? "Building..." : "Build Visual Story"}</span>
                </button>
              </div>

              {/* Preset Chips (Single Horizontal Scrollable Row for Mobile) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-black/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-black/50">Quick-Launch Inspiration:</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                  {PRESET_CONCEPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setConceptInput(p.label);
                        handleGenerate(p.label);
                      }}
                      className="whitespace-nowrap px-2.5 py-1 border-2 border-black bg-[#FAF7F2] hover:bg-[#8b1a2a] hover:text-white font-extrabold text-[11px] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 shrink-0"
                    >
                      <span>{p.label}</span>
                      <span className="text-[9px] font-black opacity-60 bg-black/10 px-1 rounded">{p.tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              LOADING STATE
              ═══════════════════════════════════════════════════════════════ */}
          {phase === "loading" && (
            <div className="bg-white border-2 sm:border-4 border-black shadow-[4px_4px_0px_0px_#000] p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 sm:gap-4">
              <div className="w-12 h-12 border-3 border-black bg-[#f0a040] flex items-center justify-center shadow-[3px_3px_0px_0px_#000] animate-bounce">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black">Synthesizing Visual Anchors for "{activeConcept}"</h3>
                <p className="text-xs font-bold text-black/60 mt-0.5">Formulating 4-scene cognitive dual-coding associations...</p>
              </div>
              <div className="w-full max-w-xs h-2.5 border-2 border-black bg-[#FAF7F2] overflow-hidden p-0.5">
                <div className="h-full bg-[#8b1a2a] animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STORYBOARD RESULTS (Responsive 2x2 Grid)
              ═══════════════════════════════════════════════════════════════ */}
          {phase === "result" && scenes.length > 0 && (
            <div className="flex flex-col gap-4">
              {/* Header Bar */}
              <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-[#8b1a2a] text-white font-black text-[9px] sm:text-[10px] px-2 py-0.5 border border-black uppercase tracking-wider">
                      Storyboard
                    </span>
                    <span className="text-[11px] font-bold text-black/50">4 Memory Frames</span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight mt-0.5">{activeConcept}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleGenerate(activeConcept)}
                    className="px-2.5 py-1.5 border-2 border-black bg-[#FAF7F2] hover:bg-black hover:text-white font-black text-[11px] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>
                  <button
                    onClick={() => {
                      setConceptInput("");
                      setScenes([]);
                      setPhase("setup");
                    }}
                    className="px-2.5 py-1.5 border-2 border-black bg-white hover:bg-[#8b1a2a] hover:text-white font-black text-[11px] shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    New
                  </button>
                </div>
              </div>

              {/* 4 Storyboard Scenes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
                {scenes.map((scene, index) => {
                  const badgeColors = ["bg-[#f0a040]", "bg-[#38bdf8]", "bg-[#34d399]", "bg-[#f43f5e]"];
                  const badgeColor = badgeColors[index % badgeColors.length];

                  return (
                    <div
                      key={scene.id || index}
                      className="bg-white border-2 sm:border-3 border-black shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] flex flex-col overflow-hidden transition-all"
                    >
                      {/* Scene Header */}
                      <div className="bg-[#FAF7F2] border-b-2 border-black px-3 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 border border-black font-black text-[10px] sm:text-xs uppercase shadow-[1px_1px_0px_0px_#000] ${badgeColor}`}>
                            Scene {index + 1}
                          </span>
                          <span className="font-extrabold text-[11px] text-black/60">Frame {index + 1} of 4</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRegenerateScene(index)}
                            disabled={scene.photoLoading}
                            title="Regenerate scene visual"
                            className="p-1 border border-black bg-white hover:bg-black hover:text-white text-xs font-bold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px] block">sync</span>
                          </button>
                          <button
                            onClick={() => handleSaveScene(scene)}
                            title="Save anchor to your gallery"
                            className="p-1 border border-black bg-white hover:bg-[#8b1a2a] hover:text-white text-xs font-bold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px] block">bookmark</span>
                          </button>
                        </div>
                      </div>

                      {/* Image Frame Viewport (Responsive Height) */}
                      <div
                        onClick={() => {
                          const url = scene.candidateUrls[0] || "";
                          if (url) setZoomImage({ url, title: scene.title, anchor: scene.anchorPhrase });
                        }}
                        className="h-40 sm:h-48 bg-black/5 relative overflow-hidden cursor-zoom-in border-b-2 border-black group"
                      >
                        <StoryboardImage
                          candidates={scene.candidateUrls}
                          alt={scene.photoAlt || scene.title}
                          onImageLoaded={(loadedUrl) => {
                            // Keep loadedUrl at front of candidates
                            setScenes((prev) =>
                              prev.map((s, idx) =>
                                idx === index ? { ...s, candidateUrls: [loadedUrl, ...s.candidateUrls.filter((u) => u !== loadedUrl)] } : s
                              )
                            );
                          }}
                        />

                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/75 text-white font-extrabold text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">fullscreen</span> Expand
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
                        <div>
                          <h4 className="font-black text-sm sm:text-base text-black leading-snug">{scene.title}</h4>

                          {/* Anchor Phrase Quotation */}
                          <div className="mt-2 bg-[#FFF9E6] border-2 border-black p-2.5 sm:p-3 shadow-[1.5px_1.5px_0px_0px_#000] relative">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#8b1a2a] block mb-0.5">
                              🗣️ Memory Anchor:
                            </span>
                            <p className="font-extrabold text-xs sm:text-sm text-[#8b1a2a] italic leading-snug">
                              "{scene.anchorPhrase}"
                            </p>
                          </div>
                        </div>

                        {/* Cognitive Connection */}
                        <div className="pt-2 border-t border-black/10">
                          <span className="text-[9px] font-black uppercase tracking-wider text-black/50 block mb-0.5">
                            Why this works:
                          </span>
                          <p className="text-[11px] font-bold text-black/75 leading-relaxed">{scene.whyItWorks}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FULLSCREEN LIGHTBOX MODAL
          ═══════════════════════════════════════════════════════════════ */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-3 sm:border-4 border-black shadow-[6px_6px_0px_0px_#000] max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-[#f0a040] border-b-2 sm:border-b-3 border-black p-3 sm:p-4 flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base">{zoomImage.title}</h3>
              <button
                onClick={() => setZoomImage(null)}
                className="w-7 h-7 border-2 border-black bg-white hover:bg-black hover:text-white font-black flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] bg-black/5 flex items-center justify-center overflow-hidden">
              {zoomImage.url.startsWith("data:image/svg") ? (
                <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(zoomImage.url.replace("data:image/svg+xml;utf8,", "")) }} className="w-full h-80" />
              ) : (
                <img src={zoomImage.url} alt={zoomImage.title} className="max-h-[60vh] w-auto object-contain" />
              )}
            </div>
            <div className="p-3 sm:p-4 bg-[#FFF9E6] border-t-2 sm:border-t-3 border-black">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8b1a2a] block mb-0.5">Anchor Phrase:</span>
              <p className="font-black text-xs sm:text-sm text-[#8b1a2a] italic">"{zoomImage.anchor}"</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HISTORY SIDEBAR DRAWER
          ═══════════════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-xs" />
          <div className="relative w-full max-w-xs sm:max-w-sm bg-[#FAF7F2] border-l-3 sm:border-l-4 border-black shadow-[-4px_0px_0px_0px_#000] sm:shadow-[-6px_0px_0px_0px_#000] h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="p-3.5 border-b-2 sm:border-b-3 border-black bg-[#f0a040] flex items-center justify-between">
              <div>
                <h3 className="font-black text-base sm:text-lg">Visual History</h3>
                <span className="text-[11px] font-bold text-black/70">{toolHistory.length} saved sessions</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-7 h-7 border-2 border-black bg-white hover:bg-black hover:text-white font-black flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
              {toolHistory.length === 0 ? (
                <div className="text-center py-10 text-black/40 font-bold text-xs">No saved visual stories yet</div>
              ) : (
                [...toolHistory].reverse().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleHistorySelect(item)}
                    className="p-3 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-1 cursor-pointer transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs sm:text-sm text-black truncate">{item.title}</h4>
                      <span className="text-[9px] font-bold text-black/40">
                        {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {item.subtitle && <p className="text-[11px] font-bold text-black/60 italic truncate">"{item.subtitle}"</p>}
                  </div>
                ))
              )}
            </div>

            {toolHistory.length > 0 && (
              <div className="p-3 border-t-2 border-black bg-white">
                <button
                  onClick={() => {
                    saveHistory("visual", []);
                    setToolHistory([]);
                  }}
                  className="w-full py-1.5 border-2 border-black bg-[#FAF7F2] hover:bg-red-500 hover:text-white font-black text-[11px] uppercase tracking-wider transition-colors"
                >
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
