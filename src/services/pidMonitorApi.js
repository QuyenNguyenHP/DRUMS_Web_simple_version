const PID_MONITOR_ENDPOINT = "/api/pid";

const readJsonResponse = async (response) => {
  if (response.ok) {
    return response.json();
  }

  let message = `P&ID request failed with status ${response.status}`;

  try {
    const errorPayload = await response.json();
    message = errorPayload?.error || message;
  } catch {
    // The response body is not JSON; use the HTTP status message above.
  }

  throw new Error(message);
};

/**
 * Loads the current values used by the P&ID screen.
 *
 * Expected response shape:
 * {
 *   values: { pressure: 2.4, temperature: 78.1 },
 *   meta: { pollIntervalMs: 2000 }
 * }
 */
export const fetchPidMonitorData = async ({ signal } = {}) => {
  const response = await fetch(PID_MONITOR_ENDPOINT, {
    headers: { Accept: "application/json" },
    signal,
  });

  return readJsonResponse(response);
};

export { PID_MONITOR_ENDPOINT };
