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
  photoUrl?: string;
  photoAlt?: string;
  photoLoading: boolean;
  svgContent?: string;
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
  { label: "Keynesian Economics", tag: "Econ" },
  { label: "Mitosis", tag: "Bio" },
  { label: "The Immune System", tag: "Bio" },
  { label: "Supply & Demand", tag: "Econ" },
  { label: "Black Holes", tag: "Physics" },
  { label: "Neural Networks", tag: "CS" },
  { label: "The Krebs Cycle", tag: "Chem" },
  { label: "The Water Cycle", tag: "Earth" },
];

// ── Image Helpers ─────────────────────────────────────────────────────────────
function unsplashUrl(scene: Scene): string {
  const keyword = encodeURIComponent(scene.unsplashQuery.split(" ").slice(0, 2).join(","));
  const seed = Math.abs((scene.id + scene.title).split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  return `https://loremflickr.com/800/500/${keyword}?lock=${seed}`;
}

function pollinationsUrl(concept: string, scene: Scene): string {
  const prompt = encodeURIComponent(`Educational illustration of ${concept}: ${scene.title}, clean flat vector art`);
  return `https://image.pollinations.ai/prompt/${prompt}?width=800&height=500&nologo=true`;
}

function urlLoads(url: string, timeout = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      resolve(false);
    }, timeout);
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

async function wikimediaImageUrl(concept: string, scene: Scene): Promise<string | null> {
  try {
    const titlesToTry = [
      scene.exactWikipediaTitle,
      scene.title,
      concept,
    ].filter(Boolean) as string[];

    for (const title of titlesToTry) {
      const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.thumbnail?.source) {
          return data.thumbnail.source;
        }
        if (data.originalimage?.source) {
          return data.originalimage.source;
        }
      }
    }
  } catch {
    // Ignore Wikipedia network failures
  }
  return null;
}

async function resolveSceneImage(concept: string, scene: Scene): Promise<{ url: string; isSvg?: boolean }> {
  // 1. Wikipedia lead image
  try {
    const wiki = await wikimediaImageUrl(concept, scene);
    if (wiki && (await urlLoads(wiki, 3000))) {
      return { url: wiki };
    }
  } catch {}

  // 2. Unsplash / LoremFlickr
  try {
    const flickr = unsplashUrl(scene);
    if (await urlLoads(flickr, 3500)) {
      return { url: flickr };
    }
  } catch {}

  // 3. Pollinations AI
  try {
    const poll = pollinationsUrl(concept, scene);
    if (await urlLoads(poll, 5000)) {
      return { url: poll };
    }
  } catch {}

  // 4. Clean Vector SVG fallback
  const svg = `<svg width="100%" height="100%" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#FAF7F2"/>
    <rect x="10" y="10" width="380" height="230" fill="#FFFDF5" stroke="#000" stroke-width="3" rx="8"/>
    <circle cx="200" cy="100" r="45" fill="#f0a040" stroke="#000" stroke-width="3"/>
    <text x="200" y="108" font-family="'Fredoka One', cursive, sans-serif" font-size="28" text-anchor="middle" fill="#000">💡</text>
    <text x="200" y="175" font-family="system-ui, sans-serif" font-weight="900" font-size="16" text-anchor="middle" fill="#000">${scene.title.slice(0, 32)}</text>
    <text x="200" y="200" font-family="system-ui, sans-serif" font-weight="700" font-size="12" text-anchor="middle" fill="#8b1a2a">${concept.slice(0, 36)}</text>
  </svg>`;

  return { url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, isSvg: true };
}

