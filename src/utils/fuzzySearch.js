// Levenshtein distance algorithm for fuzzy string matching
export function levenshteinDistance(str1, str2) {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  
  const costs = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }
  return costs[s2.length]
}

// Find the closest match from a list of keywords
export function findClosestMatch(searchTerm, keywords) {
  if (!searchTerm || searchTerm.length < 3) return null
  
  const search = searchTerm.toLowerCase()
  let closestMatch = null
  let minDistance = Infinity
  
  for (const keyword of keywords) {
    const distance = levenshteinDistance(search, keyword.toLowerCase())
    const maxLength = Math.max(search.length, keyword.length)
    const similarity = 1 - (distance / maxLength)
    
    // Only suggest if similarity is above 60% and better than previous matches
    if (similarity > 0.6 && distance < minDistance) {
      minDistance = distance
      closestMatch = keyword
    }
  }
  
  // Don't suggest if it's an exact match
  if (closestMatch && closestMatch.toLowerCase() === search) {
    return null
  }
  
  return closestMatch
}

// Common keywords for fuzzy matching
export const COMMON_KEYWORDS = [
  'epstein',
  'oscars',
  'ai',
  'artificial intelligence',
  'soccer',
  'football',
  'basketball',
  'baseball',
  'hockey',
  'tennis',
  'golf',
  'politics',
  'election',
  'technology',
  'science',
  'health',
  'medicine',
  'business',
  'finance',
  'economy',
  'entertainment',
  'movies',
  'music',
  'celebrity',
  'sports',
  'news',
  'world',
  'climate',
  'environment',
  'education',
  'shopping',
  'travel'
]
