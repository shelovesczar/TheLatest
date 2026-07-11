const { STORE_NAMES, getJson, listJson, isBlobConfigurationError } = require('./blobStore');
const { jsonHeaders } = require('./adminAccess');

function buildDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function readCollection(storeName, prefix) {
  try {
    const { blobs } = await listJson(storeName, { prefix });
    const rows = await Promise.all(blobs.slice(0, 100).map((blob) => getJson(storeName, blob.key)));
    return rows.filter(Boolean);
  } catch (error) {
    if (isBlobConfigurationError(error)) {
      return [];
    }
    throw error;
  }
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const dayKey = buildDateKey();
    const [feedItems, generatedRequests, pageAnalytics, articleAnalytics, sourceAnalytics] = await Promise.all([
      readCollection(STORE_NAMES.feeds, 'feeds/'),
      readCollection(STORE_NAMES.generated, 'requests/'),
      readCollection(STORE_NAMES.analytics, `pages/${dayKey}`),
      readCollection(STORE_NAMES.analytics, `articles/${dayKey}`),
      readCollection(STORE_NAMES.analytics, `sources/${dayKey}`)
    ]);

    const feedAlerts = feedItems
      .filter((item) => Number(item?.failureCount || 0) >= 3)
      .slice(0, 8)
      .map((item) => ({
        kind: 'feed-failures',
        source: item.source || item.label || 'Unknown source',
        failureCount: Number(item.failureCount || 0),
        updatedAt: item.updatedAt || null
      }));

    const generatedCount = generatedRequests.reduce((total, item) => total + Number(Array.isArray(item?.items) ? item.items.length : 0), 0);
    const alerts = [...feedAlerts];

    if (generatedRequests.length >= 15) {
      alerts.push({
        kind: 'generated-fallback-volume',
        count: generatedRequests.length,
        message: 'Generated fallback usage is elevated. Check feed freshness and AI fallback volume.'
      });
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      dayKey,
      status: alerts.length > 0 ? 'warning' : 'ok',
      metrics: {
        feedItems: feedItems.length,
        feedFailures: feedAlerts.length,
        generatedRequests: generatedRequests.length,
        generatedItems: generatedCount,
        pageViewsTracked: pageAnalytics.reduce((sum, item) => sum + Number(item?.views || 0), 0),
        articleViewsTracked: articleAnalytics.reduce((sum, item) => sum + Number(item?.views || 0), 0),
        sourceViewsTracked: sourceAnalytics.reduce((sum, item) => sum + Number(item?.views || 0), 0)
      },
      alerts
    };

    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Unknown error' }) };
  }
};