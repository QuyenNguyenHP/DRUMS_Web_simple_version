import { useEffect, useState } from "react";

import { fetchPagePayload } from "../services/apiClient";

const DEFAULT_POLL_INTERVAL_MS = 2000;

export const usePolledPagePayload = (pageName) => {
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pollIntervalMs, setPollIntervalMs] = useState(DEFAULT_POLL_INTERVAL_MS);

  useEffect(() => {
    let isActive = true;
    let timeoutId = null;

    const poll = async () => {
      if (!isActive) {
        return;
      }

      try {
        const nextPayload = await fetchPagePayload(pageName);

        if (!isActive) {
          return;
        }

        setPayload(nextPayload);
        setError("");
        setIsLoading(false);
        setLastUpdated(new Date());
        setPollIntervalMs(nextPayload?.meta?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);

        timeoutId = window.setTimeout(
          poll,
          nextPayload?.meta?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
        );
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : `Failed to load ${pageName} data.`
        );
        setIsLoading(false);
        timeoutId = window.setTimeout(poll, DEFAULT_POLL_INTERVAL_MS);
      }
    };

    setIsLoading(true);
    setError("");
    poll();

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [pageName]);

  return {
    payload,
    isLoading,
    error,
    lastUpdated,
    pollIntervalMs,
  };
};

export default usePolledPagePayload;
