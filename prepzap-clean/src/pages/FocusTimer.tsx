import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface TimerSettings {
  focusDuration: number;      // minutes
  breakDuration: number;      // minutes
  longBreakDuration: number;  // minutes
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  soundVolume: number;        // 0-100
  tickingSound: boolean;
  ambientMode: "none" | "rain" | "cafe" | "white-noise";
  vibrate: boolean;
  dailyGoal: number;          // sessions per day
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 70,
  tickingSound: false,
  ambientMode: "none",
  vibrate: true,
  dailyGoal: 8,
};

const STORAGE_KEY = "studenius_timer_settings";

function loadSettings(): TimerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: TimerSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

type Phase = "focus" | "break" | "long-break";

export default function FocusTimer() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [settings, setSettings] = useState<TimerSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<TimerSettings>(loadSettings);

  const [phase, setPhase] = useState<Phase>("focus");
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);

  const intervalRef = useRef<any>(null);

  // Re-sync timeLeft when settings change
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(settings.focusDuration * 60);
      setPhase("focus");
    }
  }, [settings.focusDuration]);

  const getPhaseLabel = () => {
    if (phase === "focus") return isActive ? "Focusing..." : "Focus";
    if (phase === "break") return "Short Break";
    return "Long Break";
  };

  const getPhaseDuration = (p: Phase) => {
    if (p === "focus") return settings.focusDuration * 60;
    if (p === "break") return settings.breakDuration * 60;
    return settings.longBreakDuration * 60;
  };

  const progressRatio = 1 - timeLeft / getPhaseDuration(phase);
  const circumference = 283;
  const dashoffset = circumference - progressRatio * circumference;

  const awardStudyRewards = async (minutes: number) => {
    const xpEarned = minutes * 2;
    const coinsEarned = Math.round(minutes * 0.6);
    if (user && profile) {
      try {
        await supabase
          .from("profiles")
          .update({
            total_xp: (profile.total_xp || 0) + xpEarned,
            coins: (profile.coins || 0) + coinsEarned,
          })
          .eq("id", user.id);
        await refreshProfile();
      } catch {}
    }
  };

  const triggerCompletionFeedback = () => {
    if (settings.soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        [0, 150, 300].forEach((delay, i) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 520 + i * 80;
            gain.gain.setValueAtTime((settings.soundVolume / 100) * 0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
          }, delay);
        });
      } catch {}
    }
    if (settings.vibrate && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  const advancePhase = () => {
    const nextSessionCount = sessionCount + 1;
    setSessionCount(nextSessionCount);

    if (phase === "focus") {
      setCompletedToday(d => d + 1);
      awardStudyRewards(settings.focusDuration);
      triggerCompletionFeedback();

      const nextPhase: Phase = nextSessionCount % settings.sessionsUntilLongBreak === 0
        ? "long-break"
        : "break";
      setPhase(nextPhase);
      setTimeLeft(getPhaseDuration(nextPhase));
      setIsActive(settings.autoStartBreaks);
    } else {
      setPhase("focus");
      setTimeLeft(settings.focusDuration * 60);
      setIsActive(settings.autoStartFocus);
    }
  };

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsActive(false);
            advancePhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, phase, settings]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleReset = () => {
    clearInterval(intervalRef.current);
    setIsActive(false);
    setTimeLeft(getPhaseDuration(phase));
  };

  const handleSkip = () => {
    clearInterval(intervalRef.current);
    setIsActive(false);
    advancePhase();
  };

  const openSettings = () => {
    setDraftSettings({ ...settings });
    setShowSettings(true);
  };

  const saveAndClose = () => {
    saveSettings(draftSettings);
    setSettings(draftSettings);
    setShowSettings(false);
    if (!isActive) {
      setTimeLeft(draftSettings.focusDuration * 60);
      setPhase("focus");
    }
  };

  const phaseColor = phase === "focus" ? "#ae2925" : "#2e7d32";

  return (
    <div className="bg-[#fcf9f4] text-[#1A1A1A] min-h-full flex flex-col w-full flex-1 relative overflow-x-hidden">

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center">
          <div className="bg-[#FAF7F2] border-t-2 md:border-2 border-black rounded-t-3xl md:rounded-2xl w-full md:max-w-md max-h-[90dvh] overflow-y-auto shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
            <div className="sticky top-0 bg-[#FAF7F2] border-b-2 border-black px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-[18px]">Timer Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-[#ebe8e3]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-5">
              {/* Durations */}
              <section>
                <h3 className="font-bold text-[13px] uppercase tracking-wider text-[#666] mb-3">Durations</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Focus Duration", key: "focusDuration", min: 5, max: 90, step: 5, unit: "min" },
                    { label: "Short Break", key: "breakDuration", min: 1, max: 30, step: 1, unit: "min" },
                    { label: "Long Break", key: "longBreakDuration", min: 5, max: 60, step: 5, unit: "min" },
                    { label: "Sessions Before Long Break", key: "sessionsUntilLongBreak", min: 2, max: 8, step: 1, unit: "sessions" },
                    { label: "Daily Goal", key: "dailyGoal", min: 1, max: 20, step: 1, unit: "sessions" },
                  ].map(({ label, key, min, max, step, unit }) => (
                    <div key={key} className="bg-white border-2 border-black rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[14px]">{label}</span>
                        <span className="font-black text-[#ae2925] text-[14px]">
                          {(draftSettings as any)[key]} {unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={min} max={max} step={step}
                        value={(draftSettings as any)[key]}
                        onChange={e => setDraftSettings(d => ({ ...d, [key]: Number(e.target.value) }))}
                        className="w-full accent-[#ae2925] h-1.5"
                      />
                      <div className="flex justify-between text-[11px] text-[#999] mt-1">
                        <span>{min}</span><span>{max}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Auto-start */}
              <section>
                <h3 className="font-bold text-[13px] uppercase tracking-wider text-[#666] mb-3">Automation</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Auto-start Breaks", key: "autoStartBreaks" },
                    { label: "Auto-start Focus Sessions", key: "autoStartFocus" },
                  ].map(({ label, key }) => (
                    <div key={key} className="bg-white border-2 border-black rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="font-bold text-[14px]">{label}</span>
                      <button
                        onClick={() => setDraftSettings(d => ({ ...d, [key]: !(d as any)[key] }))}
                        className={`w-12 h-6 rounded-full border-2 border-black transition-all relative ${(draftSettings as any)[key] ? "bg-[#ae2925]" : "bg-[#ddd]"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full border border-black absolute top-0.5 transition-all ${(draftSettings as any)[key] ? "left-6" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Sound */}
              <section>
                <h3 className="font-bold text-[13px] uppercase tracking-wider text-[#666] mb-3">Sound & Alerts</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { label: "Completion Sound", key: "soundEnabled" },
                    { label: "Ticking Sound", key: "tickingSound" },
                    { label: "Vibrate on Complete", key: "vibrate" },
                  ].map(({ label, key }) => (
                    <div key={key} className="bg-white border-2 border-black rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="font-bold text-[14px]">{label}</span>
                      <button
                        onClick={() => setDraftSettings(d => ({ ...d, [key]: !(d as any)[key] }))}
                        className={`w-12 h-6 rounded-full border-2 border-black transition-all relative ${(draftSettings as any)[key] ? "bg-[#ae2925]" : "bg-[#ddd]"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full border border-black absolute top-0.5 transition-all ${(draftSettings as any)[key] ? "left-6" : "left-0.5"}`} />
                      </button>
                    </div>
                  ))}

                  {draftSettings.soundEnabled && (
                    <div className="bg-white border-2 border-black rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[14px]">Volume</span>
                        <span className="font-black text-[#ae2925] text-[14px]">{draftSettings.soundVolume}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} step={5}
                        value={draftSettings.soundVolume}
                        onChange={e => setDraftSettings(d => ({ ...d, soundVolume: Number(e.target.value) }))}
                        className="w-full accent-[#ae2925] h-1.5"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Ambient */}
              <section>
                <h3 className="font-bold text-[13px] uppercase tracking-wider text-[#666] mb-3">Ambient Mode</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "none", label: "Silent", icon: "volume_off" },
                    { value: "rain", label: "Rain", icon: "water_drop" },
                    { value: "cafe", label: "Café", icon: "local_cafe" },
                    { value: "white-noise", label: "White Noise", icon: "waves" },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setDraftSettings(d => ({ ...d, ambientMode: value as any }))}
                      className={`flex items-center gap-2 px-3 py-3 border-2 border-black rounded-xl font-bold text-[13px] transition-all ${
                        draftSettings.ambientMode === value
                          ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_0px_#000]"
                          : "bg-white hover:bg-[#ebe8e3]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-[#FAF7F2] border-t-2 border-black px-5 py-4">
              <button
                onClick={saveAndClose}
                className="w-full py-3.5 bg-[#ae2925] text-white border-2 border-black rounded-xl font-black text-[15px] shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 active:shadow-none"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-5 h-16 w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-[#1A1A1A] z-30 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#ebe8e3] transition-colors shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <h1 className="font-black text-[20px]">Focus Timer</h1>
        <button
          onClick={openSettings}
          className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#ebe8e3] transition-colors shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-5 gap-8 pb-28">

        {/* Phase Label */}
        <div className="flex items-center gap-2">
          {(["focus", "break", "long-break"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => { if (!isActive) { setPhase(p); setTimeLeft(getPhaseDuration(p)); } }}
              className={`px-4 py-1.5 rounded-full border-2 border-black font-bold text-[12px] transition-all ${
                phase === p
                  ? "bg-[#1A1A1A] text-white shadow-[1px_1px_0px_0px_#ae2925]"
                  : "bg-white text-[#1A1A1A] hover:bg-[#ebe8e3]"
              }`}
            >
              {p === "focus" ? "Focus" : p === "break" ? "Short Break" : "Long Break"}
            </button>
          ))}
        </div>

        {/* Circular Timer */}
        <div className="relative w-72 h-72 flex items-center justify-center">
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Track */}
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="#e8e4de" strokeWidth="5" />
            {/* Progress */}
            <circle
              cx="50" cy="50" r="45"
              fill="transparent"
              stroke={phaseColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          {/* Inner circle content */}
          <div className="relative z-10 w-56 h-56 rounded-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col items-center justify-center gap-1">
            <span className="text-[13px] font-bold text-[#888] uppercase tracking-widest">
              {getPhaseLabel()}
            </span>
            <div
              className="text-[58px] font-black text-[#1A1A1A] tracking-tighter"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatTime(timeLeft)}
            </div>
            {/* Daily progress */}
            <span className="text-[11px] text-[#888] font-bold">
              {completedToday}/{settings.dailyGoal} today
            </span>
          </div>
        </div>

        {/* Pomodoro dots */}
        <div className="flex items-center gap-2 bg-white border-2 border-black rounded-full px-5 py-2.5 shadow-[2px_2px_0px_0px_#1A1A1A]">
          {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 border-black transition-all ${
                i < (sessionCount % settings.sessionsUntilLongBreak)
                  ? "bg-[#ae2925] scale-110"
                  : "bg-[#e8e4de]"
              }`}
            />
          ))}
          <span className="ml-2 font-bold text-[13px] text-[#666] border-l-2 border-black pl-2">
            {sessionCount} / {settings.sessionsUntilLongBreak}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleReset}
            className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ebe8e3] transition-all shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">replay</span>
          </button>

          <button
            onClick={() => setIsActive(!isActive)}
            className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center hover:opacity-90 transition-all shadow-[4px_4px_0px_0px_#1A1A1A] active:translate-y-1 active:shadow-none"
            style={{ backgroundColor: phaseColor }}
          >
            <span className="material-symbols-outlined text-white text-[44px]">
              {isActive ? "pause" : "play_arrow"}
            </span>
          </button>

          <button
            onClick={handleSkip}
            className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ebe8e3] transition-all shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none"
          >
            <span className="material-symbols-outlined text-[20px]">skip_next</span>
          </button>
        </div>
      </main>
    </div>
  );
}
