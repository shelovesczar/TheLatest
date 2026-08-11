const DEFAULT_ACCEPT_HEADER =
  "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function getConfigValue(name) {
  return String(process.env[name] || "").trim();
}

function isRssAppUrl(feedUrl = "") {
  try {
    const { hostname } = new URL(String(feedUrl || ""));
    return /(^|\.)rss\.app$/i.test(hostname);
  } catch {
    return /rss\.app/i.test(String(feedUrl || ""));
  }
}

function buildFeedRequestHeaders(feedUrl = "") {
  const headers = {
    Accept: DEFAULT_ACCEPT_HEADER,
    "User-Agent": DEFAULT_USER_AGENT,
  };

  if (!isRssAppUrl(feedUrl)) {
    return headers;
  }

  const authToken = getConfigValue("RSS_APP_AUTH_TOKEN");
  const apiKey = getConfigValue("RSS_APP_API_KEY");
  const apiSecret = getConfigValue("RSS_APP_API_SECRET");
  const apiKeyHeader = getConfigValue("RSS_APP_API_KEY_HEADER") || "X-API-Key";
  const apiSecretHeader =
    getConfigValue("RSS_APP_API_SECRET_HEADER") || "X-API-Secret";

  if (authToken) {
    headers.Authorization = /^Bearer\s+/i.test(authToken)
      ? authToken
      : `Bearer ${authToken}`;
  }

  if (apiKey) {
    headers[apiKeyHeader] = apiKey;
  }

  if (apiSecret) {
    headers[apiSecretHeader] = apiSecret;
  }

  return headers;
}

module.exports = {
  buildFeedRequestHeaders,
  DEFAULT_ACCEPT_HEADER,
  DEFAULT_USER_AGENT,
  isRssAppUrl,
};
