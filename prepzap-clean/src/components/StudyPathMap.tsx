import React, { useState } from "react";
import { playPop, playTap, playSuccess } from "@/lib/soundFX";
import { AnimatedRex } from "@/components/AnimatedRex";
import { triggerXPBurst } from "@/components/FloatingXPBurst";

export interface PathNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: "completed" | "active" | "locked";
  type: "lesson" | "practice" | "chest" | "boss";
  route?: string;
  xpReward: number;
}

interface StudyPathMapProps {
  subjectName: string;
  onSelectNode: (node: PathNode) => void;
  navigate: (route: string) => void;
}

export function StudyPathMap({
  subjectName = "General Studies",
  onSelectNode,
  navigate,
}: StudyPathMapProps) {
  const [selectedNode, setSelectedNode] = useState<PathNode | null>(null);

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
      description: "5-minute rapid recall test on high-yield questions.",
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
      description: "Bonus sparks and badge for maintaining your daily habit.",
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

  const handleNodeClick = (node: PathNode, e: React.MouseEvent) => {
    if (node.status === "locked") {
      playTap();
      setSelectedNode(node);
      return;
    }
    playPop();
    triggerXPBurst(e.clientX, e.clientY - 25, `+${node.xpReward} XP`, "⚡");
    setSelectedNode(node);
    if (node.status === "active" && node.route) {
      navigate(node.route);
    }
  };

  return (
    <div className="border-2 border-black rounded-3xl bg-[#FFFDF5] p-5 sm:p-6 shadow-[3px_3px_0px_#1A1A1A] relative select-none font-['Quicksand',sans-serif]">
      {/* Unit Banner (Duolingo Header style) */}
      <div className="bg-[#FFD13B] border-2 border-black rounded-2xl p-4 mb-6 shadow-[2.5px_2.5px_0px_#000] flex items-center justify-between">
        <div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-black/70 block">
            Unit 1 &bull; {subjectName}
          </span>
          <h3 className="text-[16px] sm:text-[18px] font-black text-black leading-tight">
            Active Recall & Foundations
          </h3>
        </div>

        <button
          type="button"
          onClick={() => {
            playPop();
            navigate("/quick-study");
          }}
          className="px-3 py-1.5 bg-white hover:bg-black hover:text-white border-2 border-black rounded-xl text-[11.5px] font-black transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1.5 active:translate-y-0.5"
        >
          <span className="material-symbols-outlined text-[16px]">menu_book</span>
          <span>Guidebook</span>
        </button>
      </div>

      {/* The Winding Stepping Stone Path */}
      <div className="relative py-4 flex flex-col gap-6 sm:gap-8 max-w-sm mx-auto">
        {/* Animated Connecting Marching Path */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
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

          return (
            <div
              key={node.id}
              className={`relative flex items-center w-full ${alignments[idx % alignments.length]}`}
            >
              {/* If active node: Rex stands next to it cheering with speech bubble! */}
              {isCurrent && (
                <div className="absolute -top-14 left-0 sm:left-2 z-20 flex items-center gap-2 pointer-events-none">
                  <div className="animate-bounce" style={{ animationDuration: "2.2s" }}>
                    <AnimatedRex
                      state="excited"
                      size="sm"
                      interactive={false}
                      preferAnimatedWebP={true}
                    />
                  </div>
                  <div className="bg-white border-2 border-black rounded-xl px-2.5 py-1 text-[10.5px] font-black shadow-[2px_2px_0px_#000] whitespace-nowrap flex items-center gap-1">
                    <span>START HERE!</span>
                    <span className="text-[#FF9600]">⚡</span>
                  </div>
                </div>
              )}

              {/* Concentric radar pulse wave on active node */}
              {isCurrent && (
                <span className="absolute w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-[#FF4D2E]/60 animate-ping pointer-events-none" />
              )}

              {/* 3D Stepping Stone Button */}
              <button
                type="button"
                onClick={(e) => handleNodeClick(node, e)}
                className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full border-3 border-black flex items-center justify-center cursor-pointer transition-all ${
                  isDone
                    ? "bg-[#10B981] text-white shadow-[0px_4px_0px_#047857,0px_6px_0px_#000] hover:scale-105 active:scale-95 active:translate-y-1 active:shadow-[0px_1px_0px_#000]"
                    : isCurrent
                    ? "bg-[#FF4D2E] text-white shadow-[0px_5px_0px_#B91C1C,0px_7px_0px_#000] hover:scale-110 active:scale-95 active:translate-y-1.5 active:shadow-[0px_1px_0px_#000] ring-4 ring-[#FFD13B]"
                    : "bg-[#E2DDD3] text-black/35 shadow-[0px_4px_0px_#BFB8AA,0px_6px_0px_#000] hover:brightness-95 active:translate-y-0.5 cursor-not-allowed"
                }`}
                title={`${node.title} (${node.status})`}
              >
                {/* 3D Gloss Highlight Arc */}
                <span className="absolute top-1.5 left-2.5 right-2.5 h-2 rounded-full bg-white/30 pointer-events-none" />

                <span className="material-symbols-outlined text-[26px] sm:text-[30px] font-black">
                  {node.icon}
                </span>

                {/* Star / Crown Badge on Node */}
                {isDone && (
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FFD13B] border-2 border-black flex items-center justify-center text-[12px] shadow-[1px_1px_0px_#000] hover:rotate-12 transition-transform">
                    ★
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#FFE566] text-black border-2 border-black text-[9px] font-black shadow-[1px_1px_0px_#000]">
                    +{node.xpReward} XP
                  </span>
                )}
                {isLocked && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/10 border border-black/30 flex items-center justify-center text-black/50">
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Node Details Card / Launch Popover */}
      {selectedNode && (
        <div className="mt-4 bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] flex items-center justify-between gap-3 animate-fadeIn relative">
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/5 hover:bg-black hover:text-white flex items-center justify-center text-[11px] font-black transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
          <div className="pr-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-black/50">
                {selectedNode.status.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold text-black/40">&bull;</span>
              <span className="text-[10px] font-black text-[#FF9600]">+{selectedNode.xpReward} XP</span>
            </div>
            <h4 className="text-[14px] font-black text-black leading-tight mt-0.5">
              {selectedNode.title}
            </h4>
            <p className="text-[11.5px] font-medium text-black/65 mt-0.5">
              {selectedNode.description}
            </p>
          </div>

          <button
            type="button"
            disabled={selectedNode.status === "locked"}
            onClick={(e) => {
              if (selectedNode.route) {
                playSuccess();
                triggerXPBurst(e.clientX, e.clientY - 20, `+${selectedNode.xpReward} XP`, "⚡");
                navigate(selectedNode.route);
              }
            }}
            className={`px-4 py-2 rounded-xl border-2 border-black font-black text-[12.5px] uppercase tracking-wider shrink-0 transition-all ${
              selectedNode.status === "locked"
                ? "bg-black/10 text-black/30 cursor-not-allowed border-black/20 shadow-none"
                : selectedNode.status === "completed"
                ? "bg-[#10B981] text-white hover:bg-black shadow-[0px_3px_0px_#047857,0px_4px_0px_#000] active:translate-y-1 active:shadow-none cursor-pointer"
                : "bg-[#FF4D2E] text-white hover:bg-black shadow-[0px_3px_0px_#B91C1C,0px_4px_0px_#000] active:translate-y-1 active:shadow-none cursor-pointer"
            }`}
          >
            {selectedNode.status === "completed" ? "Review" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
}
