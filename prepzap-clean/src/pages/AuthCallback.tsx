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
    const handle = async () => {
      // Wait for Supabase to exchange the URL token for a session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Something went wrong — send back to onboarding to try again
        navigate("/onboarding", { replace: true })
        return
      }

      // Check if this user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", session.user.id)
        .single()

      if (profile?.onboarding_complete) {
        // Returning user — go straight to dashboard
        navigate("/dashboard", { replace: true })
      } else {
        // New user or incomplete onboarding — continue from nameInput
        navigate("/onboarding?step=nameInput", { replace: true })
      }
    }

    handle()
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
