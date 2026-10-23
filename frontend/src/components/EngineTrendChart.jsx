import { useEffect, useMemo, useState } from "react";
import TimeSeriesLineChart from "./TimeSeriesLineChart";
import { fetchOverviewTrend } from "../services/apiClient";
import { buildTrendChartData, trendSeriesKey } from "../services/trendData";

const inputTime = (ms) => new Date(ms).toISOString().slice(0, 16);
const initialRange = (timestamp) => {
  const end = Number(timestamp) || Date.now();
  return { start: inputTime(end - 24 * 3600000), end: inputTime(end) };
};

export default function EngineTrendChart({ vessel, serialNo, channel, latestTimestampMs }) {
  const [draft, setDraft] = useState(() => initialRange(latestTimestampMs));
  const [range, setRange] = useState(draft);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState("");
  const name = channel?.channelDescription;
  const startMs = Date.parse(`${range.start}:00Z`);
  const endMs = Date.parse(`${range.end}:00Z`);

  useEffect(() => {
    const controller = new AbortController();
    setRecords([]);
    setError("");
    setLoading(false);
    if (!name || !vessel || !serialNo) return;
    setLoading(true);
    fetchOverviewTrend({
      vessel, serialNumbers: [serialNo], channelDescriptions: [name],
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(), signal: controller.signal,
    }).then((response) => {
      if (!controller.signal.aborted) setRecords(response?.records ?? []);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err.message || "Unable to load history.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [vessel, serialNo, name, startMs, endMs]);

  const data = useMemo(() => buildTrendChartData(records), [records]);
  const series = useMemo(() => name ? [{
    name, dataKey: trendSeriesKey(serialNo, name), unit: channel?.unit ?? "",
    color: "#38bdf8", precision: 2,
  }] : [], [name, serialNo, channel?.unit]);

  return (
    <section className="mt-4 rounded-lg border border-slate-700 bg-slate-800/90 p-4" aria-label="Engine history">
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <h2 className="min-w-0 text-lg font-semibold text-slate-100" aria-live="polite">
        Engine history{name ? ` — ${name}` : ""}
      </h2>
      <form className="flex flex-wrap items-end gap-3 xl:ml-auto xl:shrink-0 xl:justify-end" onSubmit={(event) => {
        event.preventDefault();
        const start = Date.parse(`${draft.start}:00Z`);
        const end = Date.parse(`${draft.end}:00Z`);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
          setValidation("Start time must be before end time.");
          return;
        }
        setValidation("");
        setRange({ ...draft });
      }}>
        {[['start', 'From (UTC)'], ['end', 'To (UTC)']].map(([field, label]) => (
          <label key={field} className="flex flex-col gap-1 text-sm text-slate-300">
            {label}
            <input type="datetime-local" required value={draft[field]}
              onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
              className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 [color-scheme:dark]" />
          </label>
        ))}
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">Apply range</button>
      </form>
      </div>
      {validation || error ? <p role="alert" className="mb-3 text-sm text-red-300">{validation || error}</p> : null}
      <div className="relative" aria-busy={loading}>
        <TimeSeriesLineChart chartData={data} series={series} rangeStartMs={startMs} rangeEndMs={endMs}
          yAxisName={channel?.unit ?? ""} chartHeight={520}
          emptyMessage={loading ? "" : error ? "Unable to load history." : !name ? "" : "No data returned for the selected window."} />
        {loading ? (
          <div role="status" className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/40 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-full border border-slate-600/80 bg-slate-950/80 px-4 py-2 text-sm text-slate-100 shadow-lg">
              <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-300" />
              Loading data...
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
