import { useEffect, useRef, useState } from "react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import { fetchPidMonitorData } from "../services/pidMonitorApi";

const DEFAULT_POLL_INTERVAL_MS = 2000;
const ENGINE_CANVAS_WIDTH = 1630;
const ENGINE_CANVAS_HEIGHT = 917;
const ENGINE_DISPLAY_SCALE = 0.8;
const ENGINE_DISPLAY_WIDTH = ENGINE_CANVAS_WIDTH * ENGINE_DISPLAY_SCALE;
const ENGINE_DISPLAY_HEIGHT = ENGINE_CANVAS_HEIGHT * ENGINE_DISPLAY_SCALE;

// Put the SVG file in /public, then set its URL here.
const SVG_SOURCE = "/Engine_indicator.svg";

// Each entry connects one API value to one element id inside the SVG.
// Example:
// { elementId: "temperature-value", dataKey: "temperature", unit: " °C", digits: 1 }
const SVG_BINDINGS = [];

const getValues = (payload) => payload?.values ?? payload?.data ?? {};

const formatBindingValue = (value, binding) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numericValue = Number(value);
  const formattedValue =
    Number.isFinite(numericValue) && Number.isInteger(binding.digits)
      ? numericValue.toFixed(binding.digits)
      : String(value);

  return `${formattedValue}${binding.unit ?? ""}`;
};

const updateSvgValues = (svgRoot, payload) => {
  if (!svgRoot) {
    return;
  }

  const values = getValues(payload);

  SVG_BINDINGS.forEach((binding) => {
    const element = svgRoot.querySelector(`[id="${binding.elementId}"]`);

    if (!element) {
      return;
    }

    const value = values[binding.dataKey];
    element.textContent = formatBindingValue(value, binding);
    element.dataset.value = value ?? "";
  });
};

const Engine = () => {
  const svgContainerRef = useRef(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [svgError, setSvgError] = useState("");
  const [payload, setPayload] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_POLL_INTERVAL_MS);

  useEffect(() => {
    const controller = new AbortController();

    fetch(SVG_SOURCE, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load SVG (${response.status}).`);
        }

        return response.text();
      })
      .then((markup) => {
        setSvgMarkup(markup);
        setSvgError("");
      })
      .catch((loadError) => {
        if (loadError?.name === "AbortError") return;

        setSvgError(
          loadError instanceof Error ? loadError.message : "Unable to load SVG."
        );
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId;
    let active = true;

    const poll = async () => {
      try {
        const nextPayload = await fetchPidMonitorData({ signal: controller.signal });

        if (!active) return;

        const requestedInterval = Number(nextPayload?.meta?.pollIntervalMs);
        const nextInterval =
          Number.isFinite(requestedInterval) && requestedInterval >= 500
            ? requestedInterval
            : DEFAULT_POLL_INTERVAL_MS;

        setPayload(nextPayload);
        setLastUpdated(new Date());
        setPollIntervalMs(nextInterval);
        timeoutId = window.setTimeout(poll, nextInterval);
      } catch (loadError) {
        if (!active || loadError?.name === "AbortError") return;

        console.error("Unable to load engine data:", loadError);
        timeoutId = window.setTimeout(poll, DEFAULT_POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    updateSvgValues(svgContainerRef.current?.querySelector("svg"), payload);
  }, [payload, svgMarkup]);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#07111f]">
      <Header />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" />

        <section className="flex-1 min-w-0 p-3 lg:p-5">
          <div
            className="relative flex h-full min-h-[420px] flex-col items-center justify-center overflow-auto rounded-lg border border-slate-700 bg-slate-800/90 bg-no-repeat lg:min-h-[calc(100vh-116px)]"
            style={{
              backgroundImage: "url('/Engine_back_ground.png')",
              backgroundPosition: "center",
              backgroundSize: `${ENGINE_DISPLAY_WIDTH}px ${ENGINE_DISPLAY_HEIGHT}px`,
              backgroundClip: "content-box",
              backgroundOrigin: "content-box",
            }}
          >
            {svgMarkup ? (
              <div
                ref={svgContainerRef}
                role="img"
                aria-label="Engine monitoring diagram"
                className="shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                style={{
                  width: ENGINE_DISPLAY_WIDTH,
                  height: ENGINE_DISPLAY_HEIGHT,
                }}
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            ) : (
              <div className="max-w-lg px-6 text-center">
                <div className="text-lg font-semibold text-slate-200">
                  {svgError || "Loading SVG..."}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  The SVG overlay is loaded from {SVG_SOURCE}.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer lastUpdated={lastUpdated} pollIntervalMs={pollIntervalMs} />
    </div>
  );
};

export default Engine;
