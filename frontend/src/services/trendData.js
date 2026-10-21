export const normalizeChannelName = (value) => {
  const name = String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  return name === "LOAD" ? "ENGINE LOAD" : name;
};

export const trendSeriesKey = (serialNo, channelDescription) =>
  JSON.stringify([
    String(serialNo ?? "").trim().toUpperCase(),
    normalizeChannelName(channelDescription),
  ]);

export const readTrendValue = (raw) => {
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  if (typeof raw === "string" && !raw.trim()) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const buildTrendChartData = (records) => {
  const rowsByTimestamp = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    const timestampMs = readTrendValue(record.timestampMs);
    const serialNo = String(record.serialNo ?? "").trim();
    const channelDescription = String(record.channelDescription ?? "").trim();
    if (timestampMs === null || !serialNo || !channelDescription) continue;
    const row = rowsByTimestamp.get(timestampMs) ?? {
      timestampLabel: record.timestampLabel,
      timestampMs,
    };
    row[trendSeriesKey(serialNo, channelDescription)] = readTrendValue(record.value);
    rowsByTimestamp.set(timestampMs, row);
  }
  return Array.from(rowsByTimestamp.values()).sort((a, b) => a.timestampMs - b.timestampMs);
};
