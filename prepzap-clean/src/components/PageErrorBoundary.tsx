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

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-black flex items-center justify-center p-6">
          <div role="alert" className="max-w-md w-full bg-white border-2 border-black rounded-3xl p-6 md:p-8 shadow-[4px_4px_0px_#000000] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFD13B] border-2 border-black flex items-center justify-center text-[26px] shadow-[2px_2px_0px_#000]">
              <span className="material-symbols-outlined" aria-hidden="true">replay</span>
            </div>
            <h2 className="text-[20px] font-black text-black">Let’s try that again</h2>
            <p className="text-[13px] font-bold text-black/60">
              Something unexpected happened while loading this view. You can retry loading or return to your dashboard.
            </p>
            {this.state.message && (
              <div className="p-3 bg-[#FAF7F2] border border-black/15 rounded-xl text-[11px] font-mono text-black/70 text-left overflow-x-auto">
                {this.state.message}
              </div>
            )}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="min-h-11 flex-1 py-2.5 bg-[#FFD13B] hover:bg-[#FFC000] text-black border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-all"
              >
                Retry page
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = "/dashboard"; }}
                className="min-h-11 flex-1 py-2.5 bg-black hover:bg-[#FF4D2E] text-white border-2 border-black rounded-xl font-black text-[12px] shadow-[2px_2px_0px_#000] active:translate-y-0.5 cursor-pointer transition-all"
              >
                Dashboard &rarr;
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

