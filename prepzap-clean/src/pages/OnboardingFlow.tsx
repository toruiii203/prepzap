import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedRex } from "@/components/AnimatedRex";
import {
  playPop,
  playTap,
  playSuccess,
  playCelebration,
  triggerHaptic,
  setSoundEnabled,
  isSoundEnabled,
} from "@/lib/soundFX";
import {
  getDiagnosticQuestion,
  getOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  type DiagnosticQuestion,
} from "@/lib/onboardingBank";
import { StreakCelebrationModal } from "@/components/StreakCelebrationModal";

interface SubjectOption {
  id: string;
  name: string;
  icon: string;
}

const PRESET_SUBJECTS: SubjectOption[] = [
  { id: "math", name: "Math", icon: "calculate" },
  { id: "science", name: "Science", icon: "science" },
  { id: "english", name: "English", icon: "menu_book" },
  { id: "biology", name: "Biology", icon: "biotech" },
  { id: "calculus", name: "Calculus", icon: "functions" },
  { id: "chemistry", name: "Chemistry", icon: "experiment" },
  { id: "history", name: "History", icon: "history_edu" },
  { id: "psychology", name: "Psychology", icon: "psychology" },
  { id: "computer science", name: "Computer Science", icon: "terminal" },
  { id: "physics", name: "Physics", icon: "bolt" },
  { id: "economics", name: "Economics", icon: "trending_up" },
  { id: "general", name: "General Studies", icon: "school" },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();

  // Redirect returning users immediately
  useEffect(() => {
    if (session && profile?.onboarding_complete !== false) {
      clearOnboardingDraft();
      navigate("/dashboard", { replace: true });
    }
  }, [session, profile, navigate]);

  // Load persisted draft or default
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [subject, setSubject] = useState<string>("Math");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Challenge state
  const [challenge, setChallenge] = useState<DiagnosticQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Goal & Exam state
  const [dailyMinutes, setDailyMinutes] = useState<number>(15);
  const [streakTarget, setStreakTarget] = useState<number>(7);
  const [examTitle, setExamTitle] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [examDateError, setExamDateError] = useState<string>("");

  // Consent & Auth state
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>("");
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  // Login modal for returning users
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Audio mute state
  const [audioMuted, setAudioMuted] = useState<boolean>(() => !isSoundEnabled());

  // Streak counter animation
  const [animatedStreak, setAnimatedStreak] = useState<number>(0);

  // Restore draft on mount
  useEffect(() => {
    const draft = getOnboardingDraft();
    if (draft) {
      if (draft.subject) setSubject(draft.subject);
      if (draft.customSubject) {
        setCustomSubject(draft.customSubject);
        setIsCustom(true);
      }
      if (draft.dailyGoalMinutes) setDailyMinutes(draft.dailyGoalMinutes);
      if (draft.streakTargetDays) setStreakTarget(draft.streakTargetDays);
      if (draft.examTitle) setExamTitle(draft.examTitle);
      if (draft.examDate) setExamDate(draft.examDate);
      if (draft.ageConfirmed) setAgeConfirmed(draft.ageConfirmed);
      if (typeof draft.audioMuted === "boolean") {
        setAudioMuted(draft.audioMuted);
        setSoundEnabled(!draft.audioMuted);
      }
      if (draft.firstWinCompleted) {
        setStep(4);
      }
    }
  }, []);

  const toggleAudio = () => {
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);
    setSoundEnabled(!nextMuted);
    saveOnboardingDraft({ audioMuted: nextMuted });
    if (!nextMuted) playPop();
  };

  // Generate question when subject changes or when entering Step 2
  const activeSubjectName = isCustom && customSubject.trim() ? customSubject.trim() : subject;

  useEffect(() => {
    if (step === 2) {
      const q = getDiagnosticQuestion(activeSubjectName);
      setChallenge(q);
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
  }, [step, activeSubjectName]);

  // Handle streak ticker animation on Step 3
  useEffect(() => {
    if (step === 3) {
      setAnimatedStreak(0);
      const timer = setTimeout(() => {
        setAnimatedStreak(1);
        playCelebration();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Actions
  const handleSelectPresetSubject = (sub: SubjectOption) => {
    playTap();
    setSubject(sub.name);
    setIsCustom(false);
    setCustomSubject("");
    saveOnboardingDraft({ subject: sub.name, customSubject: "" });
    setStep(2);
  };

  const handleSelectCustomSubject = () => {
    playPop();
    setIsCustom(true);
  };

  const handleConfirmCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSubject.trim()) return;
    playTap();
    saveOnboardingDraft({ subject: "Custom", customSubject: customSubject.trim() });
    setStep(2);
  };

  const handleAnswerQuestion = (idx: number) => {
    if (selectedAnswer !== null || !challenge) return;
    playPop();
    triggerHaptic("medium");
    setSelectedAnswer(idx);

    const correct = idx === challenge.correctIndex;
    setIsCorrect(correct);

    const todayLocal = new Date().toLocaleDateString("en-CA");
    saveOnboardingDraft({
      firstWinCompleted: true,
      firstWinLocalDate: todayLocal,
      subject: activeSubjectName,
    });

    if (correct) {
      playSuccess();
    }

    setTimeout(() => {
      setStep(3);
    }, 700);
  };

  const handleExamDateChange = (val: string) => {
    setExamDate(val);
    if (!val) {
      setExamDateError("");
      return;
    }
    const today = new Date().toLocaleDateString("en-CA");
    if (val < today) {
      setExamDateError("Please pick an upcoming date or skip.");
    } else {
      setExamDateError("");
    }
  };

  const handleContinueFromGoal = () => {
    if (examDate && examDateError) return;
    playPop();
    saveOnboardingDraft({
      dailyGoalMinutes: dailyMinutes,
      streakTargetDays: streakTarget,
      examTitle: examTitle.trim() || undefined,
      examDate: examDate || undefined,
    });
    setStep(5);
  };

  const handleSkipExam = () => {
    playPop();
    setExamTitle("");
    setExamDate("");
    setExamDateError("");
    saveOnboardingDraft({
      dailyGoalMinutes: dailyMinutes,
      streakTargetDays: streakTarget,
      examTitle: undefined,
      examDate: undefined,
    });
    setStep(5);
  };

  // Google OAuth
  const handleGoogleSignIn = async () => {
    if (!ageConfirmed) return;
    playTap();
    setAuthLoading(true);
    setAuthError(null);

    saveOnboardingDraft({ ageConfirmed: true });

    try {
      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: "studenius://auth/callback",
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: "_self" });
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: { prompt: "select_account" },
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Google auth error:", err);
      setAuthError(err.message || "Failed to start Google sign-in. Please try again.");
      setAuthLoading(false);
    }
  };

  // Email Magic Link / Signup
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageConfirmed || !emailInput.trim()) return;
    playTap();
    setAuthLoading(true);
    setAuthError(null);

    saveOnboardingDraft({ ageConfirmed: true });

    try {
      const redirectUrl = Capacitor.isNativePlatform()
        ? "studenius://auth/callback"
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      console.error("Email auth error:", err);
      setAuthError(err.message || "Could not send login link. Check your email address.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Returning user email/password login
  const handleReturningUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
      if (data.session) {
        clearOnboardingDraft();
        await refreshProfile();
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      setLoginError(err.message || "Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  };

  // 7-day calendar row for Step 3
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  const todayDayIdx = (new Date().getDay() + 6) % 7; // 0 = Mon, 6 = Sun

  return (
    <div className="fixed inset-0 bg-[#FFFBEA] flex flex-col items-center overflow-hidden font-['Quicksand',sans-serif]">
      {/* Header Bar */}
      <header className="w-full max-w-[800px] h-[54px] flex items-center justify-between px-4 sticky top-0 z-40 bg-[#FFFBEA]">
        <div className="flex items-center gap-2">
          {step > 1 && step < 4 && (
            <button
              type="button"
              onClick={() => {
                playTap();
                setStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1));
              }}
              className="p-1 rounded-lg border-2 border-black hover:bg-white active:translate-y-0.5 cursor-pointer flex items-center justify-center bg-[#FAF7F2]"
              title="Go Back"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center gap-1.5 ml-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full border border-black transition-all duration-300 ${
                  s === step
                    ? "w-7 bg-[#FF4D2E]"
                    : s < step
                    ? "w-2.5 bg-black"
                    : "w-2.5 bg-black/10"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute/Sound Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-[#FAF7F2] active:translate-y-0.5 cursor-pointer flex items-center justify-center shadow-[1px_1px_0px_#000]"
            title={audioMuted ? "Unmute audio" : "Mute audio"}
          >
            <span className="material-symbols-outlined text-[18px]">
              {audioMuted ? "volume_off" : "volume_up"}
            </span>
          </button>

          {/* Returning User Link */}
          {step === 1 && (
            <button
              type="button"
              onClick={() => {
                playPop();
                setShowLoginModal(true);
              }}
              className="px-2.5 py-1 text-[11.5px] font-black border-2 border-black rounded-lg bg-white hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[1px_1px_0px_#000]"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-[480px] flex-1 flex flex-col justify-between px-5 py-4 overflow-y-auto">
        {/* STEP 1: Focus Subject */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedRex state="idle" size="sm" interactive={false} />
                <div className="bg-white border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_#000]">
                  <p className="text-[13px] font-black leading-tight text-black">
                    What class are you studying for?
                  </p>
                  <p className="text-[11px] font-medium text-black/60">
                    Pick your focus subject to begin.
                  </p>
                </div>
              </div>

              {/* Subject Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {PRESET_SUBJECTS.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectPresetSubject(sub)}
                    className="p-3 bg-white hover:bg-[#FFD13B] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all text-left flex flex-col justify-between h-[84px] cursor-pointer group"
                  >
                    <span className="material-symbols-outlined text-[24px] text-black group-hover:scale-110 transition-transform">
                      {sub.icon}
                    </span>
                    <span className="text-[12.5px] font-black text-black leading-tight">
                      {sub.name}
                    </span>
                  </button>
                ))}

                {/* Custom Subject Button */}
                <button
                  type="button"
                  onClick={handleSelectCustomSubject}
                  className={`p-3 border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 transition-all text-left flex flex-col justify-between h-[84px] cursor-pointer ${
                    isCustom ? "bg-[#FFD13B]" : "bg-white hover:bg-[#FFD13B]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px] text-black">edit</span>
                  <span className="text-[12.5px] font-black text-black leading-tight">
                    + Custom
                  </span>
                </button>
              </div>

              {/* Inline Custom Subject Form */}
              {isCustom && (
                <form onSubmit={handleConfirmCustomSubject} className="mt-3.5 space-y-2">
                  <label className="block text-[11px] font-black uppercase text-black/70">
                    Enter Custom Subject Name:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="e.g. Organic Chemistry, Nursing..."
                      className="flex-1 px-3 py-2 border-2 border-black rounded-xl font-bold text-[13px] bg-white shadow-[1px_1px_0px_#000] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#FF4D2E] hover:bg-black text-white font-black text-[12.5px] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-colors"
                    >
                      Start
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="pt-4 text-center">
              <p className="text-[11px] font-medium text-black/50">
                You can change or add more subjects at any time in your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: 1-Minute Warm-Up Challenge */}
        {step === 2 && challenge && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <AnimatedRex state="thinking" size="sm" interactive={false} />
                <div className="bg-white border-2 border-black rounded-xl p-2.5 shadow-[2px_2px_0px_#000] flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white">
                      {activeSubjectName}
                    </span>
                    <span className="text-[10.5px] font-bold text-black/55">1-Min Challenge</span>
                  </div>
                  <p className="text-[13px] font-black text-black mt-1">
                    Quick Warm-Up Question
                  </p>
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_#000] mb-4">
                <h2 className="text-[15px] font-black text-black leading-snug">
                  {challenge.question}
                </h2>
              </div>

              {/* Answer Choices */}
              <div className="space-y-2.5">
                {challenge.options.map((opt, idx) => {
                  const isChosen = selectedAnswer === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswerQuestion(idx)}
                      className={`w-full p-3.5 border-2 border-black rounded-xl font-bold text-[13px] text-left transition-all flex items-center justify-between cursor-pointer ${
                        isChosen
                          ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                          : "bg-white hover:bg-[#FFD13B] text-black shadow-[2px_2px_0px_#000] active:translate-y-0.5"
                      }`}
                    >
                      <span className="leading-snug">{opt}</span>
                      <span className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center text-[10px] font-black shrink-0 ml-2 bg-[#FAF7F2] text-black">
                        {String.fromCharCode(65 + idx)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-center pt-3">
              <p className="text-[11px] font-bold text-black/50">
                Tap the best answer to test your recall.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: Instant Feedback & Streak Awakening */}
        {step === 3 && challenge && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            {/* Feedback Pill */}
            <div
              className={`p-3.5 border-2 border-black rounded-2xl shadow-[3px_3px_0px_#000] mb-2 ${
                isCorrect
                  ? "bg-[#10B981] text-white"
                  : "bg-white text-black"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[20px] font-black">
                  {isCorrect ? "check_circle" : "info"}
                </span>
                <span className="text-[14px] font-black">
                  {isCorrect ? "Spot on!" : "Good try!"}
                </span>
              </div>
              <p className={`text-[12px] font-bold ${isCorrect ? "text-white/95" : "text-black/80"}`}>
                Testing yourself beats re-reading.
              </p>
              {!isCorrect && (
                <p className="text-[11.5px] font-medium text-black/75 mt-1 border-t border-black/20 pt-1">
                  Correct answer: <strong className="font-black text-black">{challenge.options[challenge.correctIndex]}</strong>. {challenge.explanation}
                </p>
              )}
            </div>

            {/* Duolingo-style Streak Celebration with Animated Dual-Core Flame, Floating Sparks, and Calendar */}
            <StreakCelebrationModal
              isEmbedded={true}
              streakCount={1}
              onContinue={() => setStep(4)}
            />
          </div>
        )}

        {/* STEP 4: Study Goal & Optional Exam Target */}
        {step === 4 && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] font-black text-black">
                  Set Your Study Habit
                </h2>
                <p className="text-[12px] font-medium text-black/65">
                  A small amount of practice each day keeps your streak alive.
                </p>
              </div>

              {/* Daily Study Time Goal */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0px_#000]">
                <label className="block text-[11px] font-black uppercase text-black/70 mb-2">
                  Daily Study Goal:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { min: 5, label: "5 Min", desc: "Quick Review" },
                    { min: 15, label: "15 Min", desc: "Steady Progress" },
                    { min: 30, label: "30 Min", desc: "Deep Mastery" },
                  ].map((g) => (
                    <button
                      key={g.min}
                      type="button"
                      onClick={() => {
                        playTap();
                        setDailyMinutes(g.min);
                      }}
                      className={`p-2.5 border-2 border-black rounded-xl text-center transition-all cursor-pointer ${
                        dailyMinutes === g.min
                          ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                          : "bg-[#FAF7F2] hover:bg-white text-black shadow-[1px_1px_0px_#000]"
                      }`}
                    >
                      <span className="block text-[13px] font-black">{g.label}</span>
                      <span className="block text-[9.5px] opacity-75">{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Streak Target Commitment */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0px_#000]">
                <label className="block text-[11px] font-black uppercase text-black/70 mb-2">
                  Streak Target Commitment:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { days: 7, label: "7 Days" },
                    { days: 14, label: "14 Days" },
                    { days: 30, label: "30 Days" },
                  ].map((t) => (
                    <button
                      key={t.days}
                      type="button"
                      onClick={() => {
                        playTap();
                        setStreakTarget(t.days);
                      }}
                      className={`py-2 px-2 border-2 border-black rounded-xl font-black text-[12.5px] text-center transition-all cursor-pointer ${
                        streakTarget === t.days
                          ? "bg-[#FFD13B] text-black shadow-[2px_2px_0px_#000]"
                          : "bg-[#FAF7F2] hover:bg-white text-black shadow-[1px_1px_0px_#000]"
                      }`}
                    >
                      🔥 {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Exam Target */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0px_#000] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black uppercase text-black/70">
                    Upcoming Exam (Optional):
                  </label>
                  <button
                    type="button"
                    onClick={handleSkipExam}
                    className="text-[11px] font-bold text-black/55 hover:text-black underline cursor-pointer"
                  >
                    Skip for now
                  </button>
                </div>

                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder={`e.g. ${activeSubjectName} Midterm`}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold bg-[#FAF7F2] focus:bg-white focus:outline-none"
                />

                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => handleExamDateChange(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold bg-[#FAF7F2] focus:bg-white focus:outline-none cursor-pointer"
                />

                {examDateError && (
                  <p className="text-[11px] font-black text-[#EF4444]">
                    {examDateError}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                disabled={Boolean(examDate && examDateError)}
                onClick={handleContinueFromGoal}
                className="w-full py-3.5 bg-[#FF4D2E] hover:bg-black text-white font-black text-[14px] uppercase tracking-wider border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Keep Your Streak & Account Creation */}
        {step === 5 && (
          <div className="flex-1 flex flex-col justify-between animate-fadeIn">
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <AnimatedRex state="excited" size="md" interactive={false} />
                </div>
                <h2 className="text-[20px] font-black text-black">
                  Keep Your Streak
                </h2>
                <p className="text-[12.5px] font-medium text-black/65 max-w-xs mx-auto mt-1">
                  Create your free account so your 1-day study streak is saved.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-[#EF4444] text-white border-2 border-black rounded-xl text-[12px] font-bold shadow-[2px_2px_0px_#000]">
                  {authError}
                </div>
              )}

              {/* Age & Terms Consent Box */}
              <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[2px_2px_0px_#000]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => {
                      playTap();
                      setAgeConfirmed(e.target.checked);
                    }}
                    className="mt-1 w-4 h-4 accent-black rounded border-2 border-black cursor-pointer shrink-0"
                  />
                  <span className="text-[11.5px] font-bold text-black/80 leading-snug">
                    I am 13 or older (or studying with parent/guardian consent) and agree to the{" "}
                    <Link to="/terms" target="_blank" className="underline font-black text-black hover:text-[#FF4D2E]">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" className="underline font-black text-black hover:text-[#FF4D2E]">
                      Privacy Policy
                    </Link>.
                  </span>
                </label>
              </div>

              {/* Continue with Google Button */}
              <button
                type="button"
                disabled={!ageConfirmed || authLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 bg-white hover:bg-[#FAF7F2] text-black font-black text-[13.5px] border-2 border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-y-0.5 cursor-pointer transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{authLoading ? "Connecting..." : "Continue with Google"}</span>
              </button>

              {/* Email Form Toggle */}
              {!showEmailForm ? (
                <button
                  type="button"
                  disabled={!ageConfirmed || authLoading}
                  onClick={() => {
                    playPop();
                    setShowEmailForm(true);
                  }}
                  className="w-full py-2.5 text-[12px] font-black text-black/70 hover:text-black underline cursor-pointer disabled:opacity-40"
                >
                  Or sign in with email
                </button>
              ) : emailSent ? (
                <div className="p-4 bg-[#10B981] text-white border-2 border-black rounded-xl text-center shadow-[2px_2px_0px_#000]">
                  <p className="font-black text-[13px]">Check your inbox!</p>
                  <p className="text-[11.5px] mt-1 text-white/90">
                    We sent a sign-in link to <strong>{emailInput}</strong>.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleEmailAuth} className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="Enter your student email..."
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 border-2 border-black rounded-xl text-[12.5px] font-bold bg-white focus:outline-none shadow-[1px_1px_0px_#000]"
                    />
                    <button
                      type="submit"
                      disabled={!ageConfirmed || authLoading || !emailInput.trim()}
                      className="px-4 py-2.5 bg-black hover:bg-[#FF4D2E] text-white font-black text-[12.5px] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-colors disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="text-center pt-3">
              <p className="text-[10.5px] font-medium text-black/45">
                Studenius is free to start. No credit card required.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Returning User Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFFBEA] border-2 border-black rounded-2xl p-6 max-w-sm w-full shadow-[4px_4px_0px_#000] animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-black text-black">Log in to Studenius</h3>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="w-7 h-7 rounded-lg border-2 border-black bg-white flex items-center justify-center font-black text-[12px] hover:bg-black hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="mb-3 p-2.5 bg-[#EF4444] text-white border-2 border-black rounded-xl text-[11.5px] font-bold">
                {loginError}
              </div>
            )}

            {/* Google OAuth Shortcut */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 mb-4 bg-white hover:bg-[#FAF7F2] text-black font-black text-[12.5px] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-[1.5px] bg-black/20" />
              <span className="text-[10px] font-black uppercase text-black/45">Or with Password</span>
              <div className="flex-1 h-[1.5px] bg-black/20" />
            </div>

            <form onSubmit={handleReturningUserLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-black/70 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-[12.5px] font-bold bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-black hover:bg-[#FF4D2E] text-white font-black text-[13px] border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                {loginLoading ? "Signing in..." : "Log In"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
