import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Footer from "../components/Footer";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import VesselEngineSelector from "../components/VesselEngineSelector";
import { fetchVesselConfig } from "../services/apiClient";
import { fetchEngineMonitorData } from "../services/pidMonitorApi";

const DEFAULT_POLL_INTERVAL_MS = 2000;
const ENGINE_CANVAS_WIDTH = 1630;
const ENGINE_CANVAS_HEIGHT = 917;
const ENGINE_DISPLAY_SCALE = 0.8;
const ENGINE_DISPLAY_WIDTH = ENGINE_CANVAS_WIDTH * ENGINE_DISPLAY_SCALE;
const ENGINE_ASPECT_RATIO = `${ENGINE_CANVAS_WIDTH} / ${ENGINE_CANVAS_HEIGHT}`;
const ENGINE_ASPECT_RATIO_VALUE = ENGINE_CANVAS_WIDTH / ENGINE_CANVAS_HEIGHT;
const ENGINE_VIEWPORT_OFFSET_PX = 120;

// Put the SVG file in /public, then set its URL here.
const SVG_SOURCE = "/Engine_indicator.svg";

// Each entry connects one API value to one element id inside the SVG.
// Example:
// { elementId: "temperature-value", dataKey: "temperature", unit: " °C", digits: 1 }
const getValues = (payload) => payload?.values ?? payload?.data ?? {};

const renderSvgValues = (markup, payload) => {
  if (!markup) {
    return "";
  }

  const values = getValues(payload);
  const parser = new DOMParser();
  const document = parser.parseFromString(markup, "image/svg+xml");

  Object.entries(values).forEach(([elementId, value]) => {
    const element = document.getElementById(elementId);

    if (!element) {
      return;
    }

    const nextValue =
      value === null || value === undefined || value === "" ? "--" : String(value);

    element.textContent = nextValue;
    element.setAttribute("data-value", nextValue);
  });

  return new XMLSerializer().serializeToString(document.documentElement);
};

