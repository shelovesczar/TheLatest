const FOLLOWS_ENDPOINT = '/.netlify/functions/follows'

async function requestFollows(method = 'GET', token, body) {
  const response = await fetch(FOLLOWS_ENDPOINT, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Follow request failed.')
  }

  return payload
}

export const fetchFollows = (token) => requestFollows('GET', token)
export const updateFollowGroup = (token, body) => requestFollows('POST', token, body)