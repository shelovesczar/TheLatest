const rssAggregator = require('./rss-aggregator');
const { enforceRateLimit } = require('./rateLimit');
const fs = require('fs');
const path = require('path');

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateText(value = '', max = 220) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim().replace(/[,:;-]+$/, '')}...`;
}

function extractAnthropicTextBlocks(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

let localEnvCache = null;

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
  const localValue = readLocalEnvValue(name);
  if (localValue) return localValue;
  return cleanText(process.env[name] || '');
}

function sanitizeShortList(values = [], { min = 2, max = 40, maxWords = 5, limit = 6 } = {}) {
  const cleaned = [];
  const seen = new Set();

  const addValue = (value = '') => {
    const item = cleanText(value)
      .replace(/[|/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!item) return;
    if (item.length < min || item.length > max) return;
    if (item.split(' ').length > maxWords) return;

    const lowered = item.toLowerCase();
    if (seen.has(lowered)) return;

    seen.add(lowered);
    cleaned.push(item);
  };

  if (Array.isArray(values)) {
    values.forEach((value) => addValue(value));
  }

  return cleaned.slice(0, limit);
}

async function getLiveSearchItems(query = '') {
  const response = await rssAggregator.handler({
    httpMethod: 'GET',
    queryStringParameters: {
      type: 'news',
      search: cleanText(query),
      strictSearch: '0',
      relaxSearchFallback: '1',
      minStrictResults: '4'
    }
  }, {});

  if (response?.statusCode !== 200) {
    return [];
  }

  const payload = JSON.parse(response.body || '{}');
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.filter(Boolean).slice(0, 8);
}

function buildCoverageContext(items = []) {
  return items
    .map((item, index) => {
      const title = truncateText(item?.title || '', 140);
      const source = truncateText(item?.source || item?.category || 'Unknown Source', 40);
      const description = truncateText(item?.description || item?.content || '', 180);

      return `${index + 1}. Source: ${source}\nTitle: ${title}\nDetail: ${description || 'No additional detail provided.'}`;
    })
    .join('\n\n');
}

function buildPrompt(query = '', items = []) {
  const cleanQuery = cleanText(query);
  const hasItems = Array.isArray(items) && items.length > 0;

  return [
    'You are improving internal search for a news aggregation app.',
    `A user searched for: "${cleanQuery}".`,
    hasItems
      ? 'Use the article notes below to infer nearby topics and better in-app search angles.'
      : 'Infer nearby topics and better in-app search angles from the query alone.',
    'Return JSON only in the form {"normalizedQuery":"...","topicBrief":"...","suggestedTopics":["..."],"searchPhrases":["..."]}.',
    'Constraints:',
    '- normalizedQuery: concise version of the user intent, under 80 characters',
    '- topicBrief: one sentence, under 140 characters',
    '- suggestedTopics: 4 to 6 likely follow-up topics users may want to search, each 1 to 4 words',
    '- searchPhrases: 3 to 5 short in-app search phrases, each 2 to 5 words',
    '- neutral tone',
    '- no markdown, no bullets, no preamble',
    '- do not mention AI limitations or browsing limits',
    ...(hasItems
      ? [
          '',
          'Article notes:',
          buildCoverageContext(items)
        ]
      : [])
  ].join('\n');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFallbackSearchAssist(query = '') {
  const normalizedQuery = cleanText(query);
  const loweredTokens = normalizedQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
  const rootToken = loweredTokens[0] || normalizedQuery;

  return {
    normalizedQuery,
    topicBrief: truncateText(`Related search angles and coverage paths for ${normalizedQuery}.`, 140),
    suggestedTopics: sanitizeShortList([
      normalizedQuery,
      `${normalizedQuery} policy`,
      `${normalizedQuery} startups`,
      `${normalizedQuery} safety`,
      `${normalizedQuery} companies`,
      `${rootToken} market`
    ], {
      min: 3,
      max: 32,
      maxWords: 4,
      limit: 6
    }),
    searchPhrases: sanitizeShortList([
      normalizedQuery,
      `${normalizedQuery} latest`,
      `${normalizedQuery} regulation`,
      `${normalizedQuery} business`,
      `${normalizedQuery} impact`
    ], {
      min: 4,
      max: 48,
      maxWords: 5,
      limit: 5
    }),
    provider: 'Search Assist Fallback',
    timestamp: new Date().toISOString()
  };
}

async function generateAnthropicSearchAssist(query = '') {
  const apiKey = getConfigValue('ANTHROPIC_API_KEY');
  const fallbackData = buildFallbackSearchAssist(query);

  if (!apiKey) {
    return fallbackData;
  }

  const items = await Promise.race([
    getLiveSearchItems(query).catch(() => []),
    sleep(4000).then(() => [])
  ]);

  const model = getConfigValue('ANTHROPIC_SUMMARY_MODEL') || 'claude-sonnet-5';
  const prompt = buildPrompt(query, items);

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
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      return fallbackData;
    }

    const payload = await response.json().catch(() => null);
    const text = cleanText(extractAnthropicTextBlocks(payload));
    if (!text) return fallbackData;

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return fallbackData;
    }

    const suggestedTopics = sanitizeShortList(parsed?.suggestedTopics, {
      min: 3,
      max: 32,
      maxWords: 4,
      limit: 6
    });
    const searchPhrases = sanitizeShortList(parsed?.searchPhrases, {
      min: 4,
      max: 48,
      maxWords: 5,
      limit: 5
    });

    if (suggestedTopics.length === 0 && searchPhrases.length === 0) {
      return fallbackData;
    }

    return {
      normalizedQuery: cleanText(parsed?.normalizedQuery || query),
      topicBrief: truncateText(parsed?.topicBrief || fallbackData.topicBrief, 140),
      suggestedTopics: suggestedTopics.length > 0 ? suggestedTopics : fallbackData.suggestedTopics,
      searchPhrases: searchPhrases.length > 0 ? searchPhrases : fallbackData.searchPhrases,
      provider: `Claude (${model})`,
      timestamp: new Date().toISOString()
    };
  } catch {
    return fallbackData;
  }
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const rateLimit = await enforceRateLimit(event, {
    scope: 'search-assist',
    maxRequests: 30,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return {
      statusCode: 429,
      headers: { ...headers, ...rateLimit.headers },
      body: JSON.stringify({ error: 'Rate limit exceeded' })
    };
  }

  try {
    const query = cleanText(event.queryStringParameters?.q || '');
    if (!query) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ found: false, data: null })
      };
    }

    const data = await generateAnthropicSearchAssist(query);

    return {
      statusCode: 200,
      headers: { ...headers, ...rateLimit.headers },
      body: JSON.stringify({
        found: Boolean(data),
        data
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...headers, ...rateLimit.headers },
      body: JSON.stringify({
        error: 'Search assist failed',
        details: cleanText(error?.message || 'Unknown error')
      })
    };
  }
};