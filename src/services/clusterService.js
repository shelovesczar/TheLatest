const CLUSTERS_ENDPOINT = '/.netlify/functions/clusters'
const CLUSTER_CACHE_TTL_MS = 5 * 60 * 1000
const clusterCache = new Map()

function buildClusterCacheKey({ type = 'news', category = '', search = '', limit = 8 } = {}) {
  return JSON.stringify({ type, category, search, limit })
}

export async function fetchStoryClusters({ type = 'news', category = '', search = '', limit = 8 } = {}) {
  const cacheKey = buildClusterCacheKey({ type, category, search, limit })
  const cached = clusterCache.get(cacheKey)

  if (cached && (Date.now() - cached.timestamp) < CLUSTER_CACHE_TTL_MS) {
    return cached.data
  }

  const params = new URLSearchParams({ type, limit: String(limit) })

  if (category) params.set('category', category)
  if (search) params.set('search', search)

  const response = await fetch(`${CLUSTERS_ENDPOINT}?${params.toString()}`)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to load story clusters.')
  }

  const clusters = Array.isArray(payload?.clusters) ? payload.clusters : []
  clusterCache.set(cacheKey, {
    data: clusters,
    timestamp: Date.now()
  })

  return clusters
}
