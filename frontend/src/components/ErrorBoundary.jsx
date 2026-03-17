import { Component } from "react";

import { Button } from "@/components/ui/button";


export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Something went wrong</p>
          <h1 className="font-display text-4xl text-white md:text-5xl">An unexpected error occurred</h1>
          <p className="max-w-md text-sm leading-7 text-slate-400">
            An unexpected error occurred. Please try refreshing the page or return to the home screen.
          </p>
          <Button
            className="border border-primary/50 bg-primary px-6 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90"
            onClick={() => window.location.replace("/")}
          >
            Return home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
