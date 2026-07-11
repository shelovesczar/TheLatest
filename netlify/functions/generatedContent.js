const { STORE_NAMES, getJson, setJson, isBlobConfigurationError } = require('./blobStore');
const rssAggregator = require('./rss-aggregator');
const { enforceRateLimit } = require('./rateLimit');
const { saveStorySnapshot } = require('./storySnapshot');
const fs = require('fs');
const path = require('path');

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_COUNT_BY_TYPE = {
  news: 12,
  opinions: 8,
  videos: 8,
  podcasts: 8
};

const DEFAULT_IMAGE_BY_CATEGORY = {
  politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=700&fit=crop',
  technology: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=700&fit=crop',
  business: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=700&fit=crop',
  entertainment: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=700&fit=crop',
  sports: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=700&fit=crop',
  health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=700&fit=crop',
  science: 'https://images.unsplash.com/photo-1516849677043-ef67c9557e16?w=1200&h=700&fit=crop',
  climate: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=1200&h=700&fit=crop',
  environment: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=1200&h=700&fit=crop',
  general: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=700&fit=crop'
};

let localEnvCache = null;

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizePart(value = '') {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function stableHash(value = '') {
  const source = String(value || '');
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function readLocalEnvValue(name = '') {
  if (localEnvCache === null) {
    localEnvCache = {};
    const candidatePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '..', '..', '.env')
    ];

    for (const envPath of candidatePaths) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content
          .split(/\r?\n/)
          .filter(Boolean)
          .forEach((line) => {
            const trimmed = String(line || '').trim();
            if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
            const separatorIndex = trimmed.indexOf('=');
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

  return cleanText(localEnvCache[name] || '');
}

function getConfigValue(name = '') {
  return cleanText(process.env[name] || '') || readLocalEnvValue(name);
}

function extractAnthropicTextBlocks(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function truncateText(value = '', max = 220) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim().replace(/[,:;-]+$/, '')}...`;
}

function parseRequest(event = {}) {
  const query = event?.queryStringParameters || {};
  const requestedType = normalizePart(query.type || 'news');
  const type = ['news', 'opinions', 'videos', 'podcasts'].includes(requestedType) ? requestedType : 'news';
  const topic = cleanText(query.topic || query.search || '');
  const category = normalizePart(query.category || '');
  const requestedCount = Number.parseInt(query.count, 10);
  const count = Number.isNaN(requestedCount)
    ? DEFAULT_COUNT_BY_TYPE[type]
    : Math.max(1, Math.min(requestedCount, 20));

  return {
    id: cleanText(query.id || ''),
    type,
    topic,
    category,
    count
  };
}

function buildRequestKey({ type, topic = '', category = '', count = 0 }) {
  return `requests/${type}/${normalizePart(category) || 'general'}/${normalizePart(topic) || 'general'}/${count || DEFAULT_COUNT_BY_TYPE[type] || 8}`;
}

function buildItemKey(id = '') {
  return `items/${cleanText(id)}`;
}

function isFresh(timestamp, ttlMs = CACHE_TTL_MS) {
  const parsed = Date.parse(timestamp || '');
  if (Number.isNaN(parsed)) return false;
  return (Date.now() - parsed) < ttlMs;
}

function getFallbackImage(category = '', type = 'news') {
  const normalizedCategory = normalizePart(category);
  if (DEFAULT_IMAGE_BY_CATEGORY[normalizedCategory]) {
    return DEFAULT_IMAGE_BY_CATEGORY[normalizedCategory];
  }

  if (type === 'videos') {
    return 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&h=700&fit=crop';
  }

  if (type === 'podcasts') {
    return 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&h=700&fit=crop';
  }

  return DEFAULT_IMAGE_BY_CATEGORY.general;
}

function toTitleCase(value = '') {
  return cleanText(value)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildCoverageContext(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'No live RSS coverage notes were available. Create clearly labeled fallback briefings without inventing specific breaking facts.';
  }

  return items
    .slice(0, 8)
    .map((item, index) => {
      const title = truncateText(item?.title || '', 140);
      const source = truncateText(item?.source || item?.category || 'Unknown Source', 50);
      const description = truncateText(item?.description || item?.content || '', 220);
      return `${index + 1}. Source: ${source}\nTitle: ${title}\nDetail: ${description || 'No additional detail provided.'}`;
    })
    .join('\n\n');
}

async function fetchAggregatorItems(params = {}) {
  try {
    const response = await rssAggregator.handler({
      httpMethod: 'GET',
      queryStringParameters: params
    }, {});

    if (response?.statusCode !== 200) {
      return [];
    }

    const payload = JSON.parse(response.body || '{}');
    return Array.isArray(payload?.data) ? payload.data.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function getCoverageItems({ type, topic, category }) {
  const requestSets = [
    { type, ...(category ? { category } : {}), ...(topic ? { search: topic, strictSearch: '0', relaxSearchFallback: '1', minStrictResults: '4' } : {}) }
  ];

  if (type !== 'news') {
    requestSets.push({
      type: 'news',
      ...(category ? { category } : {}),
      ...(topic ? { search: topic, strictSearch: '0', relaxSearchFallback: '1', minStrictResults: '4' } : {}) }
    );
  }

  if (topic) {
    requestSets.push({ type, ...(category ? { category } : {}) });
  }

  const settled = await Promise.allSettled(requestSets.map((params) => fetchAggregatorItems(params)));
  const merged = [];
  const seen = new Set();

  settled.forEach((result) => {
    if (result.status !== 'fulfilled') return;

    result.value.forEach((item) => {
      const key = cleanText(item?.link || item?.url || `${item?.source || ''}|${item?.title || ''}`).toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
  });

  return merged.slice(0, 8);
}

function buildPrompt({ type, topic, category, count, items }) {
  const categoryLabel = category ? toTitleCase(category) : 'General';
  const scope = topic
    ? `the topic "${topic}"`
    : `${categoryLabel} coverage`;

  const typeInstructions = {
    news: 'Create concise news briefings that read like original aggregation copy, not copied source articles.',
    opinions: 'Create clearly labeled analysis or opinion-style briefings with a point of view, but avoid pretending to be a real columnist or publication.',
    videos: 'Create watch-list style video briefing cards that summarize what a viewer would expect to learn from an on-site explainer.',
    podcasts: 'Create listen-list style podcast briefing cards that summarize what a listener would expect to hear in an on-site audio-style explainer.'
  };

  return [
    'You create fallback content for The Latest when RSS feeds are temporarily empty or too thin.',
    `Generate ${count} ${type} items about ${scope}.`,
    typeInstructions[type] || typeInstructions.news,
    'Use the coverage notes below when available.',
    'If the notes are sparse, write durable explainers or what-to-watch briefings instead of inventing unverified breaking developments.',
    'Every item must be honest that it is an original The Latest briefing, not a republished source story.',
    'Return JSON only in the form {"items":[{"title":"","description":"","content":"","sourceLabel":"","author":"","hosts":"","duration":"","categoryLabel":""}]}.',
    'Constraints:',
    '- title under 110 characters',
    '- description under 180 characters',
    '- content 2 to 4 short paragraphs, under 1100 characters',
    '- sourceLabel should make clear this is a The Latest / Claude fallback briefing',
    '- for opinions include author',
    '- for videos include duration like 4:20',
    '- for podcasts include hosts',
    '- categoryLabel should reflect the topic or category when possible',
    '- no markdown, no bullets outside JSON, no preamble',
    '',
    'Coverage notes:',
    buildCoverageContext(items)
  ].join('\n');
}

function normalizeGeneratedItems(rawItems = [], request = {}, provider = 'Claude') {
  const categoryLabel = request.category ? toTitleCase(request.category) : 'News';
  const fallbackSourceByType = {
    news: 'The Latest Claude Briefing',
    opinions: 'The Latest Claude Analysis',
    videos: 'The Latest Claude Video Briefing',
    podcasts: 'The Latest Claude Podcast Briefing'
  };

  return (Array.isArray(rawItems) ? rawItems : [])
    .slice(0, request.count || DEFAULT_COUNT_BY_TYPE[request.type] || 8)
    .map((item, index) => {
      const title = truncateText(item?.title || `${toTitleCase(request.topic || request.category || request.type)} briefing`, 110);
      const description = truncateText(item?.description || item?.content || `${title} from The Latest.`, 180);
      const content = truncateText(item?.content || description, 1100);
      const generatedId = `${request.type}-${stableHash(`${request.type}|${request.category}|${request.topic}|${title}|${index}`)}`;
      const fallbackUrl = `https://fallback.thelatest.local/generated/${request.type}/${generatedId}`;

      return {
        generatedId,
        title,
        description,
        content,
        source: cleanText(item?.sourceLabel || fallbackSourceByType[request.type] || 'The Latest Claude Briefing'),
        author: cleanText(item?.author || item?.sourceLabel || 'The Latest Desk'),
        hosts: cleanText(item?.hosts || item?.author || 'The Latest Desk'),
        duration: cleanText(item?.duration || (request.type === 'videos' ? `${4 + (index % 4)}:${index % 2 === 0 ? '12' : '48'}` : '')),
        category: cleanText(item?.categoryLabel || request.topic || categoryLabel || 'News'),
        type: request.type === 'opinions'
          ? 'opinion'
          : request.type === 'videos'
            ? 'video'
            : request.type === 'podcasts'
              ? 'podcast'
              : 'news',
        image: getFallbackImage(request.category || request.topic || '', request.type),
        url: fallbackUrl,
        link: fallbackUrl,
        publishedAt: new Date(Date.now() - (index * 60 * 60 * 1000)).toISOString(),
        provider,
        isGenerated: true,
        fallbackLabel: 'AI fallback briefing',
        contentKind: request.type
      };
    })
    .filter((item) => item.title && item.description);
}

