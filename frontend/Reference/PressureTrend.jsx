import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import Footer from "../components/Footer";
import DashboardButton from "../components/DashboardButton";
import TimeSeriesLineChart from "../components/TimeSeriesLineChart";
import { fetchPressureTrendHistory } from "../services/pidMonitorApi";

const pressureSeriesConfig = [
  {
    channelDescription: "Fuel Oil Pressure",
    dataKey: "fuelOilPressure",
    name: "Fuel Oil Pressure",
    color: "#f97316",
    precision: 2,
  },
  {
    channelDescription: "Engine LO Pressure",
    dataKey: "engineLoPressure",
    name: "Engine LO Pressure",
    color: "#38bdf8",
    precision: 2,
  },
  {
    channelDescription: "Intake Air Pressure",
    dataKey: "intakeAirPressure",
    name: "Intake Air Pressure",
    color: "#22c55e",
    precision: 2,
  },
  {
    channelDescription: "Cooler Water Pressure",
    dataKey: "coolerWaterPressure",
    name: "Cooler Water Pressure",
    color: "#e879f9",
    precision: 2,
  },
];

const normalizePressureValueToMpa = (value, unit) => {
  const numericValue = Number(value ?? 0);
  const normalizedUnit = String(unit ?? "").trim().toLowerCase();

  if (normalizedUnit === "bar") {
    return numericValue / 10;
  }

  return numericValue;
};

const pad = (value) => String(value).padStart(2, "0");

const toUtcInputValue = (timestampMs) => {
  if (!timestampMs) {
    return "";
  }

  const date = new Date(timestampMs);
  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  ].join("T");
};

const fromUtcInputValue = (inputValue) => {
  if (!inputValue) {
    return null;
  }

  return new Date(`${inputValue}:00Z`).getTime();
};

const shiftUtcInputValue = (inputValue, deltaHours) => {
  const timestampMs = fromUtcInputValue(inputValue);
  if (!timestampMs) {
    return inputValue;
  }

  return toUtcInputValue(timestampMs + deltaHours * 3600000);
};

const buildEngineLabel = (engineNumber) => `Engine ${engineNumber}`;

