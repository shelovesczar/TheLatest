const {
  STORE_NAMES,
  getJson,
  setJson,
  isBlobConfigurationError,
} = require("./blobStore");
const { enforceRateLimit } = require("./rateLimit");

const MAX_FIELD_LENGTH = 2000;
const MAX_STACK_LENGTH = 4000;

function jsonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function truncate(value = "", max = MAX_FIELD_LENGTH) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function stableHash(value = "") {
  const source = String(value || "");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}

function buildDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const rateLimit = await enforceRateLimit(event, {
    scope: "client-error",
    maxRequests: 20,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimit.headers },
      body: JSON.stringify({ error: "Rate limit exceeded" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const message = truncate(body.message || "Unknown client error", 300);
    const stack = truncate(body.stack || "", MAX_STACK_LENGTH);
    const componentStack = truncate(body.componentStack || "", MAX_STACK_LENGTH);
    const path = truncate(body.path || "", 300);
    const userAgent = truncate(
      event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "",
      300,
    );

    // Server-side console logging surfaces immediately in Netlify function logs.
    console.error("[clientError]", message, { path, stack });

    const dayKey = buildDateKey();
    const signature = stableHash(`${message}|${path}`);
    const key = `${dayKey}/${signature}`;

    const existing = await getJson(STORE_NAMES.clientErrors, key);
    const now = new Date().toISOString();
    const nextValue = {
      message,
      stack,
      componentStack,
      path,
      userAgent,
      count: Number(existing?.count || 0) + 1,
      firstSeenAt: existing?.firstSeenAt || now,
      lastSeenAt: now,
    };

    await setJson(STORE_NAMES.clientErrors, key, nextValue, {
      metadata: { message, path, count: nextValue.count },
    });

    return {
      statusCode: 202,
      headers,
      body: JSON.stringify({ logged: true }),
    };
  } catch (error) {
    if (isBlobConfigurationError(error)) {
      return {
        statusCode: 202,
        headers,
        body: JSON.stringify({ logged: true, persisted: false }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
