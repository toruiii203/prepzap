import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Logo } from "@/components/Logo"
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase"


const GOLD = "#f0a040"
const BORDER = "rgba(139,26,42,0.35)"
const BORDHV = "rgba(240,160,64,0.45)"
const TEXT = "#f5ede8"
const TEXT2 = "rgba(245,237,232,0.55)"
const TEXT3 = "rgba(245,237,232,0.28)"
const SURF = "#1f0b13"
const SURF2 = "#2a0e18"

const brand: React.CSSProperties = { fontFamily: "'Fredoka One', cursive" };
const mono: React.CSSProperties = { fontFamily: "'Nunito', sans-serif" };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: "13px", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
  background: SURF2, color: TEXT,
  border: `1.5px solid ${BORDER}`, borderRadius: 10, outline: "none",
  transition: "border-color 0.15s",
};
const labelStyle: React.CSSProperties = {
  ...mono, fontSize: "10px", color: TEXT3, letterSpacing: "0.10em", fontWeight: 700,
  textTransform: "uppercase", display: "block", marginBottom: "6px",
};

const SUBJECTS = ["Biology","Chemistry","Math","Physics","History","English","Economics","Other"]

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep]         = useState<1 | 2>(1)
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [subjects, setSubjects] = useState<Set<string>>(new Set())
  const [goal, setGoal]         = useState(60)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const toggleSubject = (s: string) =>
    setSubjects(prev => {
      const n = new Set(prev)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("Please enter your name."); return }
    if (!email.includes("@")) { setError("Please enter a valid email."); return }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return }
    setError(null); setStep(2)
  }

  const handleGoogle = async () => {
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    if (authError) { setError(authError.message); setLoading(false) }
  }

  const handleFinish = async () => {
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          subjects: Array.from(subjects),
          daily_goal_minutes: goal,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already registered") ||
          signUpError.message.toLowerCase().includes("already exists")) {
        setError("An account with this email already exists. Try logging in instead.")
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(true)

    if (data.session) {
      // Email confirmation is OFF — session created immediately, go to dashboard
      setTimeout(() => navigate("/onboarding"), 800)
    } else {
      // Email confirmation is ON — try signing in anyway (some Supabase configs allow it)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr && signInData.session) {
        setTimeout(() => navigate("/onboarding"), 800)
      }
      // else: confirmation email was sent — success state shows the message below
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--pz-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px" }}>
      <Link to="/" style={{ marginBottom: "40px" }}><Logo size="lg" /></Link>

      <div style={{ width: "100%", maxWidth: "380px", background: SURF, border: `2px solid ${BORDER}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", gap: "4px", marginBottom: "28px" }}>
          {[1,2].map(s => (
            <div key={s} style={{ flex: 1, height: "3px", borderRadius: 4, background: s <= step ? GOLD : BORDER, transition: "background 0.3s" }} />
          ))}
        </div>

        <div style={{ borderBottom: `1px solid ${BORDER}`, marginBottom: "28px", paddingBottom: "20px" }}>
          <h1 style={{ ...brand, fontSize: "28px", letterSpacing: "0.01em", color: GOLD, marginBottom: "4px" }}>
            {step === 1 ? "Create your account" : "Personalize your experience"}
          </h1>
          <p style={{ fontSize: "13px", color: TEXT2, fontWeight: 700, margin: 0 }}>
            {step === 1 ? "Start studying smarter today" : "Help us tailor your study plan"}
          </p>
        </div>

        {step === 1 ? (
          <>
            <p style={{ fontSize: "11px", color: TEXT3, fontWeight: 700, lineHeight: 1.6, margin: "0 0 12px 0" }}>
              By signing up, you agree to our{" "}
              <Link to="/terms" style={{ color: TEXT2, textDecoration: "none", borderBottom: `1px solid ${BORDER}` }}>Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" style={{ color: TEXT2, textDecoration: "none", borderBottom: `1px solid ${BORDER}` }}>Privacy Policy</Link>.
            </p>
            <button onClick={handleGoogle} disabled={loading} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              padding: "10px", border: `1.5px solid ${BORDER}`, borderRadius: 10, background: SURF2,
              color: TEXT2, fontSize: "12px", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
              cursor: "pointer", marginBottom: "20px", transition: "border-color 0.15s, color 0.15s, transform 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = BORDHV; (e.currentTarget).style.color = TEXT; (e.currentTarget).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = BORDER; (e.currentTarget).style.color = TEXT2; (e.currentTarget).style.transform = "translateY(0)"; }}>
              <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24">
                <path fill="#888" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#888" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#888" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#888" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ flex: 1, height: "1px", background: BORDER }} />
              <span style={{ ...mono, fontSize: "10px", color: TEXT3, letterSpacing: "0.08em", fontWeight: 700 }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: BORDER }} />
            </div>

            <form onSubmit={handleStep1} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" placeholder="Your name" value={name}
                  onChange={e => setName(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = BORDHV)}
                  onBlur={e => (e.target.style.borderColor = BORDER)} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = BORDHV)}
                  onBlur={e => (e.target.style.borderColor = BORDER)} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: "relative" }}>
                  <input type={showPw ? "text" : "password"} placeholder="Min. 6 characters" value={password}
                    onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: "40px" }}
                    onFocus={e => (e.target.style.borderColor = BORDHV)}
                    onBlur={e => (e.target.style.borderColor = BORDER)} />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: TEXT3 }}>
                    {showPw ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              </div>
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: "12px", color: "#ff9c9c", fontWeight: 700, background: "rgba(139,26,42,0.18)" }}>
                  <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} /> {error}
                </div>
              )}
              <button type="submit" style={{ width: "100%", padding: "10px", fontSize: "12px", fontFamily: "'Fredoka One', cursive", fontWeight: 400, color: "var(--pz-bg)", background: GOLD, border: `2px solid ${GOLD}`, borderRadius: 10, cursor: "pointer", letterSpacing: "0.04em" }}>
                Continue →
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <label style={labelStyle}>Subjects you study</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {SUBJECTS.map(s => (
                  <button type="button" key={s} onClick={() => toggleSubject(s)} style={{
                    padding: "6px 12px", fontSize: "11px", fontFamily: "'Nunito', sans-serif", fontWeight: 700,
                    border: `1.5px solid ${subjects.has(s) ? BORDHV : BORDER}`, borderRadius: 999,
                    background: subjects.has(s) ? "rgba(240,160,64,0.18)" : SURF2,
                    color: subjects.has(s) ? GOLD : TEXT2,
                    cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em",
                  }}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Daily study goal — <span style={{ color: GOLD }}>{goal} min</span></label>
              <input type="range" min="15" max="180" step="15" value={goal}
                onChange={e => setGoal(Number(e.target.value))}
                style={{ width: "100%", accentColor: GOLD, marginTop: "8px", cursor: "pointer" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span style={{ ...mono, fontSize: "10px", color: TEXT3 }}>15 min</span>
                <span style={{ ...mono, fontSize: "10px", color: TEXT3 }}>3 hr</span>
              </div>
            </div>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: "12px", color: "#ff9c9c", fontWeight: 700, background: "rgba(139,26,42,0.18)" }}>
                <AlertCircle style={{ width: 12, height: 12, flexShrink: 0 }} /> {error}
              </div>
            )}
            {success ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", border: `1.5px solid ${BORDHV}`, borderRadius: 10, background: "rgba(240,160,64,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: GOLD, fontWeight: 700 }}>
                  <CheckCircle2 style={{ width: 13, height: 13, flexShrink: 0 }} />
                  Account created successfully!
                </div>
                <p style={{ fontSize: "11px", color: TEXT2, fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
                  Check your email for a confirmation link, then{" "}
                  <Link to="/login" style={{ color: GOLD, textDecoration: "none", borderBottom: `1px solid ${BORDER}` }}>log in here</Link>.
                </p>
              </div>
            ) : (
              <button onClick={handleFinish} disabled={loading} style={{ width: "100%", padding: "10px", fontSize: "12px", fontFamily: "'Fredoka One', cursive", fontWeight: 400, color: "var(--pz-bg)", background: GOLD, border: `2px solid ${GOLD}`, borderRadius: 10, cursor: "pointer", letterSpacing: "0.04em", opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
                {loading ? "Creating account..." : "Finish setup →"}
              </button>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: "12px", color: TEXT3, marginTop: "24px", fontWeight: 700 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: GOLD, textDecoration: "none", borderBottom: `1px solid ${BORDER}` }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
