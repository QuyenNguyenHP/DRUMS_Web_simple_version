import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { Link } from "react-router-dom";

export const ENGINE_RING_COLORS = ["#38bdf8", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee", "#f97316"];

const formatLoad = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export default function EngineLoadRingGauge({ engines, max = 600, vesselKey }) {
  const container = useRef(null);
  const chart = useRef(null);
  const [chartError, setChartError] = useState(false);

  useEffect(() => {
    if (!container.current) return undefined;

    let instance;
    let observer;
    const resize = () => instance?.resize();

    try {
      instance = echarts.init(container.current, null, { renderer: "svg" });
      chart.current = instance;
      setChartError(false);

      if (typeof window.ResizeObserver === "function") {
        observer = new window.ResizeObserver(resize);
        observer.observe(container.current);
      } else {
        window.addEventListener("resize", resize);
      }
    } catch (error) {
      console.error("Unable to initialize the engine load gauge:", error);
      setChartError(true);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      instance?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (!chart.current) return;

      try {
        chart.current.setOption({
          animation: !reducedMotion.matches,
          animationDurationUpdate: 600,
          color: ENGINE_RING_COLORS,
          series: [{
            id: "engine-load-rings",
            type: "gauge",
            startAngle: 90,
            endAngle: -270,
            radius: "94%",
            min: 0,
            max,
            pointer: { show: false },
            progress: {
              show: true,
              overlap: false,
              roundCap: true,
              clip: false,
              width: Math.max(12, Math.min(18, 82 / Math.max(engines.length, 1))),
            },
            axisLine: {
              lineStyle: {
                width: Math.max(12, Math.min(18, 82 / Math.max(engines.length, 1))),
                color: [[1, "#31465f"]],
              },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { show: false },
            detail: { show: false },
            silent: true,
            data: engines.map((engine, index) => ({
              value: Math.min(max, Math.max(0, engine.load ?? 0)),
              name: engine.label,
              itemStyle: {
                color: ENGINE_RING_COLORS[index % ENGINE_RING_COLORS.length],
                opacity: 1,
              },
            })),
          }],
        }, { notMerge: true });
        setChartError(false);
      } catch (error) {
        console.error("Unable to update the engine load gauge:", error);
        setChartError(true);
      }
    };
    update();
    reducedMotion.addEventListener("change", update);
    return () => reducedMotion.removeEventListener("change", update);
  }, [engines, max]);

  return (
    <div className="engine-ring-wrap">
      <div ref={container} className="engine-ring-chart" aria-hidden="true" />
      <div className="engine-ring-center-list" aria-label="Engine load values">
        {engines.map((engine, index) => (
          <Link
            className={`engine-ring-reading${engine.status === "Stale data" ? " engine-ring-reading-stale" : ""}`}
            key={engine.key}
            to={`/engine?${new URLSearchParams({ vessel: vesselKey, engine: engine.key })}`}
            title={`${engine.label}: ${engine.load === null ? "No load data" : `${formatLoad.format(engine.load)} ekW`}`}
          >
            <span
              className="engine-ring-reading-dot"
              style={{ backgroundColor: ENGINE_RING_COLORS[index % ENGINE_RING_COLORS.length] }}
            />
            <strong>{engine.label}</strong>
            <span>{engine.load === null ? "--" : formatLoad.format(engine.load)} ekW</span>
          </Link>
        ))}
      </div>
      {chartError ? <p className="engine-ring-error">Gauge unavailable</p> : null}
    </div>
  );
}
