import assert from "node:assert/strict";
import test from "node:test";
import { buildTrendChartData, readTrendValue, trendSeriesKey } from "./trendData.js";

test("H429 history matches mixed-case channel options for every cylinder", () => {
  const records = [1, 2, 3, 4].map((cylinder) => ({
    serialNo: "DG1 DE618Z5178",
    channelDescription: `NO.${cylinder}CYL. EXHAUST GAS TEMPERATURE`,
    timestampMs: 1792508424000,
    value: 43 + cylinder,
  }));
  const rows = buildTrendChartData(records);
  assert.equal(rows.length, 1);
  for (const cylinder of [1, 2, 3, 4]) {
    const key = trendSeriesKey("DG1 DE618Z5178", `No.${cylinder}CYL. EXHAUST GAS TEMPERATURE`);
    assert.equal(rows[0][key], 43 + cylinder);
  }
});

test("missing and invalid readings are not zero; actual zero remains valid", () => {
  for (const value of [null, undefined, "", "  ", "--", "NaN", Infinity, true, [], {}]) {
    assert.equal(readTrendValue(value), null);
  }
  for (const value of [0, "0", 44.5, " 44.5 ", -5]) {
    assert.equal(readTrendValue(value), Number(value));
  }
});

test("series keys normalize spacing and load aliases without mixing engines", () => {
  assert.equal(trendSeriesKey(" DG1 ", " load "), trendSeriesKey("dg1", "ENGINE  LOAD"));
  assert.notEqual(trendSeriesKey("DG1", "LOAD"), trendSeriesKey("DG2", "LOAD"));
});

test("sparse series preserve missing values and sort timestamps", () => {
  const rows = buildTrendChartData([
    { serialNo: "DG1", channelDescription: "LOAD", timestampMs: 2000, value: null },
    { serialNo: "DG2", channelDescription: "LOAD", timestampMs: 1000, value: 0 },
    { serialNo: "DG1", channelDescription: "LOAD", timestampMs: null, value: 5 },
  ]);
  assert.deepEqual(rows.map((row) => row.timestampMs), [1000, 2000]);
  assert.equal(rows[0][trendSeriesKey("DG2", "LOAD")], 0);
  assert.equal(rows[0][trendSeriesKey("DG1", "LOAD")], undefined);
  assert.equal(rows[1][trendSeriesKey("DG1", "LOAD")], null);
  assert.deepEqual(buildTrendChartData(null), []);
});