async function readCachedRequestPayload(key = '') {
  try {
    const cached = await getJson(STORE_NAMES.generated, key);
    if (!cached || !Array.isArray(cached.items)) return null;
    if (isFresh(cached.timestamp)) return cached;
    return cached;
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn('[generatedContent] failed to read cached request payload:', error.message);
    }
    return null;
  }
}

async function writeCachedPayload(key = '', payload = {}) {
  try {
    await setJson(STORE_NAMES.generated, key, payload);
    const items = Array.isArray(payload.items) ? payload.items : [];
    await Promise.allSettled(items.map(async (item) => {
      await setJson(STORE_NAMES.generated, buildItemKey(item.generatedId), item);
      await saveStorySnapshot(item);
    }));
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn('[generatedContent] failed to cache generated payload:', error.message);
    }
  }
}

async function readGeneratedItem(id = '') {
  if (!id) return null;

  try {
    const item = await getJson(STORE_NAMES.generated, buildItemKey(id));
    return item && typeof item === 'object' ? item : null;
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn('[generatedContent] failed to read cached generated item:', error.message);
    }
    return null;
  }
}

async function generateWithAnthropic(request = {}) {
  const apiKey = getConfigValue('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return { items: [], provider: null };
  }

  const items = await getCoverageItems(request);
  const model = getConfigValue('ANTHROPIC_CONTENT_FALLBACK_MODEL') || getConfigValue('ANTHROPIC_SUMMARY_MODEL') || 'claude-sonnet-5';
  const prompt = buildPrompt({ ...request, items });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      return { items: [], provider: null };
    }

    const payload = await response.json().catch(() => null);
    const text = cleanText(extractAnthropicTextBlocks(payload));
    if (!text) {
      return { items: [], provider: null };
    }

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return { items: [], provider: null };
    }

    return {
      items: normalizeGeneratedItems(parsed?.items, request, `Claude (${model})`),
      provider: `Claude (${model})`
    };
  } catch {
    return { items: [], provider: null };
  }
}

