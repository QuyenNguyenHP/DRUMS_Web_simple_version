const ENGINE_MONITOR_ENDPOINT = "/api/engine";

const readJsonResponse = async (response) => {
  if (response.ok) {
    return response.json();
  }

  let message = `Engine request failed with status ${response.status}`;

  try {
    const errorPayload = await response.json();
    message = errorPayload?.error || message;
  } catch {
    // The response body is not JSON; use the HTTP status message above.
  }

  throw new Error(message);
};

/**
 * Loads the current values used by the engine screen.
 *
 * Expected response shape:
 * {
 *   values: { pressure: 2.4, temperature: 78.1 },
 *   meta: { pollIntervalMs: 2000 }
 * }
 */
export const fetchEngineMonitorData = async ({ vessel, engine, signal } = {}) => {
  const url = new URL(ENGINE_MONITOR_ENDPOINT, window.location.origin);

  if (vessel) {
    url.searchParams.set("vessel", vessel);
  }

  if (engine) {
    url.searchParams.set("engine", engine);
  }

  const response = await fetch(url.pathname + url.search, {
    headers: { Accept: "application/json" },
    signal,
  });

  return readJsonResponse(response);
};

export { ENGINE_MONITOR_ENDPOINT };
