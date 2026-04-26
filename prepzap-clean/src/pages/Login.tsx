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
