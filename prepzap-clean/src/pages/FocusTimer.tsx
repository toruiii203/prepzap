import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface TimerSettings {
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  tickingSound: boolean;
  ambientMode: "none" | "rain" | "cafe" | "white-noise";
  vibrate: boolean;
  dailyGoal: number;
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

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
];

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
  const [currentTask, setCurrentTask] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [quoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const intervalRef = useRef<any>(null);

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
  const phaseColor = phase === "focus" ? "#ae2925" : "#2e7d32";

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

  const totalFocusTimeToday = completedToday * settings.focusDuration;
  const focusHours = Math.floor(totalFocusTimeToday / 60);
  const focusMins = totalFocusTimeToday % 60;
  const focusTimeStr = focusHours > 0 ? `${focusHours}h ${focusMins}m` : `${focusMins}m`;

  const quote = QUOTES[quoteIndex];

  // ── DesktopSidebar ──────────────────────────────────────────────────────────
  const DesktopSidebar = () => (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 flex-col p-4 border-r-2 border-black bg-[#FAF7F2] w-64">
      <div className="mb-6">
        <h1 className="text-[28px] font-black tracking-tight">Studenius</h1>
        <p className="text-[13px] font-bold text-black/50">Academic Level: Pro</p>
      </div>
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
        {[
          { icon: "dashboard",      label: "Dashboard",      route: "/dashboard" },
          { icon: "smart_toy",      label: "AI Tutor",       route: "/ai-tutor" },
          { icon: "style",          label: "Flashcards",     route: "/flashcards" },
          { icon: "assignment",     label: "Practice",       route: "/practice" },
          { icon: "timer",          label: "Focus Timer",    route: "/timer",     active: true },
          { icon: "calendar_today", label: "Study Planner",  route: "/planner" },
          { icon: "folder_open",    label: "Source Library", route: "/sources" },
          { icon: "bar_chart",      label: "Analytics",      route: "/analytics" },
        ].map((item) => (
          <button key={item.route} onClick={() => navigate(item.route)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-bold transition-all text-left w-full ${
              (item as any).active ? "bg-black text-white scale-95" : "text-black hover:bg-[#E2E2E2]"
            }`}>
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t-2 border-black pt-4 flex flex-col gap-2">
        <button onClick={() => navigate("/go-pro")}
          className="w-full bg-[#F5A623] border-2 border-black py-2 text-[13px] font-extrabold shadow-[2px_2px_0px_#000] hover:opacity-90">
          Upgrade to Pro
        </button>
        <button onClick={() => navigate("/settings")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] w-full">
          <span className="material-symbols-outlined text-[20px]">settings</span>Settings
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-bold text-black hover:bg-[#E2E2E2] w-full">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>Help
        </button>
      </div>
    </aside>
  );

  return (
    <div className="w-full bg-[#FAF7F2] flex flex-col" style={{ minHeight: "100dvh" }}>

      <DesktopSidebar />

      {/* Settings Modal — shared between mobile and desktop */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end lg:items-center justify-center">
          <div className="bg-[#FAF7F2] border-t-2 lg:border-2 border-black rounded-t-3xl lg:rounded-2xl w-full lg:max-w-md max-h-[90dvh] overflow-y-auto shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
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
                        <span className="font-black text-[#ae2925] text-[14px]">{(draftSettings as any)[key]} {unit}</span>
                      </div>
                      <input type="range" min={min} max={max} step={step}
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
                      <input type="range" min={0} max={100} step={5}
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
                    <button key={value}
                      onClick={() => setDraftSettings(d => ({ ...d, ambientMode: value as any }))}
                      className={`flex items-center gap-2 px-3 py-3 border-2 border-black rounded-xl font-bold text-[13px] transition-all ${
                        draftSettings.ambientMode === value ? "bg-[#ae2925] text-white shadow-[2px_2px_0px_0px_#000]" : "bg-white hover:bg-[#ebe8e3]"
                      }`}>
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 bg-[#FAF7F2] border-t-2 border-black px-5 py-4">
              <button onClick={saveAndClose}
                className="w-full py-3.5 bg-[#ae2925] text-white border-2 border-black rounded-xl font-black text-[15px] shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 active:shadow-none">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          DESKTOP LAYOUT
          ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:ml-64 flex-col" style={{ height: "100vh" }}>

        {/* Desktop Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b-2 border-black bg-[#FAF7F2] shrink-0">
          <div>
            <h2 className="text-[22px] font-black tracking-tight">Deep Focus Session</h2>
            <p className="text-[12px] font-bold text-black/50">Minimize distractions and master your flow state.</p>
          </div>
          <button
            onClick={openSettings}
            className="w-10 h-10 flex items-center justify-center border-2 border-black bg-white shadow-[2px_2px_0px_#000] hover:bg-[#E2E2E2] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </header>

        {/* Desktop Body — two columns */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT COLUMN — Timer */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-12 overflow-y-auto">

            {/* Phase selector */}
            <div className="flex items-center gap-2">
              {(["focus", "break", "long-break"] as Phase[]).map((p) => (
                <button key={p}
                  onClick={() => { if (!isActive) { setPhase(p); setTimeLeft(getPhaseDuration(p)); } }}
                  className={`px-5 py-2 border-2 border-black font-extrabold text-[12px] uppercase tracking-wider transition-all ${
                    phase === p ? "bg-black text-white shadow-[2px_2px_0px_#ae2925]" : "bg-white text-black hover:bg-[#E2E2E2]"
                  }`}>
                  {p === "focus" ? "Focus" : p === "break" ? "Short Break" : "Long Break"}
                </button>
              ))}
            </div>

            {/* Circular Timer */}
            <div className="relative w-[300px] h-[300px] flex items-center justify-center">
              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="transparent" stroke="#e8e4de" strokeWidth="5" />
                <circle cx="50" cy="50" r="45" fill="transparent"
                  stroke={phaseColor} strokeWidth="6"
                  strokeDasharray={circumference} strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="relative z-10 w-56 h-56 rounded-full bg-white border-2 border-black shadow-[5px_5px_0px_0px_#1A1A1A] flex flex-col items-center justify-center gap-1">
                <span className="text-[11px] font-extrabold text-[#888] uppercase tracking-widest">{getPhaseLabel()}</span>
                <div className="text-[56px] font-black text-[#1A1A1A] tracking-tighter" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(timeLeft)}
                </div>
                <span className="text-[11px] text-[#888] font-bold">{completedToday}/{settings.dailyGoal} today</span>
              </div>
            </div>

            {/* Pomodoro dots */}
            <div className="flex items-center gap-2 bg-white border-2 border-black px-5 py-2.5 shadow-[2px_2px_0px_#000]">
              {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
                <div key={i}
                  className={`w-4 h-4 rounded-full border-2 border-black transition-all ${
                    i < (sessionCount % settings.sessionsUntilLongBreak) ? "bg-[#ae2925] scale-110" : "bg-[#e8e4de]"
                  }`}
                />
              ))}
              <span className="ml-2 font-extrabold text-[13px] text-[#666] border-l-2 border-black pl-3">
                {sessionCount % settings.sessionsUntilLongBreak}/{settings.sessionsUntilLongBreak} SESSIONS
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button onClick={handleReset}
                className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ebe8e3] transition-all shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none">
                <span className="material-symbols-outlined text-[20px]">replay</span>
              </button>
              <button onClick={() => setIsActive(!isActive)}
                className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center hover:opacity-90 transition-all shadow-[5px_5px_0px_#000] active:translate-y-1 active:shadow-none"
                style={{ backgroundColor: phaseColor }}>
                <span className="material-symbols-outlined text-white text-[48px]">
                  {isActive ? "pause" : "play_arrow"}
                </span>
              </button>
              <button onClick={handleSkip}
                className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ebe8e3] transition-all shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none">
                <span className="material-symbols-outlined text-[20px]">skip_next</span>
              </button>
            </div>

            {/* Duration presets */}
            <div className="flex gap-3">
              {[25, 50].map((min) => (
                <button key={min}
                  onClick={() => {
                    if (!isActive) {
                      const draft = { ...settings, focusDuration: min };
                      saveSettings(draft);
                      setSettings(draft);
                      setTimeLeft(min * 60);
                      setPhase("focus");
                    }
                  }}
                  className={`px-6 py-2 border-2 border-black font-extrabold text-[13px] transition-all ${
                    settings.focusDuration === min ? "bg-black text-white shadow-[2px_2px_0px_#ae2925]" : "bg-white text-black hover:bg-[#E2E2E2] shadow-[2px_2px_0px_#000]"
                  }`}>
                  {min} MIN
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN — Cards */}
          <div className="w-[380px] border-l-2 border-black flex flex-col gap-0 overflow-y-auto shrink-0">

            {/* Card 1: Today's Focus Stats */}
            <div className="p-6 border-b-2 border-black">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider mb-4">Today's Progress</h3>
              <div className="flex justify-between items-center gap-2">
                <div className="flex-1 flex flex-col items-center gap-1 bg-[#F0EDE0] border-2 border-black p-3 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[22px]">schedule</span>
                  <span className="font-extrabold text-[15px]">{focusTimeStr}</span>
                  <span className="text-[10px] font-bold text-black/50 uppercase">Focus Time</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 bg-[#F0EDE0] border-2 border-black p-3 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[22px]">task_alt</span>
                  <span className="font-extrabold text-[15px]">{completedToday} sessions</span>
                  <span className="text-[10px] font-bold text-black/50 uppercase">Completed</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 bg-[#F0EDE0] border-2 border-black p-3 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[22px]">local_fire_department</span>
                  <span className="font-extrabold text-[15px]">{completedToday}/{settings.dailyGoal}</span>
                  <span className="text-[10px] font-bold text-black/50 uppercase">Daily Goal</span>
                </div>
              </div>
            </div>

            {/* Card 2: Motivational Quote */}
            <div className="p-6 border-b-2 border-black border-l-[5px] border-l-[#ae2925]">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider mb-3">Quote</h3>
              <p className="text-[15px] font-bold italic leading-relaxed mb-2">"{quote.text}"</p>
              <p className="text-[12px] font-extrabold uppercase text-black/50">— {quote.author}</p>
            </div>

            {/* Card 3: Current Task */}
            <div className="p-6">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wider mb-3">What are you focusing on?</h3>
              {currentTask ? (
                <div className="flex items-center gap-2 bg-[#F0EDE0] border-2 border-black px-3 py-2.5 shadow-[2px_2px_0px_#000]">
                  <span className="material-symbols-outlined text-[#ae2925] text-[16px]">task_alt</span>
                  <span className="text-[13px] font-extrabold flex-1 truncate">{currentTask}</span>
                  <button onClick={() => { setCurrentTask(""); setTaskInput(""); }}
                    className="hover:bg-black/10 rounded p-0.5">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={taskInput}
                    onChange={e => setTaskInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && taskInput.trim()) setCurrentTask(taskInput.trim()); }}
                    placeholder="Enter task name..."
                    className="flex-1 px-3 py-2.5 border-2 border-black bg-white text-[13px] font-bold placeholder:text-black/30 focus:outline-none shadow-[2px_2px_0px_#000]"
                  />
                  <button
                    onClick={() => { if (taskInput.trim()) setCurrentTask(taskInput.trim()); }}
                    className="px-4 py-2.5 bg-black text-white border-2 border-black font-extrabold text-[13px] hover:bg-[#ae2925] transition-colors shadow-[2px_2px_0px_#000]">
                    Set
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MOBILE LAYOUT — updated with new features
          ══════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full flex flex-col bg-[#FAF7F2]" style={{ height: "100dvh", overflow: "hidden" }}>
        <div className="bg-[#fcf9f4] text-[#1A1A1A] flex flex-col w-full flex-1 relative overflow-x-hidden" style={{ height: "100dvh" }}>

          {/* Mobile Header */}
          <header className="flex items-center justify-between px-5 h-16 w-full top-0 sticky bg-[#FAF7F2] border-b-2 border-[#1A1A1A] z-30 shrink-0">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#ebe8e3] transition-colors shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-black text-[20px]">Focus Timer</h1>
            <button onClick={openSettings}
              className="w-10 h-10 flex items-center justify-center border-2 border-[#1A1A1A] rounded-lg bg-white hover:bg-[#ebe8e3] transition-colors shadow-[2px_2px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none">
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
          </header>

          {/* Mobile Main */}
          <main className="flex-1 flex flex-col items-center justify-center py-8 px-5 gap-6 overflow-y-auto pb-10">

            {/* Phase selector */}
            <div className="flex items-center gap-2">
              {(["focus", "break", "long-break"] as Phase[]).map((p) => (
                <button key={p}
                  onClick={() => { if (!isActive) { setPhase(p); setTimeLeft(getPhaseDuration(p)); } }}
                  className={`px-4 py-1.5 rounded-full border-2 border-black font-bold text-[12px] transition-all ${
                    phase === p ? "bg-[#1A1A1A] text-white shadow-[1px_1px_0px_0px_#ae2925]" : "bg-white text-[#1A1A1A] hover:bg-[#ebe8e3]"
                  }`}>
                  {p === "focus" ? "Focus" : p === "break" ? "Short Break" : "Long Break"}
                </button>
              ))}
            </div>

            {/* Circular Timer */}
            <div className="relative w-72 h-72 flex items-center justify-center">
              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="transparent" stroke="#e8e4de" strokeWidth="5" />
                <circle cx="50" cy="50" r="45" fill="transparent"
                  stroke={phaseColor} strokeWidth="6"
                  strokeDasharray={circumference} strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="relative z-10 w-56 h-56 rounded-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col items-center justify-center gap-1">
                <span className="text-[13px] font-bold text-[#888] uppercase tracking-widest">{getPhaseLabel()}</span>
                <div className="text-[58px] font-black text-[#1A1A1A] tracking-tighter" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(timeLeft)}
                </div>
                <span className="text-[11px] text-[#888] font-bold">{completedToday}/{settings.dailyGoal} today</span>
              </div>
            </div>

            {/* Pomodoro dots */}
            <div className="flex items-center gap-2 bg-white border-2 border-black rounded-full px-5 py-2.5 shadow-[2px_2px_0px_0px_#1A1A1A]">
              {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, i) => (
                <div key={i}
                  className={`w-4 h-4 rounded-full border-2 border-black transition-all ${
                    i < (sessionCount % settings.sessionsUntilLongBreak) ? "bg-[#ae2925] scale-110" : "bg-[#e8e4de]"
                  }`}
                />
              ))}
              <span className="ml-2 font-bold text-[13px] text-[#666] border-l-2 border-black pl-2">
                {sessionCount % settings.sessionsUntilLongBreak}/{settings.sessionsUntilLongBreak}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button onClick={handleReset}
                className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ebe8e3] transition-all shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none">
                <span className="material-symbols-outlined text-[20px]">replay</span>
              </button>
              <button onClick={() => setIsActive(!isActive)}
                className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center hover:opacity-90 transition-all shadow-[4px_4px_0px_0px_#1A1A1A] active:translate-y-1 active:shadow-none"
                style={{ backgroundColor: phaseColor }}>
                <span className="material-symbols-outlined text-white text-[44px]">
                  {isActive ? "pause" : "play_arrow"}
                </span>
              </button>
              <button onClick={handleSkip}
                className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ebe8e3] transition-all shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-y-0.5 active:shadow-none">
                <span className="material-symbols-outlined text-[20px]">skip_next</span>
              </button>
            </div>

            {/* Current Task (mobile) */}
            <div className="w-full">
              <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2">What are you focusing on?</p>
              {currentTask ? (
                <div className="flex items-center gap-2 bg-[#F0EDE0] border-2 border-black px-3 py-2.5 shadow-[2px_2px_0px_#000] rounded-lg">
                  <span className="material-symbols-outlined text-[#ae2925] text-[16px]">task_alt</span>
                  <span className="text-[13px] font-extrabold flex-1 truncate">{currentTask}</span>
                  <button onClick={() => { setCurrentTask(""); setTaskInput(""); }}
                    className="hover:bg-black/10 rounded p-0.5">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={taskInput}
                    onChange={e => setTaskInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && taskInput.trim()) setCurrentTask(taskInput.trim()); }}
                    placeholder="Enter task name..."
                    className="flex-1 px-3 py-2.5 border-2 border-black bg-white text-[13px] font-bold placeholder:text-black/30 focus:outline-none shadow-[2px_2px_0px_#000] rounded-lg"
                  />
                  <button
                    onClick={() => { if (taskInput.trim()) setCurrentTask(taskInput.trim()); }}
                    className="px-4 py-2.5 bg-black text-white border-2 border-black font-extrabold text-[13px] rounded-lg hover:bg-[#ae2925] transition-colors">
                    Set
                  </button>
                </div>
              )}
            </div>

          </main>
        </div>
      </div>

    </div>
  );
}
