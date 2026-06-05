const AUTH_ENDPOINT = '/.netlify/functions/auth'

async function requestAuth(method = 'GET', body, token) {
  const response = await fetch(AUTH_ENDPOINT, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Authentication request failed.')
  }

  return payload
}

export const getSession = (token) => requestAuth('GET', null, token)
export const loginUser = ({ email, password }) => requestAuth('POST', { action: 'login', email, password })
export const registerUser = ({ name, email, password }) => requestAuth('POST', { action: 'register', name, email, password })
export const logoutUser = (token) => requestAuth('POST', { action: 'logout' }, token)