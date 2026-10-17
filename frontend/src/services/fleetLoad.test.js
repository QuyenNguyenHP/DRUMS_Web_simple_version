import assert from "node:assert/strict";
import test from "node:test";
import { engineId, readEngineLoad, pollFleet } from "./fleetLoad.js";

test("load parsing preserves zero and rejects missing or invalid readings", () => {
  for (const raw of [null, undefined, "", "  ", "--", "abc", Infinity, true]) {
    assert.equal(readEngineLoad({ values: { engine_load_ekw: raw } }).load, null);
  }
  for (const raw of [0, "0", 412.5, "412.5"]) {
    assert.equal(readEngineLoad({ values: { engine_load_ekw: raw } }).load, Number(raw));
  }
  assert.equal(readEngineLoad({ meta: { latestTimestampMs: null } }).timestamp, null);
  assert.equal(readEngineLoad({ meta: { latestTimestampMs: 12345 } }).timestamp, 12345);
  assert.notEqual(engineId("a:b", "c"), engineId("a", "b:c"));
});

test("fleet polling limits concurrency and isolates a failed engine", async () => {
  let active = 0;
  let peak = 0;
  const results = [];
  const jobs = Array.from({ length: 12 }, (_, index) => ({ vessel: "vessel", engine: String(index) }));
  await pollFleet(jobs, async ({ engine }) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    if (engine === "3") throw new Error("offline");
    return { values: { engine_load_ekw: engine }, meta: { latestTimestampMs: 12345 } };
  }, new AbortController().signal, (job, result) => results.push({ job, result }));
  assert.ok(peak <= 4);
  assert.equal(results.length, jobs.length);
  assert.ok(results.find(({ job }) => job.engine === "3").result.error);
  assert.equal(results.find(({ job }) => job.engine === "0").result.load, 0);
});

test("cancellation prevents queued requests and late results", async () => {
  const controller = new AbortController();
  const jobs = Array.from({ length: 8 }, (_, index) => ({ vessel: "vessel", engine: String(index) }));
  let calls = 0;
  let results = 0;
  await pollFleet(jobs, async () => {
    calls += 1;
    controller.abort();
    return { values: { engine_load_ekw: 0 } };
  }, controller.signal, () => { results += 1; });
  assert.equal(calls, 1);
  assert.equal(results, 0);
});
