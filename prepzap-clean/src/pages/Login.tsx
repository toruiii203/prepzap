import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Logo } from "@/components/Logo"
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

const mono: React.CSSProperties = { fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', Calibri, sans-serif" };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: "13px",
  fontFamily: "'Gill Sans', 'Gill Sans MT', 'Trebuchet MS', Calibri, sans-serif", fontWeight: 300,
  background: "transparent", color: "var(--pz-text)",
  border: "0.5px solid var(--pz-border)", outline: "none",
  transition: "border-color 0.15s",
};
const labelStyle: React.CSSProperties = {
  ...mono, fontSize: "10px", color: "var(--pz-text-muted)",
  letterSpacing: "0.10em", textTransform: "uppercase", display: "block", marginBottom: "6px",
};

const toFakeEmail = (username: string) => `${username.toLowerCase().trim()}@prepzap.app`

export default function Login() {
  const navigate  = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = username.trim().toLowerCase()
    if (!clean || !password) { setError("Please fill in all fields."); return }
    setError(null); setLoading(true)

    const fakeEmail = toFakeEmail(clean)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })
    setLoading(false)

    if (authError) {
      // Give a friendly message instead of Supabase internals
      if (authError.message.toLowerCase().includes("invalid") ||
          authError.message.toLowerCase().includes("credentials")) {
        setError("Incorrect username or password.")
      } else {
        setError(authError.message)
      }
    } else {
      setSuccess(true)
      setTimeout(() => navigate("/dashboard"), 800)
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px" }}>
      <Link to="/" style={{ marginBottom: "40px" }}><Logo size="lg" /></Link>

      <div style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ borderBottom: "0.5px solid var(--pz-border)", marginBottom: "32px", paddingBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 300, letterSpacing: "-0.02em", color: "var(--pz-text)", marginBottom: "6px" }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "var(--pz-text-muted)", fontWeight: 300 }}>Log in with your username and password</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button type="button" onClick={async () => {
            setLoading(true)
            const { error: authError } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/dashboard` },
            })
            if (authError) { setError(authError.message); setLoading(false) }
          }} disabled={loading} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            padding: "10px", border: "0.5px solid var(--pz-border)", background: "transparent",
            color: "var(--pz-text-2)", fontSize: "12px", fontFamily: "'Geist', sans-serif", fontWeight: 300,
            cursor: "pointer", marginBottom: "4px", transition: "border-color 0.15s, color 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--pz-border-hv)"; e.currentTarget.style.color = "var(--pz-text)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--pz-border)"; e.currentTarget.style.color = "var(--pz-text-2)"; }}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24">
              <path fill="#888" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#888" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#888" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#888" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "0.5px", background: "var(--pz-border)" }} />
            <span style={{ ...mono, fontSize: "10px", color: "var(--pz-text-muted)", letterSpacing: "0.08em" }}>OR</span>
            <div style={{ flex: 1, height: "0.5px", background: "var(--pz-border)" }} />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              placeholder="your username"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              style={inputStyle}
              autoComplete="username"
              autoCapitalize="none"
              onFocus={e => (e.target.style.borderColor = "var(--pz-border-hv)")}
              onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "40px" }}
                autoComplete="current-password"
                onFocus={e => (e.target.style.borderColor = "var(--pz-border-hv)")}
                onBlur={e => (e.target.style.borderColor = "var(--pz-border)")}
              />
              <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "var(--pz-text-muted)" }}>
                {showPw ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "0.5px solid rgba(245,245,245,0.14)", fontSize: "12px", color: "var(--pz-text-muted)", fontWeight: 300 }}>
              <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "0.5px solid rgba(245,245,245,0.14)", fontSize: "12px", color: "var(--pz-text-2)", fontWeight: 300 }}>
              <CheckCircle2 style={{ width: 12, height: 12, flexShrink: 0 }} /> Logged in! Redirecting...
            </div>
          )}

          <button type="submit" disabled={loading || success} style={{
            width: "100%", padding: "10px", fontSize: "12px",
            fontFamily: "'Gill Sans', sans-serif", fontWeight: 400,
            color: "#000", background: "var(--pz-text)", border: "none",
            cursor: "pointer", letterSpacing: "0.04em",
            opacity: (loading || success) ? 0.6 : 1, transition: "opacity 0.15s",
          }}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--pz-text-muted)", marginTop: "24px", fontWeight: 300 }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--pz-text-2)", textDecoration: "none", borderBottom: "0.5px solid var(--pz-border)" }}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
