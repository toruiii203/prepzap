import React, { useState, useEffect } from "react";
import { SpringButton } from "@/components/ui/SpringButton";
import { startAmbientSound, stopAmbientSound, isAmbientPlaying } from "@/lib/ambientSound";
import { playPop } from "@/lib/soundFX";

export const AmbientSoundToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(isAmbientPlaying());
  }, []);

  const handleToggle = () => {
    playPop();
    if (playing) {
      stopAmbientSound();
      setPlaying(false);
    } else {
      const ok = startAmbientSound();
      setPlaying(ok);
    }
  };

  return (
    <SpringButton
      onClick={handleToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-black text-[12px] font-black shadow-[2px_2px_0px_#000] cursor-pointer transition-colors select-none ${
        playing
          ? "bg-[#85f5eb] text-black"
          : "bg-white text-black/70 hover:text-black hover:bg-black/5"
      } ${className}`}
      title={playing ? "Stop focus rain sound" : "Play calming focus rain sound"}
      aria-label="Toggle ambient focus sound"
    >
      <span className="text-[14px]">{playing ? "🌧️" : "🎧"}</span>
      <span>{playing ? "Focus Rain: On" : "Focus Rain"}</span>
      {playing && (
        <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
      )}
    </SpringButton>
  );
};
