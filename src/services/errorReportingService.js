const CLIENT_ERROR_ENDPOINT = "/.netlify/functions/clientError";

export function reportClientError({ message, stack, componentStack } = {}) {
  try {
    const payload = JSON.stringify({
      message: String(message || "Unknown client error"),
      stack: String(stack || ""),
      componentStack: String(componentStack || ""),
      path:
        typeof window !== "undefined"
          ? window.location?.pathname || ""
          : "",
    });

    fetch(CLIENT_ERROR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let error reporting itself throw.
  }
}
