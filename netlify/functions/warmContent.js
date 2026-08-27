const { getJson, setJson } = require("./blobStore");
const { jsonHeaders, requireAdminAccess } = require("./adminAccess");
const rssAggregator = require("./rss-aggregator.cjs");

const SUMMARY_TARGETS = [
  { category: "", label: "Top Stories", sourceCategory: null },
  { category: "politics", label: "Politics", sourceCategory: null },
  { category: "tech", label: "Tech", sourceCategory: "tech" },
  { category: "business", label: "Business", sourceCategory: "business" },
  { category: "sports", label: "Sports", sourceCategory: "sports" },
  {
    category: "entertainment",
    label: "Entertainment",
    sourceCategory: "entertainment",
  },
  { category: "lifestyle", label: "Lifestyle", sourceCategory: "lifestyle" },
  { category: "culture", label: "Culture", sourceCategory: "culture" },
];

// All 11 feedKeys in RSS_FEEDS — previously only 7 were warmed hourly.
const WARM_FEED_KEYS = [
  "news",
  "politics",
  "opinions",
  "videos",
  "podcasts",
  "sports",
  "tech",
  "entertainment",
  "business",
  "lifestyle",
  "culture",
];

// warmContent is a plain synchronous scheduled function, not a -background
// function — a small bounded-concurrency pool keeps total wall time close to
// the slowest single item instead of the sum of all of them, while avoiding
// firing every category's fetches at once against upstream RSS hosts.
async function mapWithConcurrency(items, worker, concurrency = 4) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runNext() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runNext),
  );
  return results;
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

// sharedSummary.js writes real Claude-backed summaries to this exact same
// Blobs key/store — this hourly job's plain-template fallback must never
// clobber a still-fresh real summary, or the AI Daily Briefing can get stuck
// showing this fallback text indefinitely (each overwrite resets the
// freshness window sharedSummary.js checks before deciding to call Claude).
const SUMMARY_FRESHNESS_MS = 55 * 60 * 1000; // just under sharedSummary's 60-min TTL

function isRealSummaryStillFresh(existing) {
  if (!existing || !existing.timestamp) return false;
  if (existing.isFallback === true) return false;
  if (String(existing.provider || "").toLowerCase().includes("editorial")) {
    return false;
  }

  const parsed = Date.parse(existing.timestamp);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed < SUMMARY_FRESHNESS_MS;
}

function extractTopItems(items = [], limit = 4) {
  return Array.isArray(items) ? items.filter(Boolean).slice(0, limit) : [];
}

function buildSummaryText(items = [], label = "Top Stories") {
  const topItems = extractTopItems(items, 4);
  if (topItems.length === 0) {
    return `${label} coverage is being refreshed now. Check back shortly for the latest editorial summary.`;
  }

  const lead = topItems[0];
  const followUps = topItems.slice(1, 4);
  const paragraphOne = `${lead.title} leads the latest ${label.toLowerCase()} cycle, with ${lead.source || "major outlets"} driving fresh coverage and new angles.`;
  const paragraphTwo =
    followUps.length > 0
      ? `Also developing: ${followUps.map((item) => item.title).join(" ")}.`
      : `Editors are tracking additional developments across ${label.toLowerCase()} coverage as the story set evolves.`;

  return `${paragraphOne}\n\n${paragraphTwo}`;
}

async function invokeAggregator(type, category) {
  const response = await rssAggregator.handler(
    {
      httpMethod: "GET",
      queryStringParameters: {
        type,
        ...(category ? { category } : {}),
      },
    },
    {},
  );

  const body = JSON.parse(response.body || "{}");
  return Array.isArray(body.data) ? body.data : [];
}

async function warmSummaries() {
  await mapWithConcurrency(
    SUMMARY_TARGETS,
    async (target) => {
      const key = buildSummaryKey("", target.category);
      const existing = await getJson("shared-ai-summaries", key);
      if (isRealSummaryStillFresh(existing)) {
        return; // don't stomp a still-fresh, real (non-fallback) summary
      }

      const items = await invokeAggregator("news", target.sourceCategory);
      const timestamp = new Date().toISOString();
      const summaryData = {
        summary: buildSummaryText(items, target.label),
        headline: `${target.label}: Editor's Brief`,
        provider: "Editorial Cache",
        timestamp,
        url: target.category
          ? `/category/${target.category}`
          : "/category/top-stories",
      };

      await setJson(
        "shared-ai-summaries",
        key,
        summaryData,
        {
          metadata: {
            category: normalizePart(target.category) || "general",
            provider: "Editorial Cache",
            warmedAt: timestamp,
          },
        },
      );
    },
    4,
  );
}

async function runWarmContent() {
  const [categoryResults] = await Promise.all([
    mapWithConcurrency(
      WARM_FEED_KEYS,
      (feedKey) => rssAggregator.runCategoryWarmFetch(feedKey),
      4,
    ),
    warmSummaries(),
  ]);

  return {
    warmed: true,
    timestamp: new Date().toISOString(),
    categories: categoryResults,
  };
}

exports.runWarmContent = runWarmContent;
exports.runWarmSummaries = warmSummaries;

exports.handler = async (event) => {
  const access = await requireAdminAccess(event || {});
  if (access.response) {
    return access.response;
  }

  const payload = await runWarmContent();

  return {
    statusCode: 200,
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  };
};
