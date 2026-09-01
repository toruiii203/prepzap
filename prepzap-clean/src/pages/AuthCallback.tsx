import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { getCachedSession } from "@/lib/authSession"

// Handles redirect after:
// - Google OAuth (sign in or sign up)
// - Email confirmation link click
// Checks onboarding_complete and routes accordingly.
export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let resolved = false

    const getDestination = async (userId: string) => {
      const redirect = sessionStorage.getItem("post_auth_redirect")
      sessionStorage.removeItem("post_auth_redirect")
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_complete")
          .eq("id", userId)
          .maybeSingle()

        if (!profile?.onboarding_complete) {
          return "/onboarding?step=nameInput"
        }
      } catch {}
      return redirect || "/dashboard"
    }

    const processAuth = async () => {
      // 1. Check cached session first (instant, no lock)
      const cached = getCachedSession()
      if (cached) {
        resolved = true
        const dest = await getDestination(cached.user.id)
        navigate(dest, { replace: true })
        return
      }

      // 2. Wait for Supabase to emit the session via onAuthStateChange.
      // GoTrue automatically parses ?code= or #access_token= from the URL
      // when detectSessionInUrl is true. We just wait for it.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
        if (s && !resolved) {
          resolved = true
          subscription.unsubscribe()
          const dest = await getDestination(s.user.id)
          navigate(dest, { replace: true })
        }
      })

      // 5. Safety timeout: if after 8 seconds nothing resolved, show error and redirect
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          subscription.unsubscribe()
          setErrorMsg("Login timed out. Returning to login...")
          setTimeout(() => navigate("/onboarding", { replace: true }), 1500)
        }
      }, 8000)
    }

    processAuth()
  }, [navigate, searchParams])

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFBEA",
      fontFamily: "'Quicksand', sans-serif",
      fontSize: 18,
      fontWeight: 700,
      color: "#1A1A1A",
      gap: 12,
    }}>
      {errorMsg ? (
        <span style={{ color: "#E8534A" }}>{errorMsg}</span>
      ) : (
        <>
          <div style={{
            width: 32,
            height: 32,
            border: "3px solid #1A1A1A",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <span>Signing you in...</span>
        </>
      )}
    </div>
  )
}
