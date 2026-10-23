import { useEffect, useMemo, useState } from "react";
import { buildTrendChartData, normalizeChannelName, trendSeriesKey } from "../services/trendData";
import { groupSeriesByUnit } from "../services/chartAxes";

import Footer from "../components/Footer";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import ExpandableTrendChart from "../components/ExpandableTrendChart";
import VesselEngineSelector, {
  MultiSelectField,
} from "../components/VesselEngineSelector";
import {
  fetchOverviewChannelOptions,
  fetchVesselConfig,
  fetchOverviewTrend,
} from "../services/apiClient";

const SERIES_COLORS = [
  "#f59e0b",
  "#38bdf8",
  "#22c55e",
  "#e879f9",
  "#f87171",
  "#a78bfa",
  "#2dd4bf",
  "#facc15",
];

const cardClass =
  "rounded-[14px] border border-[#334155] bg-[#111827] p-4";
const buttonClass =
  "rounded-[12px] bg-blue-600 px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70";

const pad = (value) => String(value).padStart(2, "0");

const toUtcInputValue = (timestampMs) => {
  const date = new Date(timestampMs);
  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  ].join("T");
};

const fromUtcInputValue = (inputValue) =>
  inputValue ? new Date(`${inputValue}:00Z`).getTime() : null;

const shiftUtcInputValue = (inputValue, deltaHours) => {
  const timestampMs = fromUtcInputValue(inputValue);
  return timestampMs ? toUtcInputValue(timestampMs + deltaHours * 3600000) : inputValue;
};

const buildInitialUtcRange = () => {
  const endMs = Date.now();
  return {
    draftStartInput: toUtcInputValue(endMs - 24 * 3600000),
    draftEndInput: toUtcInputValue(endMs),
  };
};

const buildRangeFromVessel = (vesselOption) => {
  const rangeEndMs = Number(vesselOption?.latestRangeEndMs ?? 0);
  const rangeStartMs = Number(vesselOption?.latestRangeStartMs ?? 0);

  if (Number.isFinite(rangeEndMs) && rangeEndMs > 0) {
    return {
      draftStartInput: toUtcInputValue(
        Number.isFinite(rangeStartMs) && rangeStartMs > 0
          ? rangeStartMs
          : rangeEndMs - 24 * 3600000
      ),
      draftEndInput: toUtcInputValue(rangeEndMs),
    };
  }

  return buildInitialUtcRange();
};

const DateField = ({ label, value, onChange }) => (
  <label className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] px-3 py-2">
    <span className="text-[13px] font-semibold text-[#8fb4ef]">{label}</span>
    <input
      type="datetime-local"
      className="min-w-[220px] border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]"
      value={value}
      onChange={onChange}
    />
  </label>
);

const getDefaultEngineKeys = (engines = []) => {
  const engine = engines.find((option) =>
    [option.key, option.label].some(
      (value) => String(value ?? "").replace(/\s+/g, "").toUpperCase() === "DG1"
    )
  ) ?? engines[0];
  return engine?.key ? [engine.key] : [];
};

