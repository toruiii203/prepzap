import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingStory } from "@/components/onboarding/OnboardingStory";
import { GoogleMark } from "@/components/onboarding/WelcomeArtwork";
import { Mascot } from "@/components/Mascot";
import { SpringButton } from "@/components/ui/SpringButton";
import { motionVariables } from "@/lib/motionTokens";
import { playPop, playTap, playSuccess, triggerHaptic, setSoundEnabled, isSoundEnabled } from "@/lib/soundFX";
import { getDiagnosticQuestion, getOnboardingDraft, saveOnboardingDraft, clearOnboardingDraft, type DiagnosticQuestion } from "@/lib/onboardingBank";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : fallback;
}

/** The presentation is shared with review. Existing local bank, draft and auth boundaries stay here. */
export default function OnboardingFlow() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [subject, setSubject] = useState("Math");
  const [customSubject, setCustomSubject] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["ace_exams", "daily_habit"]);
  const [reminderWindow, setReminderWindow] = useState<"morning" | "afternoon" | "evening" | "night">("evening");
  const [challenge, setChallenge] = useState<DiagnosticQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(()=>!isSoundEnabled());
  const [authDialog, setAuthDialog] = useState<"google" | "email" | null>(null);
  const [dark, setDark] = useState(()=>document.documentElement.classList.contains("dark"));
  const opener = useRef<HTMLElement | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>();
  const activeSubjectName = isCustom && customSubject.trim() ? customSubject.trim() : subject;

  useEffect(() => {
    if (session && profile?.onboarding_complete !== false) {
      clearOnboardingDraft();
      navigate("/dashboard", { replace: true });
    }
  }, [session, profile, navigate]);
  useEffect(() => {
    const draft = getOnboardingDraft();
    if (!draft) return;
    if (draft.subject) setSubject(draft.subject);
    if (draft.customSubject) { setCustomSubject(draft.customSubject); setIsCustom(true); }
    if (draft.selectedGoals?.length) setSelectedGoals(draft.selectedGoals);
    if (draft.reminderWindow) setReminderWindow(draft.reminderWindow);
    if (draft.ageConfirmed) setAgeConfirmed(draft.ageConfirmed);
    if (typeof draft.audioMuted === "boolean") { setAudioMuted(draft.audioMuted); setSoundEnabled(!draft.audioMuted); }
    if (draft.firstWinCompleted) setStep(4);
  }, []);
  useEffect(() => {
    if (step === 2) { setChallenge(getDiagnosticQuestion(activeSubjectName)); setSelectedAnswer(null); }
  }, [step, activeSubjectName]);
  useEffect(()=>()=>clearTimeout(feedbackTimer.current),[]);
  useEffect(()=>{
    const observer=new MutationObserver(()=>setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:["class"]});return()=>observer.disconnect();
  },[]);
  const toggleAudio = () => {
    const nextMuted=!audioMuted;setAudioMuted(nextMuted);setSoundEnabled(!nextMuted);
    saveOnboardingDraft({audioMuted:nextMuted});if(!nextMuted)playPop();
  };
  const handleStartWarmup = () => {
    if (isCustom && !customSubject.trim()) return;
    playPop();triggerHaptic("medium");
    saveOnboardingDraft({subject:isCustom ? "Custom" : subject,customSubject:isCustom ? customSubject.trim() : "",selectedGoals,reminderWindow});
    setStep(2);
  };
  const handleAnswerQuestion = (idx: number) => {
    if (selectedAnswer !== null || !challenge) return;
    playPop();triggerHaptic("medium");setSelectedAnswer(idx);
    saveOnboardingDraft({firstWinCompleted:true,firstWinLocalDate:new Date().toLocaleDateString("en-CA"),subject:activeSubjectName,selectedGoals,reminderWindow});
    if(idx===challenge.correctIndex)playSuccess();
    feedbackTimer.current=setTimeout(()=>setStep(3),700);
  };
  function selectSubject(value: string) {
    playTap();const resolved=value === "Computing" ? "Computer Science" : value;
    const preset=["Math","Science","English","Biology","Calculus","Chemistry","History","Psychology","Computer Science","Physics","Economics","General Studies"].includes(resolved);
    if(preset){setSubject(resolved);setIsCustom(false);setCustomSubject("");saveOnboardingDraft({subject:resolved,customSubject:"",selectedGoals,reminderWindow});}
    else {setIsCustom(true);setCustomSubject(value);}
  }
  function openAuth(title: string) {
    opener.current=document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if(title==="Log in"){setShowLoginModal(true);return;}
    setAuthError(null);setAuthDialog(title==="Continue with Google" ? "google" : "email");
  }
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
    } catch (err: unknown) {
      console.error("Google auth error:", err);
      setAuthError(errorMessage(err, "Failed to start Google sign-in. Please try again."));
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      console.error("Email auth error:", err);
      setAuthError(errorMessage(err, "Could not send login link. Check your email address."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleReturningUserLogin = async (e: FormEvent) => {
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
    } catch (err: unknown) {
      setLoginError(errorMessage(err, "Invalid email or password."));
    } finally {
      setLoginLoading(false);
    }
  };


  const consent = <label className="onboarding-consent"><input type="checkbox" checked={ageConfirmed} onChange={event=>{playTap();setAgeConfirmed(event.target.checked);}}/><span>I am 13 or older (or studying with parent/guardian consent) and agree to the <Link to="/terms" target="_blank">Terms</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>.</span></label>;
  return <div className="studio studenius-onboarding" data-onboarding="true" data-theme={dark ? "dark" : "light"} style={motionVariables}>
    <OnboardingStory dark={dark} still={false} reviewMode={false} initialSubject={activeSubjectName} resumeAtSave={step===4} questionOverride={challenge} onSubjectSelect={selectSubject} onStartQuestion={handleStartWarmup} onAnswer={handleAnswerQuestion} onAuth={openAuth} saveActions={<><SpringButton soundEnabled={false} className="story-google" onClick={()=>openAuth("Continue with Google")}><GoogleMark/>Continue with Google</SpringButton><SpringButton soundEnabled={false} className="story-secondary" onClick={()=>openAuth("Continue with email")}>Continue with email</SpringButton><p className="story-review-note">Your account keeps your progress together.</p></>}/>
    <Dialog.Root open={authDialog!==null} onOpenChange={open=>{if(!open)setAuthDialog(null);}}><Dialog.Portal><Dialog.Overlay className="onboarding-dialog-overlay"/><Dialog.Content className="onboarding-dialog" data-theme={dark?"dark":"light"} onCloseAutoFocus={event=>{event.preventDefault();opener.current?.focus();}}>
      <button className="close-modal" aria-label="Close sign-in" onClick={()=>setAuthDialog(null)}>×</button><Mascot mood="encouraging" size="sm"/><Dialog.Title>{authDialog==="google" ? "Continue with Google" : "Save with email"}</Dialog.Title><Dialog.Description>Your study space, ready when you are.</Dialog.Description>
      {consent}{authError && <p role="alert" className="onboarding-auth-error">{authError}</p>}
      {authDialog==="google" ? <SpringButton soundEnabled={false} className="story-google" disabled={!ageConfirmed||authLoading} onClick={handleGoogleSignIn}><GoogleMark/>{authLoading?"Connecting…":"Continue with Google"}</SpringButton> : emailSent ? <p role="status">We sent a sign-in link to <strong>{emailInput}</strong>. Check your inbox.</p> : <form onSubmit={handleEmailAuth}><label>Email address<input type="email" autoComplete="email" required value={emailInput} onChange={event=>setEmailInput(event.target.value)}/></label><SpringButton soundEnabled={false} type="submit" className="story-primary" disabled={!ageConfirmed||authLoading||!emailInput.trim()}>{authLoading?"Sending…":"Send sign-in link"}</SpringButton></form>}
      <button className="story-text" onClick={toggleAudio}>{audioMuted ? "Sound effects: off" : "Sound effects: on"}</button>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={showLoginModal} onOpenChange={setShowLoginModal}><Dialog.Portal><Dialog.Overlay className="onboarding-dialog-overlay"/><Dialog.Content className="onboarding-dialog" data-theme={dark?"dark":"light"} onCloseAutoFocus={event=>{event.preventDefault();opener.current?.focus();}}>
      <button className="close-modal" aria-label="Close login" onClick={()=>setShowLoginModal(false)}>×</button><Dialog.Title>Welcome back.</Dialog.Title><Dialog.Description>Log in to your Studenius account.</Dialog.Description>
      <SpringButton soundEnabled={false} className="story-google" onClick={()=>{setShowLoginModal(false);setAuthDialog("google");}}><GoogleMark/>Continue with Google</SpringButton>
      {loginError && <p role="alert" className="onboarding-auth-error">{loginError}</p>}
      <form onSubmit={handleReturningUserLogin}><label>Email<input type="email" autoComplete="email" required value={loginEmail} onChange={event=>setLoginEmail(event.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={loginPassword} onChange={event=>setLoginPassword(event.target.value)}/></label><SpringButton soundEnabled={false} className="story-primary" type="submit" disabled={loginLoading}>{loginLoading?"Signing in…":"Log in"}</SpringButton></form>
      <button className="story-text" onClick={()=>{setShowLoginModal(false);setAuthDialog("email");}}>Email me a sign-in link instead</button>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
