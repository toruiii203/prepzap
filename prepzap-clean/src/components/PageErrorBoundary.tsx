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
            background: "#1a0a0a",
            color: "#f5ede8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 560 }}>
            <h2 style={{ color: "#F5A623", marginBottom: 10 }}>This page hit an error</h2>
            <p style={{ opacity: 0.85, marginBottom: 8 }}>
              Something went wrong while rendering this route.
            </p>
            <p style={{ opacity: 0.6, fontSize: 13 }}>{this.state.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

