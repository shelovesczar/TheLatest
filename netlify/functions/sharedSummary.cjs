const {
  STORE_NAMES,
  getJsonWithMetadata,
  setJson,
  isBlobConfigurationError,
} = require("./blobStore");
const { requireAdminAccess } = require("./adminAccess");
const rssAggregator = require("./rss-aggregator.cjs");
const { enforceRateLimit } = require("./rateLimit");
const fs = require("fs");
const path = require("path");

const SUMMARY_TTL_MS = 60 * 60 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SUMMARY_CHARACTERS = 850;
const inFlightSummaryRefreshes = new Map();

function jsonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Session-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function normalizePart(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildSummaryKey(topic = "", category = "") {
  const normalizedTopic = normalizePart(topic) || "general";
  const normalizedCategory = normalizePart(category) || "general";
  return `summary/${normalizedCategory}/${normalizedTopic}`;
}

function isFresh(timestamp, ttlMs = SUMMARY_TTL_MS) {
  const parsed = Date.parse(timestamp || "");
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < ttlMs;
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeTopic(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function itemMatchesTopic(item = {}, topic = "") {
  const tokens = tokenizeTopic(topic);
  if (tokens.length === 0) return true;

  const searchableText = cleanText([
    item?.title,
    item?.description,
    item?.content,
    item?.source,
    item?.category,
  ].filter(Boolean).join(" ")).toLowerCase();

  return tokens.every((token) => searchableText.includes(token));
}

let localEnvCache = null;

function readLocalEnvValue(name = "") {
  if (localEnvCache === null) {
    localEnvCache = {};
    const candidatePaths = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(__dirname, "..", "..", ".env"),
    ];

    for (const envPath of candidatePaths) {
      try {
        const content = fs.readFileSync(envPath, "utf8");
        content
          .split(/\r?\n/)
          .filter(Boolean)
          .forEach((line) => {
            const trimmed = String(line || "").trim();
            if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
              return;
            const separatorIndex = trimmed.indexOf("=");
            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            if (key) {
              localEnvCache[key] = value;
            }
          });

        break;
      } catch {
        // try the next candidate path
      }
    }
  }

  return cleanText(localEnvCache[name] || "");
}

function getConfigValue(name = "") {
  const localValue = readLocalEnvValue(name);
  if (localValue) return localValue;
  return cleanText(process.env[name] || "");
}

function logSummaryIssue(message, details = null) {
  if (details === null || details === undefined || details === "") {
    console.warn(`[sharedSummary] ${message}`);
    return;
  }

  console.warn(`[sharedSummary] ${message}: ${details}`);
}

function toTitleCase(value = "") {
  return cleanText(value)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractAnthropicTextBlocks(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter(
      (block) => block?.type === "text" && typeof block?.text === "string",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// Truncating at a raw character count can slice a token in half (e.g.
// "$17.1 billion" -> "$17."), which reads as a factual error rather than an
// intentional trim. Back up to the last whitespace boundary before cutting,
// as long as that doesn't throw away most of the allowed length.
function truncateAtWordBoundary(text = "", sliceLength = 0) {
  const clipped = text.slice(0, sliceLength).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  const safeClip =
    lastSpace > sliceLength * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return safeClip.replace(/[,:;-]+$/, "");
}

function truncateText(value = "", max = 220) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${truncateAtWordBoundary(text, max)}...`;
}

function capSummaryText(value = "", max = MAX_SUMMARY_CHARACTERS) {
  const text = cleanText(value);
  if (text.length <= max) return text;

  const sliceLength = Math.max(0, max - 3);
  return `${truncateAtWordBoundary(text, sliceLength)}...`;
}

function normalizeSummaryPayload(payload = {}) {
  if (!payload || typeof payload !== "object") return payload;

  return {
    ...payload,
    summary: capSummaryText(payload.summary || ""),
  };
}

function buildNormalizedCachedSummary(payload = {}) {
  return normalizeSummaryPayload({
    ...payload,
    sources:
      Array.isArray(payload.sources) && payload.sources.length > 0
        ? payload.sources
        : cleanText(payload.source)
          ? [cleanText(payload.source)]
          : [],
  });
}

async function getLiveSummaryItems({ topic = "", category = "" } = {}) {
  const normalizedTopic = cleanText(topic);
  const normalizedCategory = cleanText(category);
  const requestSets = [
    {
      type: "news",
      ...(normalizedCategory ? { category: normalizedCategory } : {}),
    },
  ];

  if (normalizedTopic && normalizedCategory) {
    requestSets.push({ type: "news" });
  }

  const merged = [];
  const seen = new Set();

  for (const params of requestSets) {
    const response = await rssAggregator.handler(
      {
        httpMethod: "GET",
        queryStringParameters: params,
      },
      {},
    );

    if (response?.statusCode !== 200) {
      logSummaryIssue(
        "rss-aggregator returned non-200 for summary context",
        response?.statusCode,
      );
      continue;
    }

    const payload = JSON.parse(response.body || "{}");
    const items = Array.isArray(payload?.data) ? payload.data : [];
    const filtered = items.filter(
      (item) => item && itemMatchesTopic(item, normalizedTopic),
    );

    filtered.forEach((item) => {
      const key = cleanText(
        item?.link || item?.url || `${item?.source || ""}|${item?.title || ""}`,
      ).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    if (merged.length >= 8) break;
  }

  return merged.slice(0, 8);
}

function buildCoverageContext(items = []) {
  return items
    .map((item, index) => {
      const title = truncateText(item?.title || "", 140);
      const source = truncateText(
        item?.source || item?.category || "Unknown Source",
        40,
      );
      const description = truncateText(
        item?.description || item?.content || "",
        220,
      );
      const publishedAt = cleanText(
        item?.publishedAt || item?.date || item?.pubDate || "",
      );

      return `${index + 1}. Source: ${source}\nTitle: ${title}\nPublished: ${publishedAt || "Unknown"}\nDetail: ${description || "No additional detail provided."}`;
    })
    .join("\n\n");
}

function collectSummarySources(items = [], max = 4) {
  const uniqueSources = [];
  const seen = new Set();

  items.forEach((item) => {
    const source = cleanText(item?.source || item?.category || "");
    if (!source) return;

    const normalized = source.toLowerCase();
    if (seen.has(normalized)) return;

    seen.add(normalized);
    uniqueSources.push(source);
  });

  return uniqueSources.slice(0, max);
}

function buildSummaryPrompt(topic = "", category = "", items = []) {
  const cleanTopic = cleanText(topic);
  const cleanCategory = cleanText(category);
  const scope =
    cleanTopic && cleanCategory
      ? `topic "${cleanTopic}" within the ${toTitleCase(cleanCategory)} news category`
      : cleanTopic
        ? `topic "${cleanTopic}"`
        : cleanCategory
          ? `${toTitleCase(cleanCategory)} news coverage`
          : "today's top global news coverage";

  return [
    "You are writing a concise homepage briefing for a news aggregation app.",
    `Summarize the latest major developments for ${scope} using only the coverage notes below.`,
    'Return JSON only in the form {"headline":"...","summary":"...","suggestedTopics":["...","..."]}.',
    "Constraints:",
    "- headline: under 90 characters",
    "- summary: 3 to 5 sentences, maximum 850 characters total",
    "- when a story involves a settlement, lawsuit, resignation, firing, policy reversal, or other major decision, state the reason or allegation driving it, not just the outcome",
    "- state figures exactly as given in the coverage notes (full dollar amounts, counts, dates) — never shorten or drop part of a number",
    "- suggestedTopics: 5 to 7 short topic labels, each 1 to 3 words, ideal for a homepage topic rail",
    "- neutral, factual tone",
    "- no markdown, no bullets, no preamble",
    "- do not say that you lack browsing, real-time access, or external context",
    "",
    "Coverage notes:",
    buildCoverageContext(items),
  ].join("\n");
}

function sanitizeSuggestedTopics(values = [], fallbackItems = []) {
  const cleaned = [];
  const seen = new Set();

  const addTopic = (value = "") => {
    const topic = cleanText(value)
      .replace(/[|/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!topic) return;
    if (topic.length < 3 || topic.length > 32) return;
    if (topic.split(" ").length > 3) return;

    const lowered = topic.toLowerCase();
    if (seen.has(lowered)) return;

    seen.add(lowered);
    cleaned.push(topic);
  };

  if (Array.isArray(values)) {
    values.forEach((value) => addTopic(value));
  }

  if (cleaned.length >= 5) {
    return cleaned.slice(0, 7);
  }

  fallbackItems.forEach((item) => {
    const title = cleanText(item?.title || "");
    if (!title) return;

    title
      .split(/[:\-;,]|\band\b/i)
      .map((part) => cleanText(part))
      .filter(Boolean)
      .forEach((part) => {
        const compact = part
          .replace(/[^a-zA-Z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((token) => token.length > 2)
          .slice(0, 3)
          .join(" ");

        addTopic(compact);
      });
  });

  return cleaned.slice(0, 7);
}

function buildEditorialSummaryFromItems(
  { topic = "", category = "" } = {},
  items = [],
) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const leadItem = items[0] || {};
  const sources = collectSummarySources(items);
  const highlightLines = items
    .slice(0, 3)
    .map((item) => cleanText(item?.title || item?.description || ""))
    .filter(Boolean)
    .slice(0, 3);

  const scopeLabel = cleanText(topic)
    ? cleanText(topic)
    : cleanText(category)
      ? `${toTitleCase(category)} coverage`
      : "today's top coverage";

  const overview = highlightLines[0]
    ? truncateText(highlightLines[0], 180)
    : `The latest reporting signals around ${scopeLabel}.`;
  const followOn = highlightLines
    .slice(1)
    .map((line) => truncateText(line, 110))
    .join("; ");
  const sourceLine = sources.length > 0
    ? `Signals in this briefing come from ${sources.slice(0, 4).join(", ")}.`
    : "Signals in this briefing come from multiple reporting sources.";

  return {
    headline: cleanText(leadItem?.title || `Latest on ${scopeLabel}`),
    summary: capSummaryText(
      [
        overview,
        followOn ? `Related coverage includes ${followOn}.` : "",
        sourceLine,
      ]
        .filter(Boolean)
        .join(" "),
    ),
    suggestedTopics: sanitizeSuggestedTopics([], items),
    sources,
    sourceCount: sources.length,
    provider: "Editorial signal digest",
    timestamp: new Date().toISOString(),
    topic: cleanText(topic),
    category: cleanText(category),
    url: cleanText(leadItem?.link || leadItem?.url || ""),
    image: cleanText(leadItem?.image || ""),
    source: cleanText(leadItem?.source || ""),
    isFallback: true,
  };
}

async function generateAnthropicSummary({ topic = "", category = "" } = {}) {
  const apiKey = getConfigValue("ANTHROPIC_API_KEY");
  if (!apiKey) {
    logSummaryIssue("ANTHROPIC_API_KEY is missing");
    return null;
  }

  const items = await getLiveSummaryItems({ topic, category });
  if (items.length === 0) {
    logSummaryIssue("no live summary items were available");
    return null;
  }

  const model = getConfigValue("ANTHROPIC_SUMMARY_MODEL") || "claude-sonnet-5";
  const prompt = buildSummaryPrompt(topic, category, items);
  const leadItem = items[0] || {};

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = cleanText(await response.text().catch(() => ""));
      logSummaryIssue(
        `Anthropic request failed with status ${response.status}`,
        truncateText(
          errorText || response.statusText || "Unknown response error",
          260,
        ),
      );
      return null;
    }

    const payload = await response.json().catch(() => null);
    const text = cleanText(extractAnthropicTextBlocks(payload));
    if (!text) {
      logSummaryIssue("Anthropic response did not include any text blocks");
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      logSummaryIssue(
        "Anthropic response was not valid JSON",
        truncateText(text, 260),
      );
      return null;
    }

    const summary = capSummaryText(parsed?.summary || "");
    if (!summary) {
      logSummaryIssue("Anthropic JSON response did not include summary text");
      return null;
    }

    const suggestedTopics = sanitizeSuggestedTopics(
      parsed?.suggestedTopics,
      items,
    );
    const sources = collectSummarySources(items);

    return {
      headline: cleanText(parsed?.headline || leadItem?.title || ""),
      summary,
      suggestedTopics,
      sources,
      sourceCount: sources.length,
      provider: `Claude (${model})`,
      timestamp: new Date().toISOString(),
      topic: cleanText(topic),
      category: cleanText(category),
      url: cleanText(leadItem?.link || ""),
      image: cleanText(leadItem?.image || ""),
      source: cleanText(leadItem?.source || ""),
    };
  } catch (error) {
    logSummaryIssue(
      "Anthropic summary generation threw an exception",
      error?.message || "Unknown error",
    );
    return null;
  }
}

async function tryPersistGeneratedSummary(key, payload) {
  try {
    await setJson(STORE_NAMES.summaries, key, payload, {
      metadata: {
        topic: normalizePart(payload.topic) || "general",
        category: normalizePart(payload.category) || "general",
        provider: String(payload.provider || "Unknown").slice(0, 80),
      },
    });
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      throw error;
    }
  }
}

async function generateAndPersistSummary(
  key,
  { topic = "", category = "" } = {},
) {
  const generated = await generateAnthropicSummary({ topic, category });
  if (!generated) {
    return null;
  }

  const normalizedGenerated = normalizeSummaryPayload(generated);

  await tryPersistGeneratedSummary(key, {
    ...normalizedGenerated,
    persistedAt: new Date().toISOString(),
  });

  return normalizedGenerated;
}

function scheduleSummaryRefresh(key, request = {}) {
  if (inFlightSummaryRefreshes.has(key)) {
    return inFlightSummaryRefreshes.get(key);
  }

  const refreshPromise = generateAndPersistSummary(key, request)
    .catch((error) => {
      logSummaryIssue(
        "background summary refresh failed",
        error?.message || "Unknown error",
      );
      return null;
    })
    .finally(() => {
      inFlightSummaryRefreshes.delete(key);
    });

  inFlightSummaryRefreshes.set(key, refreshPromise);
  return refreshPromise;
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    const rateLimit = await enforceRateLimit(event, {
      scope: "shared-summary",
      maxRequests: 40,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, ...rateLimit.headers },
        body: JSON.stringify({ error: "Rate limit exceeded" }),
      };
    }
  }

  try {
    if (event.httpMethod === "GET") {
      const {
        topic = "",
        category = "",
        allowStale = "0",
        refresh = "0",
      } = event.queryStringParameters || {};
      const key = buildSummaryKey(topic, category);
      const shouldRefresh = String(refresh) === "1";
      let cached = null;
      let cacheUnavailable = false;

      try {
        cached = await getJsonWithMetadata(STORE_NAMES.summaries, key);
      } catch (error) {
        if (!isBlobConfigurationError(error)) {
          throw error;
        }
        cacheUnavailable = true;
      }

      const cachedData = cached?.data
        ? buildNormalizedCachedSummary(cached.data)
        : null;
      const staleAllowed = String(allowStale) === "1";

      if (
        !shouldRefresh &&
        cachedData &&
        isFresh(cached.data.timestamp, SUMMARY_TTL_MS)
      ) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            found: true,
            cached: true,
            key,
            data: cachedData,
            metadata: cached.metadata || null,
          }),
        };
      }

      if (
        !shouldRefresh &&
        staleAllowed &&
        cachedData &&
        isFresh(cached.data.timestamp, STALE_TTL_MS)
      ) {
        scheduleSummaryRefresh(key, { topic, category });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            found: true,
            cached: true,
            stale: true,
            refreshing: true,
            key,
            data: cachedData,
            metadata: cached.metadata || null,
          }),
        };
      }

      if (!shouldRefresh) {
        const liveItems = await getLiveSummaryItems({ topic, category });
        const editorialSummary = buildEditorialSummaryFromItems(
          { topic, category },
          liveItems,
        );

        if (editorialSummary) {
          scheduleSummaryRefresh(key, { topic, category });
          await tryPersistGeneratedSummary(key, {
            ...editorialSummary,
            persistedAt: new Date().toISOString(),
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              found: true,
              cached: false,
              immediate: true,
              refreshing: true,
              key,
              data: editorialSummary,
              metadata: null,
            }),
          };
        }
      }

      const generated = await generateAndPersistSummary(key, {
        topic,
        category,
      });
      if (generated) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            found: true,
            cached: false,
            key,
            data: generated,
            metadata: null,
          }),
        };
      }

      if (!cached || !cached.data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            found: false,
            key,
            unavailable: cacheUnavailable,
          }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          found: true,
          cached: true,
          stale: true,
          key,
          data: cachedData,
          metadata: cached.metadata || null,
        }),
      };
    }

    if (event.httpMethod === "POST") {
      const access = await requireAdminAccess(event);
      if (access.response) {
        return access.response;
      }

      const body = JSON.parse(event.body || "{}");
      const topic = body.topic || "";
      const category = body.category || "";
      const summary = body.summaryData || body.data;

      if (!summary || !summary.summary) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing summaryData.summary" }),
        };
      }

      const key = buildSummaryKey(topic, category);
      const payload = {
        ...summary,
        topic,
        category,
        summary: capSummaryText(summary.summary || ""),
        timestamp: summary.timestamp || new Date().toISOString(),
        persistedAt: new Date().toISOString(),
      };

      await tryPersistGeneratedSummary(key, payload);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ saved: true, key, data: payload }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    if (isBlobConfigurationError(error)) {
      return {
        statusCode: event.httpMethod === "GET" ? 404 : 503,
        headers,
        body: JSON.stringify({
          found: false,
          unavailable: true,
          error: "Netlify Blobs are not configured in this environment",
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
