import React, { useState } from "react";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { AnimatedRex } from "@/components/AnimatedRex";
import { triggerXPBurst } from "@/components/FloatingXPBurst";
import { launchPathLesson, PathNodeInfo } from "@/lib/lessonLauncher";
import { getRexContext } from "@/lib/rexContext";

export interface PathNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "completed" | "active" | "locked" | "legendary";
  type: "lesson" | "practice" | "chest" | "boss";
  route?: string;
  xpReward: number;
}

interface StudyPathMapProps {
  subjectName: string;
  onSelectNode?: (node: PathNode) => void;
  navigate: (route: string) => void;
}

export function StudyPathMap({
  subjectName = "General Studies",
  onSelectNode,
  navigate,
}: StudyPathMapProps) {
  const [selectedNode, setSelectedNode] = useState<PathNode | null>(null);

  // Phase 4B: Context-Aware Rex
  const rexContext = getRexContext({
    streakDays: 3,
  });

  const nodes: PathNode[] = [
    {
      id: "node-1",
      title: "Diagnostic Baseline",
      description: "First win completed. Core knowledge baseline established.",
      icon: "check_circle",
      status: "completed",
      type: "lesson",
      route: "/practice",
      xpReward: 20,
    },
    {
      id: "node-2",
      title: "Active Recall Sprint",
      description: "5 rapid recall questions to strengthen memory retention.",
      icon: "bolt",
      status: "active",
      type: "practice",
      route: "/practice",
      xpReward: 35,
    },
    {
      id: "node-3",
      title: "Concept Mastery Flashcards",
      description: "Spaced repetition deck to lock concepts into long-term memory.",
      icon: "style",
      status: "locked",
      type: "lesson",
      route: "/flashcards",
      xpReward: 30,
    },
    {
      id: "node-4",
      title: "Scholar Treasure Chest",
      description: "Bonus sparks and streak protection for consistent study.",
      icon: "inventory_2",
      status: "locked",
      type: "chest",
      xpReward: 50,
    },
    {
      id: "node-5",
      title: "Arena Live Battle",
      description: "Challenge classmates or AI in a multiplayer speed showdown.",
      icon: "swords",
      status: "locked",
      type: "boss",
      route: "/rooms",
      xpReward: 60,
    },
  ];

  // Alternating lateral offsets for winding path: [center, right, center, left, center]
  const alignments = [
    "justify-center",
    "justify-end pr-8 sm:pr-14",
    "justify-center",
    "justify-start pl-8 sm:pl-14",
    "justify-center",
  ];

  const [isPathCollapsed, setIsPathCollapsed] = useState(() => {
    try {
      return localStorage.getItem("pz_path_map_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const togglePathCollapse = () => {
    playTap();
    setIsPathCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pz_path_map_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const startLesson = (node: PathNode, e?: React.MouseEvent) => {
    if (node.status === "locked") return;
    if (e) {
      triggerXPBurst(e.clientX, e.clientY - 25, `+${node.xpReward} XP`, "⚡");
    }
    playSuccess();

    if (node.route === "/practice" || !node.route) {
      const nodeInfo: PathNodeInfo = {
        ...node,
        unit: 1,
      };
      launchPathLesson(subjectName, nodeInfo, navigate);
    } else {
      navigate(node.route);
    }
    if (onSelectNode) onSelectNode(node);
  };

  const handleNodeClick = (node: PathNode, e: React.MouseEvent) => {
    if (node.status === "locked") {
      playTap();
      setSelectedNode(node);
      return;
    }

    // If node was already selected, second tap immediately launches!
    if (selectedNode?.id === node.id) {
      startLesson(node, e);
      return;
    }

    playPop();
    triggerXPBurst(e.clientX, e.clientY - 25, `+${node.xpReward} XP`, "⚡");
    setSelectedNode(node);
  };

  /** Returns Tailwind classes for a node button based on its status */
  const getNodeButtonClass = (node: PathNode, isSelected: boolean): string => {
    const base = "relative w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-black flex items-center justify-center cursor-pointer transition-all";
    let stateClass = "";
    switch (node.status) {
      case "completed":
        stateClass = "bg-[#FFD13B] border-2 border-black shadow-[3px_3px_0px_#000] hover:scale-105 active:scale-95 active:translate-y-1 active:shadow-[0px_1px_0px_#000]";
        break;
      case "active":
        stateClass = "bg-[#FF4D2E] text-white border-2 border-black shadow-[4px_4px_0px_#000] hover:scale-110 active:scale-95 active:translate-y-1.5 active:shadow-[0px_1px_0px_#000] ring-4 ring-[#FFD13B]";
        break;
      case "locked":
        stateClass = "bg-gray-200 border-2 border-black/40 shadow-[2px_2px_0px_rgba(0,0,0,0.2)] opacity-60 cursor-not-allowed";
        break;
      case "legendary":
        stateClass = "bg-[#FFD13B] border-2 border-black shadow-[4px_4px_0px_#000] hover:scale-105 active:scale-95 active:translate-y-1 active:shadow-[0px_1px_0px_#000] legendary-shimmer";
        break;
    }
    return `${base} ${stateClass} ${isSelected ? "ring-4 ring-black ring-offset-2" : ""}`;
  };

  return (
    <div className="border-2 border-black rounded-3xl bg-[#FFFDF5] p-5 sm:p-6 shadow-[3px_3px_0px_#1A1A1A] relative select-none font-['Quicksand',sans-serif]">
      {/* Unit Banner (Duolingo Header style) */}
      <div className={`bg-[#FFD13B] border-2 border-black rounded-2xl p-4 shadow-[2.5px_2.5px_0px_#000] flex items-center justify-between ${isPathCollapsed ? "mb-0" : "mb-6"}`}>
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-black/75 block">
            Unit 1 &bull; {subjectName}
          </span>
          <h3 className="text-[16px] sm:text-[18px] font-black text-black leading-tight">
            Active Recall & Foundations
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playPop();
              navigate("/quick-study");
            }}
            aria-label="Open Guidebook"
            className="px-3 py-1.5 bg-white hover:bg-black hover:text-white border-2 border-black rounded-xl text-[12px] font-black transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 active:translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">menu_book</span>
            <span>Guidebook</span>
          </button>

          <button
            type="button"
            onClick={togglePathCollapse}
            aria-label={isPathCollapsed ? "Show learning path" : "Hide learning path"}
            title={isPathCollapsed ? "Expand learning path" : "Collapse learning path"}
            className="w-8 h-8 bg-white hover:bg-black hover:text-white border-2 border-black rounded-xl flex items-center justify-center transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_#000] active:translate-y-0.5 text-black"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {isPathCollapsed ? "keyboard_arrow_down" : "keyboard_arrow_up"}
            </span>
          </button>
        </div>
      </div>

      {/* The Winding Stepping Stone Path & Popover */}
      {!isPathCollapsed && (
        <>
          <div className="relative py-4 flex flex-col gap-6 sm:gap-8 max-w-sm mx-auto">
        {/* Animated Connecting Marching Path */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 50,6 Q 78,16 78,26 T 50,48 T 22,70 T 50,92"
            fill="none"
            stroke="#E5DFD3"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 50,6 Q 78,16 78,26 T 50,48 T 22,70 T 50,92"
            fill="none"
            stroke="#000000"
            strokeWidth="3.5"
            strokeDasharray="2 4"
            className="animate-dash-march opacity-35"
            strokeLinecap="round"
          />
        </svg>

        {nodes.map((node, idx) => {
          const isCurrent = node.status === "active";
          const isDone = node.status === "completed";
          const isLocked = node.status === "locked";
          const isLegendary = node.status === "legendary";
          const isSelected = selectedNode?.id === node.id;

          return (
            <div
              key={node.id}
              className={`relative flex items-center w-full ${alignments[idx % alignments.length]}`}
            >
              {/* If active node: Rex stands next to it with context-aware greeting & speech bubble! */}
              {isCurrent && (
                <div className="absolute -top-14 left-0 sm:left-2 z-20 flex items-center gap-2 pointer-events-none">
                  <div className="animate-bounce" style={{ animationDuration: "2.4s" }}>
                    <img
                      src={rexContext.animation}
                      alt="Rex mascot"
                      className="w-12 h-12 object-contain drop-shadow-[1px_2px_0px_#000]"
                    />
                  </div>
                  <div className="bg-white border-2 border-black rounded-xl px-2.5 py-1 text-[11px] font-black shadow-[2px_2px_0px_#000] whitespace-nowrap flex items-center gap-1">
                    <span>{rexContext.speechBubble}</span>
                    <span className="text-[#FF9600]">{rexContext.badgeEmoji}</span>
                  </div>
                </div>
              )}

              {/* Pulse ring on active node */}
              {isCurrent && (
                <span
                  className="absolute w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-[#FF4D2E]/60 animate-ping pointer-events-none"
                  aria-hidden="true"
                />
              )}

              {/* Phase 5A: Pure CSS Floating Sparkles on Active Node */}
              {isCurrent && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  <span
                    className="absolute -top-3 left-0 text-[13px] animate-float-sparkle-1"
                    aria-hidden="true"
                  >
                    ✨
                  </span>
                  <span
                    className="absolute -bottom-2 -left-2 text-[11px] animate-float-sparkle-2"
                    aria-hidden="true"
                  >
                    ✦
                  </span>
                  <span
                    className="absolute top-1 -right-3 text-[12px] animate-float-sparkle-3"
                    aria-hidden="true"
                  >
                    ✨
                  </span>
                </div>
              )}

              {/* Shimmer keyframes for legendary — inline style injected once */}
              {isLegendary && (
                <style>{`
                  @keyframes legendary-shimmer {
                    0%   { box-shadow: 4px 4px 0px #000, 0 0 0 0 rgba(255,209,59,0.0); }
                    50%  { box-shadow: 4px 4px 0px #000, 0 0 18px 6px rgba(255,209,59,0.7); }
                    100% { box-shadow: 4px 4px 0px #000, 0 0 0 0 rgba(255,209,59,0.0); }
                  }
                  .legendary-shimmer { animation: legendary-shimmer 2s infinite; }
                  @keyframes pulse-ring {
                    0%   { opacity: 1; transform: scale(1); }
                    100% { opacity: 0; transform: scale(1.3); }
                  }
                  .active-pulse-ring { animation: pulse-ring 1.5s infinite; }
                `}</style>
              )}

              {/* 3D Stepping Stone Button */}
              <button
                type="button"
                onClick={(e) => handleNodeClick(node, e)}
                aria-label={`${node.title}: ${node.status}`}
                className={
                  "relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all " +
                  (isDone
                    ? "bg-[#FFD13B] border-2 border-black shadow-[3px_3px_0px_#000] hover:scale-105 active:scale-95 active:translate-y-1 cursor-pointer"
                    : isCurrent
                    ? "bg-[#FF4D2E] text-white border-2 border-black shadow-[4px_4px_0px_#000] hover:scale-110 active:scale-95 active:translate-y-1.5 ring-4 ring-[#FFD13B] cursor-pointer"
                    : isLegendary
                    ? "bg-[#FFD13B] border-2 border-black shadow-[4px_4px_0px_#000] hover:scale-105 active:scale-95 legendary-shimmer cursor-pointer"
                    : "bg-gray-200 border-2 border-black/40 shadow-[2px_2px_0px_rgba(0,0,0,0.2)] opacity-60 cursor-not-allowed") +
                  (isSelected ? " ring-4 ring-black ring-offset-2" : "")
                }
              >
                {/* 3D Gloss Highlight Arc */}
                <span className="absolute top-1.5 left-2.5 right-2.5 h-2 rounded-full bg-white/30 pointer-events-none" />

                <span className="material-symbols-outlined text-[26px] sm:text-[30px] font-black" aria-hidden="true">
                  {node.icon}
                </span>

                {/* Completed: checkmark badge */}
                {isDone && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center text-[13px] shadow-[1px_1px_0px_#000]">
                    ✓
                  </span>
                )}
                {/* Active: XP badge */}
                {isCurrent && (
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#FFE566] text-black border-2 border-black text-[9px] font-black shadow-[1px_1px_0px_#000]">
                    +{node.xpReward} XP
                  </span>
                )}
                {/* Locked: lock icon */}
                {isLocked && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/10 border border-black/30 flex items-center justify-center text-black/50">
                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">lock</span>
                  </span>
                )}
                {/* Legendary: star badge top-right */}
                {isLegendary && (
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-black flex items-center justify-center text-[13px] shadow-[1px_1px_0px_#000]">
                    ⭐
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Duolingo-style Popover / Action Card */}
      {selectedNode && (
        <div className="mt-5 bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn relative">
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/5 hover:bg-black hover:text-white flex items-center justify-center text-[12px] font-black transition-colors cursor-pointer"
            aria-label="Close details"
          >
            ✕
          </button>
          <div className="pr-6">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black/15 ${
                selectedNode.status === "completed" 
                  ? "bg-[#D1FAE5] text-[#065F46]" 
                  : selectedNode.status === "active" 
                  ? "bg-[#FFE4E6] text-[#9F1239]" 
                  : "bg-gray-100 text-gray-500"
              }`}>
                {selectedNode.status}
              </span>
              <span className="text-[10px] font-bold text-black/40">&bull;</span>
              <span className="text-[11px] font-black text-[#FF9600]">+{selectedNode.xpReward} XP</span>
              <span className="text-[10px] font-bold text-black/40">&bull;</span>
              <span className="text-[11px] font-bold text-black/50">5 questions • ~2 min</span>
            </div>
            <h4 className="text-[15px] font-black text-black leading-tight mt-1">
              {selectedNode.title}
            </h4>
            <p className="text-[12px] font-medium text-black/65 mt-0.5">
              {selectedNode.description}
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
            <button
              type="button"
              disabled={selectedNode.status === "locked"}
              onClick={(e) => startLesson(selectedNode, e)}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border-2 border-black font-black text-[13px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                selectedNode.status === "locked"
                  ? "bg-black/10 text-black/30 cursor-not-allowed border-black/20 shadow-none"
                  : selectedNode.status === "completed"
                  ? "bg-[#10B981] text-white hover:bg-black shadow-[0px_3px_0px_#047857,0px_4px_0px_#000] active:translate-y-1 active:shadow-none cursor-pointer"
                  : "bg-[#FF4D2E] text-white hover:bg-black shadow-[0px_3px_0px_#B91C1C,0px_4px_0px_#000] active:translate-y-1 active:shadow-none cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                {selectedNode.status === "completed" ? "replay" : "play_arrow"}
              </span>
              <span>
                {selectedNode.status === "completed" ? "Review (+10 XP)" : `START (+${selectedNode.xpReward} XP)`}
              </span>
            </button>

            {selectedNode.status !== "locked" && selectedNode.route === "/practice" && (
              <button
                type="button"
                onClick={() => {
                  playTap();
                  navigate("/practice?custom=1");
                }}
                className="text-[10.5px] font-bold text-black/50 hover:text-black hover:underline cursor-pointer self-center sm:self-end"
              >
                Custom quiz settings &rarr;
              </button>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
