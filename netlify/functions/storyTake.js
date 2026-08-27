/**
 * storyTake — Netlify Function
 *
 * "The Latest's Take": a short, original synthesis of how multiple outlets
 * are covering the same story, built from the Story Dossier's cross-outlet
 * coverage (never from full scraped article text). This is deliberately
 * NOT a rewrite of any single article -- it only runs when at least two
 * distinct outlets are covering the story, and the prompt explicitly
 * instructs against paraphrasing any one source. If there isn't enough
 * cross-outlet signal, or no model is configured, this returns
 * { take: null } and the client simply doesn't show the section.
 */

const {
  STORE_NAMES,
  getJson,
  setJson,
  isBlobConfigurationError,
} = require("./blobStore");
const { enforceRateLimit } = require("./rateLimit");
const storyDossier = require("./storyDossier");
const fs = require("fs");
const path = require("path");

const CACHE_TTL_MS = 45 * 60 * 1000;
const MIN_DISTINCT_SOURCES = 2;
const MAX_CONTEXT_SOURCES = 6;

let localEnvCache = null;

function jsonHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value = "", max = 200) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text
    .slice(0, max)
    .trim()
    .replace(/[,:;-]+$/, "")}...`;
}

function normalizePart(value = "") {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stableHash(value = "") {
  const source = String(value || "");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

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
  return cleanText(process.env[name] || "") || readLocalEnvValue(name);
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

function isFresh(timestamp, ttlMs = CACHE_TTL_MS) {
  const parsed = Date.parse(timestamp || "");
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < ttlMs;
}

async function parseHandlerBody(responsePromise) {
  const response = await responsePromise;
  const body = JSON.parse(response?.body || "{}");

  if (response?.statusCode && response.statusCode >= 400) {
    throw new Error(body?.error || "Request failed");
  }

  return body;
}

function buildTakeCacheKey(query = "", category = "") {
  return `takes/${normalizePart(category) || "news"}/${normalizePart(query) || stableHash(query)}`;
}

// Cross-outlet context, deduped by outlet name (not by story) so the model
// always sees genuinely distinct sources rather than several items from the
// same outlet's own coverage cluster.
function buildTakeContext(dossier = {}) {
  const fromClusters = (
    Array.isArray(dossier.clusters) ? dossier.clusters : []
  ).flatMap((cluster) => (Array.isArray(cluster?.sources) ? cluster.sources : []));
  const fromCoverage = Array.isArray(dossier.coverage) ? dossier.coverage : [];
  const combined = [...fromClusters, ...fromCoverage];

  const seenSources = new Set();
  const items = [];

  for (const item of combined) {
    const sourceName = cleanText(item?.source || item?.siteName || "");
    if (!sourceName || seenSources.has(sourceName)) continue;
    seenSources.add(sourceName);

    items.push({
      source: sourceName,
      title: truncateText(item?.title || "", 140),
      description: truncateText(item?.description || item?.content || "", 200),
    });

    if (items.length >= MAX_CONTEXT_SOURCES) break;
  }

  return items;
}

function buildTakePrompt({ title, contextItems }) {
  const contextBlock = contextItems
    .map(
      (item, index) =>
        `${index + 1}. ${item.source}: "${item.title}" — ${item.description || "No additional detail provided."}`,
    )
    .join("\n");

  return [
    'You write "The Latest\'s Take" -- a short, original synthesis that helps a reader understand how multiple outlets are covering the same story right now.',
    "This must be your own original analysis. Do not closely paraphrase any single source's sentences, structure, or distinctive phrasing -- synthesize and compare across the outlets below instead.",
    `Story: "${truncateText(title, 160)}"`,
    "",
    "Coverage notes from multiple outlets (titles and short descriptions only):",
    contextBlock,
    "",
    "Write an 80-120 word synthesis that:",
    "- Notes what is broadly agreed on across these outlets, and where framing or emphasis differs if apparent.",
    "- Adds comparison or context value beyond restating any single headline.",
    '- Names 2-3 of the specific outlets whose coverage informed this (e.g. "per NPR and Reuters").',
    "- Reads clearly as The Latest's own original analysis, not a copy of any outlet's reporting.",
    "",
    'Return JSON only in the form {"take":"...","citedSources":["Outlet A","Outlet B"]}. No markdown, no preamble.',
  ].join("\n");
}

async function generateTakeWithAnthropic({ title, contextItems }) {
  const apiKey = getConfigValue("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const model =
    getConfigValue("ANTHROPIC_TAKE_MODEL") ||
    getConfigValue("ANTHROPIC_SUMMARY_MODEL") ||
    "claude-sonnet-5";
  const prompt = buildTakePrompt({ title, contextItems });

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
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json().catch(() => null);
    const text = cleanText(extractAnthropicTextBlocks(payload));
    if (!text) return null;

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      return null;
    }

    const take = cleanText(parsed?.take || "");
    if (!take) return null;

    const citedSources = Array.isArray(parsed?.citedSources)
      ? parsed.citedSources.map(cleanText).filter(Boolean).slice(0, 4)
      : [];

    return { take, citedSources, provider: `Claude (${model})` };
  } catch {
    return null;
  }
}

async function readCachedTake(key = "") {
  try {
    return await getJson(STORE_NAMES.storyTakes, key);
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn("[storyTake] failed to read cached take:", error.message);
    }
    return null;
  }
}

async function writeCachedTake(key = "", payload = {}) {
  try {
    await setJson(STORE_NAMES.storyTakes, key, payload);
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn("[storyTake] failed to cache take:", error.message);
    }
  }
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const rateLimit = await enforceRateLimit(event, {
    scope: "story-take",
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

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const title = cleanText(event.queryStringParameters?.title || "");
  const source = cleanText(event.queryStringParameters?.source || "");
  const category = cleanText(event.queryStringParameters?.category || "");
  const url = cleanText(event.queryStringParameters?.url || "");

  if (!title) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing article title" }),
    };
  }

  try {
    const dossier = await parseHandlerBody(
      storyDossier.handler(
        {
          httpMethod: "GET",
          queryStringParameters: { title, source, category, url },
        },
        {},
      ),
    );

    const query = cleanText(dossier?.query || title);
    const resolvedCategory = cleanText(dossier?.category || category);
    const cacheKey = buildTakeCacheKey(query, resolvedCategory);

    const cached = await readCachedTake(cacheKey);
    if (cached && isFresh(cached.timestamp)) {
      return {
        statusCode: 200,
        headers: { ...headers, ...rateLimit.headers },
        body: JSON.stringify(cached),
      };
    }

    const contextItems = buildTakeContext(dossier);
    const uniqueSources = new Set(contextItems.map((item) => item.source));

    if (uniqueSources.size < MIN_DISTINCT_SOURCES) {
      const payload = {
        take: null,
        reason: "insufficient-cross-outlet-coverage",
        query,
        timestamp: new Date().toISOString(),
      };
      await writeCachedTake(cacheKey, payload);
      return {
        statusCode: 200,
        headers: { ...headers, ...rateLimit.headers },
        body: JSON.stringify(payload),
      };
    }

    const generated = await generateTakeWithAnthropic({ title, contextItems });

    const payload = generated
      ? {
          take: generated.take,
          citedSources: generated.citedSources,
          provider: generated.provider,
          query,
          timestamp: new Date().toISOString(),
        }
      : {
          take: null,
          reason: "generation-unavailable",
          query,
          timestamp: new Date().toISOString(),
        };

    await writeCachedTake(cacheKey, payload);

    return {
      statusCode: 200,
      headers: { ...headers, ...rateLimit.headers },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
