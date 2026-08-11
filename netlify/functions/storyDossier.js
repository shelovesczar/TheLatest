const rssAggregator = require("./rss-aggregator");
const clusters = require("./clusters");
const socialFeeds = require("./fetchSocialFeeds");

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

function normalizeCategoryHint(value = "") {
  const normalized = cleanText(value).toLowerCase();

  if (!normalized || normalized === "news" || normalized === "top stories")
    return "news";
  if (normalized.includes("politic")) return "politics";
  if (normalized.includes("tech")) return "tech";
  if (normalized.includes("business")) return "business";
  if (normalized.includes("sport")) return "sports";
  if (normalized.includes("entertain")) return "entertainment";
  if (normalized.includes("culture")) return "culture";
  if (normalized.includes("life")) return "lifestyle";
  return "news";
}

function buildDossierQuery(article = {}) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "what",
    "when",
    "where",
    "about",
    "after",
    "before",
    "amid",
    "over",
    "into",
    "under",
    "while",
    "their",
    "there",
    "have",
    "will",
    "would",
    "could",
    "should",
  ]);

  const title = cleanText(article.title || "")
    .split(/[:|–—]/)[0]
    .trim();

  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));

  return tokens.slice(0, 7).join(" ") || cleanText(article.source || "news");
}

function normalizeStoryKey(item = {}) {
  return cleanText(item?.url || item?.link || item?.title || "").toLowerCase();
}

function dedupeItems(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const key = normalizeStoryKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function excludeCurrentStory(items = [], article = {}) {
  const currentKey = normalizeStoryKey(article);
  const currentTitle = cleanText(article?.title || "").toLowerCase();

  return dedupeItems(items).filter((item) => {
    const itemKey = normalizeStoryKey(item);
    const itemTitle = cleanText(item?.title || "").toLowerCase();

    if (currentKey && itemKey && currentKey === itemKey) return false;
    if (currentTitle && itemTitle && currentTitle === itemTitle) return false;
    return true;
  });
}

function mapTypeToContentKind(type = "") {
  switch (cleanText(type).toLowerCase()) {
    case "opinions":
      return "opinion";
    case "videos":
      return "video";
    case "podcasts":
      return "podcast";
    default:
      return "news";
  }
}

function normalizeTypedItem(item = {}, fallbackType = "news") {
  const contentKind =
    cleanText(
      item.contentKind || item.type || mapTypeToContentKind(fallbackType),
    ).toLowerCase() || mapTypeToContentKind(fallbackType);
  return {
    ...item,
    url: cleanText(item.url || item.link || ""),
    link: cleanText(item.link || item.url || ""),
    title: cleanText(item.title || ""),
    description: cleanText(item.description || ""),
    content: cleanText(item.content || ""),
    source: cleanText(item.source || item.siteName || ""),
    author: cleanText(item.author || ""),
    category: cleanText(item.category || ""),
    hosts: cleanText(item.hosts || item.author || item.source || ""),
    duration: cleanText(item.duration || ""),
    contentKind,
    type: contentKind,
  };
}

async function parseHandlerBody(responsePromise) {
  const response = await responsePromise;
  const body = JSON.parse(response?.body || "{}");

  if (response?.statusCode && response.statusCode >= 400) {
    throw new Error(body?.error || "Request failed");
  }

  return body;
}

async function fetchTypedFeed({ type, category, search }) {
  const payload = await parseHandlerBody(
    rssAggregator.handler(
      {
        httpMethod: "GET",
        queryStringParameters: {
          type,
          ...(category ? { category } : {}),
          ...(search
            ? {
                search,
                strictSearch: "0",
                relaxSearchFallback: "1",
                minStrictResults: "4",
              }
            : {}),
        },
      },
      {},
    ),
  );

  return (Array.isArray(payload?.data) ? payload.data : []).map((item) =>
    normalizeTypedItem(item, type),
  );
}

async function fetchClusters({ category, search }) {
  const payload = await parseHandlerBody(
    clusters.handler(
      {
        httpMethod: "GET",
        queryStringParameters: {
          type: "news",
          ...(category ? { category } : {}),
          ...(search ? { search } : {}),
          limit: "6",
        },
      },
      {},
    ),
  );

  return (Array.isArray(payload?.clusters) ? payload.clusters : []).map(
    (cluster) => ({
      ...cluster,
      sources: (Array.isArray(cluster?.sources) ? cluster.sources : []).map(
        (story) => normalizeTypedItem(story, "news"),
      ),
    }),
  );
}

async function fetchSocial({ search }) {
  const payload = await parseHandlerBody(
    socialFeeds.handler(
      {
        httpMethod: "GET",
        queryStringParameters: {
          topic: search,
          limit: "6",
        },
      },
      {},
    ),
  );

  return Array.isArray(payload?.data) ? payload.data : [];
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const article = {
      title: cleanText(event.queryStringParameters?.title || ""),
      source: cleanText(event.queryStringParameters?.source || ""),
      category: cleanText(event.queryStringParameters?.category || ""),
      url: cleanText(event.queryStringParameters?.url || ""),
      link: cleanText(event.queryStringParameters?.url || ""),
    };

    if (!article.title && !article.source) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing article context" }),
      };
    }

    const query = buildDossierQuery(article);
    const categoryHint = normalizeCategoryHint(article.category);

    const [
      newsResult,
      opinionResult,
      videoResult,
      podcastResult,
      clusterResult,
      socialResult,
    ] = await Promise.allSettled([
      fetchTypedFeed({ type: "news", category: categoryHint, search: query }),
      fetchTypedFeed({
        type: "opinions",
        category: categoryHint,
        search: query,
      }),
      fetchTypedFeed({ type: "videos", category: categoryHint, search: query }),
      fetchTypedFeed({
        type: "podcasts",
        category: categoryHint,
        search: query,
      }),
      fetchClusters({ category: categoryHint, search: query }),
      fetchSocial({ search: query }),
    ]);

    const news = newsResult.status === "fulfilled" ? newsResult.value : [];
    const opinions =
      opinionResult.status === "fulfilled" ? opinionResult.value : [];
    const videos = videoResult.status === "fulfilled" ? videoResult.value : [];
    const podcasts =
      podcastResult.status === "fulfilled" ? podcastResult.value : [];
    const clustersData =
      clusterResult.status === "fulfilled" ? clusterResult.value : [];
    const social =
      socialResult.status === "fulfilled" ? socialResult.value : [];

    const clusterCoverage = excludeCurrentStory(
      clustersData.flatMap((cluster) =>
        Array.isArray(cluster?.sources) ? cluster.sources : [],
      ),
      article,
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        query,
        category: categoryHint,
        coverage: dedupeItems([
          ...clusterCoverage,
          ...excludeCurrentStory(news, article),
        ]).slice(0, 8),
        clusters: Array.isArray(clustersData) ? clustersData.slice(0, 4) : [],
        opinions: excludeCurrentStory(opinions, article).slice(0, 4),
        videos: excludeCurrentStory(videos, article).slice(0, 4),
        podcasts: excludeCurrentStory(podcasts, article).slice(0, 4),
        social: Array.isArray(social) ? social.slice(0, 4) : [],
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
