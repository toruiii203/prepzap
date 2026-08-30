import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

// Handles redirect after:
// - Google OAuth (sign in or sign up)
// - Email confirmation link click
// Checks onboarding_complete and routes accordingly.
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Where to send the user after auth completes. Login/Signup pages must
    // store this BEFORE kicking off Google OAuth, since the OAuth redirect
    // wipes out any query params — sessionStorage survives the round trip.
    // e.g. in Login.tsx/Signup.tsx before calling signInWithOAuth:
    //   const redirect = searchParams.get("redirect")
    //   if (redirect) sessionStorage.setItem("post_auth_redirect", redirect)
    const getDestination = (onboardingComplete: boolean) => {
      const redirect = sessionStorage.getItem("post_auth_redirect")
      sessionStorage.removeItem("post_auth_redirect")
      if (!onboardingComplete) return "/onboarding?step=nameInput"
      return redirect || "/dashboard"
    }

    // FIX: use onAuthStateChange instead of getSession() directly.
    // After an OAuth redirect, Supabase needs a moment to exchange the
    // PKCE code for a session. getSession() called immediately may return
    // null before the exchange completes. The SIGNED_IN event fires reliably
    // once the session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "SIGNED_IN" || !session) return

        subscription.unsubscribe()

        // Check if this user has completed onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", session.user.id)
          .maybeSingle()

        navigate(getDestination(!!profile?.onboarding_complete), { replace: true })
      }
    )

    // Fallback: if already have a session (rare: user navigated to /auth/callback
    // manually while already logged in), handle immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      subscription.unsubscribe()
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .maybeSingle()
      navigate(getDestination(!!profile?.onboarding_complete), { replace: true })
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFBEA",
      fontFamily: "'Quicksand', sans-serif",
      fontSize: 18,
      fontWeight: 700,
      color: "#1A1A1A",
    }}>
      Signing you in...
    </div>
  )
}
