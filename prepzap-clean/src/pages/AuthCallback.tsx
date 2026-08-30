import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"

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
      // 1. Check for PKCE code in query params (?code=xxx)
      const code = searchParams.get("code")
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data?.session) {
            resolved = true
            const dest = await getDestination(data.session.user.id)
            navigate(dest, { replace: true })
            return
          }
        } catch (e) {
          console.error("Exchange code failed in AuthCallback:", e)
        }
      }

      // 2. Check for Implicit tokens in hash (#access_token=xxx&refresh_token=xxx)
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const access_token = hashParams.get("access_token")
        const refresh_token = hashParams.get("refresh_token")
        if (access_token && refresh_token) {
          try {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (!error && data?.session) {
              resolved = true
              const dest = await getDestination(data.session.user.id)
              navigate(dest, { replace: true })
              return
            }
          } catch (e) {
            console.error("Set session from hash failed in AuthCallback:", e)
          }
        }
      }

      // 3. Check existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        resolved = true
        const dest = await getDestination(session.user.id)
        navigate(dest, { replace: true })
        return
      }

      // 4. Fallback listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
        if (s && !resolved) {
          resolved = true
          subscription.unsubscribe()
          const dest = await getDestination(s.user.id)
          navigate(dest, { replace: true })
        }
      })

      // 5. Safety timeout: if after 6 seconds nothing resolved, redirect to /onboarding
      setTimeout(() => {
        if (!resolved) {
          subscription.unsubscribe()
          setErrorMsg("Login timed out. Returning to login...")
          setTimeout(() => navigate("/onboarding", { replace: true }), 1500)
        }
      }, 6000)
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