const EnginePage = ({ user, onLogout }) => {
  const [searchParams] = useSearchParams();
  const requestedVessel = searchParams.get("vessel");
  const requestedEngine = searchParams.get("engine");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [svgError, setSvgError] = useState("");
  const [payload, setPayload] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_POLL_INTERVAL_MS);
  const [vesselOptions, setVesselOptions] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");
  const [vesselError, setVesselError] = useState("");

  const selectedVesselOption =
    vesselOptions.find((option) => option.value === selectedVessel) ?? vesselOptions[0] ?? null;
  const engineOptions = selectedVesselOption?.engines ?? [];
  const selectedEngineOption =
    engineOptions.find((option) => option.key === selectedEngine) ?? engineOptions[0] ?? null;

  const selectedVesselSummary = useMemo(
    () => selectedVesselOption?.label ?? "--",
    [selectedVesselOption]
  );
  const matchedElementCount = Number(payload?.meta?.matchedElementCount ?? 0);
  const snapshotRecordCount = Number(payload?.meta?.snapshotRecordCount ?? 0);
  const unmatchedChannels = Array.isArray(payload?.meta?.unmatchedChannels)
    ? payload.meta.unmatchedChannels
    : [];
  const renderedSvgMarkup = useMemo(
    () => renderSvgValues(svgMarkup, payload),
    [payload, svgMarkup]
  );

  useEffect(() => {
    let isActive = true;
    setVesselError("");

    fetchVesselConfig({ includeLatestRange: false })
      .then((response) => {
        if (!isActive) {
          return;
        }

        const nextVessels = Array.isArray(response?.vessels) ? response.vessels : [];
        const firstVessel = nextVessels.find((vessel) => vessel.value === requestedVessel) ?? nextVessels[0] ?? null;
        const firstEngine = firstVessel?.engines?.find((engine) => engine.key === requestedEngine) ?? firstVessel?.engines?.[0];
        setVesselOptions(nextVessels);
        setSelectedVessel(firstVessel?.value ?? "");
        setSelectedEngine(firstEngine?.key ?? "");
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setVesselOptions([]);
        setVesselError(
          loadError instanceof Error ? loadError.message : "Unable to load vessel options."
        );
      });

    return () => {
      isActive = false;
    };
  }, [requestedVessel, requestedEngine]);

  useEffect(() => {
    if (engineOptions.length === 0) {
      setSelectedEngine("");
      return;
    }

    const validEngineKeys = new Set(engineOptions.map((option) => option.key));

    if (!validEngineKeys.has(selectedEngine)) {
      setSelectedEngine(engineOptions[0].key);
    }
  }, [engineOptions, selectedEngine]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(SVG_SOURCE, { cache: "no-store", signal: controller.signal })
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

    setPayload(null);
    setIsDataLoading(true);

    const poll = async () => {
      try {
        if (!selectedVessel || !selectedEngine) {
          setPayload(null);
          setIsDataLoading(false);
          timeoutId = window.setTimeout(poll, DEFAULT_POLL_INTERVAL_MS);
          return;
        }

        const nextPayload = await fetchEngineMonitorData({
          vessel: selectedVessel,
          engine: selectedEngine,
          signal: controller.signal,
        });

        if (!active) return;

        const requestedInterval = Number(nextPayload?.meta?.pollIntervalMs);
        const nextInterval =
          Number.isFinite(requestedInterval) && requestedInterval >= 500
            ? requestedInterval
            : DEFAULT_POLL_INTERVAL_MS;

        setPayload(nextPayload);
        setIsDataLoading(false);
        setLastUpdated(new Date());
        setPollIntervalMs(nextInterval);
        timeoutId = window.setTimeout(poll, nextInterval);
      } catch (loadError) {
        if (!active || loadError?.name === "AbortError") return;

        console.error("Unable to load engine data:", loadError);
        setIsDataLoading(false);
        timeoutId = window.setTimeout(poll, DEFAULT_POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [selectedEngine, selectedVessel]);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#07111f]">
      <Header user={user} onLogout={onLogout} />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" user={user} />

        <section className="flex-1 min-w-0 p-3 lg:p-5">
          <div
            className="relative flex h-full min-h-[420px] flex-col items-center justify-start overflow-auto rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-4 lg:min-h-[calc(100vh-116px)] lg:justify-center lg:px-0 lg:py-0"
          >
            <div className="z-20 w-full lg:absolute lg:left-4 lg:right-4 lg:top-4 lg:w-auto">
              <div className="grid items-end justify-start gap-3 lg:grid-cols-[minmax(420px,500px)_500px]">
                <VesselEngineSelector
                  vesselOptions={vesselOptions}
                  selectedVessel={selectedVessel}
                  onVesselChange={(nextVesselValue) => {
                    const nextVessel =
                      vesselOptions.find((option) => option.value === nextVesselValue) ?? null;
                    setSelectedVessel(nextVesselValue);
                    setSelectedEngine(nextVessel?.engines?.[0]?.key ?? "");
                  }}
                  engineOptions={engineOptions}
                  selectedEngineValues={selectedEngine ? [selectedEngine] : []}
                  onEngineSelectionChange={(nextValues) => setSelectedEngine(nextValues[0] ?? "")}
                  engineSelectionMode="single-dropdown"
                  vesselDisabled={vesselOptions.length === 0}
                  engineDisabled={engineOptions.length === 0}
                  className="grid gap-3 sm:grid-cols-2"
                />
                <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-[8px] border border-slate-700/80 bg-slate-950/65 px-3 py-2 text-[12px] text-slate-300 backdrop-blur-sm">
                <span>
                  Vessel: <strong className="text-slate-100">{selectedVesselSummary}</strong>
                </span>
                <span>
                  Engine:{" "}
                  <strong className="text-slate-100">
                    {selectedEngineOption?.label ?? "--"}
                  </strong>
                </span>
                {selectedEngineOption?.serialNo ? (
                  <span>
                    SerialNo:{" "}
                    <strong className="text-slate-100">
                      {selectedEngineOption.serialNo}
                    </strong>
                  </span>
                ) : null}
                </div>
              </div>
              {vesselError ? (
                <div className="mt-2 rounded-[12px] border border-[#7f1d1d] bg-[#450a0a66] px-3 py-2 text-[12px] text-[#fecaca]">
                  {vesselError}
                </div>
              ) : null}
              {snapshotRecordCount > 0 && matchedElementCount === 0 ? (
                <div className="mt-2 rounded-[12px] border border-amber-500/60 bg-amber-950/40 px-3 py-2 text-[12px] text-amber-100">
                  Chua map duoc channel DB vao SVG. Unmatched sample:{" "}
                  {unmatchedChannels.slice(0, 6).join(", ") || "--"}
                </div>
              ) : null}
            </div>

            {svgMarkup ? (
              <div className="relative mt-4 w-full shrink-0 overflow-hidden px-0 sm:px-2 lg:mt-0 lg:px-4">
                <div
                  className="relative mx-auto w-full overflow-hidden"
                  style={{
                    width: `min(100%, ${ENGINE_DISPLAY_WIDTH}px, calc((100dvh - ${ENGINE_VIEWPORT_OFFSET_PX}px) * ${ENGINE_ASPECT_RATIO_VALUE}))`,
                    aspectRatio: ENGINE_ASPECT_RATIO,
                    maxHeight: `calc(100dvh - ${ENGINE_VIEWPORT_OFFSET_PX}px)`,
                  }}
                >
                  <img
                    src="/Engine_back_ground.png"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    className="pointer-events-none absolute inset-0 block h-full w-full select-none"
                  />
                  <div
                    role="img"
                    aria-label="Engine monitoring diagram"
                    className="absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: renderedSvgMarkup }}
                  />
                  {isDataLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/28 backdrop-blur-[1px]">
                      <div className="flex items-center gap-3 rounded-full border border-slate-600/80 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-lg">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-300" />
                        Loading engine data...
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
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

export default EnginePage;
