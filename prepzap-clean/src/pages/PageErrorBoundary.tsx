import React from "react"

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  message: string
}

export class PageErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unknown error" }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Route ErrorBoundary]", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#160810",
            color: "#f5ede8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>//////</div>
            <h2 style={{ color: "#F5A623", marginBottom: 10, fontFamily: "'Fredoka One', cursive", fontSize: 24 }}>
              This page hit an error
            </h2>
            <p style={{ opacity: 0.75, marginBottom: 8, fontSize: 14 }}>
              Something went wrong while rendering this route.
            </p>
            {this.state.message && (
              <p
                style={{
                  opacity: 0.5,
                  fontSize: 12,
                  marginBottom: 24,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(139,26,42,0.35)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontFamily: "monospace",
                  textAlign: "left",
                  wordBreak: "break-all",
                }}
              >
                {this.state.message}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => this.setState({ hasError: false, message: "" })}
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  background: "#f0a040",
                  border: "none",
                  color: "#160810",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  background: "transparent",
                  border: "1.5px solid rgba(139,26,42,0.5)",
                  color: "rgba(245,237,232,0.55)",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
