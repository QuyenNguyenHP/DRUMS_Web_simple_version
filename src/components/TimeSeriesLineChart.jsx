import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import * as echarts from "echarts";

const timeSeriesLineChartPopInKeyframes = `
  @keyframes timeSeriesLineChartPopIn {
    0% {
      opacity: 0;
      transform: scale(0.94);
    }
    65% {
      opacity: 0.68;
      transform: scale(1.02);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const defaultSeriesColors = ["#22c55e", "#38bdf8", "#f97316", "#e879f9", "#facc15", "#fb7185"];

const pad = (value) => String(value).padStart(2, "0");

const formatUtcAxisTime = (timestampMs) => {
  const date = new Date(timestampMs);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

const calculateSeriesAverages = (chartData, series) =>
  series.map((seriesItem, index) => {
    const color = seriesItem.color ?? defaultSeriesColors[index % defaultSeriesColors.length];

    if (!Array.isArray(chartData) || chartData.length === 0) {
      return {
        ...seriesItem,
        color,
        average: null,
      };
    }

    const numericValues = chartData
      .map((item) => Number(item?.[seriesItem.dataKey]))
      .filter((value) => Number.isFinite(value));

    if (numericValues.length === 0) {
      return {
        ...seriesItem,
        color,
        average: null,
      };
    }

    const total = numericValues.reduce((sum, value) => sum + value, 0);

    return {
      ...seriesItem,
      color,
      average: total / numericValues.length,
    };
  });

const formatAverageValue = (value, precision, unit) => {
  if (!Number.isFinite(value)) {
    return "--";
  }

  const normalizedPrecision = Number.isInteger(precision) ? precision : 2;
  return `${value.toFixed(normalizedPrecision)}${unit ? ` ${unit}` : ""}`;
};

const buildChartOption = ({
  chartData,
  series,
  rangeStartMs,
  rangeEndMs,
  emptyMessage,
  yAxisName,
  yAxes,
}) => {
  const normalizedSeries = series.map((item, index) => ({
    lineWidth: 3,
    smooth: 0.22,
    yAxisIndex: 0,
    ...item,
    color: item.color ?? defaultSeriesColors[index % defaultSeriesColors.length],
  }));

  const resolvedYAxes =
    Array.isArray(yAxes) && yAxes.length > 0
      ? yAxes
      : [
          {
            name: yAxisName,
            position: "left",
          },
        ];

  const source = chartData.map((item) => {
    const point = {
      timestampLabel: item.timestampLabel,
      timestampMs: Number(item.timestampMs ?? 0),
    };

    normalizedSeries.forEach((seriesItem) => {
      point[seriesItem.dataKey] = Number(item[seriesItem.dataKey] ?? 0);
    });

    return point;
  });

  const seriesLookup = Object.fromEntries(
    normalizedSeries.map((item) => [item.name, item])
  );

  return {
    animationDuration: 250,
    animationDurationUpdate: 200,
    backgroundColor: "transparent",
    color: normalizedSeries.map((item) => item.color),
    dataset: [{ id: "raw", source }],
    legend: {
      left: "center",
      top: 8,
      data: normalizedSeries.map((item) => item.name),
      textStyle: {
        color: "#cbd5e1",
      },
    },
    grid: {
      top: 42,
      right: resolvedYAxes.length > 1 ? 64 : 28,
      bottom: 28,
      left: resolvedYAxes.length > 1 ? 64 : 58,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#0f172a",
      borderColor: "#334155",
      textStyle: {
        color: "#f8fafc",
      },
      axisPointer: {
        type: "line",
        lineStyle: {
          color: "#64748b",
          type: "dashed",
        },
      },
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        const firstRow = rows[0];
        const timestampLabel =
          firstRow?.data?.timestampLabel ?? formatUtcAxisTime(firstRow?.axisValue ?? 0);
        const formattedRows = rows.map((row) => {
          const seriesConfig = seriesLookup[row.seriesName] ?? {};
          const value = Number(row?.value?.[seriesConfig.dataKey] ?? 0);
          const precision = Number.isInteger(seriesConfig.precision)
            ? seriesConfig.precision
            : 2;
          const fallbackAxis = resolvedYAxes[seriesConfig.yAxisIndex ?? 0];
          const unit = seriesConfig.unit ?? fallbackAxis?.name ?? yAxisName ?? "";

          return `${row.marker ?? ""}${row.seriesName}: ${value.toFixed(precision)}${unit ? ` ${unit}` : ""}`;
        });

        return [timestampLabel, ...formattedRows].join("<br/>");
      },
    },
    xAxis: {
      type: "time",
      min: rangeStartMs ?? undefined,
      max: rangeEndMs ?? undefined,
      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },
      axisLabel: {
        color: "#94a3b8",
        margin: 8,
        formatter: (value) => formatUtcAxisTime(value),
      },
      splitLine: {
        show: false,
      },
    },
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        filterMode: "none",
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: false,
        zoomOnMouseWheel: true,
      },
    ],
    yAxis: resolvedYAxes.map((axisConfig, axisIndex) => ({
      type: "value",
      name: axisConfig?.name ?? "",
      position: axisConfig?.position ?? (axisIndex === 0 ? "left" : "right"),
      nameTextStyle: {
        color: "#94a3b8",
        padding:
          (axisConfig?.position ?? (axisIndex === 0 ? "left" : "right")) === "right"
            ? [0, 0, 0, 0]
            : [0, 0, 0, 8],
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: "#94a3b8",
      },
      splitLine:
        axisIndex === 0
          ? {
              lineStyle: {
                color: "#1e293b",
                type: "dashed",
              },
            }
          : {
              show: false,
            },
    })),
    series: [
      ...normalizedSeries.map((seriesItem) => ({
        name: seriesItem.name,
        type: "line",
        datasetId: "raw",
        yAxisIndex: seriesItem.yAxisIndex ?? 0,
        encode: {
          x: "timestampMs",
          y: seriesItem.dataKey,
        },
        showSymbol: false,
        smooth: seriesItem.smooth,
        lineStyle: {
          width: seriesItem.lineWidth,
        },
        itemStyle: {
          color: seriesItem.color,
        },
      })),
      {
        type: "scatter",
        data:
          chartData.length === 0 && rangeStartMs != null && rangeEndMs != null
            ? [[rangeStartMs, null], [rangeEndMs, null]]
            : [],
        symbolSize: 0,
        tooltip: { show: false },
      },
    ],
    graphic:
      chartData.length === 0
        ? [
            {
              type: "text",
              left: "center",
              top: "middle",
              silent: true,
              style: {
                text: emptyMessage,
                fill: "#94a3b8",
                fontSize: 14,
              },
            },
          ]
        : [],
  };
};

const TimeSeriesLineChart = ({
  chartData,
  series,
  rangeStartMs,
  rangeEndMs,
  chartHeight = 420,
  title = "",
  subtitle = "",
  emptyMessage = "No data returned for the selected window.",
  yAxisName = "",
  yAxes = [],
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const hasLoggedChartErrorRef = useRef(false);
  const [isAverageVisible, setIsAverageVisible] = useState(true);
  const seriesAverages = useMemo(
    () => calculateSeriesAverages(chartData, series),
    [chartData, series]
  );

  useEffect(() => {
    if (!chartRef.current) {
      return undefined;
    }

    chartInstanceRef.current = echarts.init(chartRef.current);
    const chartInstance = chartInstanceRef.current;
    const handleDoubleClick = () => {
      chartInstance.dispatchAction({
        type: "dataZoom",
        start: 0,
        end: 100,
      });
    };

    chartInstance.getZr().on("dblclick", handleDoubleClick);
    resizeObserverRef.current = new ResizeObserver(() => {
      chartInstance.resize();
    });
    resizeObserverRef.current.observe(chartRef.current);

    return () => {
      chartInstance.getZr().off("dblclick", handleDoubleClick);
      resizeObserverRef.current?.disconnect();
      chartInstance.dispose();
      resizeObserverRef.current = null;
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) {
      return;
    }

    try {
      chartInstanceRef.current.setOption(
        buildChartOption({
          chartData,
          series,
          rangeStartMs,
          rangeEndMs,
          emptyMessage,
          yAxisName,
          yAxes,
        }),
        { notMerge: true, lazyUpdate: true }
      );
    } catch (error) {
      if (!hasLoggedChartErrorRef.current) {
        console.error("Failed to render time series line chart:", error);
        hasLoggedChartErrorRef.current = true;
      }
    }
  }, [chartData, series, rangeStartMs, rangeEndMs, emptyMessage, yAxisName, yAxes]);

  return (
    <>
      <style>{timeSeriesLineChartPopInKeyframes}</style>
      <div
        className="w-full rounded-[12px] bg-[#11182766] border border-[#334155] p-1 pb-0"
        style={{
          animation: "timeSeriesLineChartPopIn 900ms ease-out",
          transformOrigin: "center",
          willChange: "transform, opacity",
        }}
      >
        {title && (
          <div className="mb-3 flex flex-col gap-1 px-2 pt-2">
            <h3 className="m-0 text-[18px] font-roboto text-[#f8fafc]">{title}</h3>
          </div>
        )}
        <div className="relative w-full">
          <div ref={chartRef} className="w-full" style={{ height: `${chartHeight}px` }} />
          {seriesAverages.length ? (
            <button
              type="button"
              className="absolute right-3 top-1 z-[2] flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#334155] bg-[#0b1220e6] text-[#cbd5e1] transition hover:border-[#475569] hover:text-[#f8fafc]"
              onClick={() => setIsAverageVisible((currentValue) => !currentValue)}
              aria-label={isAverageVisible ? "Hide average" : "Show average"}
              title={isAverageVisible ? "Hide average" : "Show average"}
            >
              {isAverageVisible ? (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 8H13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="4.25"
                    y="4.25"
                    width="7.5"
                    height="7.5"
                    rx="0.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 4V3.5C6 3.22386 6.22386 3 6.5 3H12.5C12.7761 3 13 3.22386 13 3.5V9.5C13 9.77614 12.7761 10 12.5 10H12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ) : null}
          {seriesAverages.length && isAverageVisible ? (
            <div className="pointer-events-none absolute right-3 top-1 rounded-[10px] border border-[#334155] bg-[#0b1220cc] px-3 py-2 text-left shadow-[0_10px_30px_rgba(2,6,23,0.3)] backdrop-blur-sm">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                Average
              </p>
              <div className="mt-1 flex flex-col gap-1">
                {seriesAverages.map((seriesItem) => (
                  <div
                    key={seriesItem.dataKey}
                    className="flex items-center justify-start gap-2 text-[13px] text-[#e2e8f0]"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: seriesItem.color ?? "#38bdf8" }}
                    />
                    <span className="font-medium text-[#cbd5e1]">{seriesItem.name}:</span>
                    <span className="font-semibold text-[#f8fafc]">
                      {formatAverageValue(
                        seriesItem.average,
                        seriesItem.precision,
                        seriesItem.unit ?? yAxisName
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

TimeSeriesLineChart.propTypes = {
  chartData: PropTypes.arrayOf(
    PropTypes.shape({
      timestampLabel: PropTypes.string,
      timestampMs: PropTypes.number,
    })
  ).isRequired,
  chartHeight: PropTypes.number,
  emptyMessage: PropTypes.string,
  rangeEndMs: PropTypes.number,
  rangeStartMs: PropTypes.number,
  series: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string,
      dataKey: PropTypes.string.isRequired,
      lineWidth: PropTypes.number,
      name: PropTypes.string.isRequired,
      precision: PropTypes.number,
      smooth: PropTypes.number,
      unit: PropTypes.string,
    })
  ).isRequired,
  subtitle: PropTypes.string,
  title: PropTypes.string,
  yAxes: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      position: PropTypes.oneOf(["left", "right"]),
    })
  ),
  yAxisName: PropTypes.string,
};

export default TimeSeriesLineChart;
