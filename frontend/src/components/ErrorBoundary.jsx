import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center text-white space-y-8 select-none">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold font-display tracking-wide uppercase text-white/95" style={{ fontFamily: "'Playfair Display', serif" }}>
              Something went wrong
            </h1>
            <p className="text-sm md:text-base text-white/60 max-w-md mx-auto font-sans tracking-wide leading-relaxed">
              We encountered an unexpected error. Please try again or return to our homepage.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <button
              onClick={this.handleRetry}
              className="px-8 py-3.5 bg-[#C9A84C] hover:bg-[#B5963F] text-white text-xs font-bold uppercase tracking-widest rounded transition-all duration-300 shadow-md shadow-[#C9A84C]/10 w-48 sm:w-auto"
            >
              Retry
            </button>
            <a
              href="/"
              className="px-8 py-3.5 border border-white/20 hover:border-white/40 text-white text-xs font-bold uppercase tracking-widest rounded transition-all duration-300 w-48 sm:w-auto"
            >
              Homepage
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
