import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface FocusTimerProps {
}

export default function FocusTimer(()) {
  const { user, profile, refreshProfile } = useAuth();
  const [duration, setDuration] = useState<25 | 50>(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(2); // Mock: 2 completed out of 4

  const awardStudyRewards = async (minutes: number) => {
    const xpEarned = minutes * 2;
    const coinsEarned = Math.round(minutes * 0.6);

    if (user && profile) {
      try {
        const currentXp = profile.total_xp || profile.xp || 0;
        const currentCoins = profile.coins || 0;
        await supabase
          .from("profiles")
          .update({ 
            total_xp: currentXp + xpEarned,
            coins: currentCoins + coinsEarned
          })
          .eq("id", user.id);
        if (typeof refreshProfile === "function") {
          await refreshProfile();
        }
      } catch (err) {
        console.error("Error rewarding focus session:", err);
        await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpEarned }).eq("id", user?.id ?? ""); await refreshProfile();
      }
    } else {
      await supabase.from("profiles").update({ total_xp: (profile?.total_xp ?? 0) + xpEarned }).eq("id", user?.id ?? ""); await refreshProfile();
    }
  };

  // Audio effect context cue
  const ringRef = { strokeDasharray: 283 };

  // Timer Tick implementation
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setSessionCount(prev => Math.min(4, prev + 1));
      awardStudyRewards(duration);
      
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, duration]);

  const handleToggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(duration * 60);
  };

  const selectDuration = (minutes: 25 | 50) => {
    setIsActive(false);
    setDuration(minutes);
    setTimeLeft(minutes * 60);
  };

  const handleSkip = () => {
    setIsActive(false);
    setTimeLeft(0);
    setSessionCount(prev => Math.min(4, prev + 1));
    awardStudyRewards(duration);
    
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Dashoffset calculation
  const totalSeconds = duration * 60;
  const progressRatio = (totalSeconds - timeLeft) / totalSeconds;
  const dashoffset = 283 - progressRatio * 283;

  return (
    <div className="bg-[#fcf9f4] text-on-background min-h-screen flex flex-col font-body-md antialiased w-full max-w-[390px] mx-auto relative overflow-x-hidden border-x border-[#8d706d]/20 shadow-xl">
      {/* TopAppBar */}
      <header className="flex items-center justify-between px-5 h-16 w-full top-0 sticky bg-background border-b-2 border-on-background z-50">
        <button 
          onClick={() => navigate("/dashboard")}
          className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-surface hover:bg-surface-container-high transition-colors text-primary active:translate-y-0.5 shadow-[2px_2px_0px_#1A1A1A]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline text-headline-md text-on-background font-bold text-[21.5px]">Focus Timer</h1>
        <button 
          onClick={() => navigate("/planner")}
          className="w-10 h-10 flex items-center justify-center text-secondary hover:bg-surface-container-high transition-colors rounded-full"
        >
          <span className="material-symbols-outlined">calendar_month</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-between py-10 px-5 pb-28">
        
        {/* Timer Display Section */}
        <div className="flex flex-col items-center gap-6 mt-6 w-full">
          {/* Circular Progress Block */}
          <div className="relative w-68 h-68 flex items-center justify-center bg-white rounded-full p-2.5 border-2 border-black shadow-[4px_4px_0px_0px_#1A1A1A]">
            {/* SVG Background Ring */}
            <svg className="absolute inset-x-0 w-full h-full p-2.5" viewBox="0 0 100 100">
              <circle 
                className="text-surface-variant stroke-current" 
                cx="50" 
                cy="50" 
                fill="transparent" 
                r="45" 
                strokeWidth="4"
              ></circle>
              {/* Progress Ring (Coral) */}
              <circle 
                className="text-primary stroke-current progress-ring__circle transition-all duration-300" 
                cx="50" 
                cy="50" 
                fill="transparent" 
                r="45" 
                strokeDasharray="283" 
                strokeDashoffset={dashoffset} 
                strokeLinecap="round" 
                strokeWidth="6"
              ></circle>
            </svg>
            
            {/* Inner Content */}
            <div className="z-10 flex flex-col items-center justify-center text-center">
              <span className="font-headline text-headline-md text-secondary mb-1.5 text-[14.5px] uppercase tracking-wider font-extrabold opacity-75">
                {isActive ? "Ticking..." : "Focus"}
              </span>
              <div 
                className="font-headline text-[54px] font-extrabold text-on-background tracking-tighter" 
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Session Indicator */}
          <div className="flex items-center gap-2.5 mt-4 bg-surface-container-lowest px-5 py-3 rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((tomatoId) => (
                <span 
                  key={tomatoId}
                  className={`text-2xl transition-all duration-300 ${
                    tomatoId <= sessionCount ? "filter-none opacity-100" : "grayscale opacity-30"
                  }`}
                >
                  ////
                </span>
              ))}
            </div>
            <span className="font-label-md text-label-md text-on-surface-variant ml-2 border-l-2 border-on-background pl-2 text-[14.5px] font-bold">
              {sessionCount}/4
            </span>
          </div>
        </div>

        {/* Duration Selector Pills */}
        <div className="flex gap-4.5 my-8 w-full justify-center">
          <button 
            onClick={() => selectDuration(25)}
            className={`px-8 py-3.5 rounded-full border-2 border-[#1A1A1A] font-label-md transition-all duration-100 text-[14.5px] ${
              duration === 25 
                ? "bg-primary text-on-primary font-bold shadow-[2px_2px_0px_0px_#1A1A1A]" 
                : "bg-surface-container-lowest text-on-background hover:bg-surface-container-low"
            }`}
          >
            25 min
          </button>
          
          <button 
            onClick={() => selectDuration(50)}
            className={`px-8 py-3.5 rounded-full border-2 border-[#1A1A1A] font-label-md transition-all duration-100 text-[14.5px] ${
              duration === duration ? (duration === 50 ? "bg-primary text-on-primary font-bold shadow-[2px_2px_0px_0px_#1A1A1A]" : "bg-surface-container-lowest text-on-background hover:bg-surface-container-low") : "bg-surface-container-lowest text-on-background hover:bg-surface-container-low"
            }`}
          >
            50 min
          </button>
        </div>

        {/* Controls Section */}
        <div className="flex items-center justify-center gap-6 w-full mb-8">
          {/* Reset Button */}
          <button 
            onClick={handleReset}
            className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-[#1A1A1A] flex items-center justify-center text-on-background hover:bg-surface-container-low transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_#1A1A1A]"
          >
            <span className="material-symbols-outlined">replay</span>
          </button>

          {/* Main Start/Pause Button */}
          <button 
            onClick={handleToggleTimer}
            className="w-24 h-24 rounded-full bg-primary border-2 border-[#1A1A1A] flex items-center justify-center text-white hover:bg-opacity-90 transition-all active:translate-y-1 shadow-[4px_4px_0px_0px_#1A1A1A] active:shadow-none"
          >
            <span className="material-symbols-outlined text-4xl">
              {isActive ? "pause" : "play_arrow"}
            </span>
          </button>

          {/* Skip Button */}
          <button 
            onClick={handleSkip}
            className="w-14 h-14 rounded-full bg-surface-container-lowest border-2 border-[#1A1A1A] flex items-center justify-center text-on-background hover:bg-surface-container-low transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_#1A1A1A]"
          >
            <span className="material-symbols-outlined">skip_next</span>
          </button>
        </div>

      </main>
    </div>
  );
}
