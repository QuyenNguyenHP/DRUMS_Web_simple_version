import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("DRUMS frontend failed to render:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] p-6 text-slate-100">
        <section className="w-full max-w-xl rounded-xl border border-red-800 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-xl font-bold">Frontend render error</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The application encountered an unexpected browser error.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-red-200">
            {this.state.error?.message || "Unknown error"}
          </pre>
          <button
            type="button"
            className="mt-5 rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950"
            onClick={() => window.location.reload()}
          >
            Reload application
          </button>
        </section>
      </main>
    );
  }
}
