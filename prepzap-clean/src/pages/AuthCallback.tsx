import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getCachedSession } from "@/lib/authSession";
import { applyOnboardingDraftIfAny, clearOnboardingDraft } from "@/lib/onboardingBank";

// Handles redirect after:
// - Google OAuth (sign in or sign up)
// - Email confirmation link click
// If returning user (onboarding_complete), clears draft and routes to /dashboard.
// If new user, applies onboarding draft, marks complete, and routes to /dashboard.
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let resolved = false;

    const getDestination = async (user: User) => {
      const redirect = sessionStorage.getItem("post_auth_redirect");
      sessionStorage.removeItem("post_auth_redirect");

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", user.id)
          .maybeSingle();

        // Returning user: never overwrite, clear draft to protect shared computers
        if (profile?.onboarding_complete) {
          clearOnboardingDraft();
          return redirect || "/dashboard";
        }

        // New user or incomplete: apply any active draft
        await applyOnboardingDraftIfAny(user);
        return redirect || "/dashboard";
      } catch (err) {
        console.error("Error in getDestination:", err);
        clearOnboardingDraft();
        return redirect || "/dashboard";
      }
    };

    const processAuth = async () => {
      // 1. Check cached session first (instant, no lock)
      const cached = getCachedSession();
      if (cached?.user) {
        resolved = true;
        const dest = await getDestination(cached.user);
        navigate(dest, { replace: true });
        return;
      }

      // 2. Wait for Supabase to emit the session via onAuthStateChange
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, s) => {
        if (s?.user && !resolved) {
          resolved = true;
          subscription.unsubscribe();
          const dest = await getDestination(s.user);
          navigate(dest, { replace: true });
        }
      });

      // 3. Safety timeout: after 8 seconds, show error and return to /onboarding
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.unsubscribe();
          setErrorMsg("Login timed out. Returning to onboarding...");
          setTimeout(() => navigate("/onboarding", { replace: true }), 1500);
        }
      }, 8000);
    };

    processAuth();
  }, [navigate, searchParams]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFBEA",
        fontFamily: "'Quicksand', sans-serif",
        fontSize: 18,
        fontWeight: 700,
        color: "#000000",
        gap: 12,
      }}
    >
      {errorMsg ? (
        <span style={{ color: "#EF4444" }}>{errorMsg}</span>
      ) : (
        <>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #000000",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span>Signing you in...</span>
        </>
      )}
    </div>
  );
}