const GraphPanel = ({ onUpdated }) => {
  const initialRange = useMemo(buildInitialUtcRange, []);
  const [overviewConfig, setOverviewConfig] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState("");
  const [selectedEngines, setSelectedEngines] = useState([]);
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [submittedFilters, setSubmittedFilters] = useState(null);
  const [trendPayload, setTrendPayload] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isChannelOptionsLoading, setIsChannelOptionsLoading] = useState(false);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftStartInput, setDraftStartInput] = useState(initialRange.draftStartInput);
  const [draftEndInput, setDraftEndInput] = useState(initialRange.draftEndInput);
  const [isChartDataOpen, setIsChartDataOpen] = useState(false);

  const selectedVesselOption =
    overviewConfig.find((option) => option.value === selectedVessel) ?? overviewConfig[0] ?? null;
  const engineOptions = selectedVesselOption?.engines ?? [];
  const selectedEngineOptions = useMemo(
    () => engineOptions.filter((option) => selectedEngines.includes(option.key)),
    [engineOptions, selectedEngines]
  );
  const selectedSerialNumbers = useMemo(
    () => selectedEngineOptions.map((option) => option.serialNo).filter(Boolean),
    [selectedEngineOptions]
  );
  const activeChartChannels = submittedFilters?.channelDescriptions ?? [];

  useEffect(() => {
    let isActive = true;
    setIsConfigLoading(true);
    setError("");

    fetchVesselConfig()
      .then((payload) => {
        if (!isActive) {
          return;
        }

        const nextVessels = Array.isArray(payload?.vessels) ? payload.vessels : [];
        const firstVessel = nextVessels[0] ?? null;
        setOverviewConfig(nextVessels);
        setSelectedVessel(firstVessel?.value ?? "");
        setSelectedEngines(getDefaultEngineKeys(firstVessel?.engines));
        const nextRange = buildRangeFromVessel(firstVessel);
        setDraftStartInput(nextRange.draftStartInput);
        setDraftEndInput(nextRange.draftEndInput);
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setOverviewConfig([]);
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load overview config."
        );
      })
      .finally(() => {
        if (isActive) {
          setIsConfigLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (engineOptions.length === 0) {
      setSelectedEngines([]);
      return;
    }

    const validEngineKeys = new Set(engineOptions.map((option) => option.key));
    const nextSelectedEngines = selectedEngines.filter((engineKey) =>
      validEngineKeys.has(engineKey)
    );

    if (nextSelectedEngines.length === 0) {
      setSelectedEngines(getDefaultEngineKeys(engineOptions));
      return;
    }

    if (nextSelectedEngines.length !== selectedEngines.length) {
      setSelectedEngines(nextSelectedEngines);
    }
  }, [engineOptions, selectedEngines]);

  useEffect(() => {
    if (!selectedVessel || selectedSerialNumbers.length === 0) {
      setChannelOptions([]);
      setIsChartDataOpen(false);
      return;
    }

    let isActive = true;
    setIsChannelOptionsLoading(true);
    setError("");
    setIsChartDataOpen(false);

    fetchOverviewChannelOptions({
      vessel: selectedVessel,
      serialNumbers: selectedSerialNumbers,
    })
      .then((payload) => {
        if (!isActive) {
          return;
        }

        const nextChannels = Array.isArray(payload?.channels) ? payload.channels : [];
        setChannelOptions(nextChannels);
        setSelectedChannels((currentValues) =>
          currentValues
            .map((value) =>
              nextChannels.find(
                (channel) =>
                  normalizeChannelName(channel.channelDescription) === normalizeChannelName(value)
              )?.channelDescription
            )
            .filter(Boolean)
        );
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setChannelOptions([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load channel options."
        );
      })
      .finally(() => {
        if (isActive) {
          setIsChannelOptionsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedSerialNumbers, selectedVessel]);

  // Apply the initial selection once the API has resolved the actual channel name.
  useEffect(() => {
    if (
      submittedFilters || isConfigLoading || isChannelOptionsLoading ||
      !selectedVessel || selectedSerialNumbers.length === 0 ||
      channelOptions.length === 0 ||
      !selectedChannels.every((value) =>
        channelOptions.some((channel) => channel.channelDescription === value)
      )
    ) {
      return;
    }

    // Resolve defaults from loaded options even if earlier loading or hot reload
    // left the selection empty. Keep the exact API name in the request.
    const defaultChannel = channelOptions.find(
      (channel) => normalizeChannelName(channel.channelDescription) === "ENGINE LOAD"
    );
    const initialChannels = selectedChannels.length > 0
      ? selectedChannels
      : defaultChannel ? [defaultChannel.channelDescription] : [];
    if (initialChannels.length === 0) {
      return;
    }

    const startMs = fromUtcInputValue(draftStartInput);
    const endMs = fromUtcInputValue(draftEndInput);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
      return;
    }

    setSelectedChannels(initialChannels);
    setSubmittedFilters({
      vessel: selectedVessel,
      serialNumbers: selectedSerialNumbers,
      engines: selectedEngineOptions,
      channelDescriptions: initialChannels,
      startMs,
      endMs,
    });
  }, [
    submittedFilters, isConfigLoading, isChannelOptionsLoading, selectedVessel,
    selectedSerialNumbers, selectedEngineOptions, selectedChannels, channelOptions,
    draftStartInput, draftEndInput,
  ]);

  useEffect(() => {
    if (!submittedFilters?.serialNumbers?.length || activeChartChannels.length === 0) {
      setIsTrendLoading(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    setIsTrendLoading(true);
    setError("");

    fetchOverviewTrend({
      signal: controller.signal,
      vessel: submittedFilters.vessel,
      serialNumbers: submittedFilters.serialNumbers,
      channelDescriptions: submittedFilters.channelDescriptions,
      startTime: new Date(submittedFilters.startMs).toISOString(),
      endTime: new Date(submittedFilters.endMs).toISOString(),
    })
      .then((payload) => {
        if (!isActive) {
          return;
        }

        setTrendPayload(payload);
        onUpdated(new Date());
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setTrendPayload(null);
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load overview trend."
        );
      })
      .finally(() => {
        if (isActive) {
          setIsTrendLoading(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [activeChartChannels.length, submittedFilters]);

  const channelMetadata = useMemo(
    () =>
      Object.fromEntries(
        channelOptions.map((channelOption) => [
          channelOption.channelDescription,
          channelOption,
        ])
      ),
    [channelOptions]
  );

  const chartSeries = useMemo(() => {
    const appliedEngines = submittedFilters?.engines ?? [];

    return appliedEngines.flatMap((engineOption, engineIndex) =>
      activeChartChannels.map((channelDescription, channelIndex) => ({
        name: `${engineOption.label} - ${channelDescription}`,
        dataKey: trendSeriesKey(engineOption.serialNo, channelDescription),
        color:
          SERIES_COLORS[
            (engineIndex * Math.max(activeChartChannels.length, 1) + channelIndex) %
              SERIES_COLORS.length
          ],
        precision: 2,
        unit: channelMetadata[channelDescription]?.unit ?? "",
      }))
    );
  }, [activeChartChannels, channelMetadata, submittedFilters]);

  const chartData = useMemo(
    () => buildTrendChartData(trendPayload?.records),
    [trendPayload]
  );

  const chartAxes = useMemo(() => groupSeriesByUnit(chartSeries), [chartSeries]);

  const resetDraftRange = (vesselOption = selectedVesselOption) => {
    const nextRange = buildRangeFromVessel(vesselOption);
    setDraftStartInput(nextRange.draftStartInput);
    setDraftEndInput(nextRange.draftEndInput);
  };

  const handleChannelToggle = (channelDescription) => {
    setSelectedChannels((currentValues) =>
      currentValues.includes(channelDescription)
        ? currentValues.filter((value) => value !== channelDescription)
        : [...currentValues, channelDescription]
    );
  };

  const applyFiltersForRange = (startInput, endInput) => {
    const startMs = fromUtcInputValue(startInput);
    const endMs = fromUtcInputValue(endInput);

    if (!startMs || !endMs) {
      setError("Both From (UTC) and To (UTC) are required.");
      return false;
    }

    if (startMs >= endMs) {
      setError("From (UTC) must be earlier than To (UTC).");
      return false;
    }

    if (!selectedVessel) {
      setError("Please select a vessel.");
      return false;
    }

    if (selectedEngineOptions.length === 0) {
      setError("Please select at least one engine.");
      return false;
    }

    if (selectedChannels.length === 0) {
      setError("Please select at least one chart data item before applying.");
      return false;
    }

    setError("");
    setIsChartDataOpen(false);
    setSubmittedFilters({
      vessel: selectedVessel,
      serialNumbers: selectedSerialNumbers,
      engines: selectedEngineOptions,
      channelDescriptions: selectedChannels,
      startMs,
      endMs,
    });
    return true;
  };

  const handleApplyFilters = () => {
    applyFiltersForRange(draftStartInput, draftEndInput);
  };

  const handleShiftRange = (direction) => {
    const nextStartInput = shiftUtcInputValue(draftStartInput, 24 * direction);
    const nextEndInput = shiftUtcInputValue(draftEndInput, 24 * direction);
    const nextStartMs = fromUtcInputValue(nextStartInput);
    const nextEndMs = fromUtcInputValue(nextEndInput);

    setDraftStartInput(nextStartInput);
    setDraftEndInput(nextEndInput);

    if (!nextStartMs || !nextEndMs || nextStartMs >= nextEndMs) {
      setError("Unable to shift the selected UTC range.");
      return;
    }

    applyFiltersForRange(nextStartInput, nextEndInput);
  };

  const selectedEngineSummary =
    selectedEngineOptions.length > 0
      ? selectedEngineOptions.map((option) => option.label).join(", ")
      : "--";
  const selectedSerialSummary =
    selectedEngineOptions.length > 0
      ? selectedEngineOptions.map((option) => option.serialNo).join(", ")
      : "--";
  const appliedEngineTitle =
    submittedFilters?.engines?.length > 0
      ? submittedFilters.engines.map((engine) => engine.label).join(" vs ")
      : selectedEngineSummary;

  return (
          <div className="flex h-full min-h-[420px] flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:min-h-[calc(100vh-116px)] lg:p-5">
            <div className={cardClass}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <DateField
                    label="From (UTC)"
                    value={draftStartInput}
                    onChange={(event) => setDraftStartInput(event.target.value)}
                  />
                  <DateField
                    label="To (UTC)"
                    value={draftEndInput}
                    onChange={(event) => setDraftEndInput(event.target.value)}
                  />
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => handleShiftRange(-1)}
                  >
                    Prev 24h
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => handleShiftRange(1)}
                  >
                    Next 24h
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={handleApplyFilters}
                    disabled={isConfigLoading || isChannelOptionsLoading || isTrendLoading}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isTrendLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : null}
                      <span>{isTrendLoading ? "Loading..." : "Apply Filters"}</span>
                    </span>
                  </button>
                </div>

                <div className="grid gap-3 lg:grid-cols-3 max-w-[1200px]">
                  <VesselEngineSelector
                    vesselOptions={overviewConfig}
                    selectedVessel={selectedVessel}
                    onVesselChange={(nextVesselValue) => {
                      const nextVessel =
                        overviewConfig.find((option) => option.value === nextVesselValue) ?? null;
                      setSelectedVessel(nextVesselValue);
                      setSelectedEngines(
                        getDefaultEngineKeys(nextVessel?.engines)
                      );
                      resetDraftRange(nextVessel);
                    }}
                    engineOptions={engineOptions}
                    selectedEngineValues={selectedEngines}
                    onEngineSelectionChange={setSelectedEngines}
                    vesselDisabled={isConfigLoading}
                    engineDisabled={isConfigLoading || engineOptions.length === 0}
                    className="grid gap-3 lg:col-span-2 lg:grid-cols-2"
                  />

                  <MultiSelectField
                    label="Chart data"
                    options={channelOptions}
                    selectedValues={selectedChannels}
                    onToggle={handleChannelToggle}
                    isOpen={isChartDataOpen}
                    onOpenChange={setIsChartDataOpen}
                    getOptionValue={(option) => option.channelDescription}
                    getOptionLabel={(option) => option.channelDescription}
                    getOptionMeta={(option) => option.unit}
                    placeholder="Select chart data"
                    emptyMessage="No chart data available."
                    disabled={isChannelOptionsLoading || channelOptions.length === 0}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
                  <span>
                    Vessel:{" "}
                    <strong className="text-slate-200">
                      {selectedVesselOption?.label ?? "--"}
                    </strong>
                  </span>
                  <span>
                    Engines:{" "}
                    <strong className="text-slate-200">{selectedEngineSummary}</strong>
                  </span>
                  <span>
                    SerialNo:{" "}
                    <strong className="text-slate-200">{selectedSerialSummary}</strong>
                  </span>
                  {selectedVesselOption?.database ? (
                    <span>
                      Database:{" "}
                      <strong className="text-slate-200">
                        {selectedVesselOption.database}
                      </strong>
                    </span>
                  ) : null}
                  {isChannelOptionsLoading ? (
                    <span className="inline-flex items-center gap-2 text-sky-300">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Loading analog ChannelDescription...
                    </span>
                  ) : (
                    <span>
                      Analog ChannelDescription count:{" "}
                      <strong className="text-slate-200">{channelOptions.length}</strong>
                    </span>
                  )}
                  {trendPayload?.meta?.dataTable ? (
                    <span>
                      Data table:{" "}
                      <strong className="text-slate-200">{trendPayload.meta.dataTable}</strong>
                    </span>
                  ) : null}
                  {trendPayload?.meta?.maxPointsPerSeries ? (
                    <span>
                      Max points per series:{" "}
                      <strong className="text-slate-200">
                        {trendPayload.meta.maxPointsPerSeries}
                      </strong>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? (
              <div className="rounded-[12px] border border-[#7f1d1d] bg-[#450a0a66] px-4 py-3 text-[14px] text-[#fecaca]">
                {error}
              </div>
            ) : null}

            <div className="flex-1 rounded-[12px] border border-[#334155] bg-[#0f172a] p-4">
              <ExpandableTrendChart
                loading={isTrendLoading}
                chartData={chartData}
                series={chartAxes.series}
                yAxes={chartAxes.yAxes}
                rangeStartMs={trendPayload?.meta?.rangeStartMs ?? null}
                rangeEndMs={trendPayload?.meta?.rangeEndMs ?? null}
                chartHeight={560}
                title={`${selectedVesselOption?.label ?? "Vessel"} - ${appliedEngineTitle} Trend`}
                yAxisName="Selected values"
                emptyMessage={
                  isTrendLoading
                    ? ""
                    : submittedFilters
                      ? "No analog records returned for the selected vessel, engines, channels, and time range."
                      : "Select chart data and press Apply Filters to request trend data."
                }
              />
            </div>
          </div>
  );
};

const Graph = ({ user, onLogout }) => {
  const [chartCount, setChartCount] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#07111f]">
      <Header user={user} onLogout={onLogout} />
      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" user={user} />
        <section className="min-w-0 flex-1 space-y-4 p-3 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-100">Graphs</h1>
            <label className="flex items-center gap-3 text-sm text-slate-200">
              Display
              <select value={chartCount} onChange={(event) => setChartCount(Number(event.target.value))}
                className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2">
                <option value={1}>1 chart</option>
                <option value={2}>2 charts</option>
              </select>
            </label>
          </div>
          {Array.from({ length: chartCount }, (_, index) => (
            <section key={index} aria-label={`Chart ${index + 1}`}>
              {chartCount === 2 ? <h2 className="mb-2 text-lg font-semibold text-slate-200">Chart {index + 1}</h2> : null}
              <GraphPanel onUpdated={setLastUpdated} />
            </section>
          ))}
        </section>
      </main>
      <Footer lastUpdated={lastUpdated} pollIntervalMs={null} />
    </div>
  );
};

export default Graph;