function buildStaticFallbackItems(request = {}) {
  const topicLabel = cleanText(request.topic || toTitleCase(request.category || request.type || 'news'));
  const provider = 'Editorial fallback';

  const baseByType = {
    news: [
      `What changed around ${topicLabel}`,
      `Why ${topicLabel} still matters`,
      `The main questions around ${topicLabel}`
    ],
    opinions: [
      `${topicLabel}: the argument readers are weighing`,
      `${topicLabel}: the strongest case for caution`,
      `${topicLabel}: what critics and supporters are missing`
    ],
    videos: [
      `${topicLabel}: video briefing`,
      `${topicLabel}: key clips to understand the story`,
      `${topicLabel}: visual explainer`
    ],
    podcasts: [
      `${topicLabel}: podcast briefing`,
      `${topicLabel}: the five-minute listen`,
      `${topicLabel}: what to hear next`
    ]
  };

  const rawItems = (baseByType[request.type] || baseByType.news).map((title, index) => ({
    title,
    description: `A fallback ${request.type.slice(0, -1) || 'news'} briefing generated to keep ${topicLabel} coverage available while upstream feeds recover.`,
    content: `${topicLabel} does not have enough live RSS items right now, so this fallback briefing keeps the page usable. It is designed to summarize the main stakes, the open questions, and the next angles readers should watch while fresh feed coverage catches up.`,
    sourceLabel: `The Latest ${provider}`,
    author: request.type === 'opinions' ? 'The Latest Desk' : '',
    hosts: request.type === 'podcasts' ? 'The Latest Desk' : '',
    duration: request.type === 'videos' ? `${4 + index}:15` : '',
    categoryLabel: cleanText(request.topic || request.category || 'News')
  }));

  return normalizeGeneratedItems(rawItems, request, provider);
}

async function resolveGeneratedItems(request = {}) {
  const cacheKey = buildRequestKey(request);
  const cached = await readCachedRequestPayload(cacheKey);

  if (cached && isFresh(cached.timestamp)) {
    return cached;
  }

  const generated = await generateWithAnthropic(request);
  const items = generated.items.length > 0 ? generated.items : buildStaticFallbackItems(request);
  const payload = {
    request,
    provider: generated.provider || 'Editorial fallback',
    timestamp: new Date().toISOString(),
    items
  };

  await writeCachedPayload(cacheKey, payload);
  return payload;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: jsonHeaders(), body: '' };
  }

  const rateLimit = await enforceRateLimit(event, {
    scope: 'generated-content',
    maxRequests: 30,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: { ...jsonHeaders(), ...rateLimit.headers },
      body: JSON.stringify({ error: 'Rate limit exceeded' })
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: jsonHeaders(),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const request = parseRequest(event);

  if (request.id) {
    const item = await readGeneratedItem(request.id);
    if (!item) {
      return {
        statusCode: 404,
        headers: jsonHeaders(),
        body: JSON.stringify({ error: 'Generated item not found' })
      };
    }

    return {
      statusCode: 200,
      headers: { ...jsonHeaders(), ...rateLimit.headers },
      body: JSON.stringify(item)
    };
  }

  const payload = await resolveGeneratedItems(request);
  return {
    statusCode: 200,
    headers: { ...jsonHeaders(), ...rateLimit.headers },
    body: JSON.stringify(payload)
  };
};