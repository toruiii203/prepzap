import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

const GOLD = "#F5A623"
const BORDER = "rgba(245,166,35,0.22)"
const BORDHV = "rgba(245,166,35,0.55)"
const SURF = "#231010"
const SURF2 = "#2d1414"
const BG = "#1a0a0a"
const TEXT = "#f5ede8"
const TEXT2 = "rgba(245,237,232,0.55)"
const TEXT3 = "rgba(245,237,232,0.28)"

const mono: React.CSSProperties = { fontFamily: "'Nunito', sans-serif" }
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: "13px",
  fontFamily: "'Nunito', sans-serif", fontWeight: 700,
  background: SURF2, color: TEXT,
  border: `1.5px solid ${BORDER}`, borderRadius: 10, outline: "none",
  transition: "border-color 0.15s", boxSizing: "border-box",
}
const labelStyle: React.CSSProperties = {
  ...mono, fontSize: "10px", color: TEXT3, fontWeight: 700,
  letterSpacing: "0.10em", textTransform: "uppercase", display: "block", marginBottom: "6px",
}

function MascotPanel() {
  return (
    <div className="mascot-panel" style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(160deg, #1a0a10 0%, #2d0f1c 50%, #160810 100%)`,
      borderRight: `2px solid ${BORDER}`,
      position: "relative",
      overflow: "hidden",
      gap: 0,
    }}>
      <style>{`
        @media (max-width: 800px) {
          .mascot-panel { display: none !important; }
        }
        @keyframes floatIdle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.06); }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: "absolute",
        width: 340, height: 340,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(245,166,35,0.22) 0%, transparent 70%)`,
        animation: "glowPulse 5s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Fox illustration */}
      <div style={{ animation: "floatIdle 5s ease-in-out infinite", position: "relative", zIndex: 1 }}>
        <img
          src="/fox_scholar.jpg"
          alt="Studenius fox scholar mascot"
          style={{
            width: 300,
            height: 300,
            objectFit: "cover",
            objectPosition: "center top",
            borderRadius: "50%",
            border: `3px solid rgba(245,166,35,0.35)`,
            display: "block",
          }}
        />
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", marginTop: 28, zIndex: 1, padding: "0 32px" }}>
        <h2 style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 28, color: GOLD,
          margin: "0 0 10px", letterSpacing: "0.01em",
        }}>
          Join the journey
        </h2>
        <p style={{
          color: TEXT2, fontSize: 14, lineHeight: 1.6,
          maxWidth: 240, margin: "0 auto",
          fontFamily: "'Nunito', sans-serif", fontWeight: 600,
        }}>
          Your AI-powered study companion is waiting. Let's get smart.
        </p>
      </div>

      {/* Decorative dots */}
      <div style={{ display: "flex", gap: 8, marginTop: 28, zIndex: 1 }}>
        {([GOLD, "rgba(245,166,35,0.4)", "rgba(245,166,35,0.2)"] as string[]).map((c, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
        ))}
      </div>
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { setError("Please fill in all fields."); return }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }
    setError(null); setLoading(true)

    const { error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, onboarding_complete: false } },
    })
    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate("/onboarding"), 800)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
        queryParams: { prompt: "select_account" },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex" }}>
      <MascotPanel />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "32px",
      }}>
        {/* Logo */}
        <Link to="/" style={{ marginBottom: "40px", display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/fox_icon_final.png" alt="Studenius" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover" }} />
          <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: 22, color: GOLD, letterSpacing: "0.08em" }}>STUDENIUS</span>
        </Link>

        <div style={{
          width: "100%", maxWidth: "380px",
          background: SURF, border: `2px solid ${BORDER}`,
          borderRadius: 16, padding: 18,
        }}>
          <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: "32px", paddingBottom: "24px" }}>
            <h1 style={{
              fontSize: "28px", fontWeight: 400,
              fontFamily: "'Fredoka One',cursive",
              letterSpacing: "0.01em", color: GOLD, marginBottom: "6px",
            }}>
              Create account
            </h1>
            <p style={{ fontSize: "13px", color: TEXT2, fontWeight: 700, margin: 0 }}>
              Start your free trial today
            </p>
          </div>

          {/* Google OAuth button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "10px",
              padding: "10px", border: `1.5px solid ${BORDER}`,
              borderRadius: 10, background: SURF2,
              color: TEXT2, fontSize: "12px",
              fontFamily: "'Nunito', sans-serif", fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              marginBottom: "20px", transition: "border-color 0.15s, color 0.15s",
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = BORDHV; e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT2 }}
          >
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ flex: 1, height: "1px", background: BORDER }} />
            <span style={{ ...mono, fontSize: "10px", color: TEXT3, letterSpacing: "0.08em", fontWeight: 700 }}>OR</span>
            <div style={{ flex: 1, height: "1px", background: BORDER }} />
          </div>

          <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text" placeholder="Your name" value={name}
                onChange={e => setName(e.target.value)} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = BORDHV)}
                onBlur={e  => (e.target.style.borderColor = BORDER)}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = BORDHV)}
                onBlur={e  => (e.target.style.borderColor = BORDER)}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="At least 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: "40px" }}
                  onFocus={e => (e.target.style.borderColor = BORDHV)}
                  onBlur={e  => (e.target.style.borderColor = BORDER)}
                />
                <button
                  type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: TEXT3 }}
                >
                  {showPw ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: `1.5px solid rgba(255,100,100,0.4)`, borderRadius: 10, fontSize: "12px", color: "#ff9c9c", fontWeight: 700, background: "rgba(139,26,42,0.18)" }}>
                <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} /> {error}
              </div>
            )}
            {success && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: `1.5px solid ${BORDHV}`, borderRadius: 10, fontSize: "12px", color: GOLD, fontWeight: 700, background: "rgba(245,166,35,0.1)" }}>
                <CheckCircle2 style={{ width: 12, height: 12, flexShrink: 0 }} /> Account created! Redirecting...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              style={{
                width: "100%", padding: "10px", fontSize: "13px",
                fontFamily: "'Nunito', sans-serif", fontWeight: 800,
                color: "#000", background: GOLD,
                border: `2px solid ${GOLD}`, borderRadius: 10,
                cursor: (loading || success) ? "default" : "pointer",
                letterSpacing: "0.04em",
                opacity: (loading || success) ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "12px", color: TEXT3, marginTop: "24px", fontWeight: 700 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: GOLD, textDecoration: "none", borderBottom: `1px solid ${BORDER}` }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
