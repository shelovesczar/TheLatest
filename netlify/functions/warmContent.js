const { setJson } = require('./blobStore');
const { jsonHeaders, requireAdminAccess } = require('./adminAccess');
const rssAggregator = require('./rss-aggregator');

const SUMMARY_TARGETS = [
  { category: '', label: 'Top Stories', sourceCategory: null },
  { category: 'politics', label: 'Politics', sourceCategory: null },
  { category: 'tech', label: 'Tech', sourceCategory: 'tech' },
  { category: 'business', label: 'Business', sourceCategory: 'business' },
  { category: 'sports', label: 'Sports', sourceCategory: 'sports' },
  { category: 'entertainment', label: 'Entertainment', sourceCategory: 'entertainment' },
  { category: 'lifestyle', label: 'Lifestyle', sourceCategory: 'lifestyle' },
  { category: 'culture', label: 'Culture', sourceCategory: 'culture' }
];

function normalizePart(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildSummaryKey(topic = '', category = '') {
  const normalizedTopic = normalizePart(topic) || 'general';
  const normalizedCategory = normalizePart(category) || 'general';
  return `summary/${normalizedCategory}/${normalizedTopic}`;
}

function extractTopItems(items = [], limit = 4) {
  return Array.isArray(items) ? items.filter(Boolean).slice(0, limit) : [];
}

function buildSummaryText(items = [], label = 'Top Stories') {
  const topItems = extractTopItems(items, 4);
  if (topItems.length === 0) {
    return `${label} coverage is being refreshed now. Check back shortly for the latest editorial summary.`;
  }

  const lead = topItems[0];
  const followUps = topItems.slice(1, 4);
  const paragraphOne = `${lead.title} leads the latest ${label.toLowerCase()} cycle, with ${lead.source || 'major outlets'} driving fresh coverage and new angles.`;
  const paragraphTwo = followUps.length > 0
    ? `Also developing: ${followUps.map((item) => item.title).join(' ')}.`
    : `Editors are tracking additional developments across ${label.toLowerCase()} coverage as the story set evolves.`;

  return `${paragraphOne}\n\n${paragraphTwo}`;
}

async function invokeAggregator(type, category) {
  const response = await rssAggregator.handler({
    httpMethod: 'GET',
    queryStringParameters: {
      type,
      ...(category ? { category } : {})
    }
  }, {});

  const body = JSON.parse(response.body || '{}');
  return Array.isArray(body.data) ? body.data : [];
}

async function warmSummaries() {
  for (const target of SUMMARY_TARGETS) {
    const items = await invokeAggregator('news', target.sourceCategory);
    const timestamp = new Date().toISOString();
    const summaryData = {
      summary: buildSummaryText(items, target.label),
      headline: `${target.label}: Editor's Brief`,
      provider: 'Editorial Cache',
      timestamp,
      url: target.category ? `/category/${target.category}` : '/category/top-stories'
    };

    await setJson('shared-ai-summaries', buildSummaryKey('', target.category), summaryData, {
      metadata: {
        category: normalizePart(target.category) || 'general',
        provider: 'Editorial Cache',
        warmedAt: timestamp
      }
    });
  }
}

async function runWarmContent() {
  const categoriesToWarm = [null, 'tech', 'business', 'sports', 'entertainment', 'lifestyle', 'culture'];

  for (const category of categoriesToWarm) {
    await invokeAggregator('news', category);
  }

  await warmSummaries();

  return {
    warmed: true,
    timestamp: new Date().toISOString()
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
    body: JSON.stringify(payload)
  };
};