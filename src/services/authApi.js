const AUTH_STORAGE_KEY = "drums-auth-session";

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

export const loadStoredSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const session = JSON.parse(rawValue);
    if (!session?.token || !session?.user?.username || !session?.user?.role) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
};

export const persistSession = (session) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
};

export const clearStoredSession = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

export const loginUser = async (username, password) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  return readJsonOrThrow(response, `login request failed with status ${response.status}`);
};

const authorizedFetch = async (url, token, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  return readJsonOrThrow(response, `${url} request failed with status ${response.status}`);
};

export const fetchUsers = async (token) => {
  return authorizedFetch("/api/users", token);
};

export const createUser = async (token, payload) => {
  return authorizedFetch("/api/users", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
