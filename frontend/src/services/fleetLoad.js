export const FLEET_POLL_MS = 10000;
export const STALE_AFTER_MS = 40 * 60 * 1000;

export const engineId = (vessel, engine) => JSON.stringify([vessel, engine]);

export function readEngineLoad(payload) {
  const raw = payload?.values?.engine_load_ekw;
  const load = (typeof raw === "number" || (typeof raw === "string" && raw.trim() !== ""))
    ? Number(raw) : NaN;
  const timestamp = payload?.meta?.latestTimestampMs;
  return {
    load: Number.isFinite(load) ? load : null,
    timestamp: typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null,
  };
}

// Bound simultaneous requests and finish each cycle before scheduling another.
export async function pollFleet(jobs, fetchEngine, signal, onResult) {
  let next = 0;
  async function worker() {
    while (!signal.aborted && next < jobs.length) {
      const job = jobs[next++];
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(cancel, 20000);
      try {
        const payload = await fetchEngine({ ...job, signal: controller.signal });
        if (!signal.aborted) onResult(job, { ...readEngineLoad(payload), error: null });
      } catch (error) {
        if (!signal.aborted) onResult(job, {
          load: null, timestamp: null,
          error: error?.name === "AbortError" ? "Request timed out" : "Unable to load engine data",
        });
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
}
