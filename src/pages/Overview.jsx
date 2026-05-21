import { useEffect, useMemo, useRef, useState } from "react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import TimeSeriesLineChart from "../components/TimeSeriesLineChart";
import {
  fetchOverviewChannelOptions,
  fetchOverviewConfig,
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
const fieldClass =
  "w-full rounded-[12px] border border-[#334155] bg-[#0b1220] px-3 py-3 text-[14px] text-[#f8fafc] outline-none transition focus:border-[#2563eb]";
const buttonClass =
  "rounded-[12px] bg-blue-600 px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70";
const labelClass = "mb-2 block text-[13px] font-semibold text-[#8fb4ef]";

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

const SelectField = ({ label, value, onChange, children, disabled = false }) => (
  <label className="block">
    <span className={labelClass}>{label}</span>
    <select
      className={fieldClass}
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {children}
    </select>
  </label>
);

const MultiSelectField = ({
  label,
  options,
  selectedValues,
  onToggle,
  isOpen,
  onOpenChange,
  disabled = false,
}) => {
  const containerRef = useRef(null);
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.channelDescription))
    .map((option) => option.channelDescription);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={containerRef} className="block">
      <span className={labelClass}>{label}</span>
      <div className="relative">
        <button
          type="button"
          className={`${fieldClass} flex cursor-pointer items-center justify-between gap-3 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          onClick={() => {
            if (!disabled) {
              onOpenChange(!isOpen);
            }
          }}
          aria-expanded={isOpen}
          disabled={disabled}
        >
          <span className="truncate text-left">
            {selectedLabels.length > 0
              ? `${selectedLabels.length} item(s) selected`
              : "Select chart data"}
          </span>
          <span className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {!disabled && isOpen ? (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-[12px] border border-[#334155] bg-[#0b1220] p-2 shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-slate-400">No chart data available.</div>
            ) : (
              options.map((option) => (
                <label
                  key={option.channelDescription}
                  className="flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2 text-[#f8fafc] transition hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-500 bg-transparent accent-blue-500"
                    checked={selectedValues.includes(option.channelDescription)}
                    onChange={() => onToggle(option.channelDescription)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-5">
                      {option.channelDescription}
                    </span>
                    {option.unit ? (
                      <span className="block text-[11px] text-slate-400">{option.unit}</span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Overview = () => {
  const initialRange = useMemo(buildInitialUtcRange, []);
  const [overviewConfig, setOverviewConfig] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");
  const [channelOptions, setChannelOptions] = useState([]);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [submittedFilters, setSubmittedFilters] = useState(null);
  const [trendPayload, setTrendPayload] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isChannelOptionsLoading, setIsChannelOptionsLoading] = useState(false);
  const [isTrendLoading, setIsTrendLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [draftStartInput, setDraftStartInput] = useState(initialRange.draftStartInput);
  const [draftEndInput, setDraftEndInput] = useState(initialRange.draftEndInput);
  const [isChartDataOpen, setIsChartDataOpen] = useState(false);

  const selectedVesselOption =
    overviewConfig.find((option) => option.value === selectedVessel) ?? overviewConfig[0] ?? null;
  const engineOptions = selectedVesselOption?.engines ?? [];
  const selectedEngineOption =
    engineOptions.find((option) => option.key === selectedEngine) ?? engineOptions[0] ?? null;
  const activeChartChannels = submittedFilters?.channelDescriptions ?? [];

  useEffect(() => {
    let isActive = true;
    setIsConfigLoading(true);
    setError("");

    fetchOverviewConfig()
      .then((payload) => {
        if (!isActive) {
          return;
        }

        const nextVessels = Array.isArray(payload?.vessels) ? payload.vessels : [];
        setOverviewConfig(nextVessels);
        setSelectedVessel(nextVessels[0]?.value ?? "");
        setSelectedEngine(nextVessels[0]?.engines?.[0]?.key ?? "");
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
    if (engineOptions.length && !engineOptions.some((option) => option.key === selectedEngine)) {
      setSelectedEngine(engineOptions[0].key);
    }
  }, [engineOptions, selectedEngine]);

  useEffect(() => {
    if (!selectedVessel || !selectedEngineOption?.serialNo) {
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
      serialNo: selectedEngineOption.serialNo,
    })
      .then((payload) => {
        if (!isActive) {
          return;
        }

        const nextChannels = Array.isArray(payload?.channels) ? payload.channels : [];
        const nextChannelDescriptions = new Set(
          nextChannels.map((channel) => channel.channelDescription)
        );

        setChannelOptions(nextChannels);
        setSelectedChannels((currentValues) =>
          currentValues.filter((value) => nextChannelDescriptions.has(value))
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
  }, [selectedEngineOption, selectedVessel]);

  useEffect(() => {
    if (!submittedFilters?.serialNo || activeChartChannels.length === 0) {
      setIsTrendLoading(false);
      return;
    }

    let isActive = true;
    setIsTrendLoading(true);
    setError("");

    fetchOverviewTrend({
      vessel: submittedFilters.vessel,
      serialNo: submittedFilters.serialNo,
      channelDescriptions: submittedFilters.channelDescriptions,
      startTime: new Date(submittedFilters.startMs).toISOString(),
      endTime: new Date(submittedFilters.endMs).toISOString(),
    })
      .then((payload) => {
        if (!isActive) {
          return;
        }

        setTrendPayload(payload);
        setLastUpdated(new Date());
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

  const chartSeries = useMemo(
    () =>
      activeChartChannels.map((channelDescription, index) => ({
        name: channelDescription,
        dataKey: `series_${index}`,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        precision: 2,
        unit: channelMetadata[channelDescription]?.unit ?? "",
      })),
    [activeChartChannels, channelMetadata]
  );

  const chartData = useMemo(() => {
    const rowsByTimestamp = new Map();
    const seriesLookup = Object.fromEntries(
      activeChartChannels.map((channelDescription, index) => [
        channelDescription,
        `series_${index}`,
      ])
    );

    for (const record of Array.isArray(trendPayload?.records) ? trendPayload.records : []) {
      const timestampMs = Number(record.timestampMs ?? 0);
      const dataKey = seriesLookup[record.channelDescription];

      if (!Number.isFinite(timestampMs) || !dataKey) {
        continue;
      }

      const row = rowsByTimestamp.get(timestampMs) ?? {
        timestampLabel: record.timestampLabel,
        timestampMs,
      };

      row[dataKey] = Number(record.value ?? 0);
      rowsByTimestamp.set(timestampMs, row);
    }

    return Array.from(rowsByTimestamp.values()).sort(
      (leftRow, rightRow) => leftRow.timestampMs - rightRow.timestampMs
    );
  }, [activeChartChannels, trendPayload]);

  const resetDraftRange = () => {
    const nextRange = buildInitialUtcRange();
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

  const handleApplyFilters = () => {
    applyFiltersForRange(draftStartInput, draftEndInput);
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

    if (!selectedEngineOption?.serialNo) {
      setError("Please select an engine.");
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
      serialNo: selectedEngineOption.serialNo,
      engineKey: selectedEngineOption.key,
      engineLabel: selectedEngineOption.label,
      channelDescriptions: selectedChannels,
      startMs,
      endMs,
    });
    return true;
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

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#07111f]">
      <Header />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" />

        <section className="flex-1 min-w-0 p-3 lg:p-5">
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

                <div className="grid gap-3 lg:grid-cols-3">
                  <SelectField
                    label="Vessel"
                    value={selectedVessel}
                    onChange={(event) => {
                      setSelectedVessel(event.target.value);
                      resetDraftRange();
                    }}
                    disabled={isConfigLoading}
                  >
                    {overviewConfig.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Engine"
                    value={selectedEngine}
                    onChange={(event) => setSelectedEngine(event.target.value)}
                    disabled={isConfigLoading || engineOptions.length === 0}
                  >
                    {engineOptions.length === 0 ? (
                      <option value="">No engine configured</option>
                    ) : (
                      engineOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label} ({option.serialNo})
                        </option>
                      ))
                    )}
                  </SelectField>

                  <MultiSelectField
                    label="Chart data"
                    options={channelOptions}
                    selectedValues={selectedChannels}
                    onToggle={handleChannelToggle}
                    isOpen={isChartDataOpen}
                    onOpenChange={setIsChartDataOpen}
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
                    Engine:{" "}
                    <strong className="text-slate-200">
                      {selectedEngineOption?.label ?? "--"}
                    </strong>
                  </span>
                  <span>
                    SerialNo:{" "}
                    <strong className="text-slate-200">
                      {selectedEngineOption?.serialNo ?? "--"}
                    </strong>
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
              {isTrendLoading ? (
                <div className="mb-4 inline-flex items-center gap-2 rounded-[10px] border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[13px] font-semibold text-sky-200">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Loading trend data from backend...
                </div>
              ) : null}
              <TimeSeriesLineChart
                chartData={chartData}
                series={chartSeries}
                rangeStartMs={trendPayload?.meta?.rangeStartMs ?? null}
                rangeEndMs={trendPayload?.meta?.rangeEndMs ?? null}
                chartHeight={400}
                title={`${selectedVesselOption?.label ?? "Vessel"} - ${
                  submittedFilters?.engineLabel ?? selectedEngineOption?.label ?? "Engine"
                } Trend`}
                yAxisName="Selected values"
                emptyMessage={
                  isTrendLoading
                    ? "Loading trend history..."
                    : submittedFilters
                      ? "No analog records returned for the selected vessel, engine, channels, and time range."
                      : "Select chart data and press Apply Filters to request trend data."
                }
              />
            </div>
          </div>
        </section>
      </main>

      <Footer lastUpdated={lastUpdated} pollIntervalMs={null} />
    </div>
  );
};

export default Overview;
