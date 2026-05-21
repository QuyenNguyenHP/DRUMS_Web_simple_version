export const fetchPagePayload = async (pageName) => {
  const response = await fetch(`/api/${pageName}`);

  if (!response.ok) {
    let errorMessage = `${pageName} request failed with status ${response.status}`;

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
    } catch {
      // Preserve the fallback message when the response is not JSON.
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

const readJsonOrThrow = async (response, fallbackMessage) => {
  if (response.ok) {
    return response.json();
  }

  let errorMessage = fallbackMessage;

  try {
    const errorPayload = await response.json();
    if (errorPayload?.error) {
      errorMessage = errorPayload.error;
    }
  } catch {
    // Preserve the fallback message when the response is not JSON.
  }

  throw new Error(errorMessage);
};

export const fetchTrendHistory = async ({
  windowMinutes,
  startTime,
  endTime,
  seriesKeys,
} = {}) => {
  const url = new URL("/api/history/trend", window.location.origin);

  if (Number.isFinite(windowMinutes) && windowMinutes > 0) {
    url.searchParams.set("windowMinutes", String(windowMinutes));
  }

  if (startTime) {
    url.searchParams.set("startTime", startTime);
  }

  if (endTime) {
    url.searchParams.set("endTime", endTime);
  }

  if (Array.isArray(seriesKeys) && seriesKeys.length > 0) {
    seriesKeys
      .filter((seriesKey) => typeof seriesKey === "string" && seriesKey)
      .forEach((seriesKey) => url.searchParams.append("seriesKey", seriesKey));
  }

  const response = await fetch(url.pathname + url.search);

  return readJsonOrThrow(
    response,
    `history trend request failed with status ${response.status}`
  );
};

export const fetchOverviewChannelOptions = async ({ vessel, serialNo }) => {
  const url = new URL("/api/overview/channel-options", window.location.origin);

  if (vessel) {
    url.searchParams.set("vessel", vessel);
  }

  if (serialNo) {
    url.searchParams.set("serialNo", serialNo);
  }

  const response = await fetch(url.pathname + url.search);

  return readJsonOrThrow(
    response,
    `overview channel-options request failed with status ${response.status}`
  );
};

export const fetchOverviewConfig = async () => {
  const response = await fetch("/api/overview/config");

  return readJsonOrThrow(
    response,
    `overview config request failed with status ${response.status}`
  );
};

export const fetchOverviewTrend = async ({
  vessel,
  serialNo,
  startTime,
  endTime,
  channelDescriptions,
} = {}) => {
  const url = new URL("/api/overview/trend", window.location.origin);

  if (vessel) {
    url.searchParams.set("vessel", vessel);
  }

  if (serialNo) {
    url.searchParams.set("serialNo", serialNo);
  }

  if (startTime) {
    url.searchParams.set("startTime", startTime);
  }

  if (endTime) {
    url.searchParams.set("endTime", endTime);
  }

  if (Array.isArray(channelDescriptions) && channelDescriptions.length > 0) {
    channelDescriptions
      .filter(
        (channelDescription) =>
          typeof channelDescription === "string" && channelDescription.trim()
      )
      .forEach((channelDescription) =>
        url.searchParams.append("channelDescription", channelDescription)
      );
  }

  const response = await fetch(url.pathname + url.search);

  return readJsonOrThrow(
    response,
    `overview trend request failed with status ${response.status}`
  );
};