// ── Fallback Storyboard Generator (Never let a 503 block the student!) ─────────
function generateLocalStoryboard(concept: string): StoryboardResult {
  const c = concept.trim();
  return {
    concept: c,
    scenes: [
      {
        id: "s1",
        title: "The Core Foundation",
        anchorPhrase: `Picture the starting trigger that sets "${c}" into motion.`,
        whyItWorks: "Anchors the abstract principle to a concrete physical starting point.",
        unsplashQuery: `${c} origin spark`,
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
        anchorPhrase: `Look at the lasting ripple effect on the surrounding ecosystem.`,
        whyItWorks: "Reinforces retention by showing the ultimate outcome in reality.",
        unsplashQuery: `${c} result impact`,
        exactWikipediaTitle: c,
      },
    ],
  };
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

  // Keep source synced
  useEffect(() => {
    const sync = () => setActiveSource(getActiveSource()?.name ?? null);
    sync();
    const unsub = onSourceChange(sync);
    return unsub;
  }, []);

  // QuickLaunch prefill support
  useEffect(() => {
    const prefill = sessionStorage.getItem("quicklaunch_prompt");
    if (prefill && prefill.trim()) {
      setConceptInput(prefill.trim());
      sessionStorage.removeItem("quicklaunch_prompt");
      sessionStorage.removeItem("quicklaunch_tool");
    }
  }, []);

  // Save gallery persistence
  const handleSaveScene = (scene: SceneWithPhoto) => {
    const url = scene.photoUrl || "";
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

  // Restore history entry
  const handleHistorySelect = (entry: HistoryEntry) => {
    try {
      const parsed: StoryboardResult = typeof entry.data === "string" ? JSON.parse(entry.data) : (entry.data as StoryboardResult);
      if (!parsed || !parsed.scenes) return;
      setActiveConcept(parsed.concept);
      const restored: SceneWithPhoto[] = parsed.scenes.map((s) => ({
        ...s,
        photoUrl: unsplashUrl(s),
        photoAlt: `${parsed.concept} — ${s.title}`,
        photoLoading: false,
      }));
      setScenes(restored);
      setPhase("result");
      setSidebarOpen(false);
    } catch {
      // Ignore
    }
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
      // Graceful fallback: Never block the student with a 503 error!
      parsed = generateLocalStoryboard(target);
    }

    if (!parsed || !parsed.scenes || parsed.scenes.length === 0) {
      parsed = generateLocalStoryboard(target);
    }

    // Set initial scenes with loading state
    const initialScenes: SceneWithPhoto[] = parsed.scenes.map((s) => ({
      ...s,
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

    // Asynchronously resolve photos for each scene
    for (let i = 0; i < parsed.scenes.length; i++) {
      const scene = parsed.scenes[i];
      resolveSceneImage(parsed.concept, scene).then(({ url, isSvg }) => {
        setScenes((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  photoUrl: url,
                  photoAlt: `${target} - ${scene.title}`,
                  photoLoading: false,
                  svgContent: isSvg ? url : undefined,
                }
              : s
          )
        );
      });
      // Stagger slightly
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  const handleRegenerateScene = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;
    setScenes((prev) => prev.map((s, idx) => (idx === index ? { ...s, photoLoading: true } : s)));
    const { url, isSvg } = await resolveSceneImage(activeConcept, scene);
    setScenes((prev) =>
      prev.map((s, idx) =>
        idx === index
          ? {
              ...s,
              photoUrl: url,
              photoLoading: false,
              svgContent: isSvg ? url : undefined,
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

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b-2 border-black bg-[#FAF7F2] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/dashboard")} className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5">
            <span className="material-symbols-outlined text-[20px] block">arrow_back</span>
          </button>
          <span className="font-['Fredoka_One',cursive] text-lg text-[#8b1a2a]">Visual Learner</span>
        </div>
        <div className="flex items-center gap-2">
          {savedImages.length > 0 && (
            <button
              onClick={() => setPhase(phase === "gallery" ? "setup" : "gallery")}
              className={`px-3 py-1 text-xs font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] ${phase === "gallery" ? "bg-[#8b1a2a] text-white" : "bg-white text-black"}`}
            >
              Saved ({savedImages.length})
            </button>
          )}
          <button onClick={() => setSidebarOpen(true)} className="p-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-[20px] block">history</span>
          </button>
        </div>
      </header>

      {/* Desktop Main Content Area */}
      <div className="md:ml-64 flex flex-col flex-1 pb-24 md:pb-12">
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

        {/* ── Main Container ── */}
        <main className="max-w-5xl mx-auto w-full px-4 md:px-8 py-8 flex flex-col gap-8">
          {/* ═══════════════════════════════════════════════════════════════
              GALLERY VIEW
              ═══════════════════════════════════════════════════════════════ */}
          {phase === "gallery" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <div>
                  <h2 className="text-2xl font-black">Saved Memory Gallery</h2>
                  <p className="text-sm font-bold text-black/60">Your saved visual anchors and scene snapshots</p>
                </div>
                <button
                  onClick={() => setPhase(scenes.length > 0 ? "result" : "setup")}
                  className="px-4 py-2 border-2 border-black bg-white font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-black hover:text-white transition-colors"
                >
                  Back to Storyboard
                </button>
              </div>

              {savedImages.length === 0 ? (
                <div className="border-4 border-dashed border-black/30 p-12 text-center flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-black/40">photo_library</span>
                  <p className="font-black text-lg">No saved images yet</p>
                  <p className="text-xs font-bold text-black/60 max-w-sm">Hit "Save Anchor" on any scene card during your storyboard review to pin it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedImages.map((item) => (
                    <div key={item.id} className="bg-white border-3 border-black shadow-[4px_4px_0px_0px_#000] flex flex-col overflow-hidden">
                      <div className="h-44 w-full bg-black/5 overflow-hidden relative border-b-2 border-black">
                        {item.url.startsWith("data:image/svg") ? (
                          <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(item.url.replace("data:image/svg+xml;utf8,", "")) }} className="w-full h-full" />
                        ) : (
                          <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#8b1a2a] bg-[#8b1a2a]/10 px-2 py-0.5 rounded border border-[#8b1a2a]/30">
                            {item.concept}
                          </span>
                          <h4 className="font-black text-sm mt-1">{item.title}</h4>
                          <p className="text-xs font-bold text-black/70 italic mt-1 bg-[#FFF9E6] p-2 border border-black/20">"{item.anchor}"</p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-black/10">
                          <button
                            onClick={() => setZoomImage({ url: item.url, title: item.title, anchor: item.anchor })}
                            className="text-xs font-black flex items-center gap-1 hover:text-[#8b1a2a]"
                          >
                            <span className="material-symbols-outlined text-[16px]">zoom_in</span> Zoom
                          </button>
                          <button
                            onClick={() => handleRemoveSaved(item.id)}
                            className="text-xs font-bold text-black/40 hover:text-red-600 transition-colors"
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
              SETUP HERO CARD (Input & Concept Selection)
              ═══════════════════════════════════════════════════════════════ */}
          {phase !== "gallery" && (
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-6 md:p-8 flex flex-col gap-6">
              {/* Badge & Title */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 bg-[#f0a040] border-2 border-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
                    Vision Dual-Coding
                  </span>
                  <span className="text-xs font-bold text-black/60 hidden sm:inline">4 Memorable Storyboard Anchors</span>
                </div>
                {activeSource && (
                  <button
                    onClick={() => setConceptInput(activeSource.replace(/\.[^/.]+$/, ""))}
                    className="text-xs font-bold border-2 border-black px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#8b1a2a] hover:text-white transition-colors"
                  >
                    Paste Active Source
                  </button>
                )}
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-black text-black tracking-tight leading-tight">
                  What concept do you want to visualize?
                </h2>
                <p className="text-sm font-bold text-black/60 mt-1">
                  Rex breaks down any complex lesson into 4 photographic mnemonic scenes linked with memorable audio-visual anchor phrases.
                </p>
              </div>

              {/* Input Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={conceptInput}
                    onChange={(e) => setConceptInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="e.g. Keynesian Economics, Mitosis, Supply & Demand, The Krebs Cycle..."
                    className="w-full bg-[#FAF7F2] border-3 border-black px-4 py-3.5 text-base font-extrabold focus:outline-none focus:bg-white focus:shadow-[4px_4px_0px_0px_#000] transition-all placeholder:text-black/30"
                  />
                  {conceptInput && (
                    <button
                      onClick={() => setConceptInput("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/10 flex items-center justify-center hover:bg-black hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleGenerate()}
                  disabled={!conceptInput.trim() || phase === "loading"}
                  className="bg-[#f0a040] hover:bg-[#e09030] disabled:opacity-50 disabled:cursor-not-allowed border-3 border-black px-8 py-3.5 font-black uppercase tracking-wider text-sm shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">movie</span>
                  <span>{phase === "loading" ? "Building Story..." : "Build Visual Story"}</span>
                </button>
              </div>

              {/* Preset Chips */}
              <div className="flex flex-col gap-2 pt-2 border-t-2 border-black/10">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/50">Quick-Launch Inspiration:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CONCEPTS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setConceptInput(p.label);
                        handleGenerate(p.label);
                      }}
                      className="px-3 py-1.5 border-2 border-black bg-[#FAF7F2] hover:bg-[#8b1a2a] hover:text-white font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
                    >
                      <span>{p.label}</span>
                      <span className="text-[9px] font-extrabold opacity-60 bg-black/10 px-1 rounded">{p.tag}</span>
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
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-10 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-16 h-16 border-4 border-black bg-[#f0a040] flex items-center justify-center shadow-[4px_4px_0px_0px_#000] animate-bounce">
                <span className="material-symbols-outlined text-3xl">psychology</span>
              </div>
              <div>
                <h3 className="text-xl font-black">Synthesizing Visual Anchors for "{activeConcept}"</h3>
                <p className="text-sm font-bold text-black/60 mt-1">Formulating 4-scene cognitive dual-coding associations...</p>
              </div>
              <div className="w-full max-w-md h-3 border-2 border-black bg-[#FAF7F2] overflow-hidden p-0.5">
                <div className="h-full bg-[#8b1a2a] animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              STORYBOARD RESULTS (4-Scene Deck)
              ═══════════════════════════════════════════════════════════════ */}
          {phase === "result" && scenes.length > 0 && (
            <div className="flex flex-col gap-6">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-3 border-black pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#8b1a2a] text-white font-black text-[11px] px-2.5 py-0.5 border border-black uppercase tracking-wider">
                      Storyboard Active
                    </span>
                    <span className="text-xs font-bold text-black/50">4 Memory Frames</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-1">{activeConcept}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerate(activeConcept)}
                    className="px-3.5 py-2 border-2 border-black bg-[#FAF7F2] hover:bg-black hover:text-white font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Regenerate All</span>
                  </button>
                  <button
                    onClick={() => {
                      setConceptInput("");
                      setScenes([]);
                      setPhase("setup");
                    }}
                    className="px-3.5 py-2 border-2 border-black bg-white hover:bg-[#8b1a2a] hover:text-white font-black text-xs shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    New Concept
                  </button>
                </div>
              </div>

              {/* 4 Storyboard Scenes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenes.map((scene, index) => {
                  const badgeColors = ["bg-[#f0a040]", "bg-[#38bdf8]", "bg-[#34d399]", "bg-[#f43f5e]"];
                  const badgeColor = badgeColors[index % badgeColors.length];

                  return (
                    <div
                      key={scene.id || index}
                      className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] flex flex-col overflow-hidden transition-all hover:-translate-y-1"
                    >
                      {/* Scene Header */}
                      <div className="bg-[#FAF7F2] border-b-3 border-black px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 border-2 border-black font-black text-xs uppercase shadow-[1px_1px_0px_0px_#000] ${badgeColor}`}>
                            Scene {index + 1}
                          </span>
                          <span className="font-extrabold text-xs text-black/70">Frame {index + 1} of 4</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRegenerateScene(index)}
                            disabled={scene.photoLoading}
                            title="Regenerate this scene"
                            className="p-1 border border-black bg-white hover:bg-black hover:text-white text-xs font-bold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] block">sync</span>
                          </button>
                          <button
                            onClick={() => handleSaveScene(scene)}
                            title="Save anchor to your gallery"
                            className="p-1 border border-black bg-white hover:bg-[#8b1a2a] hover:text-white text-xs font-bold transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px] block">bookmark</span>
                          </button>
                        </div>
                      </div>

                      {/* Image Frame Viewport */}
                      <div
                        onClick={() => scene.photoUrl && setZoomImage({ url: scene.photoUrl, title: scene.title, anchor: scene.anchorPhrase })}
                        className="h-56 bg-black/5 relative overflow-hidden cursor-zoom-in border-b-3 border-black group"
                      >
                        {scene.photoLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#FAF7F2]">
                            <div className="w-8 h-8 border-3 border-black border-t-[#f0a040] rounded-full animate-spin" />
                            <span className="text-[11px] font-black uppercase text-black/50">Fetching Visual...</span>
                          </div>
                        ) : scene.svgContent ? (
                          <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(scene.svgContent.replace("data:image/svg+xml;utf8,", "")) }} className="w-full h-full" />
                        ) : scene.photoUrl ? (
                          <img
                            src={scene.photoUrl}
                            alt={scene.photoAlt || scene.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-black/40">
                            Image Unavailable
                          </div>
                        )}

                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white font-extrabold text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">fullscreen</span> Click to expand
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                        <div>
                          <h4 className="font-black text-lg text-black leading-snug">{scene.title}</h4>

                          {/* Anchor Phrase Quotation */}
                          <div className="mt-3 bg-[#FFF9E6] border-2 border-black p-3.5 shadow-[2px_2px_0px_0px_#000] relative">
                            <span className="text-xs font-black uppercase tracking-wider text-[#8b1a2a] block mb-1">
                              🗣️ Memory Anchor:
                            </span>
                            <p className="font-extrabold text-sm text-[#8b1a2a] italic leading-relaxed">
                              "{scene.anchorPhrase}"
                            </p>
                          </div>
                        </div>

                        {/* Cognitive Connection */}
                        <div className="pt-3 border-t-2 border-black/10">
                          <span className="text-[10px] font-black uppercase tracking-wider text-black/50 block mb-0.5">
                            Why this works:
                          </span>
                          <p className="text-xs font-bold text-black/75 leading-relaxed">{scene.whyItWorks}</p>
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] max-w-3xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="bg-[#f0a040] border-b-3 border-black p-4 flex items-center justify-between">
              <h3 className="font-black text-lg">{zoomImage.title}</h3>
              <button
                onClick={() => setZoomImage(null)}
                className="w-8 h-8 border-2 border-black bg-white hover:bg-black hover:text-white font-black flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[65vh] bg-black/5 flex items-center justify-center overflow-hidden">
              {zoomImage.url.startsWith("data:image/svg") ? (
                <div dangerouslySetInnerHTML={{ __html: decodeURIComponent(zoomImage.url.replace("data:image/svg+xml;utf8,", "")) }} className="w-full h-96" />
              ) : (
                <img src={zoomImage.url} alt={zoomImage.title} className="max-h-[65vh] w-auto object-contain" />
              )}
            </div>
            <div className="p-4 bg-[#FFF9E6] border-t-3 border-black">
              <span className="text-xs font-black uppercase tracking-wider text-[#8b1a2a] block mb-1">Anchor Phrase:</span>
              <p className="font-black text-base text-[#8b1a2a] italic">"{zoomImage.anchor}"</p>
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
          <div className="relative w-full max-w-sm bg-[#FAF7F2] border-l-4 border-black shadow-[-6px_0px_0px_0px_#000] h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b-3 border-black bg-[#f0a040] flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Visual History</h3>
                <span className="text-xs font-bold text-black/70">{toolHistory.length} saved sessions</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 border-2 border-black bg-white hover:bg-black hover:text-white font-black flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {toolHistory.length === 0 ? (
                <div className="text-center py-12 text-black/40 font-bold text-sm">No saved visual stories yet</div>
              ) : (
                [...toolHistory].reverse().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleHistorySelect(item)}
                    className="p-3.5 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-1 cursor-pointer transition-all flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-black truncate">{item.title}</h4>
                      <span className="text-[10px] font-bold text-black/40">
                        {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {item.subtitle && <p className="text-xs font-bold text-black/60 italic truncate">"{item.subtitle}"</p>}
                  </div>
                ))
              )}
            </div>

            {toolHistory.length > 0 && (
              <div className="p-4 border-t-3 border-black bg-white">
                <button
                  onClick={() => {
                    saveHistory("visual", []);
                    setToolHistory([]);
                  }}
                  className="w-full py-2 border-2 border-black bg-[#FAF7F2] hover:bg-red-500 hover:text-white font-black text-xs uppercase tracking-wider transition-colors"
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