const PressureTrend = () => {
  const [payload, setPayload] = useState(null);
  const [pressurePayload, setPressurePayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(null);
  const [draftStartInput, setDraftStartInput] = useState("");
  const [draftEndInput, setDraftEndInput] = useState("");
  const [appliedRange, setAppliedRange] = useState(null);
  const [selectedEngine, setSelectedEngine] = useState(1);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);

      try {
        const requestOptions = appliedRange
          ? {
              engine: selectedEngine,
              startTime: new Date(appliedRange.startMs).toISOString(),
              endTime: new Date(appliedRange.endMs).toISOString(),
            }
          : {
              engine: selectedEngine,
            };
        const [nextPayload, nextPressurePayload] = await Promise.all([
          fetchPressureTrendHistory(requestOptions),
          fetchPressureTrendHistory({
            ...requestOptions,
            channelDescriptions: pressureSeriesConfig.map(
              (seriesItem) => seriesItem.channelDescription
            ),
          }),
        ]);

        if (!isActive) {
          return;
        }

        setPayload(nextPayload);
        setPressurePayload(nextPressurePayload);
        setError("");
        setLastUpdated(new Date());
        setPollIntervalMs(null);
        setDraftStartInput((currentValue) =>
          currentValue || toUtcInputValue(nextPayload?.meta?.rangeStartMs)
        );
        setDraftEndInput((currentValue) =>
          currentValue || toUtcInputValue(nextPayload?.meta?.rangeEndMs)
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setPayload(null);
        setPressurePayload(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load pressure trend history data."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [appliedRange, selectedEngine]);

  const modbusConnected = error ? false : payload ? true : null;
  const availableEngines = payload?.engines?.length ? payload.engines : [1, 2, 3, 4];

  useEffect(() => {
    if (payload?.engines?.length && !payload.engines.includes(selectedEngine)) {
      setSelectedEngine(payload.engines[0]);
    }
  }, [payload, selectedEngine]);

  const effectiveSelectedEngine = availableEngines.includes(selectedEngine)
    ? selectedEngine
    : availableEngines[0];
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const loadChartData = records.map((record) => ({
    timestampLabel: record.timestampLabel,
    timestampMs: Number(record.timestampMs ?? 0),
    loadValue: Number(record.value ?? 0),
  }));
  const unit = payload?.meta?.unit ?? payload?.records?.[0]?.unit ?? "kW";
  const seriesLabel = payload?.meta?.seriesLabel ?? "Engine Power";

  const pressureChartData = useMemo(() => {
    const pressureRecords = Array.isArray(pressurePayload?.records)
      ? pressurePayload.records
      : [];
    const rowsByTimestamp = new Map();

    pressureRecords.forEach((record) => {
      const timestampMs = Number(record.timestampMs ?? 0);
      const existingRow = rowsByTimestamp.get(timestampMs) ?? {
        timestampLabel: record.timestampLabel,
        timestampMs,
      };
      const matchingSeries = pressureSeriesConfig.find(
        (seriesItem) => seriesItem.channelDescription === record.channelDescription
      );

      if (!matchingSeries) {
        return;
      }

      existingRow[matchingSeries.dataKey] = normalizePressureValueToMpa(
        record.value,
        record.unit
      );
      rowsByTimestamp.set(timestampMs, existingRow);
    });

    return Array.from(rowsByTimestamp.values()).sort(
      (leftRow, rightRow) => leftRow.timestampMs - rightRow.timestampMs
    );
  }, [pressurePayload]);

  const combinedChartData = useMemo(() => {
    const rowsByTimestamp = new Map();

    loadChartData.forEach((record) => {
      rowsByTimestamp.set(record.timestampMs, { ...record });
    });

    pressureChartData.forEach((record) => {
      const existingRow = rowsByTimestamp.get(record.timestampMs) ?? {
        timestampLabel: record.timestampLabel,
        timestampMs: record.timestampMs,
      };

      pressureSeriesConfig.forEach((seriesItem) => {
        if (Number.isFinite(record[seriesItem.dataKey])) {
          existingRow[seriesItem.dataKey] = record[seriesItem.dataKey];
        }
      });

      rowsByTimestamp.set(record.timestampMs, existingRow);
    });

    return Array.from(rowsByTimestamp.values()).sort(
      (leftRow, rightRow) => leftRow.timestampMs - rightRow.timestampMs
    );
  }, [loadChartData, pressureChartData]);

  const combinedSeries = useMemo(
    () => [
      {
        name: seriesLabel,
        dataKey: "loadValue",
        color: "#c57e22",
        unit,
        precision: 2,
        yAxisIndex: 1,
      },
      ...pressureSeriesConfig.map((seriesItem) => ({
        name: seriesItem.name,
        dataKey: seriesItem.dataKey,
        color: seriesItem.color,
        precision: seriesItem.precision,
        unit: "MPa",
        yAxisIndex: 0,
      })),
    ],
    [seriesLabel, unit]
  );

  const handleApplyRange = () => {
    const startMs = fromUtcInputValue(draftStartInput);
    const endMs = fromUtcInputValue(draftEndInput);

    if (!startMs || !endMs) {
      setError("Both From (UTC) and To (UTC) are required.");
      return;
    }

    if (startMs >= endMs) {
      setError("From (UTC) must be earlier than To (UTC).");
      return;
    }

    setError("");
    setAppliedRange({ startMs, endMs });
  };

  const handleShiftRange = (direction) => {
    const deltaHours = 24 * direction;
    const nextStartInput = shiftUtcInputValue(draftStartInput, deltaHours);
    const nextEndInput = shiftUtcInputValue(draftEndInput, deltaHours);
    const nextStartMs = fromUtcInputValue(nextStartInput);
    const nextEndMs = fromUtcInputValue(nextEndInput);

    setDraftStartInput(nextStartInput);
    setDraftEndInput(nextEndInput);

    if (!nextStartMs || !nextEndMs || nextStartMs >= nextEndMs) {
      setError("Unable to shift the selected UTC range.");
      return;
    }

    setError("");
    setAppliedRange({ startMs: nextStartMs, endMs: nextEndMs });
  };

  return (
    <Box className="min-h-screen relative bg-[#101828] w-full overflow-hidden shrink-0 flex flex-col items-start leading-[normal] tracking-[normal] mq925:h-auto">
      <Header modbusConnected={modbusConnected} />
      <main className="self-stretch flex-1 overflow-hidden flex items-start [row-gap:20px] max-w-full mq1825:flex-wrap">
        <NavigationSidebar />
        <section className="flex-1 overflow-hidden flex items-start justify-center !p-4 box-border gap-4 max-w-full text-left text-[#f8fafc] font-[Roboto] mq925:h-auto">
          <Box className="flex-1 min-h-[916px] overflow-auto rounded-[10px] bg-[#1e2939] border-[#364153] border-solid border-[1px] box-border flex flex-col items-start !p-6 max-w-full shrink-0">
            <Box className="w-full flex flex-col gap-6">
              <Box className="w-full flex flex-col gap-4">
                <Box className="w-full rounded-[14px] border border-[#334155] bg-[#111827] !px-3 !py-3">
                  <Box className="flex flex-col gap-3">
                    <Box className="flex flex-wrap items-center gap-3">
                      <Box className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] !px-3 !py-2">
                        <Typography className="text-[13px] font-semibold text-[#8fb4ef]">
                          From (UTC)
                        </Typography>
                        <input
                          type="datetime-local"
                          className="min-w-[220px] border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]"
                          value={draftStartInput}
                          onChange={(event) => setDraftStartInput(event.target.value)}
                        />
                      </Box>

                      <Box className="flex items-center gap-2 rounded-[12px] border border-[#334155] bg-[#0b1220] !px-3 !py-2">
                        <Typography className="text-[13px] font-semibold text-[#8fb4ef]">
                          To (UTC)
                        </Typography>
                        <input
                          type="datetime-local"
                          className="min-w-[220px] border-0 bg-transparent text-[14px] font-semibold text-[#f8fafc] outline-none [color-scheme:dark]"
                          value={draftEndInput}
                          onChange={(event) => setDraftEndInput(event.target.value)}
                        />
                      </Box>

                      <DashboardButton onClick={() => handleShiftRange(-1)} active>
                        Prev 24h
                      </DashboardButton>
                      <DashboardButton onClick={() => handleShiftRange(1)} active>
                        Next 24h
                      </DashboardButton>
                      <DashboardButton onClick={handleApplyRange} active>
                        Apply
                      </DashboardButton>
                    </Box>

                    <Box className="flex flex-wrap items-center justify-end gap-3">
                      <Typography className="text-[13px] font-semibold text-[#8fb4ef]">
                        Select engine
                      </Typography>
                      {availableEngines.map((engineNumber) => (
                        <DashboardButton
                          key={engineNumber}
                          active={engineNumber === effectiveSelectedEngine}
                          onClick={() => setSelectedEngine(engineNumber)}
                        >
                          {buildEngineLabel(engineNumber)}
                        </DashboardButton>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {error ? (
                <Box className="w-full rounded-[12px] border border-[#7f1d1d] bg-[#450a0a66] !px-4 !py-3">
                  <Typography className="text-[14px] text-[#fecaca]">{error}</Typography>
                </Box>
              ) : null}

              <Box className="w-full rounded-[12px] border border-[#334155] bg-[#0f172a] !p-4">
                <TimeSeriesLineChart
                  chartData={combinedChartData}
                  series={combinedSeries}
                  rangeStartMs={pressurePayload?.meta?.rangeStartMs ?? payload?.meta?.rangeStartMs ?? null}
                  rangeEndMs={pressurePayload?.meta?.rangeEndMs ?? payload?.meta?.rangeEndMs ?? null}
                  chartHeight={660}
                  title={`${buildEngineLabel(effectiveSelectedEngine)} Load and Pressure Trends`}
                  yAxes={[
                    { name: "Pressure (MPa)", position: "left" },
                    { name: "Load (kW)", position: "right" },
                  ]}
                  emptyMessage={
                    isLoading
                      ? "Loading load and pressure history..."
                      : `No load or pressure history returned for ${buildEngineLabel(effectiveSelectedEngine)} in the selected window.`
                  }
                />
              </Box>
            </Box>
          </Box>
        </section>
      </main>
      <Footer
        lastUpdated={lastUpdated}
        networkStatus={
          modbusConnected === false
            ? "Disconnected"
            : modbusConnected
              ? "Connected"
              : "Connecting..."
        }
        pollIntervalMs={pollIntervalMs}
      />
    </Box>
  );
};

export default PressureTrend;
