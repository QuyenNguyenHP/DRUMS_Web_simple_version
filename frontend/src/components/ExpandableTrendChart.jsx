import { useEffect, useRef, useState } from "react";
import TimeSeriesLineChart from "./TimeSeriesLineChart";

export default function ExpandableTrendChart({ chartHeight = 560, loading = false, ...props }) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      setViewportHeight(window.innerHeight);
    };
    const syncSize = () => setViewportHeight(window.innerHeight);
    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("resize", syncSize);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  const toggleFullscreen = async () => {
    setError("");
    try {
      if (isFullscreen) await document.exitFullscreen();
      else await containerRef.current.requestFullscreen();
    } catch {
      setError("Fullscreen is unavailable in this browser. Please allow fullscreen and try again.");
    }
  };

  return (
    <div ref={containerRef} className={`min-w-0 bg-[#0f172a] ${isFullscreen ? "h-screen overflow-auto p-4" : ""}`}>
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700">
          {isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
        </button>
      </div>
      {error ? <p role="alert" className="mb-3 text-sm text-red-300">{error}</p> : null}
      <div className="relative" aria-busy={loading}>
        <TimeSeriesLineChart {...props} chartHeight={isFullscreen ? Math.max(240, viewportHeight - 150) : chartHeight} />
        {loading ? (
          <div role="status" className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/40 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-full border border-slate-600/80 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-lg">
              <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-300" />
              Loading data...
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
